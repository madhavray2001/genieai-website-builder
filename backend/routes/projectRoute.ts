import express from "express";
import { PrismaClient } from "../generated/prisma";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getSandbox } from "../sandboxManager";
const router = express.Router();
const prisma = new PrismaClient();

router.post('/project', async (req : express.Request, res: express.Response) => {
    const { initialPrompt, userId } = req.body;
    console.log("this is the intialPrompt", initialPrompt);
    console.log("this is the userId", userId);

    const id = req.query.id as string;

     const titleGeneratorLLM = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        temperature: 0
      })

      const aiGivenTitle = await titleGeneratorLLM.invoke([
        new SystemMessage("Please generate a 3 to 4 word maximum meaningful summary or the title from the user given initial prompt. Your task is to only give the title of the project. Give the relevant title for the prompt or the project in maximum 3 to 4 words. Please make sure the title is meaningful and represents the project user is trying to create"),
        new HumanMessage(initialPrompt)
      ])
      const title = aiGivenTitle.content as string;
      console.log("checking the type of title", typeof title)
      
      console.log("checking the ai gen title", title);
    try {
        if(!id){
            return res.status(400).json({msg:"missing id in query"})
        }
        if (!initialPrompt || !userId) {
            return res.status(404).json({
                msg: "Invalid input - missing initialPrompt or userId"
            })
        }
        const project = await prisma.project.create({
            data: {
                id,
                title,
                initialPrompt,
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

        return res.status(200).json({
            msg:"Project loaded successfully",
            projectUrl: `https://${host}`
        })
    } catch (error) {
        console.error("Error loading project", error);
        return res.status(500).json({msg:"Internal server error"})
    }
})

export default router;
