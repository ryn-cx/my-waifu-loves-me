import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { ApiError, ItemCreate } from "@/client"
import { ItemsService } from "@/client"
import { AddButton } from "@/components/Common/AddButton"
import { FormTextField } from "@/components/Common/FormTextField"
import type { ItemsPublicWithPending } from "@/components/Items/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form } from "@/components/ui/form"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  description: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

const AddItem = () => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      title: "",
      description: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: ItemCreate) =>
      ItemsService.createItem({ requestBody: data }),
    // When mutate is called:
    onMutate: async (newItem) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["items"] })

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData<ItemsPublicWithPending>([
        "items",
      ])

      const pendingId = crypto.randomUUID()

      // Optimistically update to the new value
      queryClient.setQueryData<ItemsPublicWithPending>(["items"], (old) =>
        old
          ? {
              ...old,
              data: [
                ...old.data,
                {
                  ...newItem,
                  id: pendingId,
                  owner_id: "",
                  pending: true,
                },
              ],
              count: old.count + 1,
            }
          : old,
      )

      // Return a result with the snapshotted value (and the tracking id)
      return { previousItems, pendingId }
    },
    onSuccess: (data, _variables, context) => {
      showSuccessToast("Item created successfully")
      queryClient.setQueryData<ItemsPublicWithPending>(["items"], (old) =>
        old
          ? {
              ...old,
              data: old.data.map((item) =>
                item.id === context.pendingId ? data : item,
              ),
            }
          : old,
      )
    },
    // If the mutation fails,
    // use the result returned from onMutate to roll back
    onError: (err, _variables, context) => {
      queryClient.setQueryData(["items"], context?.previousItems)
      handleError.call(showErrorToast, err as ApiError)
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })

  const onSubmit = (data: FormData) => {
    setIsOpen(false)
    form.reset()
    mutation.mutate(data)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <AddButton>Add Item</AddButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>
            Fill in the details to add a new item.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <FormTextField
                control={form.control}
                name="title"
                label="Title"
                placeholder="Title"
                type="text"
                required
              />

              <FormTextField
                control={form.control}
                name="description"
                label="Description"
                placeholder="Description"
                type="text"
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <LoadingButton type="submit">Save</LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AddItem
