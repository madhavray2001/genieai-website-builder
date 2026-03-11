import express from "express";
import { PrismaClient } from "../generated/prisma";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getSandbox } from "../sandboxManager";
import { PROMPT_ENHANCER_SYSTEM_PROMPT, TITLE_GENERATOR_SYSTEM_PROMPT } from "../systemPrompt";
const router = express.Router();
const prisma = new PrismaClient();

const titleGeneratorLLM = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0
})

const promptEnhancerLLM = new ChatGoogleGenerativeAI({
    model:"gemini-2.5-flash-lite",
    temperature:0
})

router.post('/project', async (req : express.Request, res: express.Response) => {
    const { initialPrompt, userId } = req.body;
    console.log("this is the intialPrompt", initialPrompt);
    console.log("this is the userId", userId);
    const id = req.query.id as string;

    
    try {
        if (!initialPrompt || !userId || !id) {
            return res.status(404).json({
                msg: "Invalid input - missing initialPrompt, userId or id"
            })
        }
        
        const projectCount = await prisma.project.count({
            where:{userId}
        })
        if(projectCount >= 1){
            return res.status(429).json({
                msg:"Project limit reached",
                current:projectCount
            })
        }
        
        const enhancedInitialPrompt = await promptEnhancerLLM.invoke([
            new SystemMessage(PROMPT_ENHANCER_SYSTEM_PROMPT),
            new HumanMessage(initialPrompt)
            ])
    
        const enhancedPrompt = enhancedInitialPrompt.content as string;
        console.log("THIS IS THE ENHANCED PROJECT BY LLM", enhancedPrompt)
        // process.exit(0);
            
            console.log("Reached title generator llm")
              const aiGivenTitle = await titleGeneratorLLM.invoke([
                new SystemMessage(TITLE_GENERATOR_SYSTEM_PROMPT),
                new HumanMessage(initialPrompt)
              ])
              const title = aiGivenTitle.content as string;
              console.log("checking the type of title", typeof title)
              
              console.log("checking the ai gen title", title);
            const project = await prisma.project.create({
            data: {
                id,
                title,
                initialPrompt,
                enhancedPrompt,
                userId
            }
        })

        return res.status(200).json({
            msg:"Project created successfully",
            project
        })

    } catch (error) {
        console.error("Internal server error", error);
    }
})


router.get('/project/:id', async (req: express.Request, res: express.Response)=>{
    try {
        const {id} = req.params;
        const prompt = await prisma.project.findFirst({
            where:{
                id
            }
        })
        // console.log("prompt from the route", prompt);
        return res.status(200).json({data:prompt})
    } catch (error) {
        console.error("Internal server error", error);
        return res.status(500).json({msg:"Internal server error"})
    }
})

router.get('/projects/:userId', async(req:express.Request, res:express.Response)=>{
    const {userId} = req.params;
    try {
        if(!userId){
            return res.status(400).json({msg:"UserId is required"})
        }
        const projects = await prisma.project.findMany({
            where:{
                userId
            },
            orderBy:{createdAt:'desc'} //lets show the newest first
        })
        return res.status(200).json({msg:"project fetched successfully", projects})
    } catch (error) {
        console.error("Error fetching projects", error);
        return res.status(500).json({msg:"Internal server error"})
    }
})

router.get('/project/load/:id', async(req:express.Request, res:express.Response)=>{
    const {id:projectId} = req.params;
    const userId = req.query.userId as string;

    try {
        if(!userId){
            return res.status(400).json({msg:"userId is required!"})
        }

        const sandbox = await getSandbox(projectId as string, userId);

        //getting the project url
        const host = sandbox.getHost(5173);

        //getting the conversation history from the db
        const conversation = await prisma.conversationHistory.findMany({
            where:{
                projectId,
            },
            orderBy:{
                createdAt:'asc'
            }
        })

        //getting fiels from sandbox after loading from project from s3
         const result = await sandbox.commands.run(
            'find /home/user/src -type f 2>/dev/null || echo ""',
            { cwd: '/home/user' }
        );

        const filePaths = result.stdout.split('\n').filter(p=>p.trim() && p.startsWith('/home/user/src'));

        const files = await Promise.all(
            filePaths.map(async(path)=>{
                try {
                    const content = await sandbox.files.read(path);
                    return{
                        path:path,
                        content:content.toString()
                    };
                } catch (error) {
                    console.error(`Error reading ${path}:`, error)
                    return null 
                }
            })
        )

        return res.status(200).json({
            msg:"Project loaded successfully",
            projectUrl: `https://${host}`,
            conversation,
            files:files.filter(f=> f !== null)
        })
    } catch (error) {
        console.error("Error loading project", error);
        return res.status(500).json({msg:"Internal server error"})
    }
})

//verification route to check if the project belong to the user
router.get("/project/verify/:id",async (req:express.Request, res:express.Response)=>{
    const {id:projectId} = req.params;
    const userId = req.query.userId as string;

    try {
        if(!userId || !projectId){
            return res.status(400).json({msg:"userId or projectId is missing"})
        }

        const project = await prisma.project.findUnique({
            where:{
                id:projectId,
            },
            select:{
                userId:true
            }
        })

        if(!project){
            return res.status(404).json({msg:"user doesnt have access to this project"})
        }

        if(project.userId === userId){
            return res.status(200).json({msg:"user has access"})
        }else{
            return res.status(403).json({
                msg:"User doesnt own this project"
            })
        }
    } catch (error) {
        console.error("Error verifying project", error);
        return res.status(500).json({msg:"Internal server error"})
    }
})

export default router;
