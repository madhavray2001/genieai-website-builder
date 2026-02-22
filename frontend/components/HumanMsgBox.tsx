import { Message } from '@/app/project/[id]/page'
import React from 'react'

const HumanMsgBox = ({message}:{message:Message}) => {
  return (
    <div className='flex justify-end mb-4 mr-3'>
      <div className='max-w-[70%] p-4 bg-[#121212] border border-neutral-800 rounded-lg break-words text-neutral-100'>
        {message.content}
      </div>
    </div>
  )
}

export default HumanMsgBox
