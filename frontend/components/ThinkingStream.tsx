import { Stream } from "@/app/project/[id]/ClientPage"
import { Brain } from "lucide-react"

const ThinkingStream = ({stream}:{stream:Stream}) => {
  return (
    <div className="flex gap-3 items-center">
        <Brain />
      {stream.content}
    </div>
  )
}

export default ThinkingStream
