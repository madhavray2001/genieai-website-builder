import Sandbox from "@e2b/code-interpreter";
import 'dotenv/config';
import { loadProjectFromS3, saveProjectToS3 } from "./helpers/s3Helper";

interface SandboxInfo {
  sandbox: Sandbox;
  currentProjectId:string | null,
  lastAccessed: Date;
}

const activeSandboxes = new Map<string, SandboxInfo>();

const SANDBOX_TIMEOUT = 30 * 60 * 1000;

async function isViteRunning(sandbox: Sandbox): Promise<boolean> {
  try {
    const res = await sandbox.commands.run(
      "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5173/ || echo 000",
      { cwd: "/home/user", timeoutMs: 5000 }
    );
    const code = res.stdout.trim();
    return code.startsWith("2") || code.startsWith("3") || code === "404";
  } catch {
    return false;
  }
}

async function startViteDevServer(sandbox: Sandbox): Promise<void> {
  console.log("Starting Vite dev server...");
  await sandbox.commands.run(
    "cd /home/user && (pgrep -f 'vite' >/dev/null || nohup npm run dev > /tmp/vite.log 2>&1 &)",
    { cwd: "/home/user", timeoutMs: 10000, background: true } as any
  );
  // Poll for dev server up to ~15s
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    if (await isViteRunning(sandbox)) {
      console.log(`Vite dev server is up (after ${i + 1}s)`);
      return;
    }
  }
  console.warn("Vite dev server did not respond in 15s — continuing anyway");
}

// Restart Vite so it serves freshly-loaded files. The sandbox's file watcher
// doesn't reliably pick up a bulk `tar` extraction, so after loading a project
// from S3 we kill the running dev server and start it again from a clean slate.
async function restartViteDevServer(sandbox: Sandbox): Promise<void> {
  console.log("Restarting Vite dev server to serve loaded project files...");
  try {
    await sandbox.commands.run(
      "pkill -f vite || true; pkill -f 'npm run dev' || true",
      { cwd: "/home/user", timeoutMs: 8000 }
    );
  } catch (e) {
    console.warn("pkill vite failed (continuing):", e);
  }
  await new Promise(r => setTimeout(r, 800));
  await startViteDevServer(sandbox);
}

async function setupViteProject(sandbox: Sandbox): Promise<void> {
  console.log("Setting up Vite project in sandbox...");

  // If dev server is already running (prebuilt template's start_cmd), we're done.
  if (await isViteRunning(sandbox)) {
    console.log("Vite dev server already running — skipping setup");
    return;
  }

  // Check if Vite project files already exist (prebuilt template w/o auto-start)
  const checkResult = await sandbox.commands.run(
    "cat /home/user/package.json 2>/dev/null || echo NO_PACKAGE_JSON",
    { cwd: "/home/user", timeoutMs: 5000 }
  );

  const hasVite =
    !checkResult.stdout.includes("NO_PACKAGE_JSON") &&
    checkResult.stdout.includes("vite");

  if (hasVite) {
    console.log("Vite project files exist — starting dev server");
    await startViteDevServer(sandbox);
    return;
  }

  // Cold path: bootstrap a Vite React project from scratch
  console.log("Creating Vite React project from scratch...");
  const createResult = await sandbox.commands.run(
    "cd /home/user && npx --yes create-vite@5.5.5 myapp --template react && cp -r myapp/. . && rm -rf myapp",
    { cwd: "/home/user", timeoutMs: 180000 }
  );

  if (createResult.exitCode !== 0) {
    console.error("Failed to create Vite project:", createResult.stderr?.slice(0, 500));
    throw new Error("Failed to create Vite project in sandbox");
  }

  console.log("Installing npm dependencies...");
  const installResult = await sandbox.commands.run("cd /home/user && npm install", {
    cwd: "/home/user",
    timeoutMs: 240000,
  });

  if (installResult.exitCode !== 0) {
    console.error("Failed to install dependencies:", installResult.stderr?.slice(0, 500));
    throw new Error("Failed to install npm dependencies in sandbox");
  }

  await sandbox.files.write(
    "/home/user/vite.config.js",
    `import { defineConfig } from "vite"\nimport react from "@vitejs/plugin-react"\n\nexport default defineConfig({\n  plugins: [react()],\n  server: {\n    host: true,\n    allowedHosts: true,\n  },\n});\n`
  );

  await startViteDevServer(sandbox);
  console.log("Vite project setup complete!");
}

