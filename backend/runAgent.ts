import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { StateGraph, START, END } from "@langchain/langgraph";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import { isAIMessage, ToolMessage } from "@langchain/core/messages";
import Sandbox from "@e2b/code-interpreter";
import 'dotenv/config'
import { systemPrompt } from "./systemPrompt";
import { PrismaClient } from "./generated/prisma";
import { ChatAnthropic } from "@langchain/anthropic";
import { scanLLM, secureCommand, secureFilePath } from "./guardrails";

const prisma = new PrismaClient();

const MessageState = z.object({
  messages: z.array(z.custom<BaseMessage>()).register(registry, MessagesZodMeta),
  llmCalls: z.number().optional(),
  summary: z.string().optional(),
  summariserLLMCalls: z.number().optional(),
  validationFailures: z.number().optional()
})

type State = z.infer<typeof MessageState>;

export async function runAgent(userId: string, projectId: string, conversationState: State, client: WebSocket, sandbox: Sandbox):Promise<void> {

  console.log("RUNNING LLM")

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 1
  })

  //   const llm = new ChatAnthropic({
  //   model: "claude-sonnet-4-5-20250929",
  //   temperature: 0,
  // });


  const summariserLLM = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0
  })

  //defining the tools
  const CreateFileSchema = z.object({
    filePath: z.string().describe("Absolute or relative path to the file"),
    content:z
    .string()
    .min(1, "content cannot be empty - you MUST provide the actual file content")
    .describe("Complete text content to write inside the file. This is REQUIRED and cannot be empty.")
  })

  const createFile = tool(
    async (input) => {
      
      const { content, filePath } = CreateFileSchema.parse(input);

      //adding explicit validation cause mf llm doesnt obey
      if(!content || typeof content !== 'string'){
        return `ERROR: content is required for ${filePath}. You MUST provide the complete file content. Do NOT create empty files.`
      }
      if (!filePath || filePath.trim() === '') {
        throw new Error("filePath is required and cannot be empty");
      }

      //filepath guardrail
      secureFilePath(filePath);

      // Normalize path inside sandbox
      let fullPath: string;
      if (filePath.startsWith('/home/user/')) {
        fullPath = filePath;
      } else if (filePath.startsWith('/')) {
        fullPath = `/home/user${filePath}`;
      } else {
        fullPath = `/home/user/${filePath}`;
      }

      // Ensure directory exists
      const dir = fullPath.slice(0, fullPath.lastIndexOf('/'));
      await sandbox.commands.run(`mkdir -p ${dir}`);

      // Write the file
      await sandbox.files.write(fullPath, content);
      console.log(`File written: ${fullPath}`);

      // Skip validation for non-code files
      const needsValidation =
        filePath.endsWith('.js') ||
        filePath.endsWith('.jsx')

      if (!needsValidation) {
        // Tell FE to refresh preview
        client?.send(JSON.stringify({ type: "refresh_preview" }));
        return `File created successfully at ${filePath}`;
      }

      try {
        console.log(`Validating via Vite module transform: ${filePath}`);

        // Let vite warm
        await new Promise((r) => setTimeout(r, 300));

        const host = sandbox.getHost(5173);
        const previewUrl = `https://${host}`;
        const moduleUrl = `${previewUrl}/${filePath}?t=${Date.now()}`;

        console.log("Fetching module:", moduleUrl);

        const res = await fetch(moduleUrl);
        const body = await res.text();

        const errorDetected =
          !res.ok ||
          body.includes('[plugin:vite') ||
          body.includes('SyntaxError') ||
          body.includes('Unexpected token') ||
          body.includes('Transform failed') ||
          body.includes('Module not found') ||
          body.includes('ReferenceError') ||
          body.includes('TypeError');

        if (errorDetected) {
          console.log(`Vite failed to compile ${filePath}`);

          return `
          VITE COMPILATION ERROR for: ${filePath} 
          ${body.slice(0, 1000)}
          __VALIDATION_FAILED__`;
        }

        console.log(`Vite successfully compiled ${filePath}`);

      } catch (err: any) {
        console.log("Validation failed:", err);
        
        return `
        VITE VALIDATION FAILED
        ${err?.message || err}
        __VALIDATION_FAILED__`;
      }

      // Tell FE to reload iframe
      client?.send(JSON.stringify({ type: "refresh_preview" }));

      return `File created successfully at ${filePath}`;
    },
    {
      name: "create_file",
      description: "Creates a new file in the Vite project and validates it.",
      schema: CreateFileSchema,
    }
  );

  //tool to run the shell commands
  const RunShellCommandSchema = z.object({
    command: z.string().describe("Shell command to execute"),
    cwd: z.string().optional().describe("Directory where to run the command"),
  })

  const runShellCommand = tool(
    async (input) => {
      const { command } = RunShellCommandSchema.parse(input);
      //command guardrail
      secureCommand(command);
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
    //if the summary exist then add the summary as well to the system prompt
    const systemContent = state.summary
      ? `${systemPrompt}

    ## CONTEXT FROM PREVIOUS CONVERSATION:
    ${state.summary}

    ## IMPORTANT:
    The above context contains the COMPLETE current state of all files. When the user asks for changes:
    1. Read the current code from the context above
    2. Make ONLY the specific changes requested
    3. Keep everything else exactly the same
    4. Use create_file to write the COMPLETE updated file (not just the changed parts)

    The user is now making a follow-up request below.`
      : systemPrompt;

    msgs.push(new SystemMessage(systemContent), ...state.messages);

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
    return { messages: [] };
  }

  const result: ToolMessage[] = [];
  let validationFailures = state.validationFailures ?? 0;

  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    
    try {
      // Validate tool call BEFORE execution
      if (toolCall.name === 'create_file') {
        if (!toolCall.args?.filePath) {
          throw new Error("create_file called without filePath argument");
        }
        if (!toolCall.args?.content) {
          throw new Error(`create_file called for ${toolCall.args.filePath} without content argument`);
        }
      }

      const observation = await tool?.invoke(toolCall);
      result.push(observation!);
      
      client?.send(JSON.stringify(observation?.content));

      const contentStr = typeof observation?.content === 'string'
        ? observation.content
        : JSON.stringify(observation?.content);

      if (contentStr.includes("__VALIDATION_FAILED__")) {
        validationFailures++;
        console.log(`Validation failure #${validationFailures}`);
      }

    } catch (error: any) {
      // Catch schema validation errors
      console.error(`Tool execution error for ${toolCall.name}:`, error.message);
      
      const errorMessage = new ToolMessage({
        tool_call_id: toolCall.id as string,
        content: `
      ERROR: Tool call failed!
      Tool: ${toolCall.name}
      Error: ${error.message}
      You called this tool incorrectly. Read the tool description carefully and   try again.

      For create_file, you MUST provide BOTH:
      1. filePath (e.g., "src/App.css")
      2. content (the complete file content as a string)

      Example:
      {
      "name": "create_file",
      "args": {
       "filePath": "src/App.css",
       "content": "body { margin: 0; padding: 0; }"
      }
      }

      Try again with the correct parameters.

      __VALIDATION_FAILED__
        `,
        name: toolCall.name
      });

      result.push(errorMessage);
      validationFailures++;
    }
  }
  
  return {
    messages: result,
    validationFailures
  };
  }

  //adding a node to give the final response to the user
  async function finalNode(state: State) {

    //checking if we need to show the validation failure msg to the user 
    if ((state.validationFailures ?? 0) >= 3) {
      // Don't call LLM, just return error message
      const errorMessage = new AIMessage(`I apologize, but I encountered repeated errors while trying to generate your code. After some attempts, I was unable to create valid code.
      This might mean:
      - The request is too complex for me to handle correctly
      - There's an issue with how I'm interpreting your requirements

      Could you please try:
      1. Breaking down your request into smaller, simpler steps
      2. Being more specific about what you want
      3. Starting with a basic version first

      I'm ready to help once you rephrase your request!`);

      return {
        messages: [errorMessage]
      };
    }

    const llmText = await llm.invoke([
      new SystemMessage("Summarize what you have done. Speak directly to the user. No tools. No code. Just a short final message. Also if the message contains summary then you need to understand that the user is following up in the chat and you need to give the response to that follow up as well."),
      ...state.messages
    ]);

    return {
      messages: [llmText]
    };
  }

  async function shouldContinue(state: State) {
    const last = state.messages.at(-1);

    if (!last || !isAIMessage(last)) return END;

    // Check validation failures FIRST
    if ((state.validationFailures ?? 0) >= 3) {
      console.log("Max validation failure reached");
      return "finalNode";
    }

    // Check for recent validation error in last 2 messages
    const recentToolMessages = state.messages
      .slice(-2)
      .filter(m => m.getType() === 'tool');

    const hasValidationError = recentToolMessages.some(m =>
      m.content?.toString().includes('__VALIDATION_FAILED__')
    );

    // If validation error AND LLM didn't retry, force it
    if (hasValidationError && (state.validationFailures ?? 0) < 3) {
      console.log("Validation error detected, forcing LLM retry...");

      // If LLM gave no tool calls (confused), go back to llmCall
      if (!last.tool_calls || last.tool_calls.length === 0) {
        console.log("LLM confused by validation error, retrying...");
        return "llmCall";
      }
    }

    // Normal flow
    if (last.tool_calls && last.tool_calls.length > 0) {
      return "toolNode";
    }

    // Check if content is meaningful
    const text =
      typeof last.content === "string"
        ? last.content.trim()
        : Array.isArray(last.content)
          ? last.content.map(c => c.text || "").join("").trim()
          : "";

    const isMeaningful = text.length > 0;

    if (!isMeaningful && (state.llmCalls ?? 0) < 4) {
      return "llmCall";
    }

    return "finalNode";
  }

  const agent = new StateGraph(MessageState)
    .addNode("llmCall", llmCall)
    .addNode("toolNode", toolNode)
    .addNode("finalNode", finalNode)
    .addEdge(START, "llmCall")
    .addConditionalEdges("llmCall", shouldContinue, ["toolNode", "llmCall", "finalNode"])
    .addEdge("toolNode", "llmCall")
    .addEdge("finalNode", END)
    .compile();

  // Run agent
  const result = await agent.invoke(conversationState)as State;
  //Check what files were actually created
  // try {
  //   console.log('\n CHECKING FILES IN SANDBOX:');

  //   // Check root
  //   const rootFiles = await sandbox.files.list('/');
  //   console.log('Root files:', rootFiles?.map(f => f.name));

  //   // Check /home/user
  //   try {
  //     const projectFiles = await sandbox.files.list('/home/user');
  //     console.log(' /home/user files:', projectFiles?.map(f => f.name));
  //   } catch (err) {
  //     console.log(' /home/user does NOT exist');
  //   }

  // } catch (error) {
  //   console.log(' Error checking files:', error);
  // }

  // console.log("this is the result.messages::", result.messages);
  // console.log("Number of llm calls", result.llmCalls);
  const allMessages = result.messages;
  console.log("Length of all messages is:", allMessages.length)

  //getting the final ai response and saving it to db
  const finalAIResponse = [...result.messages]
    .reverse()
    .filter(isAIMessage)
    .find(m =>
      (!m.tool_calls || m.tool_calls.length === 0) &&
      (
        typeof m.content === "string"
          ? m.content.trim().length > 0
          : Array.isArray(m.content) && m.content.some(c => c.text?.trim().length > 0)
      )
    );
    console.log("finalAiResponse without parsing:", finalAIResponse)
  //as finalAiResponse is sometime giving string as well as object. making sure it works on all models i use; some gives the array like content:[{}]
  const aiResponseText = typeof finalAIResponse?.content === 'string'
    ? finalAIResponse.content
    : Array.isArray(finalAIResponse?.content)
      ? finalAIResponse.content.map(c => c.text || '').join('\n')
      : '';

  console.log("final ai response text",aiResponseText);

  await prisma.conversationHistory.create({
    data: {
      projectId,
      type: "TEXT_MESSAGE",
      from: 'ASSISTANT',
      contents: aiResponseText
    }
  })

  //calling summariserLLM to summarise the context
  // previously i tested this result.llmCalls >= 3 as well as this allMessages.length >= 4
  if (allMessages.length >= 4) {
    // Build a richer context that includes actual code from tool calls
    const fullContextText = allMessages
      .map(m => {
        let text = `${m.getType().toUpperCase()} MESSAGE:\n`;

        // For AI messages with tool calls, include the actual arguments
        if (m.getType() === 'ai' && m.tool_calls?.length > 0) {
          text += `Tool calls made:\n`;
          for (const tc of m.tool_calls) {
            text += `- ${tc.name}(${JSON.stringify(tc.args, null, 2)})\n`;
          }
        }

        // Add the message content
        if (typeof m.content === 'string') {
          text += m.content;
        } else if (Array.isArray(m.content)) {
          text += m.content.map(c => c.text || '').join('\n');
        }

        return text + '\n';
      })
      .join('\n---\n');

    const summary = await summariserLLM.invoke([
      new SystemMessage(`You are summarizing a conversation between a user and an AI coding agent. 

      Your summary will be given to a FRESH AI agent (with no memory) to continue the work.

    CRITICAL REQUIREMENTS:
    1. Include the COMPLETE, CURRENT code for ALL files that were created/modified
    2. Use markdown code blocks with file paths as headers
    3. Explain what the user originally wanted
    4. Explain what changes were just made
    5. If the user is asking for follow-up changes, explain what they want changed

    FORMAT:
    ## Current Project State

    [Brief description of what was built]

    ### File: src/App.jsx
    \`\`\`jsx
    [FULL CODE HERE]
    \`\`\`

    ### File: src/App.css
    \`\`\`css
    [FULL CODE HERE]
    \`\`\`

    ## User's Latest Request
    [What the user is now asking for]

    REMEMBER: The next agent has ZERO context. It needs the COMPLETE current code to make changes.`),
      new HumanMessage(fullContextText)
    ]);

    conversationState.summary = summary.content;
    console.log("this is a summary::", conversationState.summary);

    // Keep only last user message + summary
    const lastUserMessage = [...allMessages].reverse().find(m => m.getType() === 'human') as HumanMessage;

    conversationState.messages = [
      new HumanMessage(lastUserMessage.content)
    ];
  }

  // Persist conversation history
  conversationState.llmCalls = result.llmCalls;

  //lets send the human msg as well to the streams
  // const humanMessages = result.messages.filter((m: BaseMessage) => m.getType() === 'human');
  // for (const human of humanMessages) {
  //   client?.send(JSON.stringify({
  //     type: 'human',
  //     content: human.content
  //   }))
  // }

  // FIXED: Get ALL AI messages with tool calls (not just first one)
  const allToolCalls = result.messages
    .filter(m => m.getType() === "ai" && m.tool_calls?.length > 0)
    .flatMap(m => m.tool_calls || []);

  console.log("Total tool calls to send:", allToolCalls.length);

  for (const tc of allToolCalls) {
    console.log("Sending tool_call:", tc.name, tc.args?.filePath);
    client?.send(JSON.stringify({
      type: "tool_call",
      name: tc.name,
      args: tc.args
    }));
  }

  // Send tool results
  const toolResults = result.messages.filter((m: BaseMessage) => m.getType() === "tool");
  for (const t of toolResults) {
    client?.send(JSON.stringify({
      type: "tool_result",
      content: t.content
    }));
  }

  // FINAL AI MESSAGE FOR WEBSOCKET
  function isNonEmptyAI(m: BaseMessage) {
    if (m.getType() !== "ai") return false;

    // Ignore tool-call AI messages
    // @ts-ignore
    if (m.tool_calls && m.tool_calls.length > 0) return false;

    const content = m.content as any;

    if (typeof content === "string") {
      return content.trim().length > 0;
    }

    if (Array.isArray(content)) {
      return content.some(c =>
        typeof c.text === "string" && c.text.trim().length > 0
      );
    }

    return false;
  }

  // Find the correct final AI message (skip empty ones)
  const finalAI = [...result.messages].reverse().find(isNonEmptyAI);

  if (finalAI) {
    client?.send(JSON.stringify({
      type: "ai",
      content: finalAI.content
    }));
  }

}


