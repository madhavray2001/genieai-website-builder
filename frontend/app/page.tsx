"use client"
import type React from "react"
import { PromptInput } from "@/components/prompt-input"
import { Navbar } from "@/components/navbar"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/ui/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Spinner, SpinnerCustom } from "@/components/ui/spinner"

export interface Project {
  id: string;
  title: string;
  initialPrompt: string;
  createdAt: string;
}

export const PromptFocusContext = createContext<(()=>void) | null>(null)

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([])
  const promptInputRef = useRef<{focus:()=>void}>(null)
  const [loading, setLoading] = useState(false);

  
  const focusPromptInput=()=>{
    promptInputRef.current?.focus()
  }
  
  useEffect(() => {
    const handlePendingProject = async () => {
      if (status === 'authenticated' && session?.user?.id) {
        const pending = sessionStorage.getItem('pendingProject')
        if (pending) {
          setLoading(true);
          // await new Promise(resolve => setTimeout(resolve, 100000));
          const { projectId, initialPrompt } = JSON.parse(pending);
          console.log("this is the intial prompt", initialPrompt);
          sessionStorage.removeItem('pendingProject');
          try {
            await fetch(`http://localhost:5000/api/project?id=${projectId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                initialPrompt: initialPrompt,
                userId: session.user.id
              })
            })
            router.push(`/project/${projectId}`)
          } catch (error) {
            console.error("Error creating project:", error)
          }
        }
      }
    }
    
    const fetchProjects = async () => {
      if (status === 'authenticated' && session?.user?.id) {
        try {
          const res = await fetch(`http://localhost:5000/api/projects/${session.user.id}`)
          const data = await res.json();
          setProjects(data.projects || [])
          console.log("fetching projects:", data.projects);
        } catch (error) {
          console.error("Error fetching projects", error)
        }
      }
    }
    
    handlePendingProject();
    fetchProjects();
  }, [status, session, router])
  
  if(loading){
    return(
      <SpinnerCustom />
    )
  }
  return (
    <PromptFocusContext.Provider value={focusPromptInput}>
    <div className="h-screen overflow-hidden">
      <div
        className="relative overflow-x-hidden bg-black text-foreground h-full"
        style={
          {
            "--background": "oklch(0 0 0)",
            "--foreground": "oklch(1 0 0)",
          } as React.CSSProperties
        }
      >
        
        {status === 'authenticated' ? (
          <SidebarProvider>
            <div className="flex h-screen w-full relative z-10">
              <AppSidebar projects={projects} />
              
              <main className="flex-1 grid grid-rows-[auto_auto_1fr] overflow-hidden">
                <Navbar />
                
                <div className="px-6 pt-3">
                  <SidebarTrigger className="bg-neutral-800 hover:bg-white p-2 rounded-md cursor-pointer transition-colors" />
                </div>
                
                <section className="flex items-center justify-center px-6 overflow-auto">
                  <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center py-8">
                    <h1 className="font-inter text-balance text-xl font-black tracking-[-0.03em] md:text-4xl lg:text-5xl lg:font-semibold text-white">
                      Ask and it shall be given to you
                    </h1>

                    <p className="text-pretty text-base text-neutral-400 md:text-lg font-inter leading-tight tracking-[-0.03em]">
                      Describe your vision. Watch Genie shape it into something real — beautifully, effortlessly.
                    </p>

                    <div className="w-full max-w-2xl">
                      <PromptInput initialPrompt={''} type={'primary'} ref={promptInputRef}/>
                    </div>

                    <p className="text-sm text-neutral-500 font-inter">Start with a simple idea. We'll take it from there.</p>
                  </div>
                </section>
              </main>
            </div>
          </SidebarProvider>
        ) : (
          <main className="grid grid-rows-[auto_1fr] h-screen relative z-10">
            <Navbar />
            <section className="flex items-center justify-center px-6">
              <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
                <h1 className="font-inter text-balance text-xl font-black tracking-[-0.03em] md:text-4xl lg:text-5xl lg:font-semibold text-white">
                  Ask and it shall be given to you
                </h1>

                <p className="text-pretty text-base text-neutral-400 md:text-lg font-inter leading-tight tracking-[-0.03em]">
                  Describe your vision. Watch Genie shape it into something real — beautifully, effortlessly.
                </p>

                <div className="w-full max-w-2xl">
                  <PromptInput initialPrompt={''} type={'primary'} />
                </div>

                <p className="text-sm text-neutral-500 font-inter">Start with a simple idea. We'll take it from there.</p>
              </div>
            </section>
          </main>
        )}
      </div>
    </div>
    </PromptFocusContext.Provider>
  )
}
