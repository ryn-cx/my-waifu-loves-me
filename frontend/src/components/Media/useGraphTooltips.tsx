import { useCallback, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { app__media__graphql_media_schema__Media } from "@/client"
import { MediaTooltip } from "@/components/Media/MediaTooltip"

type Media = app__media__graphql_media_schema__Media
type Position = { x: number; y: number }

interface UseGraphTooltipsOptions {
  loadedIds: Set<number>
  onAddMedia?: (mediaId: number) => void
  onRemoveMedia?: (mediaId: number) => void
}

/**
 * Owns the hover + pinned tooltip state shared by the graph components. Returns
 * stable callbacks to wire into sigma node events, plus a ready-to-render portal
 * of {@link MediaTooltip}s. Callbacks are stable so they can sit in a graph
 * effect's dependency list without forcing the graph to rebuild.
 */
export function useGraphTooltips({
  loadedIds,
  onAddMedia,
  onRemoveMedia,
}: UseGraphTooltipsOptions) {
  const [hoveredMedia, setHoveredMedia] = useState<Media | null>(null)
  const [pinnedMediaList, setPinnedMediaList] = useState<
    Array<{ media: Media; position: Position }>
  >([])
  const [tooltipPosition, setTooltipPosition] = useState<Position>({
    x: 0,
    y: 0,
  })
  const hoveredRef = useRef<Media | null>(null)

  const showHover = useCallback((media: Media, position: Position) => {
    setHoveredMedia(media)
    hoveredRef.current = media
    setTooltipPosition(position)
  }, [])

  const hideHover = useCallback(() => {
    setHoveredMedia(null)
    hoveredRef.current = null
  }, [])

  const moveHover = useCallback((position: Position) => {
    if (hoveredRef.current) setTooltipPosition(position)
  }, [])

  const togglePin = useCallback((media: Media, position: Position) => {
    setPinnedMediaList((prev) =>
      prev.find((p) => p.media.id === media.id)
        ? prev.filter((p) => p.media.id !== media.id)
        : [...prev, { media, position }],
    )
  }, [])

  const unpin = useCallback((mediaId: number) => {
    setPinnedMediaList((prev) => prev.filter((p) => p.media.id !== mediaId))
  }, [])

  const portal = createPortal(
    <>
      {hoveredMedia &&
        !pinnedMediaList.find((p) => p.media.id === hoveredMedia.id) && (
          <MediaTooltip
            media={hoveredMedia}
            position={tooltipPosition}
            isPinned={false}
            loadedIds={loadedIds}
          />
        )}

      {pinnedMediaList.map((pinned) => (
        <MediaTooltip
          key={pinned.media.id}
          media={pinned.media}
          position={pinned.position}
          isPinned
          loadedIds={loadedIds}
          onAddMedia={onAddMedia}
          onRemoveMedia={onRemoveMedia}
          onClose={() => unpin(pinned.media.id)}
        />
      ))}
    </>,
    document.body,
  )

  return { showHover, hideHover, moveHover, togglePin, portal }
}
