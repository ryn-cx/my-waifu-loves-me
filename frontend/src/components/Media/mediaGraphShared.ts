import type { MediaListCollection, MediaListStatus } from "@/client"

/** Node colors for each AniList list status, shared by the graphs and filters. */
export const STATUS_COLORS: Record<MediaListStatus, string> = {
  COMPLETED: "#48bb78",
  CURRENT: "#4299e1",
  DROPPED: "#f56565",
  PAUSED: "#ed8936",
  PLANNING: "#9f7aea",
  REPEATING: "#38b2ac",
}

export const CHOSEN_NODE_COLOR_LIGHT = "#000000"
export const CHOSEN_NODE_COLOR_DARK = "#ffffff"
export const NEW_NODE_COLOR_LIGHT = "#aaaaaa"
export const NEW_NODE_COLOR_DARK = "#6b7280"

/** Convert a `#rrggbb` color to an `rgba(...)` string with the given alpha. */
export function withAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16) || 0
  const g = parseInt(hex.slice(3, 5), 16) || 0
  const b = parseInt(hex.slice(5, 7), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Map every media id on the user's lists to its list status. */
export function getMediaStatusMap(userList: MediaListCollection | null) {
  const mediaStatusMap = new Map<number, MediaListStatus>()
  if (userList?.lists) {
    for (const listGroup of userList.lists) {
      if (!listGroup?.entries || !listGroup.status) continue
      for (const entry of listGroup.entries) {
        if (!entry?.mediaId) continue
        mediaStatusMap.set(entry.mediaId, listGroup.status)
      }
    }
  }
  return mediaStatusMap
}
