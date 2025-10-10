import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Image,
  Link,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react"
import Graph from "graphology"
import forceAtlas2 from "graphology-layout-forceatlas2"
import { useEffect, useMemo, useRef, useState } from "react"
import Sigma from "sigma"
import type {
  app__media__graphql_media_schema__Media,
  MediaListCollection,
  MediaListStatus,
} from "@/client"

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
  maxRecommendations?: number
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
  return 10 / largestSingleRecommendationCount
}

function calculateEdgeSize(
  rating: number,
  sourcePopularity: number,
  recPopularity: number,
  edgeScaleFactor: number,
  usePopularityCompensation: boolean,
) {
  if (usePopularityCompensation) {
    return Math.max(1, (rating / (sourcePopularity * recPopularity)) * edgeScaleFactor)
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

function addRecomendationsToGraph(
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
  maxRecommendations?: number,
) {
  const recommendations = media.recommendations?.nodes || []
  const limitedRecommendations = maxRecommendations !== undefined
    ? recommendations.slice(0, maxRecommendations)
    : recommendations

  limitedRecommendations.forEach((rec) => {
    if (!rec?.mediaRecommendation) return

    const recMedia = rec.mediaRecommendation
    const recId = String(recMedia.id)
    const recStatus = mediaStatusMap.get(recMedia.id)

    // Skip recommendations that should be hidden based on the filter
    if (recStatus && statusFilter.has(recStatus)) {
      return
    }

    // Skip recommendations not on list if hideNotOnList is enabled
    if (hideNotOnList && !recStatus) {
      return
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

// Based on https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
const generateColor = (string: string) => {
  let hash = 0;
  for (const char of string) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0; // Constrain to 32bit integer
  }
  const hexHash = Math.abs(hash).toString(16)
  return `#${hexHash.slice(0, 6)}`
};

function getBestTag(media: app__media__graphql_media_schema__Media, recMedia: app__media__graphql_media_schema__Media) {
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
  maxRecommendations,
}: MediaGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
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
      addRecomendationsToGraph(
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
        maxRecommendations,
      )
    })

    // Filter out nodes that do not have enough connections.
    if (minConnections !== undefined && minConnections > 0) {
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

    // Calculate maxRating only from recommendation nodes, exclude user chosen nodes
    // because they will probably be the highest value by far and skew the scaling.
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
          // User-chosen nodes should have fixed sizes and ratings because they exist just
          // to contextualize the recommendations.
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
          // User-chosen nodes should have fixed sizes and ratings because they exist just
          // to contextualize the recommendations.
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
    // Cleanup listeners & sigma instance for this effect run
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
    maxRecommendations,
  ])

  const renderTooltip = (
    media: app__media__graphql_media_schema__Media,
    position: { x: number; y: number },
    isPinned: boolean,
  ) => {
    // Calculate position to keep tooltip within viewport
    const tooltipWidth = 350
    const tooltipHeight = 400 // Approximate max height
    const offset = 20

    let left = position.x + offset
    let top = position.y + offset

    // Adjust horizontal position if tooltip would go off screen
    if (left + tooltipWidth > window.innerWidth) {
      left = position.x - tooltipWidth - offset
    }

    // Adjust vertical position if tooltip would go off screen
    if (top + tooltipHeight > window.innerHeight) {
      top = position.y - tooltipHeight - offset
    }

    // Ensure tooltip doesn't go off the left edge
    if (left < 0) {
      left = offset
    }

    // Ensure tooltip doesn't go off the top edge
    if (top < 0) {
      top = offset
    }

    return (
      <Box
        position="fixed"
        left={`${left}px`}
        top={`${top}px`}
        bg="white"
        border="1px solid"
        borderColor={isPinned ? "blue.400" : "gray.200"}
        borderRadius="md"
        boxShadow="lg"
        p={3}
        maxW="350px"
        zIndex={9999}
        pointerEvents={isPinned ? "auto" : "none"}
        onClick={(e) => e.stopPropagation()}
      >
        <VStack align="stretch" gap={2}>
          {isPinned && (
            <Flex justify="flex-end">
              <Text
                fontSize="xs"
                color="gray.500"
                cursor="pointer"
                onClick={() =>
                  setPinnedMediaList((prev) =>
                    prev.filter((p) => p.media.id !== media.id),
                  )
                }
                _hover={{ color: "red.500" }}
              >
                ✕ Close
              </Text>
            </Flex>
          )}
          <Flex gap={3}>
            {media.coverImage?.medium && (
              <Image
                src={media.coverImage.medium}
                alt={media.title?.romaji || "Cover"}
                w="80px"
                h="120px"
                objectFit="cover"
                borderRadius="md"
              />
            )}
            <VStack align="stretch" flex={1} gap={1}>
              <Text
                fontWeight="bold"
                fontSize="sm"
                style={{
                  display: "webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {media.title?.romaji || media.title?.english}
              </Text>
              {media.averageScore && (
                <Text fontSize="sm" color="blue.600" fontWeight="bold">
                  ★ {media.averageScore}%
                </Text>
              )}
              {media.format && (
                <Text fontSize="xs" color="gray.600">
                  {media.format}
                </Text>
              )}
              {media.episodes && (
                <Text fontSize="xs" color="gray.600">
                  {media.episodes} episodes
                </Text>
              )}
            </VStack>
          </Flex>

          {media.genres && media.genres.length > 0 && (
            <Flex wrap="wrap" gap={1}>
              {media.genres.slice(0, 4).map(
                (genre, idx) =>
                  genre && (
                    <Badge key={idx} size="sm" colorScheme="purple">
                      {genre}
                    </Badge>
                  ),
              )}
            </Flex>
          )}

          {media.description && (
            <Text
              fontSize="xs"
              color="gray.700"
              css={{
                display: "-webkit-box",
                WebkitLineClamp: 10,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {media.description.replace(/<[^>]*>/g, "")}
            </Text>
          )}

          {isPinned && (
            <>
              <Flex gap={2} pt={1} borderTop="1px solid" borderColor="gray.100">
                {media.siteUrl && (
                  <Link
                    href={media.siteUrl}
                    target="_blank"
                    fontSize="xs"
                    color="blue.500"
                  >
                    AniList
                  </Link>
                )}
                {media.idMal && (
                  <Link
                    href={`https://myanimelist.net/anime/${media.idMal}`}
                    target="_blank"
                    fontSize="xs"
                    color="blue.500"
                  >
                    MAL
                  </Link>
                )}
              </Flex>
              <HStack gap={2} pt={2}>
                {loadedIds.has(media.id) ? (
                  <Button
                    size="sm"
                    colorScheme="red"
                    onClick={() => {
                      onRemoveMedia?.(media.id)
                      setPinnedMediaList((prev) =>
                        prev.filter((p) => p.media.id !== media.id),
                      )
                    }}
                    width="100%"
                  >
                    Remove from Graph
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    colorScheme="green"
                    onClick={() => {
                      onAddMedia?.(media.id)
                      setPinnedMediaList((prev) =>
                        prev.filter((p) => p.media.id !== media.id),
                      )
                    }}
                    width="100%"
                  >
                    Add to Graph
                  </Button>
                )}
              </HStack>
            </>
          )}
        </VStack>
      </Box>
    )
  }

  return (
    <Box position="relative" h="100%">
      <Box
        ref={containerRef}
        w="100%"
        h="100%"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="md"
      />

      <Portal>
        {hoveredMedia &&
          !pinnedMediaList.find((p) => p.media.id === hoveredMedia.id) &&
          renderTooltip(hoveredMedia, tooltipPosition, false)}

        {pinnedMediaList.map((pinned) => (
          <Box key={pinned.media.id}>
            {renderTooltip(pinned.media, pinned.position, true)}
          </Box>
        ))}
      </Portal>
    </Box>
  )
}
