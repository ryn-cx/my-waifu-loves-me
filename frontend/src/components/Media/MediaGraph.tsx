import Graph from "graphology"
import forceAtlas2 from "graphology-layout-forceatlas2"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Sigma from "sigma"
import type {
  app__media__graphql_media_schema__Media,
  MediaListCollection,
  MediaListStatus,
} from "@/client"
import { useTheme } from "@/components/theme-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface MediaGraphProps {
  mediaItems: app__media__graphql_media_schema__Media[]
  userList: MediaListCollection | null
  onAddMedia?: (mediaId: number) => void
  onRemoveMedia?: (mediaId: number) => void
  loadedIds?: Set<number>
  usePopularityCompensation?: boolean
  statusFilter?: Set<MediaListStatus>
  hideNotOnList?: boolean
  useLinearScaling?: boolean
  minConnections?: number
  colorEdgesByTag?: boolean
  minStartYear?: number
  maxStartYear?: number
}

const STATUS_COLORS: Record<MediaListStatus, string> = {
  COMPLETED: "#48bb78",
  CURRENT: "#4299e1",
  DROPPED: "#f56565",
  PAUSED: "#ed8936",
  PLANNING: "#9f7aea",
  REPEATING: "#38b2ac",
}
const CHOSEN_NODE_COLOR = "#000000"
const NEW_NODE_COLOR = "#aaaaaa"

function getEdgeScaleFactor(
  mediaItems: app__media__graphql_media_schema__Media[],
  usePopularityCompensation: boolean,
) {
  let largestSingleRecommendationCount = 0

  mediaItems.forEach((media) => {
    const recommendations = media.recommendations?.nodes || []
    const sourcePopularity = media.popularity || 1

    recommendations.forEach((rec) => {
      if (!rec?.rating) return
      if (!rec?.mediaRecommendation) return

      if (usePopularityCompensation) {
        const recPopularity = rec.mediaRecommendation.popularity || 1
        const adjusted = rec.rating / (sourcePopularity * recPopularity)
        if (adjusted > largestSingleRecommendationCount) {
          largestSingleRecommendationCount = adjusted
        }
      } else {
        if (rec.rating > largestSingleRecommendationCount) {
          largestSingleRecommendationCount = rec.rating
        }
      }
    })
  })
  return 20 / largestSingleRecommendationCount
}

function calculateEdgeSize(
  rating: number,
  sourcePopularity: number,
  recPopularity: number,
  edgeScaleFactor: number,
  usePopularityCompensation: boolean,
) {
  if (usePopularityCompensation) {
    return Math.max(
      1,
      (rating / (sourcePopularity * recPopularity)) * edgeScaleFactor,
    )
  }
  return Math.max(1, rating * edgeScaleFactor)
}

function getMediaStatusMap(userList: MediaListCollection | null) {
  const mediaStatusMap = new Map<number, MediaListStatus>()
  if (userList?.lists) {
    for (const listGroup of userList.lists) {
      if (!listGroup?.entries || !listGroup.status) continue
      for (const entry of listGroup.entries) {
        if (!entry?.mediaId) continue
        mediaStatusMap.set(entry.mediaId, listGroup.status)
      }
    }
  }
  return mediaStatusMap
}

function applyMinimumConnectionsFilter(
  graph: Graph,
  ratingCount: Map<string, number>,
  loadedIds: Set<number>,
  minConnections?: number,
) {
  if (minConnections === undefined || minConnections <= 0) {
    return
  }

  const nodesToRemove: string[] = []
  graph.forEachNode((node) => {
    const nodeId = parseInt(node, 10)
    const isUserChosen = loadedIds.has(nodeId)
    const connectionCount = ratingCount.get(node) || 0

    if (!isUserChosen && connectionCount < minConnections) {
      nodesToRemove.push(node)
    }
  })

  nodesToRemove.forEach((node) => graph.dropNode(node))
}

