import { useQueries } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"

import {
  type app__media__graphql_media_schema__Media,
  type MediaRelation,
  MediaService,
} from "@/client"
import { MediaGraphFilters } from "@/components/Media/MediaGraphFilters"
import { MediaSearchInput } from "@/components/Media/MediaSearchInput"
import { RelationTypeFilter } from "@/components/Media/RelationTypeFilter"
import { Separator } from "@/components/ui/separator"

export function RelationsSidebarItems() {
  const navigate = useNavigate()
  const searchParams = useSearch({ from: "/_layout/relations" })

  const ids = searchParams?.ids || []
  const rootIds = Array.isArray(ids)
    ? ids
    : typeof ids === "string"
      ? (ids as string).split(",").filter(Boolean)
      : []

  // Resolve root ids to media so the list shows titles. These are already
  // cached by the route, so this is effectively free.
  const rootQueries = useQueries({
    queries: rootIds.map((id) => ({
      queryKey: ["media", parseInt(id, 10)],
      queryFn: () => MediaService.readMedia({ mediaId: parseInt(id, 10) }),
      staleTime: 1000 * 60 * 5,
      retry: false,
    })),
  })

  const handleAddMedia = (id: number) => {
    navigate({
      to: "/relations",
      search: (prev: any) => {
        const currentIds = prev?.ids
          ? Array.isArray(prev.ids)
            ? prev.ids
            : prev.ids.split(",")
          : []
        const newIds = [...new Set([...currentIds, String(id)])]
        return { ...prev, ids: newIds.join(",") }
      },
    })
  }

  const handleRemoveMedia = (id: string) => {
    navigate({
      to: "/relations",
      search: (prev: any) => {
        const currentIds = prev?.ids
          ? Array.isArray(prev.ids)
            ? prev.ids
            : prev.ids.split(",")
          : []
        const newIds = currentIds.filter((mediaId: string) => mediaId !== id)
        return {
          ...prev,
          ids: newIds.length > 0 ? newIds.join(",") : undefined,
        }
      },
    })
  }

  const handleFilterChange = (patch: Record<string, unknown>) => {
    navigate({
      to: "/relations",
      search: (prev: any) => ({ ...prev, ...patch }),
      replace: false,
    })
  }

  const hiddenRelations = new Set<MediaRelation>(
    (searchParams?.hideRelations ?? []) as MediaRelation[],
  )

  const getTitle = (
    media: app__media__graphql_media_schema__Media | undefined,
    fallbackId: string,
  ) =>
    media?.title?.romaji ||
    media?.title?.english ||
    media?.title?.native ||
    `Media ${fallbackId}`

  return (
    <div className="flex flex-col gap-4 p-4">
      <MediaSearchInput onAddMedia={handleAddMedia} addButtonLabel="Add" />

      <Separator />

      {/* Current roots */}
      {rootIds.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Roots</span>
          <div className="flex flex-col gap-1">
            {rootIds.map((id, index) => {
              const media = rootQueries[index]?.data
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-2 rounded-md border p-1.5"
                >
                  <span className="line-clamp-1 text-xs">
                    {getTitle(media, id)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(id)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Separator />

      <MediaGraphFilters
        values={searchParams}
        onChange={handleFilterChange}
        showRecommendationControls={false}
        showStatusFilter={false}
      />

      <Separator />

      <RelationTypeFilter
        hidden={hiddenRelations}
        onChange={(arr) =>
          handleFilterChange({
            hideRelations: arr.length > 0 ? arr.join(",") : undefined,
          })
        }
      />
    </div>
  )
}
