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
  temperature:0.3
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

const serveProject = tool(
  async({filePath})=>{
    spawn(["sh", "-c", "bun add -g serve && serve"], { cwd: filePath });
    const port = 3000;
    return `Preview project at http://localhost:${port}`
  },
  {
    name: "serve_project",
    description: "Serves a static project folder and returns a preview URL",
    schema: z.object({
      filePath: z.string().describe("Absolute path to the project folder"),
    }),
  }
)

//abstracting the tools name
const toolsByName = {
  [createFile.name]: createFile,
  [serveProject.name]:serveProject
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
        "You're helpful assistant tasked to answer any general users query and create the web apps as per user requirements and write those code by making a specific directory at first with some unique name related to project and then make the files inside that directory"
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