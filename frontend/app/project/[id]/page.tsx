import React from 'react'
import Image from 'next/image'

const page = () => {
  return (
    <div className='h-screen flex flex-col bg-black'>
        {/* navbar  */}
      <div className='bg-black h-12 text-amber-50 font-extrabold p-2'>
        <Image 
  src="/logo.svg" 
  alt="Logo" 
  width={120} 
  height={40} 
  className="h-10 w-auto"
/>
      </div>
        {/* chatbot and preview  */}
      <div className='flex flex-1'>
        <div className='bg-black w-1/3'>
        chatbot
      </div>
      <div className='bg-black w-2/3 border-1 rounded-lg border-gray-500 mb-1'>
      {/* preview navbar  */}
      <div className='h-10 border-b-1 border-gray-500'>
        hi
      </div>
        preview
      </div>
      </div>
      
    </div>
  )
}

export default page
