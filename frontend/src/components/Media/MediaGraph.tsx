import Graph from "graphology"
import forceAtlas2 from "graphology-layout-forceatlas2"
import { useEffect, useMemo, useRef } from "react"
import Sigma from "sigma"
import type {
  app__media__graphql_media_schema__Media,
  MediaListCollection,
  MediaListStatus,
} from "@/client"
import {
  CHOSEN_NODE_COLOR_DARK,
  CHOSEN_NODE_COLOR_LIGHT,
  getMediaStatusMap,
  STATUS_COLORS,
  withAlpha,
} from "@/components/Media/mediaGraphShared"
import { useGraphTooltips } from "@/components/Media/useGraphTooltips"
import { useTheme } from "@/components/theme-provider"

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

const NEW_NODE_COLOR_LIGHT = "#aaaaaa"
const NEW_NODE_COLOR_DARK = "#6b7280"
const EDGE_COLOR_LIGHT = "#cbd5e0"
const EDGE_COLOR_DARK = "#4b5563"

const DARK_EDGE_ALPHA = 0.45

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
  chosenNodeColor: string,
) {
  if (!graph.hasNode(mediaId)) {
    graph.addNode(mediaId, {
      x: Math.random() * 1024,
      y: Math.random() * 1024,
      size: 15,
      label: media.title?.romaji || media.title?.english || `Media ${media.id}`,
      originalLabel:
        media.title?.romaji || media.title?.english || `Media ${media.id}`,
      color: chosenNodeColor,
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
  isDarkMode: boolean,
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

    const newNodeColor = isDarkMode ? NEW_NODE_COLOR_DARK : NEW_NODE_COLOR_LIGHT
    const recNodeColor = recStatus ? STATUS_COLORS[recStatus] : newNodeColor
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
        const tagColor = generateColor(bestTag)
        graph.addEdge(mediaId, recId, {
          color: isDarkMode ? withAlpha(tagColor, DARK_EDGE_ALPHA) : tagColor,
          size: edgeSize,
          label: bestTag,
        })
      } else {
        graph.addEdge(mediaId, recId, {
          color: isDarkMode ? EDGE_COLOR_DARK : EDGE_COLOR_LIGHT,
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
  const { showHover, hideHover, moveHover, togglePin, portal } =
    useGraphTooltips({ loadedIds, onAddMedia, onRemoveMedia })

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

    const isDarkMode = resolvedTheme === "dark"
    const chosenNodeColor = isDarkMode
      ? CHOSEN_NODE_COLOR_DARK
      : CHOSEN_NODE_COLOR_LIGHT

    mediaItems.forEach((media) => {
      const mediaId = String(media.id)
      addMediaToGraph(graph, mediaId, media, chosenNodeColor)
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
        isDarkMode,
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
      const media = getMediaFromNode(parseInt(node, 10))
      if (media) showHover(media, { x: event.x, y: event.y })
    }
    sigma.on("enterNode", handleEnter)

    const handleLeave = () => hideHover()
    sigma.on("leaveNode", handleLeave)

    const handleClick = ({ node, event }: any) => {
      const media = getMediaFromNode(parseInt(node, 10))
      if (media) togglePin(media, { x: event.x, y: event.y })
    }
    sigma.on("clickNode", handleClick)

    const mouseCaptor = sigma.getMouseCaptor()
    const handleMove = (event: any) => moveHover({ x: event.x, y: event.y })
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
    showHover,
    hideHover,
    moveHover,
    togglePin,
  ])

  return (
    <div className="relative h-full">
      <div ref={containerRef} className="h-full w-full rounded-md border" />
      {portal}
    </div>
  )
}
