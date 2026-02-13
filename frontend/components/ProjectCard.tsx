import { Message } from "@/app/project/[id]/page"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

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

export function CardDemo({id, title}:{id:string, title:String}) {
  const router = useRouter();
  const {data:session} = useSession();

  const handleOpenProject = async()=>{
    try {
      const response = await fetch(`http://localhost:5000/api/project/load/${id}?userId=${session?.user.id}`);

      const data = await response.json();
      //lets transform the db format of msg to the frontend format
      const transformedMessages: Message[] = data.conversation.map((dbMsg: DBMessage) => {
        // Map USER/ASSISTANT to human/ai
        if (dbMsg.type === 'TEXT_MESSAGE') {
          return {
            type: dbMsg.from === 'USER' ? 'human' : 'ai',
            content: dbMsg.contents
          };
        }
        
        // Handle TOOL_CALL type
        if (dbMsg.type === 'TOOL_CALL') {
          return {
            type: 'tool_call',
            content: `Tool-call: ${dbMsg.toolCall}`,
            toolCall: dbMsg.toolCall ? {
              name: dbMsg.toolCall,
              // You might need to parse more details if stored
            } : undefined
          };
        }

        // Fallback
        return {
          type: 'ai',
          content: dbMsg.contents
        };
      });

      console.log("Transformed messages", transformedMessages)

      sessionStorage.setItem('loadedProject', JSON.stringify({
        projectUrl:data.projectUrl,
        conversation:transformedMessages
      }));
      
      router.push(`project/${id}`)

    } catch (error) {
      console.error('Error loading project', error);
    }
  }

  return (
    <Card onClick={handleOpenProject} className="w-full max-w-sm">
      <CardHeader>
       <b>{title}</b>
      </CardHeader>
    </Card>
  )
}
