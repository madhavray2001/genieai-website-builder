import { Stream } from "@/app/project/[id]/page"
import { Package } from "lucide-react"

const DeliveringStream = ({stream}:{stream:Stream}) => {
  return (
    <div className="flex gap-3 items-center">
    <Package />
      {stream.content}
    </div>
  )
}

export default DeliveringStream
