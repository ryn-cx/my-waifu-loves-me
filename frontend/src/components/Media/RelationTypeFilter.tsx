import type { MediaRelation } from "@/client"
import {
  RELATION_COLORS,
  RELATION_TYPES,
  relationLabel,
} from "@/components/Media/relationTypes"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface RelationTypeFilterProps {
  /** Relation types currently hidden. */
  hidden: Set<MediaRelation>
  /** Called with the next hidden list whenever a type is toggled. */
  onChange: (hidden: MediaRelation[]) => void
}

/**
 * Checkbox list for hiding relation types, shared by the relations and missing
 * sidebars. Presentational: the parent maps the returned list into its route's
 * search params.
 */
export function RelationTypeFilter({
  hidden,
  onChange,
}: RelationTypeFilterProps) {
  const toggle = (relation: MediaRelation, isHidden: boolean) => {
    const next = new Set(hidden)
    if (isHidden) {
      next.add(relation)
    } else {
      next.delete(relation)
    }
    onChange(Array.from(next))
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Hide Relation Type:</span>
      <div className="flex flex-col gap-1">
        {RELATION_TYPES.map((relation) => (
          <div key={relation} className="flex items-center gap-2">
            <Checkbox
              id={`relation-${relation}`}
              checked={hidden.has(relation)}
              onCheckedChange={(checked) => toggle(relation, checked === true)}
            />
            <Label
              htmlFor={`relation-${relation}`}
              className="flex items-center gap-1 text-xs"
            >
              <span
                className="inline-block h-2 w-3 rounded-sm"
                style={{ backgroundColor: RELATION_COLORS[relation] }}
              />
              {relationLabel(relation)}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
