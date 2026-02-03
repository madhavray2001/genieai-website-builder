import { S3Client, ListBucketsCommand, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type Sandbox from "@e2b/code-interpreter";
import {Readable} from "stream";

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;

interface s3{
    sandbox:Sandbox,
    userId:string,
    projectId:string
}

//function to save the project in s3
export async function saveProjectToS3({sandbox, userId, projectId}:s3):Promise<void> {
    try {
        console.log(`Saving project with id: ${projectId} to s3`)

        //creating temp directory for zip
        const tempDir = `/tmp/${projectId}`;
        const zipPath = `${tempDir}/project.zip`; 

        await sandbox.commands.run(`mkdir -p ${tempDir}`);

        // 2. ZIP the project folder in sandbox
    await sandbox.commands.run(
      `cd /home/user/project && zip -r ${zipPath} . -x "node_modules/*" -x ".git/*" -x "dist/*"`,
      {
        onStdout: (data) => console.log("ZIP:", data),
        onStderr: (data) => console.error("ZIP Error:", data)
      }
    );

       // 3. Read the ZIP file from sandbox
    const zipContent = await sandbox.files.read(zipPath);

    // 4. Upload to S3
    const s3Key = `${userId}/${projectId}/project.zip`;

    await s3Client.send(new PutObjectCommand ({
        Bucket:BUCKET_NAME,
        Key:s3Key,
        Body: Buffer.from(zipContent),
        ContentType:'application/zip',
        Metadata:{
            userId,
            projectId,
            timeStamp:new Date().toISOString()
        }
    }))

    console.log(`project saved to s3: //${BUCKET_NAME}/${s3Key}`);

    await sandbox.commands.run(`rm -rf ${tempDir}`);

    } catch (error) {
        console.log("Error saving to s3", error);
    }
}

//function to load projects from s3 and extract to sandbox
export async function loadProjectFromS3({sandbox, userId, projectId}:s3):Promise<boolean> {
    try {
        const s3Key = `${userId}/${projectId}/project.zip`;

        console.log(`Loading project ${projectId} from S3...`)
        //check if project exists in S3
        try {
            await s3Client.send(new HeadObjectCommand ({
                Bucket: BUCKET_NAME,
                Key: s3Key
            }));
        } catch (error) {
            console.log(`No saved project found in S3 for ${projectId}`);
            return false;
        }

        //downloading zip from s3
        const response = await s3Client.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
        }));

        if(!response.Body){
            throw new Error("Empty response from s3");
        }

        //converting stream to buffer
        const chunks: Uint8Array[]=[];
        for await(const chunk of response.Body as Readable){
            chunks.push(chunk);
        }
        const zipBuffer = Buffer.concat(chunks);

        //write zip to sandbox temp location
        const tempDir = `/tmp/${projectId}`;
        const zipPath = `${tempDir}/project.zip`;
    
        await sandbox.commands.run(`mkdir -p ${tempDir}`);
        await sandbox.files.write(zipPath, zipBuffer.toString('base64')); // E2B needs base64
    } catch (error) {
        
    }
}
