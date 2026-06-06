import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { MediaService } from "@/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface MediaSearchInputProps {
  /** Called with the AniList media id when the user picks a result or submits an id. */
  onAddMedia: (id: number) => void
  /** Label for the add-by-id submit button. */
  addButtonLabel?: string
}

/**
 * Reusable control for finding a media to add to a graph. Supports searching
 * AniList by title (anime/manga) or adding directly by id. Extracted from the
 * suggestions sidebar so it can be shared across pages.
 */
export function MediaSearchInput({
  onAddMedia,
  addButtonLabel = "Add to Graph",
}: MediaSearchInputProps) {
  const [mediaId, setMediaId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [mediaType, setMediaType] = useState<"ANIME" | "MANGA">("ANIME")
  const [useSearchMode, setUseSearchMode] = useState(true)

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      return MediaService.searchMedia({
        searchQuery: query,
        mediaType: mediaType,
      })
    },
    onSuccess: (data) => {
      toast.success(`Found ${data.media?.length || 0} results`)
    },
    onError: () => {
      toast.error("Failed to search")
    },
  })

  const addByIdMutation = useMutation({
    mutationFn: async (id: number) => {
      return MediaService.readMedia({ mediaId: id })
    },
    onSuccess: (_data, id) => {
      onAddMedia(id)
      setMediaId("")
      toast.success("Media added successfully")
    },
    onError: () => {
      toast.error("Failed to fetch media")
    },
  })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery)
    }
  }

  const handleMediaSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = parseInt(mediaId, 10)
    if (!Number.isNaN(id)) {
      addByIdMutation.mutate(id)
    }
  }

  const handleSelectSearchResult = (id: number) => {
    onAddMedia(id)
    searchMutation.reset()
    setSearchQuery("")
  }

  return (
    <div className="flex flex-col gap-4">
      {useSearchMode ? (
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="search-query" className="text-sm">
              Search Anime/Manga
            </Label>
            <Input
              id="search-query"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title"
              type="text"
            />
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="mediaType"
                value="ANIME"
                checked={mediaType === "ANIME"}
                onChange={() => setMediaType("ANIME")}
                className="accent-primary"
              />
              Anime
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="mediaType"
                value="MANGA"
                checked={mediaType === "MANGA"}
                onChange={() => setMediaType("MANGA")}
                className="accent-primary"
              />
              Manga
            </label>
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={searchMutation.isPending}
              size="sm"
              className="flex-1"
            >
              {searchMutation.isPending ? "Searching..." : "Search"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setUseSearchMode(false)}
              size="sm"
              type="button"
            >
              Use ID
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleMediaSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="media-id" className="text-sm">
              Add by ID
            </Label>
            <Input
              id="media-id"
              value={mediaId}
              onChange={(e) => setMediaId(e.target.value)}
              placeholder="Enter media ID"
              type="number"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={addByIdMutation.isPending}
              size="sm"
              className="flex-1"
            >
              {addByIdMutation.isPending ? "Adding..." : addButtonLabel}
            </Button>
            <Button
              variant="outline"
              onClick={() => setUseSearchMode(true)}
              size="sm"
              type="button"
            >
              Use Search
            </Button>
          </div>
        </form>
      )}

      {/* Search Results */}
      {useSearchMode &&
        searchMutation.data?.media &&
        searchMutation.data.media.length > 0 && (
          <div className="max-h-[300px] overflow-y-auto rounded-md border p-2">
            <div className="flex flex-col gap-2">
              {searchMutation.data.media.map((item) => {
                if (!item) return null
                return (
                  <div
                    key={item.id}
                    className="flex cursor-pointer gap-2 rounded-md p-2 hover:bg-accent"
                    onClick={() => handleSelectSearchResult(item.id)}
                  >
                    {item.coverImage?.medium && (
                      <img
                        src={item.coverImage.medium}
                        alt={item.title?.romaji || "Cover"}
                        className="h-[60px] w-[40px] rounded-sm object-cover"
                      />
                    )}
                    <div className="flex flex-1 flex-col gap-0.5">
                      <p className="line-clamp-2 text-xs font-bold">
                        {item.title?.romaji ||
                          item.title?.english ||
                          item.title?.native}{" "}
                        {item.startDate?.year ? `(${item.startDate.year})` : ""}
                      </p>
                      <div className="flex gap-1 text-xs text-muted-foreground">
                        {item.type && <span>{item.type}</span>}
                        {item.format && <span>{item.format}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
    </div>
  )
}
