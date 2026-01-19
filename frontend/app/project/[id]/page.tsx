import React from 'react'
import Image from 'next/image'
import { Eye, CodeXml, ChevronLeft, ChevronRight, Monitor, Slash, RotateCw } from 'lucide-react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { PromptInput } from '@/components/prompt-input';


const page = () => {
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
                <div className='bg-black flex items-end h-full p-2'>
                    <PromptInput />
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
                                    View the preview here
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
