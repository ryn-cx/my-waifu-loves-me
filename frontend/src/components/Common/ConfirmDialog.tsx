import {
  cloneElement,
  type ReactElement,
  type ReactNode,
  useState,
} from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoadingButton } from "@/components/ui/loading-button"

interface ConfirmDialogProps {
  trigger: ReactElement<{ onClick?: () => void }>
  title: string
  description: ReactNode
  confirmText?: string
  onConfirm: () => void
  isLoading?: boolean
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmText = "Delete",
  onConfirm,
  isLoading,
}: ConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleConfirm = () => {
    setIsOpen(false)
    onConfirm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {cloneElement(trigger, { onClick: () => setIsOpen(true) })}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <LoadingButton
            variant="destructive"
            onClick={handleConfirm}
            loading={isLoading}
          >
            {confirmText}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
