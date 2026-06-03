import type { ItemPublic } from "@/client"
import DeleteItem from "../Items/DeleteItem"
import EditItem from "../Items/EditItem"

interface ItemActionsMenuProps {
  item: ItemPublic
}

export const ItemActionsMenu = ({ item }: ItemActionsMenuProps) => {
  return (
    <div className="flex items-center justify-end gap-1">
      <EditItem item={item} />
      <DeleteItem id={item.id} />
    </div>
  )
}
