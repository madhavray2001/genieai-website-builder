import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { StateGraph, START, END } from "@langchain/langgraph";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import { type BaseMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import { isAIMessage, ToolMessage } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";
import { spawn } from "bun";
import Sandbox from "@e2b/code-interpreter";
import 'dotenv/config'
import express from "express";
import cors from 'cors';
import projectRoute from "./routes/projectRoute";

const sandbox = await Sandbox.create('8yn0aii31bapkinrarai')
const host = sandbox.getHost(5173)
console.log(`https://${host}`)

const app = express();
app.use(express.json())
app.use(cors());
app.use('/api', projectRoute);

app.post("/prompt", async (req, res) => {
  const { prompt } = req.body;
  console.log("prompt by user:", prompt);
  try {
    //defining the state variable to persist the context
    let state = { messages: [] }

    const userInput: string  = prompt;

    const result = await agent.invoke({
      ...state,
      messages: [...state.messages, new HumanMessage(userInput)]
    });

    state.messages.push(...result.messages);
    for (const message of result.messages) {
      console.log(`[${message.getType()}]:${message.text}`)
    }
    console.log(result.messages);

    return res.status(200).json({ msg: "Created successfully", projectUrl:`https://${host}` })
  } catch (error) {

    console.error("Internal server error", error);
    return res.status(500).json({ msg: "Shitty code!" })
  }
})


//defining the llm
const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  temperature: 1
})


//defining the tools
const createFile = tool(
  async ({ filePath, content }) => {
    console.log("this is the filepath given to a tool:", filePath)
    console.log("content given to a tool by llm", content)
    // console.log("Type of filePath:",typeof filePath)
    // console.log("Type of content:",typeof content)

    // await Bun.write(filePath, content);
    await sandbox.files.write(
      filePath, content
    );
    return `File created successfully at ${filePath}`;
  },
  {
    name: "create_file",
    description: "Creates a new file at the specified path with the given content",
    schema: z.object({
      filePath: z.string().describe("Absolute or relative path to the file"),
      content: z.string().describe("Text content to write inside the file"),
    })
  },
)

//tool to run the shell commands
const runShellCommand = tool(
  async ({ command }) => {
    console.log("checking the command in tool:", command);
    console.log("checking the type of command:", typeof command)
    // console.log("webex is trying to run the command in this dir:", cwd)
    // spawn(["sh", "-c", command], { cwd });
    await sandbox.commands.run(command, {
      onStdout: (data) => {
        console.log("cmd out:", data)
      }
    })
    return `Running: "${command}"}`;
  },
  {
    name: "run_shell_command",
    description: "Runs a shell command in the given directory",
    schema: z.object({
      command: z.string().describe("Shell command to execute"),
      cwd: z.string().optional().describe("Directory where to run the command"),
    }),
  }
)

//abstracting the tools name
const toolsByName = {
  [createFile.name]: createFile,
  // [serveStaticProject.name]:serveStaticProject,
  [runShellCommand.name]: runShellCommand
};
const tools = Object.values(toolsByName)
const llmWithTools = llm.bindTools(tools);

const MessageState = z.object({
  messages: z
    .array(z.custom<BaseMessage>())
    .register(registry, MessagesZodMeta),
  llmCalls: z.number().optional(),
})

//defining the model node
async function llmCall(state: z.infer<typeof MessageState>) {
  const appJsx = `
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App

`

  const initialFileStructure = `
    - /home/user/index.html
    - /home/user/package.json
    - /home/user/README.md
    - /home/user/src/
    - /home/user/src/App.jsx
    - /home/user/src/App.css
    - /home/user/src/index.css
    - /home/user/src/main.jsx

    App.jsx looks like this:
    ${appJsx}
`;

  return {
    messages: await llmWithTools.invoke([
      new SystemMessage(
        `
    You are an expert coding agent. Your job is to write code in a sandbox environment.
    You have access to the following tools:
    - createFile
    - runShellCommand
    You will be given a prompt and you will need to write code to implement the prompt.
    Make sure the website is pretty. 
    This is what the initial file structure looks like:
    ${initialFileStructure} Dont use npm run dev at any condition ut you should use npm install if theres a need for that. Dont run npm install if you havent imported any dependency or packages, when the user request for normal css or js change you dont need to do npm install. Dont go inside vite config file that gives an unexpected errors. Dont use npm run dev at any condition, the server is already running your job is only to update the code, dont try to run it.
`
      ),
      ...state.messages,
    ]),
    llmCalls: (state.llmCalls ?? 0) + 1,
  }
}

//define the tool node, finding the last message of llm if theres any tool call or no need to call the tool
async function toolNode(state: z.infer<typeof MessageState>) {
  const lastMessage = state.messages.at(-1);

  if (lastMessage == null || !isAIMessage(lastMessage)) {
    return { message: [] };
  }

  const result: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    const observation = await tool?.invoke(toolCall);
    result.push(observation);
  }
  return { messages: result }
}

//Branching logic, shouldContinue or end!
async function shouldContinue(state: z.infer<typeof MessageState>) {
  const lastMessage = state.messages.at(-1);
  if (lastMessage == null || !isAIMessage(lastMessage)) return END;

  //if the llm makes a tool call, then perform action
  if (lastMessage.tool_calls?.length) {
    return "toolNode"
  }
  //otherwise, we stop (reply to the user)
  return END;
}

//building the agent or lets say the graph
const agent = new StateGraph(MessageState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "llmCall")
  .compile();



app.listen(5000, () => {
  console.log("Server is running on port 5000");
});