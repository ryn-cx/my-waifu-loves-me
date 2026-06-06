import { useQueries, useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import {
  type app__media__graphql_media_schema__Media,
  type MediaListCollection,
  MediaService,
} from "@/client"

/**
 * Shared data layer for the graph pages: fetches each selected media and the
 * optional user list, and derives the loaded-media set. Both the suggestions
 * and relations pages build their graphs from this.
 */
export function useMediaGraphData(ids: string[], user?: string) {
  const numericIds = useMemo(
    () => ids.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id)),
    [ids],
  )

  const mediaQueries = useQueries({
    queries: numericIds.map((id) => ({
      queryKey: ["media", id],
      queryFn: () => MediaService.readMedia({ mediaId: id }),
      staleTime: 1000 * 60 * 5,
      retry: false,
    })),
  })

  const userListQuery = useQuery<MediaListCollection | null, Error>({
    queryKey: ["userList", user],
    queryFn: () =>
      user ? MediaService.readUser({ userName: user }) : Promise.resolve(null),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const mediaItems = useMemo(
    () =>
      mediaQueries
        .map((query) => query.data)
        .filter(
          (data): data is app__media__graphql_media_schema__Media =>
            data !== undefined,
        ),
    [mediaQueries],
  )

  const loadedIds = useMemo(
    () => new Set(mediaItems.map((item) => item.id)),
    [mediaItems],
  )

  return {
    mediaItems,
    userList: userListQuery.data ?? null,
    isUserListError: userListQuery.isError,
    loadedIds,
    isLoading: mediaQueries.some((query) => query.isLoading),
  }
}
