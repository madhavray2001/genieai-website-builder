"use client"
import type React from "react"
import { PromptInput } from "@/components/prompt-input"
import { Navbar } from "@/components/navbar"
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import {useRouter } from "next/navigation"

export default function HomePage() {
  const {data:session, status} = useSession();
  const router = useRouter();

  useEffect(()=>{
    if(status=== 'authenticated' && session.user.id){
      const pending = sessionStorage.getItem('pendingProject')
      if(pending){
        const {projectId, initialPrompt} = JSON.parse(pending);
        console.log("this is the intial prompt", initialPrompt);
        sessionStorage.removeItem('pendingProject'); //cleaning up after extracting

        fetch(`http://localhost:5000/api/project?id=${projectId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            initialPrompt: initialPrompt,
            userId:session.user.id })
        })
        .then(res=> res.json())
        .then(()=>{
          router.push(`/project/${projectId}`)
        })
        
      }
    }
  },[status, session])

  return (
    <div
      className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-background text-foreground"
      style={
        {
          "--background": "oklch(0 0 0)",
          "--foreground": "oklch(1 0 0)",
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-[32rem] w-[32rem] -translate-y-1/3 translate-x-1/4 rounded-full opacity-25"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0) 70%)",
        }}
      />

      <main>
        <Navbar />
        <section className="grid min-h-[100svh] place-items-center px-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
            <h1 className="text-balance text-3xl font-black leading-tight tracking-tight md:text-4xl lg:text-5xl">
              Ask and it shall be given to you
            </h1>

            <p className="text-pretty text-base text-muted-foreground md:text-lg">
              A minimal, modern starting point inspired by v0 and Lovable. Plain background, clean lines, and a focus on
              your idea.
            </p>

            <div className="w-full max-w-2xl">
              <PromptInput initialPrompt={''} type={'primary'} />
            </div>

            <p className="text-sm text-muted-foreground">Start with a simple idea. We’ll take it from there.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
