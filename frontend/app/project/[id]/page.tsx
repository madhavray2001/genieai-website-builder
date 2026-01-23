"use client"
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Eye, CodeXml, ChevronLeft, ChevronRight, Monitor, RotateCw } from 'lucide-react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { PromptInput } from '@/components/prompt-input';


const page =  ({params}) => {
        const [projectUrl, setprojectUrl] = useState('');
        const {id} = React.use(params) 

    const [initialPrompt, setInitialPrompt] = useState('')
    
    useEffect(() => {
        const ws = new WebSocket(`ws://localhost:5000/?userId=d79d608e-0c3a-42f1-8bdd-b69fb1334d15`)

        ws.onopen =(e)=>{
            console.log("websocket connection established")
        }

        console.log("project id in the project page", id)

        async function fetch2() {
        const res = await fetch (`http://localhost:5000/api/project/${id}`)
        const data = await res.json();
            
        console.log("data", data.data.initialPrompt)
        const initialPromptFromDB = data.data.initialPrompt;
        setInitialPrompt(initialPromptFromDB);

         const message = await fetch(`http://localhost:5000/prompt`,{
            method:'POST',
            headers:{
                'Content-Type':'application/json'
            },
            body:JSON.stringify({prompt:initialPromptFromDB})
         })
         const data2 = await message.json();
         setprojectUrl(data2.projectUrl)
         console.log("data2 by hitting /prompt api:", data2)
        }
        fetch2();
    }, [id])



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
                <div className='bg-black flex items-end h-full p-2 text-white'>
                    <PromptInput initialPrompt={initialPrompt} type={'secondary'} />
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
                                <div className='text-white h-full flex justify-center items-center'>
                                    Code files here
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
