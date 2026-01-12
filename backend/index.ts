// Step 1: define tools and model
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import * as z from "zod";

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.2,
});

const createFile= tool(
  async({filePath, content})=>{
    await Bun.write(filePath, content);
    return `file created successfully at: ${filePath}`;
  },
  {
  name:"create_file",
  description: "Creates a new file at the specified path with the given content.",
    schema: z.object({
      filePath: z.string().describe("Absolute or relative path to the file"),
      content: z.string().describe("Text content to write inside the file")
    })
  }
)

// Augment the LLM with tools
const toolsByName = {
  [createFile.name]: createFile
};
const tools = Object.values(toolsByName);
const llmWithTools = llm.bindTools(tools);

// Step 2: Define state
import { StateGraph, START, END } from "@langchain/langgraph";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import { type BaseMessage } from "@langchain/core/messages";

const MessagesState = z.object({
  messages: z
    .array(z.custom<BaseMessage>())
    .register(registry, MessagesZodMeta),
  llmCalls: z.number().optional(),
});

// Step 3: Define model node
import { SystemMessage } from "@langchain/core/messages";
async function llmCall(state: z.infer<typeof MessagesState>) {
  return {
    messages: await llmWithTools.invoke([
      new SystemMessage(
        "You are a helpful assistant that answer any general question of the user and also tasked to create web apps if the user asks"
      ),
      ...state.messages,
    ]),
    llmCalls: (state.llmCalls ?? 0) + 1,
  };
}

// Step 4: Define tool node
import { isAIMessage, ToolMessage } from "@langchain/core/messages";
async function toolNode(state: z.infer<typeof MessagesState>) {
  const lastMessage = state.messages.at(-1);

  if (lastMessage == null || !isAIMessage(lastMessage)) {
    return { messages: [] };
  }

  const result: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    const observation = await tool.invoke(toolCall);
    result.push(observation);
  }

  return { messages: result };
}

// Step 5: Define logic to determine whether to end
async function shouldContinue(state: z.infer<typeof MessagesState>) {
  const lastMessage = state.messages.at(-1);
  if (lastMessage == null || !isAIMessage(lastMessage)) return END;

  // If the LLM makes a tool call, then perform an action
  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }

  // Otherwise, we stop (reply to the user)
  return END;
}

// Step 6: Build and compile the agent
const agent = new StateGraph(MessagesState)
  .addNode("llmCall", llmCall)
  .addNode("toolNode", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
  .addEdge("toolNode", "llmCall")
  .compile();

// Invoke
import { HumanMessage } from "@langchain/core/messages";

let state = { messages: [] };

while (true) {
  const userInput:string | null = prompt();
  // state.messages.push(new HumanMessage(userInput!));

  const result = await agent.invoke({
    ...state,
    messages: [...state.messages, new HumanMessage(userInput)]
  });

  state.messages.push(...result.messages); 
  // state.messages = result.messages; 
  console.log("this is a state", state);
  for (const message of result.messages) {
    console.log(`[${message.getType()}]: ${message.text}`);
  }
}
