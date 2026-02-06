"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { useParams, useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"

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
  const [visibility, setVisibility] = React.useState<"public" | "private">("public")

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
    <form onSubmit={onSubmit} className="w-full">
      <label htmlFor="user-prompt" className="sr-only">
        Describe what you want to build
      </label>

      <InputGroup className="h-20">
        <InputGroupAddon align="inline-start">
          <InputGroupButton
            aria-label="Add attachments"
            onClick={(e) => {
              e.preventDefault()
              fileRef.current?.click()
            }}
            title="Attachments"
          >
            {/* simple paperclip icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4">
              <path
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.44 11.05 12.5 20a5.5 5.5 0 0 1-7.78-7.78l9-9a3.5 3.5 0 0 1 4.95 4.95l-9 9a1.5 1.5 0 0 1-2.12-2.12l8.3-8.3"
              />
            </svg>
            <span className="sr-only">Attachments</span>
          </InputGroupButton>

          <InputGroupButton
            aria-label="Add more context"
            title="Add more"
            onClick={(e) => {
              e.preventDefault()
              // placeholder for additional fields/modules
              console.log("[v0] plus action clicked")
            }}
          >
            <span className="text-base leading-none">+</span>
          </InputGroupButton>
        </InputGroupAddon>

        <InputGroupInput
          id="user-prompt"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe what you want to build"
          aria-label="Prompt"
          disabled={submitting}
          className="h-20 text-base md:text-lg"
        />

        <InputGroupAddon align="inline-end" className="gap-2">
          <div
            role="group"
            aria-label="Visibility"
            className="inline-flex items-center gap-0 rounded-full border border-border p-0.5"
          >
            <Button
              type="button"
              variant={visibility === "public" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-full"
              aria-pressed={visibility === "public"}
              aria-label="Public"
              onClick={() => setVisibility("public")}
              title="Public"
            >
              {/* globe icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-3.5">
                <path d="M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18Z" strokeWidth="1.75" />
                <path d="M3 12h18" strokeWidth="1.75" />
                <path d="M12 3c3 3.5 3 14.5 0 18C9 17.5 9 6.5 12 3Z" strokeWidth="1.75" />
              </svg>
            </Button>
            <Button
              type="button"
              variant={visibility === "private" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-full"
              aria-pressed={visibility === "private"}
              aria-label="Private"
              onClick={() => setVisibility("private")}
              title="Private"
            >
              {/* lock icon */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-3.5">
                <rect x="4.75" y="10" width="14.5" height="9.5" rx="2" strokeWidth="1.75" />
                <path d="M8 10V7.5a4 4 0 1 1 8 0V10" strokeWidth="1.75" />
              </svg>
            </Button>
          </div>

          <InputGroupButton type="submit" variant="default" size="sm" disabled={submitting} className="px-3">
            {submitting ? "Thinking…" : "Generate"}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      <input ref={fileRef} type="file" multiple hidden aria-label="Attachments" />
    </form>
  )
}
