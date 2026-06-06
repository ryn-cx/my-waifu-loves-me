import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useCallback, useMemo } from "react"
import type { MediaRelation } from "@/client"
import { RelationsGraph } from "@/components/Media/RelationsGraph"
import {
  RELATION_COLORS,
  relationLabel,
} from "@/components/Media/relationTypes"
import { useMediaGraphData } from "@/hooks/useMediaGraphData"
import { parsePositiveNumber, parseStringArray } from "@/lib/searchParams"

type RelationsSearch = {
  ids?: string[]
  user?: string
  hideRelations?: string[]
  minStartYear?: number
  maxStartYear?: number
}

export const Route = createFileRoute("/_layout/relations")({
  component: RelationsPage,
  validateSearch: (search: Record<string, unknown>): RelationsSearch => ({
    ids: parseStringArray(search.ids),
    user: (search.user as string) || undefined,
    hideRelations: parseStringArray(search.hideRelations),
    minStartYear: parsePositiveNumber(search.minStartYear),
    maxStartYear: parsePositiveNumber(search.maxStartYear),
  }),
  head: () => ({
    meta: [
      {
        title: "Relations - My Waifu Loves Me",
      },
    ],
  }),
})

function RelationsPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const {
    ids = [],
    user,
    hideRelations,
    minStartYear,
    maxStartYear,
  } = Route.useSearch()

  const relationFilter = useMemo(
    () => new Set((hideRelations ?? []) as MediaRelation[]),
    [hideRelations],
  )

  // Fetch only the selected media; their `relations` give the single layer of
  // related titles shown around each node.
  const { mediaItems, userList, loadedIds } = useMediaGraphData(ids, user)

  // Relation types actually present in the current graph, for the legend.
  const presentRelations = useMemo(() => {
    const types = new Set<MediaRelation>()
    for (const media of mediaItems) {
      for (const edge of media.relations?.edges || []) {
        if (edge?.relationType) types.add(edge.relationType)
      }
    }
    return Array.from(types).sort()
  }, [mediaItems])

  const handleAddMedia = useCallback(
    (id: number) => {
      navigate({
        search: (prev) => {
          const currentIds = prev.ids ?? []
          const newIds = Array.from(new Set([...currentIds, id.toString()]))
          return { ...prev, ids: newIds }
        },
        replace: true,
      })
    },
    [navigate],
  )

  const handleRemoveMedia = useCallback(
    (id: number) => {
      navigate({
        search: (prev) => ({
          ...prev,
          ids: (prev.ids ?? []).filter((mediaId) => mediaId !== id.toString()),
        }),
        replace: true,
      })
    },
    [navigate],
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-2">
      {mediaItems.length > 0 ? (
        <>
          {presentRelations.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {presentRelations.map((relation) => {
                const hidden = relationFilter.has(relation)
                return (
                  <span
                    key={relation}
                    className={`flex items-center gap-1 ${
                      hidden ? "line-through opacity-40" : ""
                    }`}
                  >
                    <span
                      className="inline-block h-2 w-3 rounded-sm"
                      style={{ backgroundColor: RELATION_COLORS[relation] }}
                    />
                    {relationLabel(relation)}
                  </span>
                )
              })}
            </div>
          )}
          <div className="h-full overflow-hidden">
            <RelationsGraph
              mediaItems={mediaItems}
              userList={userList || null}
              onAddMedia={handleAddMedia}
              onRemoveMedia={handleRemoveMedia}
              loadedIds={loadedIds}
              relationFilter={relationFilter}
              minStartYear={minStartYear}
              maxStartYear={maxStartYear}
            />
          </div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">
            Use the sidebar to search for a media and explore its relations
          </p>
        </div>
      )}
    </div>
  )
}
