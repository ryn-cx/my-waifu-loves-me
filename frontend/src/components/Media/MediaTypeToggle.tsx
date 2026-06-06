import type { MediaType } from "@/client"
import { Button } from "@/components/ui/button"

const TYPES: MediaType[] = ["ANIME", "MANGA"]

interface MediaTypeToggleProps {
  label: string
  value: MediaType
  onChange: (type: MediaType) => void
}

/** Two-option Anime/Manga segmented toggle. */
export function MediaTypeToggle({
  label,
  value,
  onChange,
}: MediaTypeToggleProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1">
        {TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            size="sm"
            variant={value === type ? "default" : "outline"}
            className="flex-1"
            onClick={() => onChange(type)}
          >
            {type.charAt(0) + type.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>
    </div>
  )
}
