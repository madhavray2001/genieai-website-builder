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

      }
      sandboxInfo.currentProjectId = projectId;
      sandboxInfo.lastAccessed = new Date();
      
      return sandboxInfo.sandbox;
    }
  }

  console.log(`Creating NEW sandbox for ${userId}...`);

  // timeoutMs:1800000
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
  activeSandboxes.set(userId, {
    sandbox,
    currentProjectId:projectId,
    lastAccessed: new Date()
  });

  console.log(`Sandbox ready for ${projectId}`);
  return sandbox;
}


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

