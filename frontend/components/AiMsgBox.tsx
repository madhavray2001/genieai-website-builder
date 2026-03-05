import { Message } from '@/app/project/[id]/ClientPage'
import React from 'react'

const AiMsgBox = ({message}:{message:Message}) => {
  //safely handling content that might be an object
    const displayContent = typeof message.content === 'string'
        ? message.content
        : JSON.stringify(message.content, null, 2);

  return (
    <div className='flex justify-start mb-4 ml-2'>
      <div className='max-w-[70%] p-4 bg-[#121212] border border-neutral-700 rounded-lg break-words text-neutral-100'>
        {displayContent}
      </div>
    </div>
  )
}

export default AiMsgBox
