import type { MediaListStatus } from "@/client"
import { STATUS_COLORS } from "@/components/Media/mediaGraphShared"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export interface GraphFilterValues {
  usePopularityCompensation?: boolean
  useLinearScaling?: boolean
  colorEdgesByTag?: boolean
  minConnections?: number
  minStartYear?: number
  maxStartYear?: number
  hideStatuses?: string[] | string
  hideNotOnList?: boolean
}

interface MediaGraphFiltersProps {
  values: GraphFilterValues
  /** Apply a partial patch to the route's search params. */
  onChange: (patch: Record<string, unknown>) => void
  /**
   * Show recommendation-only controls (popularity compensation, linear
   * scaling, color-edges-by-tag, minimum connections). Defaults to true; the
   * relations view sets this false since relations have no rating to drive
   * those behaviors.
   */
  showRecommendationControls?: boolean
  /**
   * Show the per-status filter section. Defaults to true; the relations view
   * sets this false and filters by relation type instead.
   */
  showStatusFilter?: boolean
}

const numberPatch = (value: string): number | undefined => {
  const numValue = value === "" ? null : parseInt(value, 10)
  return numValue === null || Number.isNaN(numValue) ? undefined : numValue
}

/**
 * Graph display/filter controls (popularity compensation, scaling, edge
 * coloring, year + connection limits, status filters). Route-agnostic: the
 * parent supplies current values and an onChange callback that merges the
 * returned patch into its own search params.
 */
export function MediaGraphFilters({
  values,
  onChange,
  showRecommendationControls = true,
  showStatusFilter = true,
}: MediaGraphFiltersProps) {
  const hideStatuses = values.hideStatuses || []
  const statusFilterArray = Array.isArray(hideStatuses)
    ? hideStatuses
    : typeof hideStatuses === "string"
      ? hideStatuses.split(",").filter(Boolean)
      : []
  const statusFilter = new Set(statusFilterArray as MediaListStatus[])

  return (
    <div className="flex flex-col gap-3">
      {showRecommendationControls && (
        <>
          <div className="flex items-center gap-2">
            <Checkbox
              id="popularity-comp"
              checked={values.usePopularityCompensation || false}
              onCheckedChange={(checked) =>
                onChange({
                  usePopularityCompensation: checked === true || undefined,
                })
              }
            />
            <Label htmlFor="popularity-comp" className="text-sm font-medium">
              Popularity Compensation
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="linear-scaling"
              checked={values.useLinearScaling || false}
              onCheckedChange={(checked) =>
                onChange({ useLinearScaling: checked === true || undefined })
              }
            />
            <Label htmlFor="linear-scaling" className="text-sm font-medium">
              Linear Node Scaling
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="color-edges"
              checked={values.colorEdgesByTag || false}
              onCheckedChange={(checked) =>
                onChange({ colorEdgesByTag: checked === true || undefined })
              }
            />
            <Label htmlFor="color-edges" className="text-sm font-medium">
              Color Edges by Tag
            </Label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="min-connections" className="text-sm">
              Minimum Connections
            </Label>
            <Input
              id="min-connections"
              type="number"
              min="0"
              value={values.minConnections ?? ""}
              onChange={(e) =>
                onChange({ minConnections: numberPatch(e.target.value) })
              }
              placeholder="No limit"
            />
          </div>
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="min-year" className="text-sm">
          Min Release Year
        </Label>
        <Input
          id="min-year"
          type="number"
          min="0"
          value={values.minStartYear ?? ""}
          onChange={(e) =>
            onChange({ minStartYear: numberPatch(e.target.value) })
          }
          placeholder="No limit"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="max-year" className="text-sm">
          Max Release Year
        </Label>
        <Input
          id="max-year"
          type="number"
          min="0"
          value={values.maxStartYear ?? ""}
          onChange={(e) =>
            onChange({ maxStartYear: numberPatch(e.target.value) })
          }
          placeholder="No limit"
        />
      </div>

      {showStatusFilter && (
        <>
          <Separator />

          {/* Status Filters */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Hide Status:</span>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hide-not-on-list"
                  checked={values.hideNotOnList || false}
                  onCheckedChange={(checked) =>
                    onChange({ hideNotOnList: checked || undefined })
                  }
                />
                <Label
                  htmlFor="hide-not-on-list"
                  className="flex items-center gap-1 text-xs"
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: "#aaaaaa" }}
                  />
                  Not on List
                </Label>
              </div>
              {(
                [
                  "CURRENT",
                  "PLANNING",
                  "COMPLETED",
                  "PAUSED",
                  "DROPPED",
                  "REPEATING",
                ] as MediaListStatus[]
              ).map((status) => {
                const isChecked = statusFilter.has(status)
                const displayText =
                  status.charAt(0) + status.slice(1).toLowerCase()
                return (
                  <div key={status} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(statusFilter)
                        if (checked) {
                          newSet.add(status)
                        } else {
                          newSet.delete(status)
                        }
                        const newHideStatuses = Array.from(newSet)
                        onChange({
                          hideStatuses:
                            newHideStatuses.length > 0
                              ? newHideStatuses.join(",")
                              : undefined,
                        })
                      }}
                    />
                    <Label
                      htmlFor={`status-${status}`}
                      className="flex items-center gap-1 text-xs"
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[status] }}
                      />
                      {displayText}
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
