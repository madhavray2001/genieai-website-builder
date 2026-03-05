"use client"

import { createContext } from "react"

export interface Project {
  id: string;
  title: string;
  initialPrompt: string;
  createdAt: string;
}

export const PromptFocusContext = createContext<(() => void) | null>(null)