import type { ItemPublic } from "@/client"

export type ItemPublicWithPending = ItemPublic & { pending?: boolean }
export type ItemsPublicWithPending = {
  data: ItemPublicWithPending[]
  count: number
}