function addMediaToGraph(
  graph: Graph,
  mediaId: string,
  media: app__media__graphql_media_schema__Media,
) {
  if (!graph.hasNode(mediaId)) {
    graph.addNode(mediaId, {
      x: Math.random() * 1024,
      y: Math.random() * 1024,
      size: 15,
      label: media.title?.romaji || media.title?.english || `Media ${media.id}`,
      originalLabel:
        media.title?.romaji || media.title?.english || `Media ${media.id}`,
      color: CHOSEN_NODE_COLOR,
    })
  }
}

// Based on https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
const generateColor = (string: string) => {
  let hash = 0
  for (const char of string) {
    hash = (hash << 5) - hash + char.charCodeAt(0)
    hash |= 0
  }
  const hexHash = Math.abs(hash).toString(16)
  return `#${hexHash.slice(0, 6)}`
}

function getBestTag(
  media: app__media__graphql_media_schema__Media,
  recMedia: app__media__graphql_media_schema__Media,
) {
  let bestTag = ""
  let highestScore = 0

  for (const sourceTag of media.tags || []) {
    if (!sourceTag?.name || !sourceTag?.rank) continue

    for (const recTag of recMedia.tags || []) {
      if (!recTag?.name || !recTag?.rank) continue

      if (sourceTag.name === recTag.name) {
        const score = sourceTag.rank * recTag.rank
        if (score > highestScore) {
          highestScore = score
          bestTag = sourceTag.name
        }
      }
    }
  }
  return bestTag
}

function addRecommendationsToGraph(
  media: app__media__graphql_media_schema__Media,
  mediaStatusMap: Map<number, MediaListStatus>,
  graph: Graph,
  ratingSum: Map<string, number>,
  ratingCount: Map<string, number>,
  mediaId: string,
  edgeScaleFactor: number,
  usePopularityCompensation: boolean,
  statusFilter: Set<MediaListStatus>,
  hideNotOnList: boolean,
  colorEdgesByTag: boolean,
  minStartYear?: number,
  maxStartYear?: number,
) {
  const recommendations = media.recommendations?.nodes || []
  recommendations.forEach((rec) => {
    if (!rec?.mediaRecommendation) return

    const recMedia = rec.mediaRecommendation
    const recId = String(recMedia.id)
    const recStatus = mediaStatusMap.get(recMedia.id)

    if (recStatus && statusFilter.has(recStatus)) {
      return
    }

    if (hideNotOnList && !recStatus) {
      return
    }

    const startYear = recMedia.startDate?.year
    if (startYear !== undefined && startYear !== null) {
      if (minStartYear !== undefined && startYear < minStartYear) {
        return
      }
      if (maxStartYear !== undefined && startYear > maxStartYear) {
        return
      }
    }

    const recNodeColor = recStatus ? STATUS_COLORS[recStatus] : NEW_NODE_COLOR
    const rating = rec.rating || 0
    const users = recMedia.popularity || 1

    if (!graph.hasNode(recId)) {
      graph.addNode(recId, {
        x: Math.random() * 1024,
        y: Math.random() * 1024,
        size: 10,
        label:
          recMedia.title?.romaji ||
          recMedia.title?.english ||
          `Media ${recMedia.id}`,
        originalLabel:
          recMedia.title?.romaji ||
          recMedia.title?.english ||
          `Media ${recMedia.id}`,
        color: recNodeColor,
      })
    }

    if (usePopularityCompensation) {
      ratingSum.set(recId, (ratingSum.get(recId) || 0) + rating / users)
    } else {
      ratingSum.set(recId, (ratingSum.get(recId) || 0) + rating)
    }

    ratingCount.set(recId, (ratingCount.get(recId) || 0) + 1)
    if (!graph.hasEdge(mediaId, recId)) {
      const edgeSize = calculateEdgeSize(
        rating || 0,
        media.popularity || 1,
        recMedia.popularity || 1,
        edgeScaleFactor,
        usePopularityCompensation,
      )

      if (colorEdgesByTag) {
        const bestTag = getBestTag(media, recMedia)
        graph.addEdge(mediaId, recId, {
          color: generateColor(bestTag),
          size: edgeSize,
          label: bestTag,
        })
      } else {
        graph.addEdge(mediaId, recId, {
          color: "#cbd5e0",
          size: edgeSize,
        })
      }
    }
  })
}

