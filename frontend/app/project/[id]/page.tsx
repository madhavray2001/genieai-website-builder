"use client"
import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Eye, CodeXml, ChevronLeft, ChevronRight, Monitor, RotateCw } from 'lucide-react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { PromptInput } from '@/components/prompt-input';
import HumanMsgBox from '@/components/HumanMsgBox';
import AiMsgBox from '@/components/AiMsgBox';
import { extractFilesFromMessages, FileNode } from '@/utils/extractFiles';
import { FileTree } from '@/components/FileTree';
import { CodeViewer } from '@/components/CodeViewer';
import { useSession } from 'next-auth/react';


export type Message = {
    type: 'human' | 'ai' | 'tool_call' | 'tool_result';
    content: string;
    toolCall?: any;
}

interface PageProps {
    params: Promise<{ id: string }>;
    prompt?: string;
}
 
interface ProjectResponse {
    data: {
        id: string,
        initialPrompt: string,
        userId: string
    }
}

interface PromptResponse {
    projectUrl: string,
    msg: string
}

const page = ({ params, prompt }: PageProps) => {
    const [projectUrl, setprojectUrl] = useState(null);
    const { id } = React.use(params);
    const {data:session, status} = useSession();
    const userId = session?.user.id;

    const [initialPrompt, setInitialPrompt] = useState<string>('')
    const [messages, setMessages] = useState<Message[]>([])
    const hasFetched = useRef<boolean>(false);
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

    // When messages update, rebuild file tree
    useEffect(() => {
        const files = extractFilesFromMessages(messages);
        setFileTree(files);
    }, [messages]);

    //saving the project state to the session storage whenever it changes
    useEffect(() => {
      if(projectUrl && messages.length >0){
        const projectState = {
            projectUrl,
            initialPrompt,
            messages,
            fileTree,
            timeStamp: Date.now()
        };
        sessionStorage.setItem(`project_${id}`, JSON.stringify(projectState));
      }
    }, [projectUrl, initialPrompt, messages, fileTree])
    

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        
        const ws = new WebSocket(`ws://localhost:5000/?userId=${userId}`)

        ws.onopen = (e: Event) => {
            console.log("websocket connection established")
        }

        console.log("project id in the project page", id)

        async function initializeProject() {

            try {
                //checking session storage if the project exists there
                const currentProjectState = sessionStorage.getItem(`project_${id}`);

                if(currentProjectState){
                    console.log("user refreshed! loading project from session storage")
                    const state = JSON.parse(currentProjectState);

                    setprojectUrl(state.projectUrl);
                    setInitialPrompt(state.initialPrompt);
                    setMessages(state.messages || []);
                    setFileTree(state.fileTree || []);

                    return;
                }

                //checking if the project came from project card and does exists in session storage
                const loadedProject = sessionStorage.getItem('loadedProject');

                if(loadedProject){
                    const data = JSON.parse(loadedProject);
                    setprojectUrl(data.projectUrl);
                    setMessages(data.conversation); 
                    sessionStorage.removeItem('loadedProject');
                }

                //hitting the backend if the project is being created for the first time
                if(!loadedProject){
                    const res = await fetch(`http://localhost:5000/api/project/${id}`)
                    const data: ProjectResponse = await res.json();
        
                    const initialPromptFromDB = data.data.initialPrompt;
                    setInitialPrompt(initialPromptFromDB);
        
                    const message = await fetch(`http://localhost:5000/prompt?projectId=${id}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ prompt: initialPromptFromDB, userId })
                    })
                    const data2: PromptResponse = await message.json();
                    setprojectUrl(data2.projectUrl)
                    console.log("data2 by hitting /prompt api:", data2)
                }
            } catch (error) {
                console.log("Internal server error", error)
            }

        }

        initializeProject();

        ws.onmessage = (e: MessageEvent) => {
            const data = JSON.parse(e.data);

            console.log("Received:", data);

            //   type: 'tool_call',           // ← From data.type
            //   content: 'Tool-call: create_file',
            //   toolCall: {                  // ← YOU ADD THIS (the whole data object)
            //     type: "tool_call",
            //     name: "create_file",
            //     args: {
            //       filePath: "/home/user/src/App.jsx",
            //       content: "import React..."
            //     }
            //   }
            // }

            switch (data.type) {
                case "human":
                    setMessages(prev => [...prev, {
                        type: 'human',
                        content: data.content
                    }]);
                    break;

                case "ai":
                    setMessages(prev => [...prev, {
                        type: 'ai',
                        content: data.content
                    }]);
                    break;

                case "tool_call":
                    console.log("Tool call args:", data.args);
                    setMessages(prev => [...prev, {
                        type: 'tool_call',
                        content: `Tool-call: ${data.name}`,
                        toolCall: data
                    }]);
                    break;

                case "tool_result":
                    setMessages(prev => [...prev, {
                        type: 'tool_result',
                        content: data.content
                    }]);
                    break;
                
                case "refresh_preview": {
                    console.log("Refreshing iframe preview...");

                    const iframe = document.querySelector("iframe");
                    if (!iframe) return;

                    // Only refresh if it is already pointing to the vite URL
                    const current = iframe.src;

                    if (!current.includes(":5173")) {
                    console.log("Not refreshing — iframe not ready");
                    return;
                    }

                    iframe.src = current.split("?")[0] + "?t=" + Date.now();
                    break;
                }



                default:
                    console.log("Unknown:", data);
            }
        };

    }, [id])

    const humanMsg = messages.filter(m => m.type === 'human');
    const aiMsg = messages.filter(m => m.type === 'ai');
    // const toolCall = messages.filter(m=>m.type==='tool_call')

    return (
        <div className='h-screen flex flex-col bg-black'>
            {/* navbar  */}
            <div className='bg-black h-12 text-amber-50 font-extrabold p-2'>
                <Image
                    src="/logo.svg"
                    alt="Logo"
                    width={120}
                    height={40}
                    className="h-10 w-auto"
                />
            </div>
            {/* chatbot and preview  */}

            <div className='flex flex-1'>
                {/* chatbot  */}
                <div className='bg-black w-1/3'>
                    {/* <div className='bg-red-400'>streaming here</div> */}
                    <div className='bg-black flex items-end h-full p-2 text-white flex-col'>
                        {/* <div className='bg-black flex-1 overflow-y-auto w-full text-white'>{messages}</div> */}
                        <div className='bg-black flex-1 overflow-y-auto w-full text-white'>
                            <HumanMsgBox messages={humanMsg} />
                            <AiMsgBox messages={aiMsg} />

                        </div>

                        <PromptInput initialPrompt={initialPrompt} prompt={prompt} type={'secondary'} params={params} />
                    </div>
                </div>

                {/* preview container  */}
                <div className='bg-black w-2/3 border-1 rounded-lg border-[#292929] mb-1'>

                    <Tabs defaultValue="preview" className='h-full'>
                        <div className='navbarSection h-13 border-b-1 border-[#292929]  p-5 flex items-center gap-60'>
                            <TabsList className='bg-[#252424] h-8 p-0 w-18 border border-[#292929]'>
                                <TabsTrigger value="preview" className=''>
                                    <Eye className='text-gray-300' />
                                </TabsTrigger>
                                <TabsTrigger value="code">
                                    <CodeXml className='text-gray-300 ' />
                                </TabsTrigger>

                            </TabsList>

                            <div className="navURLbar border-1 border-[#292929] rounded-sm bg-[#252424] flex h-6 w-full items-center gap-3">
                                <div className=' w-full h-full flex items-center gap-3'>
                                    <ChevronLeft className='text-gray-400 w-4 h-4 ml-2' />
                                    <ChevronRight className='text-gray-400 w-4 h-4' />
                                    <Monitor className='text-gray-400 w-4 h-4' />
                                    <p className='text-white'>localhost:3000/</p>
                                </div>

                            </div>

                            <div className='text-white'>
                                <RotateCw className='text-white w-4 h-4' />
                            </div>

                        </div>
                        <div className="previewSection h-full">
                            <TabsContent value="code" className='h-full'>
                                {/* <div className='text-white h-full flex justify-center items-center'>
                                    Code files here
                                </div> */}
                                <div className="flex h-screen">
                                    {/* Left: File Tree */}
                                    <div className="w-64 bg-gray-900 text-white overflow-y-auto">
                                        <div className="p-4 border-b border-gray-700">
                                            <h2 className="font-bold">Files</h2>
                                        </div>
                                        <FileTree
                                            nodes={fileTree}
                                            onFileClick={(file) => setSelectedFile(file)}
                                        />
                                    </div>

                                    {/* Right: Monaco Editor */}
                                    <div className="flex-1">
                                        <CodeViewer file={selectedFile} />
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="preview" className='h-full'>
                                <div className='text-white h-full flex justify-center items-center'>
                                    <iframe src={projectUrl} title='iframe example' className='w-full h-full'></iframe>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>

        </div>
    )
}

export default page
