import type React from "react"
import { PromptInput } from "@/components/prompt-input"

export default function HomePage() {
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
              <PromptInput />
            </div>

            <p className="text-sm text-muted-foreground">Start with a simple idea. We’ll take it from there.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
