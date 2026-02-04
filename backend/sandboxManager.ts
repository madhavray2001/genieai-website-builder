import Sandbox from "@e2b/code-interpreter";
import 'dotenv/config';
import { loadProjectFromS3, saveProjectToS3 } from "./helpers/s3Helper";

interface SandboxInfo {
  sandbox: Sandbox;
  lastAccessed: Date;
}

const activeSandboxes = new Map<string, SandboxInfo>();

const SANDBOX_TIMEOUT = 30 * 60 * 1000; //lets set the timeout for 30 minutes

export async function getSandbox(projectId: string, userId: string): Promise<Sandbox> {
  const sandboxKey = `${userId}:${projectId}`;

  // Check if sandbox exists and is still fresh
  const existing = activeSandboxes.get(sandboxKey);

  if (existing) {
    const timeSinceLastAccess = Date.now() - existing.lastAccessed.getTime();

    if (timeSinceLastAccess < SANDBOX_TIMEOUT) {
      console.log(`Reusing sandbox for ${projectId}`);
      existing.lastAccessed = new Date();
      return existing.sandbox;
    }
  }

  console.log(`Creating NEW sandbox for ${projectId}...`);

  const sandbox = await Sandbox.create('8yn0aii31bapkinrarai', {
    timeoutMs: SANDBOX_TIMEOUT
  });

  // Try to load project from S3
  const projectExists = await loadProjectFromS3(sandbox, userId, projectId);

  if (projectExists) {
    console.log(`Project loaded from S3 - ready to use!`);
  } else {
    console.log(`New project - starting fresh`);
  }

  // Store sandbox
  activeSandboxes.set(sandboxKey, {
    sandbox,
    lastAccessed: new Date()
  });

  console.log(`Sandbox ready for ${projectId}`);
  return sandbox;
}


export async function saveProject(projectId: string, userId: string): Promise<void> {
  const sandboxKey = `${userId}:${projectId}`;
  const info = activeSandboxes.get(sandboxKey);

  if (!info) {
    throw new Error("Sandbox not active");
  }

  const saved = await saveProjectToS3(info.sandbox, userId, projectId);
  // console.log(`Project ${projectId} saved to S3`);
  if (saved) {
    console.log(`Project ${projectId} saved to S3`);
  } else {
    console.log(` Project ${projectId} NOT saved (no files yet)`);
  }
}

