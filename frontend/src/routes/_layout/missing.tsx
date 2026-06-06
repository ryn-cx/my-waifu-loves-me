import { createFileRoute } from "@tanstack/react-router"
import { useMemo } from "react"
import type {
  app__media__graphql_media_schema__Media,
  MediaRelation,
  MediaType,
} from "@/client"
import { relationLabel } from "@/components/Media/relationTypes"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useMissingMedia } from "@/hooks/useMissingMedia"
import { parseStringArray } from "@/lib/searchParams"

type MissingSearch = {
  user?: string
  hideRelations?: string[]
  /** Which list entries to scan. Defaults to ANIME. */
  inputType?: MediaType
  /** Which missing related media to show. Defaults to ANIME. */
  outputType?: MediaType
}

const parseMediaType = (value: unknown): MediaType | undefined =>
  value === "ANIME" || value === "MANGA" ? value : undefined

export const Route = createFileRoute("/_layout/missing")({
  component: MissingPage,
  validateSearch: (search: Record<string, unknown>): MissingSearch => ({
    user: (search.user as string) || undefined,
    hideRelations: parseStringArray(search.hideRelations),
    inputType: parseMediaType(search.inputType),
    outputType: parseMediaType(search.outputType),
  }),
  head: () => ({
    meta: [
      {
        title: "Missing - My Waifu Loves Me",
      },
    ],
  }),
})

function MediaLink({
  media,
}: {
  media: app__media__graphql_media_schema__Media
}) {
  const label =
    media.title?.romaji || media.title?.english || `Media ${media.id}`
  if (!media.siteUrl) return <span>{label}</span>
  return (
    <a
      href={media.siteUrl}
      target="_blank"
      rel="noreferrer"
      className="text-blue-500 hover:underline"
    >
      {label}
    </a>
  )
}

function MissingPage() {
  const { user, hideRelations, inputType, outputType } = Route.useSearch()
  const { entries, isUserListError, totalCount, loadedCount, isLoading } =
    useMissingMedia(user)

  const scanType = inputType ?? "ANIME"
  const showType = outputType ?? "ANIME"

  const relationFilter = useMemo(
    () => new Set((hideRelations ?? []) as MediaRelation[]),
    [hideRelations],
  )

  const visibleEntries = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.listMedia.type === scanType &&
          entry.related.type === showType &&
          (!entry.relationType || !relationFilter.has(entry.relationType)),
      ),
    [entries, relationFilter, scanType, showType],
  )

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-muted-foreground">
          Enter an AniList username in the sidebar to find media missing from
          their list.
        </p>
      </div>
    )
  }

  if (isUserListError) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <p className="text-destructive">
          Could not load the list for "{user}". The username may be wrong or the
          list private.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {visibleEntries.length} missing related entr
          {visibleEntries.length === 1 ? "y" : "ies"}
        </span>
        {isLoading && (
          <span>
            Loading {loadedCount}/{totalCount} list entries…
          </span>
        )}
      </div>
      <div className="h-full overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>List Entry</TableHead>
              <TableHead>Missing Related</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Relationship</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleEntries.map((entry) => (
              <TableRow key={`${entry.listMedia.id}-${entry.related.id}`}>
                <TableCell>
                  <MediaLink media={entry.listMedia} />
                </TableCell>
                <TableCell>
                  <MediaLink media={entry.related} />
                </TableCell>
                <TableCell>
                  {entry.related.type
                    ? entry.related.type.charAt(0) +
                      entry.related.type.slice(1).toLowerCase()
                    : "—"}
                </TableCell>
                <TableCell>
                  {entry.relationType ? relationLabel(entry.relationType) : "—"}
                </TableCell>
              </TableRow>
            ))}
            {visibleEntries.length === 0 && !isLoading && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  Nothing missing — every related entry is already on the list.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
