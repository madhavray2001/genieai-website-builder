import { Stream } from '@/app/project/[id]/ClientPage'
import { ShieldCheck } from 'lucide-react'

const ValidatingStream = ({stream}:{stream:Stream}) => {
  return (
   <div className="flex gap-3 items-center">
    <ShieldCheck />
      {stream.content}
    </div>
  )
}

export default ValidatingStream
