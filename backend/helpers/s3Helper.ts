import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import Sandbox from "@e2b/code-interpreter";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

export async function saveProjectToS3(
  sandbox: Sandbox,
  userId: string,
  projectId: string
): Promise<boolean> {
  try {
    console.log(`Saving project ${projectId} to S3...`);

    // Check if project directory exists and has files
    try {
      const projectFiles = await sandbox.files.list('/home/user');
      if (!projectFiles || projectFiles.length === 0) {
        console.log(`No files to save yet for ${projectId}`);
        return false;
      }
    } catch (error) {
      console.log(`Project directory doesn't exist yet for ${projectId}`);
      return false;
    }

    const tempDir = `/tmp/archive_${projectId}`;
    const tarPath = `${tempDir}/project.tar.gz`;

    await sandbox.commands.run(`mkdir -p ${tempDir}`);

    const tarResult = await sandbox.commands.run(
    `cd /home/user && tar -czf ${tarPath} \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.next' \
    --exclude='build' \
    --exclude='.npm' \
    --exclude='.cache' \
    --exclude='.bash_logout' \
    --exclude='.bashrc' \
    --exclude='.profile' \
    . 2>&1 || echo "TAR_FAILED"`,
    {
    onStdout: (data) => console.log("TAR:", data),
    onStderr: (data) => console.error("TAR stderr:", data)
    }
);
    
    if (tarResult.stdout.includes("TAR_FAILED")) {
      console.log(`TAR failed for ${projectId}`);
      await sandbox.commands.run(`rm -rf ${tempDir}`);
      return false;
    }

    try {
      // FIX: Read as bytes - returns Uint8Array
      const tarContent = await sandbox.files.read(tarPath, { format: 'bytes' });

      if (!tarContent || tarContent.length === 0) {
        console.log(`TAR file is empty for ${projectId}`);
        await sandbox.commands.run(`rm -rf ${tempDir}`);
        return false;
      }

      console.log(`TAR file size: ${tarContent.length} bytes`);

      // Upload to S3
      const s3Key = `${userId}/${projectId}/project.tar.gz`;

      // FIX: Convert Uint8Array to Buffer
      const buffer = Buffer.from(tarContent);

      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: 'application/gzip'
      }));

      console.log(`Saved to s3://${BUCKET_NAME}/${s3Key}`);
      await sandbox.commands.run(`rm -rf ${tempDir}`);

      return true;

    } catch (readError) {
      console.error(`Failed to read TAR file:`, readError);
      return false;
    }

  } catch (error) {
    console.error("Error saving to S3:", error);
    return false;
  }
}

export async function loadProjectFromS3(
  sandbox: Sandbox,
  userId: string,
  projectId: string
): Promise<boolean> {
  try {
    const s3Key = `${userId}/${projectId}/project.tar.gz`;

    console.log(`Checking S3 for project ${projectId}...`);

    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key
      }));
    } catch (error) {
      console.log(`No saved project found`);
      return false;
    }

    const response = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    }));
    
    if (!response.Body) {
      throw new Error("Empty S3 response");
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as Readable) {
      chunks.push(chunk);
    }
    const tarBuffer = Buffer.concat(chunks);

    console.log(`Downloaded ${tarBuffer.length} bytes from S3`);

    const tempDir = `/tmp/untar_${projectId}`;
    const tarPath = `${tempDir}/project.tar.gz`;

    await sandbox.commands.run(`mkdir -p ${tempDir}`);


    // Convert Buffer → ArrayBuffer
    const arrayBuffer = new Uint8Array(tarBuffer).buffer;
    await sandbox.files.write(tarPath, arrayBuffer);

    // Extract
    await sandbox.commands.run(`mkdir -p /home/user`);
    const extractResult = await sandbox.commands.run(
      `cd /home/user && tar -xzf ${tarPath} 2>&1`,
      {
        onStdout: (data) => console.log("UNTAR:", data),
        onStderr: (data) => console.error("UNTAR stderr:", data)
      }
    );

    if (extractResult.exitCode !== 0) {
      console.error(`Extraction failed with exit code ${extractResult.exitCode}`);
      return false;
    }

    console.log(`Project extracted to /home/user`);

    await sandbox.commands.run(`rm -rf ${tempDir}`);

    return true;

  } catch (error) {
    console.error("Error loading from S3:", error);
    return false;
  }
}