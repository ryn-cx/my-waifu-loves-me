import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect } from "react"
import { toast } from "sonner"
import { type MediaListStatus, MediaService } from "@/client"
import { MediaGraph } from "@/components/Media/MediaGraph"
import { useMediaGraphData } from "@/hooks/useMediaGraphData"
import {
  parseBoolean,
  parsePositiveNumber,
  parseStringArray,
} from "@/lib/searchParams"

type MediaSearch = {
  ids?: string[]
  user?: string
  usePopularityCompensation?: boolean
  hideStatuses?: string[]
  hideNotOnList?: boolean
  useLinearScaling?: boolean
  minConnections?: number
  colorEdgesByTag?: boolean
  minStartYear?: number
  maxStartYear?: number
}

export const Route = createFileRoute("/_layout/")({
  component: MediaPage,
  validateSearch: (search: Record<string, unknown>): MediaSearch => {
    return {
      ids: parseStringArray(search.ids),
      user: (search.user as string) || undefined,
      usePopularityCompensation: parseBoolean(search.usePopularityCompensation),
      hideStatuses: parseStringArray(search.hideStatuses),
      hideNotOnList: parseBoolean(search.hideNotOnList),
      useLinearScaling: parseBoolean(search.useLinearScaling),
      minConnections: parsePositiveNumber(search.minConnections),
      colorEdgesByTag: parseBoolean(search.colorEdgesByTag),
      minStartYear: parsePositiveNumber(search.minStartYear),
      maxStartYear: parsePositiveNumber(search.maxStartYear),
    }
  },
  head: () => ({
    meta: [
      {
        title: "My Waifu Loves Me",
      },
    ],
  }),
})

function MediaPage() {
  const navigate = useNavigate({ from: Route.fullPath })
  const {
    ids = [],
    user,
    usePopularityCompensation = false,
    hideStatuses = [],
    hideNotOnList = false,
    useLinearScaling = false,
    minConnections,
    colorEdgesByTag = false,
    minStartYear,
    maxStartYear,
  } = Route.useSearch()

  const { mediaItems, userList, isUserListError, loadedIds } =
    useMediaGraphData(ids, user)

  const updateUrl = useCallback(
    (params: {
      newIds?: string[]
      newUser?: string | null
      newUsePopularityCompensation?: boolean
      newHideStatuses?: string[]
      newHideNotOnList?: boolean
      newUseLinearScaling?: boolean
      newMinConnections?: number | null
      newColorEdgesByTag?: boolean
      newMinStartYear?: number | null
      newMaxStartYear?: number | null
    }) => {
      navigate({
        search: (prev) => {
          const getValue = <T,>(newValue: T | undefined, oldValue: T): T => {
            return newValue !== undefined ? newValue : oldValue
          }

          const getOptionalValue = <T,>(
            newValue: T | null | undefined,
            oldValue: T | undefined,
          ): T | undefined => {
            if (newValue === undefined) return oldValue
            return newValue === null ? undefined : newValue
          }

          const getBooleanValue = (
            newValue: boolean | undefined,
            oldValue: boolean | undefined,
          ): boolean | undefined => {
            if (newValue === undefined) return oldValue
            return newValue || undefined
          }

          return {
            ...prev,
            ids: getValue(params.newIds, prev.ids),
            user: getOptionalValue(params.newUser, prev.user),
            usePopularityCompensation: getBooleanValue(
              params.newUsePopularityCompensation,
              prev.usePopularityCompensation,
            ),
            hideStatuses: getValue(params.newHideStatuses, prev.hideStatuses),
            hideNotOnList: getBooleanValue(
              params.newHideNotOnList,
              prev.hideNotOnList,
            ),
            useLinearScaling: getBooleanValue(
              params.newUseLinearScaling,
              prev.useLinearScaling,
            ),
            minConnections: getOptionalValue(
              params.newMinConnections,
              prev.minConnections,
            ),
            colorEdgesByTag: getBooleanValue(
              params.newColorEdgesByTag,
              prev.colorEdgesByTag,
            ),
            minStartYear: getOptionalValue(
              params.newMinStartYear,
              prev.minStartYear,
            ),
            maxStartYear: getOptionalValue(
              params.newMaxStartYear,
              prev.maxStartYear,
            ),
          }
        },
        replace: true,
      })
    },
    [navigate],
  )

  const addMediaMutation = useMutation({
    mutationFn: async (id: number) => {
      if (loadedIds.has(id)) {
        toast.info("Media already loaded")
        return null
      }
      return MediaService.readMedia({ mediaId: id })
    },
    onSuccess: (data, id) => {
      if (data) {
        const newIds = Array.from(new Set([...ids, id.toString()]))
        updateUrl({ newIds })
        toast.success("Media loaded successfully")
      }
    },
    onError: (error, id) => {
      toast.error(`Failed to fetch media ${id}: ${(error as Error).message}`)
    },
  })

  useEffect(() => {
    if (isUserListError) {
      toast.error(`Failed to load user ${user}`)
      updateUrl({ newUser: null })
    }
  }, [isUserListError, user, updateUrl])

  const handleAddMedia = (id: number) => {
    addMediaMutation.mutate(id)
  }

  const handleRemoveMedia = (id: number) => {
    const newIds = ids.filter((mediaId) => mediaId !== id.toString())
    updateUrl({ newIds })
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {mediaItems.length > 0 ? (
        <div className="h-full overflow-hidden">
          <MediaGraph
            mediaItems={mediaItems}
            userList={userList || null}
            onAddMedia={handleAddMedia}
            onRemoveMedia={handleRemoveMedia}
            loadedIds={loadedIds}
            usePopularityCompensation={usePopularityCompensation}
            statusFilter={new Set(hideStatuses as MediaListStatus[])}
            hideNotOnList={hideNotOnList}
            useLinearScaling={useLinearScaling}
            minConnections={minConnections}
            colorEdgesByTag={colorEdgesByTag}
            minStartYear={minStartYear}
            maxStartYear={maxStartYear}
          />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">
            Use the sidebar to search for anime or add by ID
          </p>
        </div>
      )}
    </div>
  )
}
