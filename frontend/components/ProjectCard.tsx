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

export function CardDemo({id, title}:{id:string, title:String}) {
  const router = useRouter();
  const {data:session} = useSession();

  const handleOpenProject = async()=>{
    try {
      const response = await fetch(`http://localhost:5000/api/project/load/${id}?userId=${session?.user.id}`);

      const data = await response.json();
      sessionStorage.setItem('loadedProject', JSON.stringify(data));
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
