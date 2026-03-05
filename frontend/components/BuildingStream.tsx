import { Stream } from '@/app/project/[id]/ClientPage'
import { Activity } from 'lucide-react'

const BuildingStream = ({stream}:{stream:Stream}) => {
  return (
    <div className="flex gap-3 items-center">
        <Activity />
      {stream.content}
    </div>
  )
}

export default BuildingStream
