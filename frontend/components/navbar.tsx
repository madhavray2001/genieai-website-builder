import Link from "next/link"

export function Navbar() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" aria-label="web-x home" className="font-medium tracking-tight">
          web-x
        </Link>
        <div aria-hidden="true" />
      </div>
    </header>
  )
}
