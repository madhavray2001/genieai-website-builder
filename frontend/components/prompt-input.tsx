"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupTextarea } from "@/components/ui/input-group"
import { useParams, useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { LuSquareArrowUp } from "react-icons/lu";

interface PromptInputProps {
  type: 'primary' | 'secondary'
  initialPrompt?: string
  prompt?: string
  params?: any
}

export function PromptInput({ initialPrompt, prompt, type, params }: PromptInputProps) {
  const { data: session, status } = useSession();
  const [value, setValue] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const para = useParams();
  const projectId = para?.id;

  const fileRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter();

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
      setSubmitting(true)

      try {
        const res = await fetch(`http://localhost:5000/api/project?id=${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ initialPrompt: value, userId })
        })
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
      try {
        const res = await fetch(`http://localhost:5000/conversation?id=${projectId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt: value, userId})
        })
        const data = await res.json();
        console.log("data from prompt api", data.msg)
      } catch (error) {
        console.log('Error giving prompt', error);
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full ">
      <label htmlFor="user-prompt" className="sr-only">
        Ask Genie to create...
      </label>

<InputGroup
  className="relative bg-[#121212] border border-[#292929] focus-within:border-[#484747] transition-all px-4 pt-3 pb-10 rounded-xl"
>
  <InputGroupTextarea
    id="user-prompt"
    value={value}
    onChange={(e) => setValue(e.target.value)}
    placeholder="Ask Genie to create..."
    aria-label="Prompt"
    disabled={submitting}
    rows={1}
    className="w-full font-inter resize-none bg-transparent !text-base leading-normal overflow-hidden p-0 !m-0 min-h-[50px]"
  />

  <button
    type="submit"
    disabled={!value.trim()}
    className="absolute bottom-2 right-2 cursor-pointer rounded-md bg-transparent hover:bg-[#1f1f1f] transition   disabled:cursor-not-allowed
    disabled:opacity-40
    disabled:hover:bg-transparent"
  >
    <LuSquareArrowUp
      className="size-7 text-neutral-300 hover:text-white transition"
      strokeWidth={0.8}
    />
  </button>
</InputGroup>



    <input ref={fileRef} type="file" multiple hidden aria-label="Attachments" />
    </form>
  )
}
