import type { MediaRelation } from "@/client"

/** Per-relation-type edge/legend colors. */
export const RELATION_COLORS: Record<MediaRelation, string> = {
  SEQUEL: "#4299e1",
  PREQUEL: "#38b2ac",
  SIDE_STORY: "#9f7aea",
  ADAPTATION: "#48bb78",
  SOURCE: "#ed8936",
  ALTERNATIVE: "#ecc94b",
  SPIN_OFF: "#ed64a6",
  PARENT: "#667eea",
  CHARACTER: "#f56565",
  SUMMARY: "#a0aec0",
  COMPILATION: "#d69e2e",
  CONTAINS: "#319795",
  OTHER: "#718096",
}

/** Relation types in display order, for filter checkboxes and the legend. */
export const RELATION_TYPES: MediaRelation[] = [
  "SEQUEL",
  "PREQUEL",
  "SIDE_STORY",
  "PARENT",
  "SPIN_OFF",
  "ALTERNATIVE",
  "ADAPTATION",
  "SOURCE",
  "SUMMARY",
  "COMPILATION",
  "CONTAINS",
  "CHARACTER",
  "OTHER",
]

/** Human-readable label for a relation type (e.g. SIDE_STORY -> Side Story). */
export function relationLabel(relation: MediaRelation) {
  return relation
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ")
}
