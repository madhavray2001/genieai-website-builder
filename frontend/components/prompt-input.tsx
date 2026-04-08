"use client"

import * as React from "react"
import { forwardRef, useImperativeHandle, useRef } from "react"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupTextarea } from "@/components/ui/input-group"
import { useParams, useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { LuSquareArrowUp } from "react-icons/lu";
import RateLimitAlert from "./RateLimitAlert"
import ConversationLimitAlert from "./ConversationLimitAlert"

interface PromptInputProps {
  type: 'primary' | 'secondary'
  initialPrompt?: string
  prompt?: string
  params?: any
  onSubmitStart?:() => void
}

export const PromptInput = forwardRef<{ focus: () => void }, PromptInputProps>(
  (props, ref) => {
  const { type, onSubmitStart } = props
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, ()=>({
    focus:()=>{
      textareaRef.current?.focus()
    }
  }))
  
  const { data: session, status } = useSession();
  const [value, setValue] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [showRateLimit, setShowRateLimit] = React.useState(false)
  const [showConversationRateLimit, setShowConversationRateLimit] = React.useState(false)

  const para = useParams();
  const projectId = para?.id;

  const fileRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter();

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) {
        // Trigger form submission
        e.currentTarget.form?.requestSubmit()
      }
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const id = crypto.randomUUID();
    const userId = session?.user.id;

    if (type == 'primary') {
      //checking authentication first
      if (status === "unauthenticated") {
        //setting the prompt and projectId in the session storage, localStorage ma it persist forever, session storage ma tab close garesi khessiyo
        sessionStorage.setItem('pendingProject', JSON.stringify({
          projectId: id,
          initialPrompt: value
        }))
        signIn();//it automatically redirect to the same page
        return;
      }

      if (!userId) {
        console.error("No userId in the session");
        return;
      }

      console.log("reached primary page for userId", userId);
      //calling the parents callback here before fetching with be
      onSubmitStart?.();
      setSubmitting(true)

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL!}/api/project?id=${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ initialPrompt: value, userId })
        })

        if(!res.ok){
          throw Error(``);
        }

        if(res.status === 429){
         
          setShowRateLimit(true)
          return;
        }
        const data = await res.json();
        router.push(`/project/${id}`)

      } catch (error) {
        console.log('Error saving the initial req to the db', error);
      } finally {
        setSubmitting(false)
      }
    } else {
      console.log("reached the second page");
      console.log("reached to secondary phase!", projectId);

      //clearing input immediately for better ux
      const currentValue = value;
      setValue('');
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL!}/api/conversation?id=${projectId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt: currentValue, userId})
        })
        if(res.status === 429){
          setShowConversationRateLimit(true)
          return;
        }
        const data = await res.json();
        console.log("data from prompt api", data.msg)
      } catch (error) {
        console.log('Error giving prompt', error);
      }
    }
    // setValue('')
  }

  return (
    <>
    <form onSubmit={onSubmit} className="w-full">
      <label htmlFor="user-prompt" className="sr-only">
        Ask Genie to create...
      </label>

      <InputGroup
        className="relative bg-[#121212] border border-[#292929] focus-within:border-[#484747] transition-all px-4 pt-3 pb-10 rounded-xl"
      >
        <InputGroupTextarea
          ref={textareaRef}
          id="user-prompt"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={type=='primary'? "Ask Genie to create..." : "Ask a follow up..."}
          onKeyDown={handleKeyDown}
          aria-label="Prompt"
          disabled={submitting}
          rows={1}
          className="w-full font-inter resize-none bg-transparent !text-base leading-normal overflow-hidden p-0 !m-0 min-h-[50px]"
        />

        <button
          type="submit"
          disabled={!value.trim() || submitting}
          className="absolute bottom-2 right-2 cursor-pointer rounded-md bg-transparent hover:bg-[#1f1f1f] transition disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <LuSquareArrowUp
            className="size-7 text-neutral-300 hover:text-white transition"
            strokeWidth={0.8}
          />
        </button>
      </InputGroup>

      <input ref={fileRef} type="file" multiple hidden aria-label="Attachments" />
    </form>
    <RateLimitAlert open={showRateLimit} onOpenChange={setShowRateLimit} />
    <ConversationLimitAlert open={showConversationRateLimit} onOpenChange={setShowConversationRateLimit} />
    </>
  )
})

PromptInput.displayName = "PromptInput"