import { Loader } from "lucide-react"
import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}
export {Spinner}
export function SpinnerCustom() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Subtle gradient glow */}
      <div
        className="absolute"
        style={{
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      
      {/* Spinner icon */}
      <Spinner className="size-10 text-white relative z-10" />
    </div>
  )
}