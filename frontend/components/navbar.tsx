"use client";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "./ui/button";

export function Navbar() {
  const { status } = useSession();

  return (
    <header className="border-b border-[#292929]">
      <div className="flex items-center justify-between px-4 py-4">
        
        <Image
          src="/logo.svg"
          alt="Logo"
          width={60}
          height={40}
          className="cursor-pointer"
        />

        
        {status === "unauthenticated" && (
          <Button
            className="bg-yellow-300 text-black hover:bg-white cursor-pointer transition-all transition-300"
            onClick={() => signIn()}
          >
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
