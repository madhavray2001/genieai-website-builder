"use client"
import { signIn, useSession } from "next-auth/react"
import React from 'react'
import Link from "next/link"
import Image from "next/image";

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b bg-background">
      {status === "unauthenticated" ? (
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          {/* <Link href="/" aria-label="web-x home" className="font-medium tracking-tight">
          web-x
        </Link> */}
          <div className='bg-black h-12 text-amber-50 font-extrabold p-2'>
            <Image
              src="/logo.svg"
              alt="Logo"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </div>
          <div aria-hidden="true" />
          <div>
            <button className="bg-yellow-300 text-black" onClick={() => (signIn())}>Sign in</button>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className='bg-black h-12 text-amber-50 font-extrabold p-2'>
            <Image
              src="/logo.svg"
              alt="Logo"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </div>
          <div aria-hidden="true" />
        </div>
      )}
    </header>
  )
}
