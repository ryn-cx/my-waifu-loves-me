// TODO: Validate File
import { Box, Container, Text } from "@chakra-ui/react"
import { useMutation, useQueries, useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo } from "react"
import {
  type app__media__graphql_media_schema__Media,
  type MediaListCollection,
  type MediaListStatus,
  MediaService,
} from "@/client"
import { MediaGraph } from "@/components/Media/MediaGraph"
import { toaster } from "@/components/ui/toaster"

const parseStringArray = (value: unknown): string[] | undefined => {
  if (typeof value === "string") {
    const arr = value.split(",").filter(Boolean)
    return arr.length > 0 ? arr : undefined
  }
  if (Array.isArray(value)) {
    const arr = value.filter(Boolean).map(String)
    return arr.length > 0 ? arr : undefined
  }
  return undefined
}

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === "true" || value === true) {
    return true
  }
  return undefined
}

const parsePositiveNumber = (value: unknown): number | undefined => {
  if (typeof value === "string") {
    const parsed = parseInt(value, 10)
    return !Number.isNaN(parsed) && parsed > 0 ? parsed : undefined
  }
  if (typeof value === "number" && value > 0) {
    return value
  }
  return undefined
}

export const Route = createFileRoute("/_layout/")({
  component: MediaPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      ids: parseStringArray(search.ids),
      user: (search.user as string) || undefined,
      usePopularityCompensation: parseBoolean(search.usePopularityCompensation),
      hideStatuses: parseStringArray(search.hideStatuses),
      hideNotOnList: parseBoolean(search.hideNotOnList),
      useLinearScaling: parseBoolean(search.useLinearScaling),
      minConnections: parsePositiveNumber(search.minConnections),
      colorEdgesByTag: parseBoolean(search.colorEdgesByTag),
      maxRecommendations: parsePositiveNumber(search.maxRecommendations),
    }
  },
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
    maxRecommendations,
  } = Route.useSearch()

  const numericIds = useMemo(
    () => ids.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id)),
    [ids],
  )

  const mediaQueries = useQueries({
    queries: numericIds.map((id) => ({
      queryKey: ["media", id],
      queryFn: () => MediaService.readMedia({ mediaId: id }),
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
    })),
  })

  const { data: userList, isError: isUserListError } = useQuery<
    MediaListCollection | null,
    Error
  >({
    queryKey: ["userList", user],
    queryFn: () =>
      user ? MediaService.readUser({ userName: user }) : Promise.resolve(null),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  })

  const mediaItems = useMemo(
    () =>
      mediaQueries
        .map((query) => query.data)
        .filter(
          (
            data,
          ): data is app__media__graphql_media_schema__Media =>
            data !== undefined,
        ),
    [mediaQueries],
  )

  const loadedIds = useMemo(
    () => new Set(mediaItems.map((item) => item.id)),
    [mediaItems],
  )

  const updateUrl = (params: {
    newIds?: string[]
    newUser?: string | null
    newUsePopularityCompensation?: boolean
    newHideStatuses?: string[]
    newHideNotOnList?: boolean
    newUseLinearScaling?: boolean
    newMinConnections?: number | null
    newColorEdgesByTag?: boolean
    newMaxRecommendations?: number | null
  }) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ids: params.newIds !== undefined ? params.newIds : prev.ids,
        user:
          params.newUser !== undefined
            ? params.newUser === null
              ? undefined
              : params.newUser
            : prev.user,
        usePopularityCompensation:
          params.newUsePopularityCompensation !== undefined
            ? params.newUsePopularityCompensation || undefined
            : prev.usePopularityCompensation,
        hideStatuses:
          params.newHideStatuses !== undefined
            ? params.newHideStatuses
            : prev.hideStatuses,
        hideNotOnList:
          params.newHideNotOnList !== undefined
            ? params.newHideNotOnList || undefined
            : prev.hideNotOnList,
        useLinearScaling:
          params.newUseLinearScaling !== undefined
            ? params.newUseLinearScaling || undefined
            : prev.useLinearScaling,
        minConnections:
          params.newMinConnections !== undefined
            ? params.newMinConnections === null
              ? undefined
              : params.newMinConnections
            : prev.minConnections,
        colorEdgesByTag:
          params.newColorEdgesByTag !== undefined
            ? params.newColorEdgesByTag || undefined
            : prev.colorEdgesByTag,
        maxRecommendations:
          params.newMaxRecommendations !== undefined
            ? params.newMaxRecommendations === null
              ? undefined
              : params.newMaxRecommendations
            : prev.maxRecommendations,
      }),
      replace: true,
    })
  }

  const addMediaMutation = useMutation({
    mutationFn: async (id: number) => {
      if (loadedIds.has(id)) {
        toaster.create({
          title: "Media already loaded",
          type: "info",
        })
        return null
      }
      return MediaService.readMedia({ mediaId: id })
    },
    onSuccess: (data, id) => {
      if (data) {
        const newIds = Array.from(new Set([...ids, id.toString()]))
        updateUrl({ newIds })
        toaster.create({
          title: "Media loaded successfully",
          type: "success",
        })
      }
    },
    onError: (error, id) => {
      toaster.create({
        title: `Failed to fetch media ${id}`,
        description: (error as Error).message,
        type: "error",
      })
    },
  })

  useEffect(() => {
    if (isUserListError) {
      toaster.create({
        title: `Failed to load user ${user}`,
        type: "error",
      })
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
    <Container maxW="full" h="100%" display="flex" flexDirection="column">
      {mediaItems.length > 0 ? (
        <Box h="100%" overflow="hidden">
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
            maxRecommendations={maxRecommendations}
          />
        </Box>
      ) : (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          h="100%"
        >
          <Text color="gray.500">
            Use the sidebar to search for anime or add by ID
          </Text>
        </Box>
      )}
    </Container>
  )
}
