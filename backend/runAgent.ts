import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { StateGraph, START, END } from "@langchain/langgraph";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import { type BaseMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import { isAIMessage, ToolMessage } from "@langchain/core/messages";
import Sandbox from "@e2b/code-interpreter";
import 'dotenv/config'
import { WebSocketServer } from "ws";
import { systemPrompt } from "./systemPrompt";

const MessageState = z.object({
  messages: z.array(z.custom<BaseMessage>()).register(registry, MessagesZodMeta),
  llmCalls: z.number().optional()
})

type State = z.infer<typeof MessageState>;

export async function runAgent(userId:string,projectId:string,conversationState:State,client:WebSocket, sandbox: Sandbox) {
    
    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-lite",
      temperature: 1
    })
    
    
    //defining the tools
    const CreateFileSchema =  z.object({
          filePath: z.string().describe("Absolute or relative path to the file"),
          content: z.string().describe("Text content to write inside the file"),
        })
    
    const createFile = tool(
      async (input) => {
        const { content, filePath} = CreateFileSchema.parse(input);
        await sandbox.files.write(
          filePath, content
        );
        return `File created successfully at ${filePath}`;
      },
      {
        name: "create_file",
        description: "Creates a new file at the specified path with the given content",
        schema: CreateFileSchema
      },
    )
    
    //tool to run the shell commands
    const RunShellCommandSchema = z.object({
          command: z.string().describe("Shell command to execute"),
          cwd: z.string().optional().describe("Directory where to run the command"),
        })
    
    const runShellCommand = tool(
      async (input) => {
        const  {command}  = RunShellCommandSchema.parse(input);
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
        schema: RunShellCommandSchema,
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
    async function llmCall(state: State) {
      return {
        messages: await llmWithTools.invoke([
          new SystemMessage(systemPrompt),
          ...state.messages,
        ]),
        
        llmCalls: (state.llmCalls ?? 0) + 1,       
      }
    }
    
    //define the tool node, finding the last message of llm if theres any tool call or no need to call the tool
    async function toolNode(state: State) {
      const lastMessage = state.messages.at(-1);
    
      if (lastMessage == null || !isAIMessage(lastMessage)) {
        return { message: [] };
      }
    
      const result: ToolMessage[] = [];
      for (const toolCall of lastMessage.tool_calls ?? []) {
        const tool = toolsByName[toolCall.name];
        const observation = await tool?.invoke(toolCall);
        result.push(observation);
        // console.log("observation from toolNode", observation)
        // const ws = users.get(userId);
        client?.send(JSON.stringify(observation?.content))
      }
      return { messages: result }
    }
    
    //Branching logic, shouldContinue or end!
    async function shouldContinue(state: State) {
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
    
    // let state = { messages: [] }
    
    //     const userInput: string  = input;
    
// Run agent
const result = await agent.invoke(conversationState);

// ✅ Persist conversation history
conversationState.messages.push(...result.messages);
conversationState.llmCalls = result.llmCalls;


// ✅ Get ONLY the AI message that contains tool calls (probably earlier in sequence)
const aiWithTools = [...result.messages]
  .reverse()
  .find(m => m._getType() === "ai" && m.tool_calls?.length);

if (aiWithTools?.tool_calls?.length) {
  for (const tc of aiWithTools.tool_calls) {
    client?.send(JSON.stringify({
      type: "tool_call",
      name: tc.name,
      args: tc.args
    }));
  }
}

// ✅ Send tool results
const toolResults = result.messages.filter(m => m._getType() === "tool");
for (const t of toolResults) {
  client?.send(JSON.stringify({
    type: "tool_result",
    content: t.content
  }));
}

// ✅ Get ONLY the final AI message (the one without tool calls)
const finalAI = [...result.messages]
  .reverse()
  .find(m => m._getType() === "ai" && (!m.tool_calls || m.tool_calls.length === 0));

if (finalAI) {
  client?.send(JSON.stringify({
    type: "ai",
    content: finalAI.content
  }));
}

        
}
      
      // console.log("This is a conversation state",conversationState);
      // state.messages.push(...result.messages);
      // for (const message of result.messages) {
      //   console.log(`[${message.getType()}]:${message.text}`)
      //   // console.log("These are the single message in result.message: ",message);
      // }
