import { Message } from '@/app/project/[id]/page'
import React from 'react'

const AiMsgBox = ({message}:{message:Message}) => {
  return (
    <div className='flex justify-start mb-4 ml-2'>
      <div className='max-w-[70%] p-4 bg-[#121212] border border-neutral-700 rounded-lg'>
        {message.content}
      </div>
    </div>
  )
}

export default AiMsgBox
