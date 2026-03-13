import 'dotenv/config'
import express from "express";
import cors from 'cors';
import { WebSocketServer } from "ws";
import http from 'http';
import projectRoute from "./routes/projectRoute";
import userRoute from "./routes/userRoute"
import promptRoute from "./routes/promptRoute"

const app = express();
app.use(express.json())
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://genie-ai-website-builder.vercel.app',
    'https://genieai.samadesh.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
}));
app.use('/api', projectRoute);
app.use('/api', userRoute)
app.use('/api', promptRoute)
const server = http.createServer(app);


const wss = new WebSocketServer({ server });

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

app.get('/health',(req, res)=>{
  res.status(200).json({status:'healthy', timestamp:new Date().toISOString()})
})

server.listen(5000, () => {
  console.log("Server is running on port 5000");
});