export function MediaGraph({
  mediaItems,
  userList,
  onAddMedia,
  onRemoveMedia,
  loadedIds = new Set(),
  usePopularityCompensation = false,
  statusFilter = new Set(),
  hideNotOnList = false,
  useLinearScaling = false,
  minConnections,
  colorEdgesByTag = false,
  minStartYear,
  maxStartYear,
}: MediaGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const { resolvedTheme } = useTheme()
  const [hoveredMedia, setHoveredMedia] =
    useState<app__media__graphql_media_schema__Media | null>(null)
  const [pinnedMediaList, setPinnedMediaList] = useState<
    Array<{
      media: app__media__graphql_media_schema__Media
      position: { x: number; y: number }
    }>
  >([])
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const hoveredRef = useRef<app__media__graphql_media_schema__Media | null>(
    null,
  )

  const mediaStatusMap = useMemo(() => getMediaStatusMap(userList), [userList])

  useEffect(() => {
    if (!containerRef.current) return

    const graph = new Graph()
    const ratingSum = new Map<string, number>()
    const ratingCount = new Map<string, number>()

    const edgeScaleFactor = getEdgeScaleFactor(
      mediaItems,
      usePopularityCompensation,
    )

    mediaItems.forEach((media) => {
      const mediaId = String(media.id)
      addMediaToGraph(graph, mediaId, media)
    })

    mediaItems.forEach((media) => {
      const mediaId = String(media.id)
      addRecommendationsToGraph(
        media,
        mediaStatusMap,
        graph,
        ratingSum,
        ratingCount,
        mediaId,
        edgeScaleFactor,
        usePopularityCompensation,
        statusFilter,
        hideNotOnList,
        colorEdgesByTag,
        minStartYear,
        maxStartYear,
      )
    })

    applyMinimumConnectionsFilter(graph, ratingCount, loadedIds, minConnections)

    const recommendationRatings = Array.from(ratingSum.entries())
      .filter(([nodeId]) => !loadedIds.has(parseInt(nodeId, 10)))
      .map(([, rating]) => rating)

    const maxRating =
      recommendationRatings.length > 0 ? Math.max(...recommendationRatings) : 1
    const scaleFactor = 100 / maxRating

    if (useLinearScaling) {
      const sortedNodes = Array.from(ratingSum.entries())
        .filter(([nodeId]) => !loadedIds.has(parseInt(nodeId, 10)))
        .sort(([, ratingA], [, ratingB]) => ratingB - ratingA)

      const nodeCount = sortedNodes.length
      const sizeRange = 50 - 8

      graph.forEachNode((node) => {
        const nodeId = parseInt(node, 10)
        const isUserChosen = loadedIds.has(nodeId)

        if (isUserChosen) {
          graph.setNodeAttribute(node, "size", 8)
          graph.setNodeAttribute(node, "rating", 0)
        } else {
          const nodeIndex = sortedNodes.findIndex(([id]) => id === node)
          const size = 50 - (nodeIndex / (nodeCount - 1)) * sizeRange
          graph.setNodeAttribute(node, "size", size)
          const rating = Math.round((ratingSum.get(node) || 0) * scaleFactor)
          graph.setNodeAttribute(node, "rating", rating)
        }
      })
    } else {
      graph.forEachNode((node) => {
        const nodeId = parseInt(node, 10)
        const isUserChosen = loadedIds.has(nodeId)

        if (isUserChosen) {
          graph.setNodeAttribute(node, "size", 8)
          graph.setNodeAttribute(node, "rating", 0)
        } else {
          const test = Math.round((ratingSum.get(node) || 0) * scaleFactor)
          graph.setNodeAttribute(node, "size", Math.max(8, test / 2))
          graph.setNodeAttribute(node, "rating", test)
        }
      })
    }

    forceAtlas2.assign(graph, {
      iterations: 128,
      settings: {
        gravity: 0.1,
        scalingRatio: 10,
        adjustSizes: true,
      },
    })

    const isDarkMode = resolvedTheme === "dark"

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: true,
      labelColor: { color: isDarkMode ? "#ffffff" : "#111827" },
      edgeLabelColor: { color: isDarkMode ? "#ffffff" : "#111827" },
    })

    const getMediaFromNode = (
      nodeId: number,
    ): app__media__graphql_media_schema__Media | null => {
      const media = mediaItems.find((m) => m.id === nodeId)
      if (media) return media

      for (const m of mediaItems) {
        const recMedia = m.recommendations?.nodes?.find(
          (rec) => rec?.mediaRecommendation?.id === nodeId,
        )?.mediaRecommendation
        if (recMedia) return recMedia
      }
      return null
    }

    const handleEnter = ({ node, event }: any) => {
      const nodeId = parseInt(node, 10)
      const media = getMediaFromNode(nodeId)
      if (media) {
        setHoveredMedia(media)
        hoveredRef.current = media
        setTooltipPosition({ x: event.x, y: event.y })
      }
    }
    sigma.on("enterNode", handleEnter)

    const handleLeave = () => {
      setHoveredMedia(null)
      hoveredRef.current = null
    }
    sigma.on("leaveNode", handleLeave)

    const handleClick = ({ node, event }: any) => {
      const nodeId = parseInt(node, 10)
      const media = getMediaFromNode(nodeId)
      if (media) {
        setPinnedMediaList((prev) => {
          const exists = prev.find((p) => p.media.id === media.id)
          if (exists) {
            return prev.filter((p) => p.media.id !== media.id)
          }
          return [...prev, { media, position: { x: event.x, y: event.y } }]
        })
      }
    }
    sigma.on("clickNode", handleClick)

    const mouseCaptor = sigma.getMouseCaptor()
    const handleMove = (event: any) => {
      if (hoveredRef.current) {
        setTooltipPosition({ x: event.x, y: event.y })
      }
    }
    mouseCaptor.on("mousemove", handleMove)

    sigmaRef.current = sigma
    return () => {
      mouseCaptor.off("mousemove", handleMove)
      sigma.off("enterNode", handleEnter)
      sigma.off("leaveNode", handleLeave)
      sigma.off("clickNode", handleClick)
      sigma.kill()
    }
  }, [
    mediaItems,
    usePopularityCompensation,
    statusFilter,
    loadedIds,
    hideNotOnList,
    mediaStatusMap,
    useLinearScaling,
    minConnections,
    colorEdgesByTag,
    minStartYear,
    maxStartYear,
    resolvedTheme,
  ])

  const renderTooltip = (
    media: app__media__graphql_media_schema__Media,
    position: { x: number; y: number },
    isPinned: boolean,
  ) => {
    const tooltipWidth = 350
    const tooltipHeight = 400
    const offset = 20

    let left = position.x + offset
    let top = position.y + offset

    if (left + tooltipWidth > window.innerWidth) {
      left = position.x - tooltipWidth - offset
    }

    if (top + tooltipHeight > window.innerHeight) {
      top = position.y - tooltipHeight - offset
    }

    if (left < 0) {
      left = offset
    }

    if (top < 0) {
      top = offset
    }

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
                onClick={() =>
                  setPinnedMediaList((prev) =>
                    prev.filter((p) => p.media.id !== media.id),
                  )
                }
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
                      setPinnedMediaList((prev) =>
                        prev.filter((p) => p.media.id !== media.id),
                      )
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
                      setPinnedMediaList((prev) =>
                        prev.filter((p) => p.media.id !== media.id),
                      )
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

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="h-full w-full rounded-md border" />

      {createPortal(
        <>
          {hoveredMedia &&
            !pinnedMediaList.find((p) => p.media.id === hoveredMedia.id) &&
            renderTooltip(hoveredMedia, tooltipPosition, false)}

          {pinnedMediaList.map((pinned) => (
            <div key={pinned.media.id}>
              {renderTooltip(pinned.media, pinned.position, true)}
            </div>
          ))}
        </>,
        document.body,
      )}
    </div>
  )
}
