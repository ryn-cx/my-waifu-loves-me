import { Box, Container, Text } from "@chakra-ui/react"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import {
  type Media,
  type MediaListCollection,
  type MediaListStatus,
  MediaService,
} from "@/client"
import { MediaGraph } from "@/components/Media/MediaGraph"
import { toaster } from "@/components/ui/toaster"

export const Route = createFileRoute("/_layout/")({
  component: MediaPage,
  validateSearch: (search: Record<string, unknown>) => {
    let parsedIds: string[] = []

    if (typeof search.ids === "string") {
      parsedIds = search.ids.split(",").filter(Boolean)
    } else if (Array.isArray(search.ids)) {
      parsedIds = search.ids.filter(Boolean).map(String)
    }

    let hideStatuses: string[] = []
    if (typeof search.hideStatuses === "string") {
      hideStatuses = search.hideStatuses.split(",").filter(Boolean)
    } else if (Array.isArray(search.hideStatuses)) {
      hideStatuses = search.hideStatuses.filter(Boolean).map(String)
    }

    return {
      ids: parsedIds.length > 0 ? parsedIds : undefined,
      user: (search.user as string) || undefined,
      usePopularityCompensation:
        search.usePopularityCompensation === "true" ||
        search.usePopularityCompensation === true ||
        undefined,
      hideStatuses: hideStatuses.length > 0 ? hideStatuses : undefined,
      hideNotOnList:
        search.hideNotOnList === "true" ||
        search.hideNotOnList === true ||
        undefined,
      useLinearScaling:
        search.useLinearScaling === "true" ||
        search.useLinearScaling === true ||
        undefined,
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
  } = Route.useSearch()
  const [mediaItems, setMediaItems] = useState<Media[]>([])
  const [userList, setUserList] = useState<MediaListCollection | null>(null)
  const [loadedIds, setLoadedIds] = useState<Set<number>>(
    () =>
      new Set(
        ids.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id)),
      ),
  )

  const updateUrl = (newIds: number[], newUser?: string) => {
    navigate({
      search: (prev: any) => ({
        ...prev,
        ids: newIds.length > 0 ? newIds.join(",") : undefined,
        user: newUser || prev.user,
      }),
      replace: true,
    })
  }

  const mediaMutation = useMutation({
    mutationFn: async (id: number) => {
      return MediaService.readMedia({ mediaId: id })
    },
    onSuccess: (data, id) => {
      setMediaItems((prev) => [...prev, data])
      setLoadedIds((prev) => {
        const newSet = new Set([...prev, id])
        updateUrl(Array.from(newSet), user)
        return newSet
      })
      toaster.create({
        title: "Media loaded successfully",
        type: "success",
      })
    },
    onError: () => {
      toaster.create({
        title: "Failed to fetch media",
        type: "error",
      })
    },
  })

  useEffect(() => {
    const idsToLoad = ids
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id))

    // TODO: Probably a better way to do this.
    if (idsToLoad.length === 0 && mediaItems.length > 0) {
      setMediaItems([])
      setLoadedIds(new Set())
      setUserList(null)
      return
    }

    const currentIds = new Set(mediaItems.map((m) => m.id))

    // Find IDs that need to be loaded (in URL but not in state)
    const idsToFetch = idsToLoad.filter((id) => !currentIds.has(id))

    if (idsToFetch.length > 0) {
      idsToFetch.forEach((id) => {
        MediaService.readMedia({ mediaId: id })
          .then((data) => {
            setMediaItems((prev) => {
              // Avoid duplicates
              if (prev.find((m) => m.id === data.id)) return prev
              return [...prev, data]
            })
          })
          .catch(() => {
            toaster.create({
              title: `Failed to load media ${id}`,
              type: "error",
            })
          })
      })
    }

    if (user && !userList) {
      MediaService.readUser({ userName: user })
        .then((data) => {
          setUserList(data)
        })
        .catch(() => {
          toaster.create({
            title: `Failed to load user ${user}`,
            type: "error",
          })
        })
    }
  }, [ids, user, mediaItems.length, mediaItems.map, userList])

  const handleAddMedia = (id: number) => {
    if (!loadedIds.has(id)) {
      mediaMutation.mutate(id)
    }
  }

  const handleRemoveMedia = (id: number) => {
    setMediaItems((prev) => prev.filter((m) => m.id !== id))
    setLoadedIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      updateUrl(Array.from(newSet), user)
      return newSet
    })
  }

  return (
    <Container maxW="full" h="100%" display="flex" flexDirection="column">
      {mediaItems.length > 0 ? (
        <Box h="100%" overflow="hidden">
          <MediaGraph
            mediaItems={mediaItems}
            userList={userList}
            onAddMedia={handleAddMedia}
            onRemoveMedia={handleRemoveMedia}
            loadedIds={loadedIds}
            usePopularityCompensation={usePopularityCompensation}
            statusFilter={new Set(hideStatuses as MediaListStatus[])}
            hideNotOnList={hideNotOnList}
            useLinearScaling={useLinearScaling}
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
