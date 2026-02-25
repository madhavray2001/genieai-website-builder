"use client"
import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Eye, CodeXml, ChevronLeft, ChevronRight, Monitor, SquareArrowUpRight } from 'lucide-react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { PromptInput } from '@/components/prompt-input';
import HumanMsgBox from '@/components/HumanMsgBox';
import AiMsgBox from '@/components/AiMsgBox';
import { buildFileTree, extractFilesFromMessages, FileNode } from '@/utils/extractFiles';
import { FileTree } from '@/components/FileTree';
import { CodeViewer } from '@/components/CodeViewer';
import { useSession } from 'next-auth/react';
import { Navbar } from '@/components/navbar';
import { useRouter } from 'next/navigation';
import { DotLottiePlayer } from '@dotlottie/react-player';
import ThinkingStream from '@/components/ThinkingStream';
import BuildingStream from '@/components/BuildingStream';
import ValidatingStream from '@/components/ValidatingStream';
import DeliveringStream from '@/components/DeliveringStream';


export type Message = {
    type: 'human' | 'ai' | 'tool_call' | 'tool_result';
    content: string | Record<string, any>;
    toolCall?: any;
}

export type Stream = {
    type: 'thinking' | 'building' | 'validating' | 'delivering',
    content: string;
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
    const router = useRouter();
    const [projectUrl, setprojectUrl] = useState(null);
    const { id } = React.use(params);
    const { data: session, status } = useSession();
    const userId = session?.user.id;

    const [initialPrompt, setInitialPrompt] = useState<string>('')
    const [messages, setMessages] = useState<Message[]>([])
    const hasFetched = useRef<boolean>(false);
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
    const [iframeLoading, setIframeLoading] = useState(true);
    const [streams, setStreams] = useState<Stream[]>([])
    const [isStreaming, setIsStreaming] = useState(true)

    // When messages update, rebuild file tree
    useEffect(() => {
        //only extract from messages if not already loaded files from apl
        if (messages.length > 0) {
            const files = extractFilesFromMessages(messages);
            console.log("CHECKING THE FILES IN MESSAGES", files);
            setFileTree(files);
        }
    }, [messages]);

    //saving the project state to the session storage whenever it changes
    useEffect(() => {
        if (projectUrl && messages.length > 0) {
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

                if (currentProjectState) {
                    console.log("user refreshed! loading project from session storage")
                    const state = JSON.parse(currentProjectState);

                    setprojectUrl(state.projectUrl);
                    setInitialPrompt(state.initialPrompt);
                    setMessages(state.messages || []);
                    setFileTree(state.fileTree || []);

                    return;
                }

                //checking if the project came from project list and does exists in session storage
                const loadedProject = sessionStorage.getItem('loadedProject');

                if (loadedProject) {
                    const data = JSON.parse(loadedProject);
                    console.log("loading projects from db>>session>page", data.conversation)
                    setprojectUrl(data.projectUrl);
                    setMessages(data.conversation);
                    if (data.files && data.files.length > 0) {
                        console.log("Building file tree from", data.files.length, "files");
                        const tree = buildFileTree(data.files);
                        console.log("Built tree:", tree);
                        setFileTree(tree);
                    } else {
                        console.log("No files to build tree from");
                    }
                    sessionStorage.removeItem('loadedProject');
                    return;
                }

                //hitting the backend if the project is being created for the first time
                if (!loadedProject) {
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

            console.log("Received data from ws:", data);

            switch (data.type) {
                case "human":
                    setMessages(prev => [...prev, {
                        type: 'human',
                        content: data.content
                    }]);
                    break;

                case "ai":
                    setIsStreaming(false);
                    setStreams([]);
                    setMessages(prev => [...prev, {
                        type: 'ai',
                        content: data.content
                    }]);
                    break;

                case "tool_call":
                 console.log("Received tool_call:", data);
                setMessages(prev => [...prev, {
                type: 'tool_call',
                content: `Creating file: ${data.args?.filePath}`,
                toolCall: {
                    name: data.name,
                    args: data.args
                    }
                 }]);
                    break;

                case "refresh_preview": {
                    console.log("Refreshing iframe preview...");

                    const iframe = document.querySelector("iframe");
                    if (!iframe) return;

                    const current = iframe.src;

                    if (!current.includes(":5173")) {
                        console.log("Not refreshing — iframe not ready");
                        return;
                    }

                    iframe.src = current.split("?")[0] + "?t=" + Date.now();
                    break;
                }

                case "thinking":
                    setIsStreaming(true)
                    console.log("trying to implement thinking stream...")
                    setStreams(prev => [...prev, {
                        type: 'thinking',
                        content: data.content
                    }]);
                    break;

                case "building":
                    console.log("trying to implement building stream...")
                    setStreams(prev => [...prev, {
                        type: 'building',
                        content: data.content
                    }]);
                    break;

                case "validating":
                    console.log("trying to implement validating stream...")
                    setStreams(prev => [...prev, {
                        type: 'validating',
                        content: data.content
                    }]);
                    break;

                case "delivering":
                    console.log("trying to implement delivering stream...")
                    setStreams(prev => [...prev, {
                        type: 'delivering',
                        content: data.content
                    }]);
                    break;

                default:
                    console.log("Unknown:", data);
            }

            console.log("checking why the user msg is repeated:", messages);

        };

    }, [id])

    // Handle iframe load
    const handleIframeLoad = () => {
        setIframeLoading(false);
    };

    // Reset loading state when projectUrl changes
    useEffect(() => {
        if (projectUrl) {
            setIframeLoading(true);
        }
    }, [projectUrl]);

    return (
        <div className='h-screen flex flex-col bg-black overflow-hidden'>
            {/* navbar  */}
            <div onClick={() => (
                router.push('/')
            )} className='bg-black h-12 text-amber-50 font-extrabold p-2 mx-2 cursor-pointer flex-shrink-0'>
                <Image
                    src="/logo.svg"
                    alt="Logo"
                    width={50}
                    height={30}
                />
            </div>

            {/* chatbot and preview */}
            <div className='flex flex-1 min-h-0'>
                <div className='bg-black w-1/3 flex flex-col overflow-hidden mt-4'>
                    <div className='flex h-full p-2 text-white flex-col overflow-hidden'>
                        {/* Messages container - grows to fill space, scrollable */}
                        <div className='bg-black flex-1 overflow-y-auto w-full text-neutral-100 font-inter hide-scrollbar min-h-0'>
                            {messages.map((msg, index) => {
                                if (msg.type === 'human') {
                                    return <HumanMsgBox key={index} message={msg} />
                                } else if (msg.type === 'ai') {
                                    console.log("ai msg:", msg)
                                    //sometime mf llm is sending msg as an object
                                    const safeMessage = {
                                        ...msg,
                                        content: typeof msg.content === 'string'
                                            ? msg.content
                                            : JSON.stringify(msg.content, null, 2)
                                    };

                                    return <AiMsgBox key={index} message={safeMessage} />
                                }
                                return null
                            })}

                            {isStreaming && (
                                <div className='flex flex-col gap-3 text-sm text-neutral-400 ml-2'>
                                    {streams.map((stream, index) => {
                                        if (stream.type === 'thinking') {
                                            return <ThinkingStream key={index} stream={stream} />
                                        } else if (stream.type === 'building') {
                                            return <BuildingStream key={index} stream={stream} />
                                        } else if (stream.type === 'validating') {
                                            return <ValidatingStream key={index} stream={stream} />
                                        } else if (stream.type === 'delivering') {
                                            return <DeliveringStream key={index} stream={stream} />
                                        }
                                    })}
                                </div>
                            )}
                        </div>

                        <div className='flex-shrink-0 relative z-20'>
                            <PromptInput initialPrompt={initialPrompt} prompt={prompt} type={'secondary'} params={params} />
                        </div>
                    </div>
                </div>

                {/* preview container */}
                <div className='bg-black flex-1 border-1 rounded-lg border-[#292929] mb-1 flex flex-col overflow-hidden'>
                    <Tabs defaultValue="preview" className='h-full flex flex-col'>
                        {/* Navbar section*/}
                        <div className='navbarSection h-13 border-b-1 border-[#292929] p-5 flex items-center gap-60 flex-shrink-0'>
                            <TabsList className='bg-[#252424] h-8 p-0 w-18 border border-[#292929]'>
                                <TabsTrigger value="preview" className='cursor-pointer'>
                                    <Eye className='text-gray-300 ' />
                                </TabsTrigger>
                                <TabsTrigger value="code" className='cursor-pointer'>
                                    <CodeXml className='text-gray-300' />
                                </TabsTrigger>
                            </TabsList>

                            <div className="navURLbar border-1 border-[#292929] rounded-sm bg-[#252424] flex h-6 w-full items-center gap-3">
                                <div className=' w-full h-full flex items-center gap-3'>
                                    <ChevronLeft className='text-neutral-400 w-4 h-4 ml-2' />
                                    <ChevronRight className='text-neutral-400 w-4 h-4' />
                                    <Monitor className='text-neutral-300 w-4 h-4' />
                                    <p className='text-neutral-300 text-sm cursor-default font-inter'>localhost:3000/</p>
                                </div>
                            </div>

                            <div onClick={() => (
                                window.open(`${projectUrl}`)
                            )}>
                                <SquareArrowUpRight className='text-neutral-300 size-5 cursor-pointer' />
                            </div>
                        </div>

                        {/* Preview section*/}
                        <div className="previewSection flex-1 min-h-0">
                            <TabsContent value="code" className='h-full'>
                                <div className="flex h-full">
                                    {/* Left: File Tree */}
                                    <div className="w-48 bg-[#252424] text-white overflow-y-auto">
                                        <div className="p-4 border-b border-[#292929]">
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
                            <TabsContent value="preview" className='h-full bg-[#111111]'>
                                <div className='text-white h-full flex justify-center items-center relative bg-[#111111]'>
                                    {/* Lottie Loader - shows when iframe is loading */}
                                    {iframeLoading && (
                                        <div className='absolute inset-0 bg-[#111111] flex justify-center items-center z-10'>
                                            <DotLottiePlayer
                                                src="/loader.lottie"
                                                loop
                                                autoplay
                                                style={{ width: '300px', height: '300px' }}
                                            />
                                        </div>
                                    )}

                                    {/* Iframe */}
                                    <iframe
                                        src={projectUrl}
                                        title='iframe example'
                                        className='w-full h-full'
                                        onLoad={handleIframeLoad}
                                    ></iframe>
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