import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import 'dotenv/config'
import express from "express";
import cors from 'cors';
import projectRoute from "./routes/projectRoute";
import { WebSocketServer } from "ws";
import http from 'http';
import Sandbox from "@e2b/code-interpreter";
import { runAgent } from "./runAgent";
import * as z from "zod";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";

const app = express();
app.use(express.json())
app.use(cors());
app.use('/api', projectRoute);
const server = http.createServer(app);

  const sandbox = await Sandbox.create('8yn0aii31bapkinrarai')
  const host = sandbox.getHost(5173)
  console.log(`https://${host}`)

const wss = new WebSocketServer({server});
/*
const globalStore = {userId: 
                {
                "projectId":{conversationState}
                } 
                }
*/
const MessageState = z.object({
  messages: z.array(z.custom<BaseMessage>()).register(registry, MessagesZodMeta),
  llmCalls: z.number().optional()
})

type ConversationState = z.infer<typeof MessageState>;

type GlobalState = Map<string,ProjectState>
type ProjectState = Map<string,ConversationState>
// interface ConversationState {
//   messages:[],
//   llmCall:number
// }
const globalStore:GlobalState = new Map();

app.post("/prompt", async (req, res) => {

  const { prompt, userId, projectId } = req.body;
  console.log("prompt by user:", prompt);

if (!globalStore.has(userId)) {
  const projectState: ProjectState = new Map();
  projectState.set(projectId, {
    messages: [],
    llmCalls: 0,
  });

  globalStore.set(userId, projectState);
}

let projectState = globalStore.get(userId);
let conversationState: ConversationState = projectState?.get(projectId)!;
conversationState.messages.push(new HumanMessage(prompt))

const client: WebSocket = users.get(userId)!;
  
  try {

    runAgent(userId, projectId, conversationState, client, sandbox )

    // const ws = users.get(userId);
    // ws?.send(JSON.stringify({ type: "log", text: 'test message' }))

    return res.status(200).json({ msg: "Created successfully", projectUrl:`https://${host}` })

  } catch (error) {

    console.error("Internal server error", error);
    return res.status(500).json({ msg: "Shitty code!" })
  }
  })

const users = new Map<string, WebSocket>();

wss.on('connection', (ws, req)=>{
  console.log("ws connection established!")
  // console.log("socket:", ws);

  const params = new URLSearchParams(req.url?.replace("/?", ""));
  const userId = params.get("userId");
  console.log("New WebSocket:", userId);
  users.set(userId, ws);
  // console.log("users data with socket id:", users)
})


server.listen(5000, () => {
  console.log("Server is running on port 5000");
});
