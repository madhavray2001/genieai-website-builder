import { Message } from '@/app/project/[id]/ClientPage'
import React from 'react'
import ReactMarkdown from 'react-markdown'

const AiMsgBox = ({message}:{message:Message}) => {
  const displayContent = typeof message.content === 'string'
    ? message.content
    : JSON.stringify(message.content, null, 2);

  return (
    <div className='flex justify-start mb-4 ml-2'>
      <div className='max-w-[90%] p-4 break-words text-neutral-100'>
        <ReactMarkdown
          components={{
            h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-3 text-white" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-2 mt-4 text-white" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-2 mt-3 text-neutral-200" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
            li: ({node, ...props}) => <li className="text-neutral-300 ml-2" {...props} />,
            p: ({node, ...props}) => <p className="mb-3 text-neutral-300 leading-relaxed" {...props} />,
            strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
            code: ({node, inline, ...props}: any) => 
              inline 
                ? <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-sm text-pink-400" {...props} />
                : <code className="block bg-neutral-900 p-3 rounded-md text-sm overflow-x-auto" {...props} />,
            a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-neutral-600 pl-4 italic text-neutral-400" {...props} />,
          }}
        >
          {displayContent}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export default AiMsgBox