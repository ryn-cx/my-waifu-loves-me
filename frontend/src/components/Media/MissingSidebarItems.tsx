import { useNavigate, useSearch } from "@tanstack/react-router"
import { useState } from "react"
import type { MediaRelation, MediaType } from "@/client"
import { MediaTypeToggle } from "@/components/Media/MediaTypeToggle"
import { RelationTypeFilter } from "@/components/Media/RelationTypeFilter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

export function MissingSidebarItems() {
  const navigate = useNavigate()
  const search = useSearch({ from: "/_layout/missing" })
  const [userName, setUserName] = useState(search?.user ?? "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = userName.trim()
    navigate({
      to: "/missing",
      search: (prev) => ({ ...prev, user: trimmed || undefined }),
    })
  }

  const hiddenRelations = new Set<MediaRelation>(
    (search?.hideRelations ?? []) as MediaRelation[],
  )

  const handleRelationsChange = (hidden: MediaRelation[]) => {
    navigate({
      to: "/missing",
      search: (prev) => ({
        ...prev,
        hideRelations: hidden.length > 0 ? hidden : undefined,
      }),
    })
  }

  const setType = (key: "inputType" | "outputType", type: MediaType) => {
    navigate({
      to: "/missing",
      search: (prev) => ({ ...prev, [key]: type }),
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="missing-user" className="text-sm">
            AniList Username
          </Label>
          <Input
            id="missing-user"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter username"
            type="text"
          />
        </div>
        <Button type="submit" size="sm">
          Find Missing
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Lists media related to entries on the user's list that aren't on it yet.
        Large lists are fetched one entry at a time, so results fill in
        gradually.
      </p>

      <Separator />

      <MediaTypeToggle
        label="List entries"
        value={search?.inputType ?? "ANIME"}
        onChange={(type) => setType("inputType", type)}
      />
      <MediaTypeToggle
        label="Show missing"
        value={search?.outputType ?? "ANIME"}
        onChange={(type) => setType("outputType", type)}
      />

      <Separator />

      <RelationTypeFilter
        hidden={hiddenRelations}
        onChange={handleRelationsChange}
      />
    </div>
  )
}
