import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface RateLimitAlertProps{
    open:boolean,
    onOpenChange:(open:boolean)=>void

}

const ConversationLimitAlert = ({open, onOpenChange}:RateLimitAlertProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Maximum conversation limit reached</AlertDialogTitle>
          <AlertDialogDescription>
            Sorry - this is just a hobby project, and I don't have enough tokens to serve more requests. If you'd like to discuss anything related to this project, feel free to email me at poudelsamadesh@gmail.com
            or DM @SamadeshPoudel on X.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* <AlertDialogCancel>Cancel</AlertDialogCancel> */}
          <AlertDialogAction>Ok</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ConversationLimitAlert
