import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import 'dotenv/config'
import express from "express";
import cors from 'cors';
import projectRoute from "./routes/projectRoute";
import { WebSocketServer } from "ws";
import http from 'http';
import { runAgent } from "./runAgent";
import * as z from "zod";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import { PrismaClient } from "./generated/prisma";
import { getSandbox, saveProject } from "./sandboxManager";
import userRoute from "./routes/userRoute"

const app = express();
app.use(express.json())
app.use(cors());
app.use('/api', projectRoute);
app.use('/api', userRoute)
const server = http.createServer(app);
const prisma = new PrismaClient();

// const sandbox = await Sandbox.create('8yn0aii31bapkinrarai')
// const host = sandbox.getHost(5173)
// console.log(`https://${host}`)

const wss = new WebSocketServer({ server });

const MessageState = z.object({
  messages: z.array(z.custom<BaseMessage>()).register(registry, MessagesZodMeta),
  llmCalls: z.number().optional()
})


type GlobalState = Map<string, ProjectState>
type ProjectState = Map<string, ConversationState>
type ConversationState = z.infer<typeof MessageState>;
const globalStore: GlobalState = new Map();

app.post("/prompt", async (req: express.Request, res: express.Response) => {

  const { prompt, userId } = req.body;
  const projectId = req.query.projectId as string;
  console.log("prompt by user:", prompt);

  const client: WebSocket = users.get(userId)!;
  
  //sending only the new message via websocket
client.send(JSON.stringify({
  type:'human',
  content:prompt
}))

  try {
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
    conversationState.messages.push(new HumanMessage(prompt))
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


app.post('/conversation', async (req: express.Request, res: express.Response) => {
  // const title = 'test project';
  // const userId = '9cabe184-e4b9-4351-9b71-5737107d552b';
  const { prompt, userId } = req.body;
  const projectId = req.query.id as string;

  try {
    if (!prompt) {
      return res.status(404).json({
        msg: "Invalid input"
      })
    }

    const sandbox = await getSandbox(projectId, userId);

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

    const client: WebSocket = users.get(userId)!;

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
      // conversation
    })
  } catch (error) {
    console.error("Internal server error", error);
  }
})

export const users = new Map<string, WebSocket>();

wss.on('connection', (ws: WebSocket, req) => {
  console.log("ws connection established!")
  // console.log("socket:", ws);

  const params = new URLSearchParams(req.url?.replace("/?", ""));
  const userId = params.get("userId")!;
  console.log("New WebSocket:", userId);
  users.set(userId, ws);
  // console.log("users data with socket id:", users)
})


server.listen(5000, () => {
  console.log("Server is running on port 5000");
});
