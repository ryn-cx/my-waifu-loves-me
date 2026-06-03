import { useMutation, useQueryClient } from "@tanstack/react-query"

import { UsersService } from "@/client"
import { ConfirmDialog } from "@/components/Common/ConfirmDialog"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const DeleteConfirmation = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { logout } = useAuth()

  const mutation = useMutation({
    mutationFn: () => UsersService.deleteUserMe(),
    onSuccess: () => {
      showSuccessToast("Your account has been successfully deleted")
      logout()
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
  })

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" className="mt-3">
          Delete Account
        </Button>
      }
      title="Confirmation Required"
      description={
        <>
          All your account data will be <strong>permanently deleted.</strong> If
          you are sure, please click <strong>"Confirm"</strong> to proceed. This
          action cannot be undone.
        </>
      }
      onConfirm={() => mutation.mutate()}
      isLoading={mutation.isPending}
    />
  )
}

export default DeleteConfirmation
