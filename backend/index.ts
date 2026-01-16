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

//defining the llm
const llm = new ChatGoogleGenerativeAI({
  model:"gemini-2.5-flash",
  temperature:1
})


//defining the tools
const createFile = tool(
  async({filePath, content})=>{
    await Bun.write(filePath, content);
    return `File created successfully at ${filePath}`;
  },
{
    name:"create_file",
    description:"Creates a new file at the specified path with the given content",
    schema: z.object({
  filePath: z.string().describe("Absolute or relative path to the file"),
  content: z.string().describe("Text content to write inside the file"),
})
  },
)

//tool to serve the static project (html, css & js)
// const serveStaticProject = tool(
//   async({filePath})=>{
//     spawn(["sh", "-c", "bun add -g serve && serve"], { cwd: filePath });
//     const port = 3000;
//     return `Preview project at http://localhost:${port}`
//   },
//   {
//     name: "serve_project",
//     description: "Serves a static project folder and returns a preview URL",
//     schema: z.object({
//       filePath: z.string().describe("Absolute path to the project folder"),
//     }),
//   }
// )

//tool to run the shell commands
const runShellCommand = tool(
  async({command, cwd})=>{
    spawn(["sh", "-c", command], { cwd });
    return `Running: "${command}" in ${cwd ?? "current directory"}`;
  },
  {
    name:"run_shell_command",
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
  [runShellCommand.name]:runShellCommand
};
const tools = Object.values(toolsByName)
const llmWithTools = llm.bindTools(tools);

const MessageState = z.object({
  messages: z
  .array(z.custom<BaseMessage>())
  .register(registry, MessagesZodMeta),
  llmCalls:z.number().optional(),
})

//defining the model node
async function llmCall(state:z.infer<typeof MessageState>) {
  return{
    messages: await llmWithTools.invoke([
      new SystemMessage(
        "You're helpful assistant tasked to answer any general users query and create the web apps in react as per user requirements and write those code by making a specific directory at first with some unique name related to project and then make the files inside that directory. Use bun everywhere instead of npm. You have tools to run the shell commands, and you should create the project in react with vite. I'm using bun spawn to run the shell command to give the commands and current working directory to that tool. I want you to make the react project in vite by running all the needed commands with the help of tools and make the react app in a separate folder by naming it something related to project. Also after you make it go to the same project you made and run the dev script and give the preview link to the user. Make sure to go to same directory and give the project preview link after running the dev script. Try to make the site responsive and make it as beautiful as you can. Try to make it as beautiful, simple yet modern looking.You might also need to import  DONT USE NPM, USE BUN EVERYWHERE TO RUN AND DEVELOP THE PROJECT"
      ),
      ...state.messages,
    ]),
    llmCalls:(state.llmCalls ?? 0)+1,
  }
}

//define the tool node, finding the last message of llm if theres any tool call or no need to call the tool
async function toolNode(state:z.infer<typeof MessageState>) {
  const lastMessage = state.messages.at(-1);

  if(lastMessage == null || !isAIMessage(lastMessage)){
    return {message: []};
  }

  const result: ToolMessage[]=[];
  for (const toolCall of lastMessage.tool_calls??[]){
    const tool = toolsByName[toolCall.name];
    const observation = await tool?.invoke(toolCall);
    result.push(observation);
  }
  return {messages: result}
}

//Branching logic, shouldContinue or end!
async function shouldContinue(state:z.infer<typeof MessageState>) {
  const lastMessage = state.messages.at(-1);
  if(lastMessage == null || !isAIMessage(lastMessage)) return END;

  //if the llm makes a tool call, then perform action
  if(lastMessage.tool_calls?.length){
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

//defining the state variable to persist the context
let state= {messages:[]}

//running the conversation in while loop
while(true){
  const userInput:string | null= prompt();

  if(userInput?.toLowerCase() === "quit"){
    break;
  }
  if(!userInput){
    continue;
  }

  const result = await agent.invoke({
    ...state,
    messages:[...state.messages, new HumanMessage(userInput)]
  });
  console.log("checking the type of result",typeof result)

  state.messages.push(...result.messages);
  for (const message of result.messages){
    console.log(`[${message.getType()}]:${message.text}`)
  }
}