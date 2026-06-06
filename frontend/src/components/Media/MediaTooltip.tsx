import type { app__media__graphql_media_schema__Media } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface MediaTooltipProps {
  media: app__media__graphql_media_schema__Media
  position: { x: number; y: number }
  /** Pinned tooltips are interactive (links, add/remove, close); hover ones aren't. */
  isPinned: boolean
  loadedIds: Set<number>
  onAddMedia?: (mediaId: number) => void
  onRemoveMedia?: (mediaId: number) => void
  /** Dismiss a pinned tooltip (also called after add/remove). */
  onClose?: () => void
}

const TOOLTIP_WIDTH = 350
const TOOLTIP_HEIGHT = 400
const OFFSET = 20

/** Flip/clamp the tooltip so it stays within the viewport near the cursor. */
function clampToViewport(position: { x: number; y: number }) {
  let left = position.x + OFFSET
  let top = position.y + OFFSET

  if (left + TOOLTIP_WIDTH > window.innerWidth) {
    left = position.x - TOOLTIP_WIDTH - OFFSET
  }
  if (top + TOOLTIP_HEIGHT > window.innerHeight) {
    top = position.y - TOOLTIP_HEIGHT - OFFSET
  }
  if (left < 0) left = OFFSET
  if (top < 0) top = OFFSET

  return { left, top }
}

/** Hover/pinned info card for a media node, shared by the graph components. */
export function MediaTooltip({
  media,
  position,
  isPinned,
  loadedIds,
  onAddMedia,
  onRemoveMedia,
  onClose,
}: MediaTooltipProps) {
  const { left, top } = clampToViewport(position)

  return (
    <div
      className={`fixed z-[9999] max-w-[350px] rounded-md border bg-background p-3 shadow-lg ${
        isPinned
          ? "border-blue-400 pointer-events-auto"
          : "border-border pointer-events-none"
      }`}
      style={{ left: `${left}px`, top: `${top}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-2">
        {isPinned && (
          <div className="flex justify-end">
            <span
              className="cursor-pointer text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onClose?.()}
            >
              Close
            </span>
          </div>
        )}
        <div className="flex gap-3">
          {media.coverImage?.medium && (
            <img
              src={media.coverImage.medium}
              alt={media.title?.romaji || "Cover"}
              className="h-[120px] w-[80px] rounded-md object-cover"
            />
          )}
          <div className="flex flex-1 flex-col gap-1">
            <p className="line-clamp-2 text-sm font-bold">
              {media.title?.romaji || media.title?.english}
            </p>
            {media.averageScore && (
              <p className="text-sm font-bold text-blue-600">
                {media.averageScore}%
              </p>
            )}
            {media.format && (
              <p className="text-xs text-muted-foreground">{media.format}</p>
            )}
            {media.episodes && (
              <p className="text-xs text-muted-foreground">
                {media.episodes} episodes
              </p>
            )}
          </div>
        </div>

        {media.genres && media.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {media.genres.slice(0, 4).map(
              (genre, idx) =>
                genre && (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {genre}
                  </Badge>
                ),
            )}
          </div>
        )}

        {media.description && (
          <p className="line-clamp-[10] text-xs text-muted-foreground">
            {media.description.replace(/<[^>]*>/g, "")}
          </p>
        )}

        {isPinned && (
          <>
            <div className="flex gap-2 border-t pt-1">
              {media.siteUrl && (
                <a
                  href={media.siteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  AniList
                </a>
              )}
              {media.idMal && (
                <a
                  href={`https://myanimelist.net/anime/${media.idMal}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  MAL
                </a>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              {loadedIds.has(media.id) ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    onRemoveMedia?.(media.id)
                    onClose?.()
                  }}
                  className="w-full"
                >
                  Remove from Graph
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    onAddMedia?.(media.id)
                    onClose?.()
                  }}
                  className="w-full"
                >
                  Add to Graph
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
