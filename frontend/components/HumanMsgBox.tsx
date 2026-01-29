import { Message } from '@/app/project/[id]/page'
import React from 'react'

const HumanMsgBox = ({messages}:{messages:Message[]}) => {
  return (
    <div className=' m-4 ml-32 p-4 border border-white text-white'>
      {messages.map((msg, index)=>(
        <div key={index}>
          {msg.content}
        </div>
      ))}
    </div>
  )
}

export default HumanMsgBox
