import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { StateGraph, START, END } from "@langchain/langgraph";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import { isAIMessage, ToolMessage } from "@langchain/core/messages";
import Sandbox from "@e2b/code-interpreter";
import 'dotenv/config'
import { systemPrompt } from "./systemPrompt";
import { PrismaClient } from "./generated/prisma";

const prisma = new PrismaClient();

const MessageState = z.object({
  messages: z.array(z.custom<BaseMessage>()).register(registry, MessagesZodMeta),
  llmCalls: z.number().optional(),
  summary: z.string().optional(),
  summariserLLMCalls: z.number().optional()
})

type State = z.infer<typeof MessageState>;

export async function runAgent(userId: string, projectId: string, conversationState: State, client: WebSocket, sandbox: Sandbox) {

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-lite",
    temperature: 1
  })

  const summariserLLM = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0
  })

  //defining the tools
  const CreateFileSchema = z.object({
    filePath: z.string().describe("Absolute or relative path to the file"),
    content: z.string().describe("Text content to write inside the file"),
  })

  // const createFile = tool(
  //   async (input) => {
  //     const { content, filePath} = CreateFileSchema.parse(input);
  //     await sandbox.files.write(
  //       filePath, content
  //     );
  //     return `File created successfully at ${filePath}`;
  //   },
  //   {
  //     name: "create_file",
  //     description: "Creates a new file at the specified path with the given content",
  //     schema: CreateFileSchema
  //   },
  // )
  const createFile = tool(
    async (input) => {
      const { content, filePath } = CreateFileSchema.parse(input);

      // FORCE: All files MUST go to /home/user
      let fullPath: string;

      if (filePath.startsWith('/home/user/')) {
        // Already has full path
        fullPath = filePath;
      } else if (filePath.startsWith('/')) {
        // Absolute path but not in project dir - REJECT or FIX
        fullPath = `/home/user${filePath}`;
      } else {
        // Relative path - prepend project dir
        fullPath = `/home/user/${filePath}`;
      }

      // Create parent directory
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      await sandbox.commands.run(`mkdir -p ${dir}`);

      await sandbox.files.write(fullPath, content);

      console.log(`File created: ${fullPath}`);
      return `File created successfully at ${filePath}`;
    },
    {
      name: "create_file",
      description: "Creates a new file at the specified path. Use relative paths like 'src/App.tsx' or 'package.json'. They will be placed in the project directory.",
      schema: CreateFileSchema
    },
  )

  //tool to run the shell commands
  const RunShellCommandSchema = z.object({
    command: z.string().describe("Shell command to execute"),
    cwd: z.string().optional().describe("Directory where to run the command"),
  })

  // const runShellCommand = tool(
  //   async (input) => {
  //     const  {command}  = RunShellCommandSchema.parse(input);
  //     await sandbox.commands.run(command, {
  //       onStdout: (data) => {
  //         console.log("cmd out:", data)
  //       }
  //     })
  //     return `Running: "${command}"}`;
  //   },
  //   {
  //     name: "run_shell_command",
  //     description: "Runs a shell command in the given directory",
  //     schema: RunShellCommandSchema,
  //   }
  // )
  const runShellCommand = tool(
    async (input) => {
      const { command } = RunShellCommandSchema.parse(input);

      // Always run commands in /home/user
      await sandbox.commands.run(command, {
        cwd: '/home/user',  // ← Force working directory
        onStdout: (data) => {
          console.log("cmd out:", data)
        }
      })

      return `Running: "${command}" in /home/user`;
    },
    {
      name: "run_shell_command",
      description: "Runs a shell command in the project directory (/home/user). Commands like 'npm install' will run in the project folder.",
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


  //defining the model node
  async function llmCall(state: State) {
    const msgs: BaseMessage[] = [];

    // Always start with ONE system message (combine prompt + summary if exists)
    const systemContent = state.summary
      ? `${systemPrompt}\n\nConversation summary so far: ${state.summary}`
      : systemPrompt;

    msgs.push(new SystemMessage(systemContent));

    // Add all messages from state (these should be HumanMessage and AIMessage only)
    // After summarization, state.messages only contains recent human messages
    // Before summarization, it contains full history
    msgs.push(...state.messages);

    const response = await llmWithTools.invoke(msgs);

    return {
      messages: [response],
      llmCalls: (state.llmCalls ?? 0) + 1,
    };
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
      result.push(observation!);
      // console.log("observation from toolNode", observation)
      // const ws = users.get(userId);
      client?.send(JSON.stringify(observation?.content))
    }
    return { messages: result }
  }

  //Branching logic, shouldContinue or end!
  async function shouldContinue(state: State) {
    const lastMessage = state.messages.at(-1);
    //
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
  //DEBUG: Check what files were actually created
  try {
    console.log('\n CHECKING FILES IN SANDBOX:');

    // Check root
    const rootFiles = await sandbox.files.list('/');
    console.log('Root files:', rootFiles?.map(f => f.name));

    // Check /home/user
    try {
      const projectFiles = await sandbox.files.list('/home/user');
      console.log(' /home/user files:', projectFiles?.map(f => f.name));
    } catch (err) {
      console.log(' /home/user does NOT exist');
    }

  } catch (error) {
    console.log(' Error checking files:', error);
  }
  // console.log("this is the log from conversationState",JSON.stringify(conversationState) +"\n"+"\n"+"\n");
  // console.log("this is the result.messages::", result.messages);

  // const allMessages = [...conversationState.messages, ...result.messages];
  const allMessages = result.messages;

  // console.log("this is from allMessage:", allMessages)

  //getting the final ai response and saving it to db
  const finalAIResponse = [...allMessages].reverse().find(m => m.getType() === 'ai' && (!m.tool_calls || m.tool_calls.length === 0));

  // const aiResponseText = finalAIResponse?.content || ' ';
  //Convert content to string (handle both string and array formats)
  const aiResponseText = typeof finalAIResponse?.content === 'string'
    ? finalAIResponse.content
    : Array.isArray(finalAIResponse?.content)
      ? finalAIResponse.content.map(c => c.text || '').join('\n')
      : '';

  await prisma.conversationHistory.create({
    data: {
      projectId,
      type: "TEXT_MESSAGE",
      from: 'ASSISTANT',
      contents: aiResponseText
    }
  })

  //calling summariserLLM to summarise the context
  if (allMessages.length >= 4) {
    const fullContextText = allMessages
      .map(m => `${m._getType().toUpperCase()} MESSAGE:\n${m.content}\n`)
      .join('\n');

    const summary = await summariserLLM.invoke([
      new SystemMessage("Summarise the following conversation context breifly so that it will be easier for another llm to continue the work from right here, make sure it has enough context to start working or make the changes from this new summary context. Please also include the code and the file refernce in this summary, i think that is absolutely needed. keep the latest code and the file references in this sumary, so that llm can solve the bugs as well if there will be any. keep the code inside the file as it is. keep the latest code always but always keep the latest code."),
      new HumanMessage(fullContextText)
    ])

    conversationState.summary = summary.content;

    const lastUserMessage = [...allMessages].reverse().find(m => m.getType() === 'human') as HumanMessage

    //keeping only last user message + summary
    conversationState.messages = [
      // new SystemMessage(summary.content),
      new HumanMessage(lastUserMessage.content)
    ]
  }


  // Persist conversation history
  // conversationState.messages.push(...result.messages);
  conversationState.llmCalls = result.llmCalls;

  //lets send the human msg as well to the streams
  const humanMessages = result.messages.filter((m: BaseMessage) => m.getType() === 'human');
  for (const human of humanMessages) {
    client?.send(JSON.stringify({
      type: 'human',
      content: human.content
    }))
  }

  // Get ONLY the AI message that contains tool calls (probably earlier in sequence)
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

  // Send tool results
  const toolResults = result.messages.filter((m: BaseMessage) => m.getType() === "tool");
  for (const t of toolResults) {
    client?.send(JSON.stringify({
      type: "tool_result",
      content: t.content
    }));
  }

  // Get ONLY the final AI message (the one without tool calls)
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