export async function getSandbox(projectId: string, userId: string): Promise<Sandbox> {
  // const sandboxKey = `${userId}:${projectId}`;

  // Check if sandbox exists and is still fresh
  const sandboxInfo = activeSandboxes.get(userId);

  if (sandboxInfo) {
    const timeSinceLastAccess = Date.now() - sandboxInfo.lastAccessed.getTime();

    if (timeSinceLastAccess < SANDBOX_TIMEOUT) {
      console.log(`Reusing sandbox for ${userId}`);
      // existing.lastAccessed = new Date();
      // return existing.sandbox;

      if(sandboxInfo.currentProjectId && sandboxInfo.currentProjectId !== projectId){
        //switching from one project to another
        await saveProjectToS3(sandboxInfo.sandbox, userId, sandboxInfo.currentProjectId);

        //clearing the sandbox workspace to run new project 
        await sandboxInfo.sandbox.commands.run('rm -rf /home/user/src/*');
        console.log("workspace cleared!!");

        //checking if this keeping only projectId works
        // const loaded = await loadProjectFromS3(sandboxInfo.sandbox, userId, sandboxInfo.currentProjectId);
        const loaded = await loadProjectFromS3(sandboxInfo.sandbox, userId, projectId);

        // Restart Vite so the preview serves the newly-loaded project's files
        // instead of the previously-open project's (stale) build.
        await restartViteDevServer(sandboxInfo.sandbox);
        console.log(loaded ? "Switched to loaded project" : "Switched to empty project (no S3 snapshot)");
      }
      sandboxInfo.currentProjectId = projectId;
      sandboxInfo.lastAccessed = new Date();
      
      return sandboxInfo.sandbox;
    }
  }

  console.log(`Creating NEW sandbox for ${userId}...`);

  // Free-tier (1 concurrent sandbox): kill any orphaned sandbox from a previous
  // process before creating a new one, so we don't hit the concurrent limit.
  try {
    const listed = await (Sandbox as any).list?.();
    const running = listed?.sandboxes || listed || [];
    for (const s of running) {
      const sid = s.sandboxId || s.sandboxID || s.id;
      if (sid) {
        console.log(`Killing orphan sandbox ${sid} to free concurrent slot`);
        try { await (Sandbox as any).kill?.(sid); } catch (e) { console.warn("kill failed:", e); }
      }
    }
  } catch (e) {
    console.warn("Sandbox.list not available or failed — skipping orphan cleanup", e);
  }

  let sandbox: Sandbox;
  try {
    sandbox = await Sandbox.create(process.env.E2B_SANDBOX_TEMPLATE!, {
      timeoutMs: SANDBOX_TIMEOUT
    });
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.toLowerCase().includes("concurrent") || msg.includes("429")) {
      throw new Error(
        "E2B concurrent sandbox limit reached (free tier = 1). Wait for the current sandbox to expire, or upgrade your E2B plan."
      );
    }
    if (msg.toLowerCase().includes("template") || msg.includes("404")) {
      throw new Error(
        `E2B template "${process.env.E2B_SANDBOX_TEMPLATE}" not found or not accessible. Check E2B_SANDBOX_TEMPLATE in .env.`
      );
    }
    throw err;
  }

  // Set up Vite dev environment in the sandbox
  await setupViteProject(sandbox);

  // Try to load project from S3
  const projectExists = await loadProjectFromS3(sandbox, userId, projectId);

  if (projectExists) {
    console.log(`Project loaded from S3 - ready to use!`);
    // Vite was started against the template files during setup; restart it so it
    // serves the S3-restored project instead of the empty template.
    await restartViteDevServer(sandbox);
  } else {
    console.log(`New project - starting fresh`);
  }

  // Store sandbox
  activeSandboxes.set(userId, {
    sandbox,
    currentProjectId:projectId,
    lastAccessed: new Date()
  });

  console.log(`Sandbox ready for ${projectId}`);
  return sandbox;
}


export async function killAllSandboxes(): Promise<void> {
  console.log(`Killing ${activeSandboxes.size} active sandbox(es)...`);
  const entries = Array.from(activeSandboxes.entries());
  activeSandboxes.clear();
  await Promise.all(entries.map(async ([userId, info]) => {
    try {
      await info.sandbox.kill();
      console.log(`Killed sandbox for ${userId}`);
    } catch (e) {
      console.warn(`Failed to kill sandbox for ${userId}:`, e);
    }
  }));
}

// Free the E2B concurrent-sandbox slot when the backend exits
let shutdownHandlersRegistered = false;
function registerShutdownHandlers() {
  if (shutdownHandlersRegistered) return;
  shutdownHandlersRegistered = true;
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal} — cleaning up sandboxes`);
    try { await killAllSandboxes(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
registerShutdownHandlers();

export async function saveProject(projectId: string, userId: string): Promise<void> {
  // const sandboxKey = `${userId}:${projectId}`;
  const sandboxInfo = activeSandboxes.get(userId);

  if (!sandboxInfo) {
    throw new Error("Sandbox not active");
  }

  const saved = await saveProjectToS3(sandboxInfo.sandbox, userId, projectId);
  // console.log(`Project ${projectId} saved to S3`);
  if (saved) {
    console.log(`Project ${projectId} saved to S3`);
  } else {
    console.log(` Project ${projectId} NOT saved (no files yet)`);
  }
}

