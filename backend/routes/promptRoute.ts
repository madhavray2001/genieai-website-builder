import express from "express";
import { PrismaClient } from "../generated/prisma";
import { getSandbox, saveProject } from "../sandboxManager";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import * as z from "zod";
import {users} from "../index";
import { runAgent } from "../runAgent";
const router = express.Router()
const prisma = new PrismaClient();


const MessageState = z.object({
  messages: z.array(z.custom<BaseMessage>()).register(registry, MessagesZodMeta),
  llmCalls: z.number().optional()
})


type GlobalState = Map<string, ProjectState>
type ProjectState = Map<string, ConversationState>
type ConversationState = z.infer<typeof MessageState>;
const globalStore: GlobalState = new Map();

router.post("/prompt", async (req: express.Request, res: express.Response) => {

  const {prompt,enhancedPrompt ,userId } = req.body;
  const projectId = req.query.projectId as string;
  console.log("prompt by user:", prompt);
//   console.log("enhanced prompt by an agent", enhancedPrompt);

  try {
    
    const project = await prisma.project.findUnique({
      where:{
        id:projectId,
      },
      select:{
        userId:true
      }
    })

    if(!project){
      return res.status(403).json({msg:"Project not found"})
    }

    if(project.userId !== userId){
      return res.status(403).json({msg:"Access denied"})
    }

    const client: WebSocket | undefined = users.get(userId)!;

    if(!client){
      return res.status(400).json({msg:"ws not found. Refresh page"})
    }
    //sending only the new message via websocket
    client.send(JSON.stringify({
    type:'human',
    content:prompt
    }))

    const sandbox = await getSandbox(projectId, userId);
    const host = sandbox.getHost(5173);
    
    if (!globalStore.has(userId)) {
      // console.log("pushing the userId in the globalstore")
      const projectState: ProjectState = new Map();
      projectState.set(projectId, {
        messages: [],
        llmCalls: 0,
      });
      
      globalStore.set(userId, projectState);
      // console.log("checking globalstore", globalStore);
    }
    
    let projectState = globalStore.get(userId);
    
    //initialising new project if the project doesnt exist
    if(!projectState?.has(projectId)){
      console.log(`Initialising new project ${projectId} for user ${userId}`);
      projectState?.set(projectId,{
        messages:[],
        llmCalls:0
      })
    }
    
    let conversationState: ConversationState = projectState?.get(projectId)!;
    conversationState.messages.push(new HumanMessage(enhancedPrompt))
    // console.log("checking global store with conversationState", globalStore)
    // console.log("checking the conversation state", conversationState);
    

    await prisma.conversationHistory.create({
      data: {
        projectId,
        type: "TEXT_MESSAGE",
        from: "USER",
        contents: prompt
      }
    })
    // console.log("conversation state to the llm with initPrompt only:", conversationState)
    await runAgent(userId, projectId, conversationState, client, sandbox)

    //saving to s3
    await saveProject(projectId, userId);

    // const ws = users.get(userId);
    // ws?.send(JSON.stringify({ type: "log", text: 'test message' }))

    return res.status(200).json({ msg: "Created successfully", projectUrl: `https://${host}` })

  } catch (error) {

    console.error("Internal server error", error);
    return res.status(500).json({ msg: "Shitty code!" })
  }
})


router.post('/conversation', async (req: express.Request, res: express.Response) => {
  const { prompt, userId } = req.body;
  const projectId = req.query.id as string;

  try {
    if (!prompt) {
      return res.status(404).json({
        msg: "Invalid input"
      })
    }

    const project = await prisma.project.findUnique({
      where:{id:projectId},
      select:{userId:true}
    })

    if(!project){
      return res.status(404).json({msg:"Project not found"})
    }

    if(project.userId !== userId){
      return res.status(403).json({msg:"Access denied!"})
    }
    const sandbox = await getSandbox(projectId, userId);

    const countConversation = await prisma.conversationHistory.count({
      where:{projectId}
    })
    const client: WebSocket|undefined = users.get(userId)!;

    if(!client){
      return res.status(400).json({
        msg:"WS not found, refresh the page"
      })
    }

    
    if(countConversation >= 4){
      return res.status(429).json({
        msg:"COnversation limit reached!",
        current:countConversation
      })
    }
    await prisma.conversationHistory.create({
      data: {
        projectId,
        type: "TEXT_MESSAGE",
        from: "USER",
        contents: prompt
      }
    })
    
    // Initialize globalStore if not exists (after server restart)
    if (!globalStore.has(userId)) {
      console.log(` Initializing globalStore for user ${userId} (server restart)`);
      const projectState: ProjectState = new Map();
      projectState.set(projectId, {
        messages: [],
        llmCalls: 0,
      });
      globalStore.set(userId, projectState);
    }
    
    let projectState = globalStore.get(userId);
    
    // Initialize project if not exists (after server restart)
    if (!projectState?.has(projectId)) {
      console.log(` Initializing project ${projectId} (server restart)`);
      projectState?.set(projectId, {
        messages: [],
        llmCalls: 0,
      });
    }
    let conversationState: ConversationState = projectState?.get(projectId)!;
    conversationState.messages.push(new HumanMessage(prompt))
    
    //sending only the new message via websocket
    client.send(JSON.stringify({
      type:'human',
      content:prompt
    }))
    
    // console.log("conversation state to the llm with the follow up message:", conversationState)
    
    
    const data = await runAgent(userId, projectId, conversationState, client, sandbox);
    // JSON.stringify(data.)

    //save to s3 after finishes
    await saveProject(projectId, userId);

    return res.status(200).json({
      msg: "Prompt given successfully",
    })
  } catch (error) {
    console.error("Internal server error", error);
  }
})

export default router;