import { useQueries, useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import {
  type app__media__graphql_media_schema__Media,
  type MediaListCollection,
  type MediaRelation,
  MediaService,
} from "@/client"

export interface MissingEntry {
  /** An entry that is on the user's list. */
  listMedia: app__media__graphql_media_schema__Media
  /** A media related to {@link listMedia} that is NOT on the user's list. */
  related: app__media__graphql_media_schema__Media
  relationType: MediaRelation | null
}

function collectOwnedIds(userList: MediaListCollection | null): Set<number> {
  const ids = new Set<number>()
  for (const listGroup of userList?.lists ?? []) {
    for (const entry of listGroup?.entries ?? []) {
      if (entry?.mediaId != null) ids.add(entry.mediaId)
    }
  }
  return ids
}

function title(media: app__media__graphql_media_schema__Media): string {
  return media.title?.romaji || media.title?.english || `Media ${media.id}`
}

/**
 * Finds every media related to an entry on the user's list that is itself
 * absent from the list. Fetches the user's list, then each entry's relations,
 * and diffs the related ids against the owned set.
 */
export function useMissingMedia(user?: string) {
  const userListQuery = useQuery<MediaListCollection | null, Error>({
    queryKey: ["userList", user],
    queryFn: () =>
      user ? MediaService.readUser({ userName: user }) : Promise.resolve(null),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })

  const ownedIds = useMemo(
    () => collectOwnedIds(userListQuery.data ?? null),
    [userListQuery.data],
  )

  const idList = useMemo(() => Array.from(ownedIds), [ownedIds])

  // One fetch per list entry to get its relations. These are paced by the
  // backend's AniList rate limiter and cached, so large lists load gradually.
  const mediaQueries = useQueries({
    queries: idList.map((id) => ({
      queryKey: ["media", id],
      queryFn: () => MediaService.readMedia({ mediaId: id }),
      staleTime: 1000 * 60 * 5,
      retry: false,
    })),
  })

  const loadedMedia = useMemo(
    () =>
      mediaQueries
        .map((query) => query.data)
        .filter(
          (data): data is app__media__graphql_media_schema__Media =>
            data !== undefined,
        ),
    [mediaQueries],
  )

  // Stable signal that only changes when the set of loaded media changes, so
  // the (potentially large) diff below doesn't rerun on every render.
  const loadedKey = useMemo(
    () =>
      loadedMedia
        .map((m) => m.id)
        .sort((a, b) => a - b)
        .join(","),
    [loadedMedia],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: loadedKey gates recompute; loadedMedia is read fresh
  const entries = useMemo<MissingEntry[]>(() => {
    const rows: MissingEntry[] = []
    const seen = new Set<string>()

    for (const media of loadedMedia) {
      for (const edge of media.relations?.edges ?? []) {
        const related = edge?.node
        if (!related?.id || ownedIds.has(related.id)) continue

        const key = `${media.id}:${related.id}`
        if (seen.has(key)) continue
        seen.add(key)

        rows.push({
          listMedia: media,
          related,
          relationType: edge?.relationType ?? null,
        })
      }
    }

    rows.sort(
      (a, b) =>
        title(a.listMedia).localeCompare(title(b.listMedia)) ||
        title(a.related).localeCompare(title(b.related)),
    )
    return rows
  }, [loadedKey, ownedIds])

  return {
    entries,
    isUserListError: userListQuery.isError,
    totalCount: idList.length,
    loadedCount: loadedMedia.length,
    isLoading:
      userListQuery.isLoading || mediaQueries.some((query) => query.isLoading),
  }
}
