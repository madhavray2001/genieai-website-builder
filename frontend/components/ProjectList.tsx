import { Message } from '@/app/project/[id]/page';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'
import { Spinner } from "@/components/ui/spinner"
import { SpinnerButton } from './ui/spinnerButton';

// Add type for database message
type DBMessage = {
    id: string;
    projectId: string;
    type: 'TEXT_MESSAGE' | 'TOOL_CALL';
    from: 'USER' | 'ASSISTANT';
    contents: string;
    hidden: boolean;
    toolCall: string | null;
    createdAt: string;
}

const ProjectList = ({id, title}:{id:string, title:string}) => {
    const router = useRouter()
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false)

    if(loading){
        return(
            <SpinnerButton />
        )
    }

    const openProject = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:5000/api/project/load/${id}?userId=${session?.user.id}`);
            const data = await response.json();
            console.log("Checking data fetched by loaded project api", data)
            //transforming the db format of msg to the fe format
            const transformedMessages: Message[] = data.conversation.map((dbMsg: DBMessage) => {
                //mapping USER/ASSISTANT to human/ai
                if (dbMsg.type === "TEXT_MESSAGE") {
                    return {
                        type: dbMsg.from === 'USER' ? 'human' : 'ai',
                        content: dbMsg.contents
                    }
                }

                //handling tool call type
                if (dbMsg.type === "TOOL_CALL") {
                    return {
                        type: 'tool_call',
                        content: `Tool-call: ${dbMsg.toolCall}`,
                        toolCall: dbMsg.toolCall ? {
                            name: dbMsg.toolCall,
                            // will parse more details if needed
                        } : undefined
                    }
                }

                //fallback
                return{
                    type:'ai',
                    content:dbMsg.contents
                }
            });
            console.log("transformed messages", transformedMessages)

            sessionStorage.setItem(`loadedProject`, JSON.stringify({
                projectUrl:data.projectUrl,
                conversation:transformedMessages
            }));

            router.push(`project/${id}`)
        } catch (error) {
            console.log("Error loading project", error);
        }
        // finally{
        //     setLoading(false);
        // }
    }
    return (
        <div onClick={openProject} className='hover:bg-neutral-800 transition-colors p-2 rounded cursor-pointer'>
            <span>{title}</span>
        </div>
    )
}

export default ProjectList
