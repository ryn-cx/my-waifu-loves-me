import Graph from "graphology"
import forceAtlas2 from "graphology-layout-forceatlas2"
import { useEffect, useMemo, useRef } from "react"
import Sigma from "sigma"
import type {
  app__media__graphql_media_schema__Media,
  MediaListCollection,
  MediaRelation,
} from "@/client"
import {
  CHOSEN_NODE_COLOR_DARK,
  CHOSEN_NODE_COLOR_LIGHT,
  getMediaStatusMap,
  STATUS_COLORS,
  withAlpha,
} from "@/components/Media/mediaGraphShared"
import { RELATION_COLORS } from "@/components/Media/relationTypes"
import { useGraphTooltips } from "@/components/Media/useGraphTooltips"
import { useTheme } from "@/components/theme-provider"

interface RelationsGraphProps {
  mediaItems: app__media__graphql_media_schema__Media[]
  userList: MediaListCollection | null
  onAddMedia?: (mediaId: number) => void
  onRemoveMedia?: (mediaId: number) => void
  loadedIds?: Set<number>
  /** Relation types to hide; edges of these types are dropped from the graph. */
  relationFilter?: Set<MediaRelation>
  minStartYear?: number
  maxStartYear?: number
}

const FALLBACK_EDGE_COLOR = "#718096"

const NEW_NODE_COLOR_LIGHT = "#aaaaaa"
const NEW_NODE_COLOR_DARK = "#6b7280"

const DARK_EDGE_ALPHA = 0.55

function isWithinYearRange(
  media: app__media__graphql_media_schema__Media,
  minStartYear?: number,
  maxStartYear?: number,
) {
  const startYear = media.startDate?.year
  if (startYear === undefined || startYear === null) return true
  if (minStartYear !== undefined && startYear < minStartYear) return false
  if (maxStartYear !== undefined && startYear > maxStartYear) return false
  return true
}

function addNode(
  graph: Graph,
  id: string,
  media: app__media__graphql_media_schema__Media,
  color: string,
) {
  if (graph.hasNode(id)) return
  const label =
    media.title?.romaji || media.title?.english || `Media ${media.id}`
  graph.addNode(id, {
    x: Math.random() * 1024,
    y: Math.random() * 1024,
    size: 10,
    label,
    originalLabel: label,
    color,
  })
}

export function RelationsGraph({
  mediaItems,
  userList,
  onAddMedia,
  onRemoveMedia,
  loadedIds = new Set(),
  relationFilter = new Set(),
  minStartYear,
  maxStartYear,
}: RelationsGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sigmaRef = useRef<Sigma | null>(null)
  const { resolvedTheme } = useTheme()
  const { showHover, hideHover, moveHover, togglePin, portal } =
    useGraphTooltips({ loadedIds, onAddMedia, onRemoveMedia })

  const mediaStatusMap = useMemo(() => getMediaStatusMap(userList), [userList])

  useEffect(() => {
    if (!containerRef.current) return

    const graph = new Graph()
    const isDarkMode = resolvedTheme === "dark"
    const chosenNodeColor = isDarkMode
      ? CHOSEN_NODE_COLOR_DARK
      : CHOSEN_NODE_COLOR_LIGHT
    const newNodeColor = isDarkMode ? NEW_NODE_COLOR_DARK : NEW_NODE_COLOR_LIGHT

    const nodeColor = (media: app__media__graphql_media_schema__Media) => {
      if (loadedIds.has(media.id)) return chosenNodeColor
      const status = mediaStatusMap.get(media.id)
      return status ? STATUS_COLORS[status] : newNodeColor
    }

    // Add every loaded (root/fetched) media as a node first so edges always
    // have a source endpoint to attach to.
    mediaItems.forEach((media) => {
      if (!isWithinYearRange(media, minStartYear, maxStartYear)) return
      addNode(graph, String(media.id), media, nodeColor(media))
    })

    // Build typed relation edges. Relations are roughly symmetric on AniList
    // (A is SEQUEL of B ⇒ B is PREQUEL of A), so dedupe on either direction
    // and keep the first-seen type's color.
    const connectionCount = new Map<string, number>()
    mediaItems.forEach((media) => {
      const sourceId = String(media.id)
      if (!graph.hasNode(sourceId)) return

      for (const edge of media.relations?.edges || []) {
        const target = edge?.node
        if (!target?.id) continue

        if (edge?.relationType && relationFilter.has(edge.relationType))
          continue
        if (!isWithinYearRange(target, minStartYear, maxStartYear)) continue

        const targetId = String(target.id)
        addNode(graph, targetId, target, nodeColor(target))

        if (
          targetId === sourceId ||
          graph.hasEdge(sourceId, targetId) ||
          graph.hasEdge(targetId, sourceId)
        ) {
          continue
        }

        const color = edge?.relationType
          ? RELATION_COLORS[edge.relationType] || FALLBACK_EDGE_COLOR
          : FALLBACK_EDGE_COLOR
        graph.addEdge(sourceId, targetId, {
          size: 2,
          color: isDarkMode ? withAlpha(color, DARK_EDGE_ALPHA) : color,
        })

        connectionCount.set(sourceId, (connectionCount.get(sourceId) || 0) + 1)
        connectionCount.set(targetId, (connectionCount.get(targetId) || 0) + 1)
      }
    })

    // Relation-type filtering can leave non-root nodes with no visible edges
    // (e.g. a title only reachable via a hidden CHARACTER edge). Drop them so
    // the graph doesn't fill with disconnected dots.
    const orphans: string[] = []
    graph.forEachNode((node) => {
      if (loadedIds.has(parseInt(node, 10))) return
      if (graph.degree(node) === 0) orphans.push(node)
    })
    orphans.forEach((node) => {
      graph.dropNode(node)
    })

    // Size nodes by how many relations they connect, so franchise hubs stand
    // out. Roots keep a fixed mid size.
    graph.forEachNode((node) => {
      const nodeId = parseInt(node, 10)
      if (loadedIds.has(nodeId)) {
        graph.setNodeAttribute(node, "size", 12)
        return
      }
      const count = connectionCount.get(node) || 0
      graph.setNodeAttribute(node, "size", Math.min(30, 8 + count * 2))
    })

    forceAtlas2.assign(graph, {
      iterations: 128,
      settings: {
        gravity: 0.1,
        scalingRatio: 10,
        adjustSizes: true,
      },
    })

    const sigma = new Sigma(graph, containerRef.current, {
      labelColor: { color: isDarkMode ? "#ffffff" : "#111827" },
    })

    const getMediaFromNode = (
      nodeId: number,
    ): app__media__graphql_media_schema__Media | null => {
      const media = mediaItems.find((m) => m.id === nodeId)
      if (media) return media

      for (const m of mediaItems) {
        const related = m.relations?.edges?.find(
          (edge) => edge?.node?.id === nodeId,
        )?.node
        if (related) return related
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
    relationFilter,
    loadedIds,
    mediaStatusMap,
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
