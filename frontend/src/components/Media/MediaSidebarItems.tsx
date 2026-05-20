import { useMutation } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"

import type { MediaListStatus } from "@/client"
import { ApiError, MediaService } from "@/client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const STATUS_COLORS: Record<MediaListStatus, string> = {
  COMPLETED: "#48bb78",
  CURRENT: "#4299e1",
  DROPPED: "#f56565",
  PAUSED: "#ed8936",
  PLANNING: "#9f7aea",
  REPEATING: "#38b2ac",
}

const ANILIST_CLIENT_ID = import.meta.env.VITE_ANILIST_CLIENT_ID
const ANILIST_AUTH_URL = `https://anilist.co/api/v2/oauth/authorize?client_id=${ANILIST_CLIENT_ID}&response_type=token`

export function MediaSidebarItems() {
  const navigate = useNavigate()
  const searchParams = useSearch({ from: "/_layout/" })
  const [mediaId, setMediaId] = useState("")
  const [userName, setUserName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [mediaType, setMediaType] = useState<"ANIME" | "MANGA">("ANIME")
  const [useSearchMode, setUseSearchMode] = useState(true)
  const [showAnilistLogin, setShowAnilistLogin] = useState(false)

  const hideStatuses = searchParams?.hideStatuses || []
  const statusFilterArray = Array.isArray(hideStatuses)
    ? hideStatuses
    : typeof hideStatuses === "string"
      ? (hideStatuses as string).split(",").filter(Boolean)
      : []
  const statusFilter = new Set(statusFilterArray as MediaListStatus[])
  const usePopularityCompensation =
    searchParams?.usePopularityCompensation || false
  const useLinearScaling = searchParams?.useLinearScaling || false
  const minConnections = searchParams?.minConnections
  const colorEdgesByTag = searchParams?.colorEdgesByTag || false
  const minStartYear = searchParams?.minStartYear
  const maxStartYear = searchParams?.maxStartYear

  const mediaMutation = useMutation({
    mutationFn: async (id: number) => {
      return MediaService.readMedia({ mediaId: id })
    },
    onSuccess: (_data, id) => {
      navigate({
        to: "/",
        search: (prev: any) => ({
          ...prev,
          ids: prev?.ids ? `${prev.ids},${id}` : String(id),
        }),
      })
      setMediaId("")
      toast.success("Media added successfully")
    },
    onError: () => {
      toast.error("Failed to fetch media")
    },
  })

  const userMutation = useMutation({
    mutationFn: async (name: string) => {
      return MediaService.readUser({ userName: name })
    },
    onSuccess: (_data, name) => {
      navigate({
        to: "/",
        search: (prev: any) => ({
          ...prev,
          user: name,
        }),
      })
      setUserName("")
      toast.success("User list loaded successfully")
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 403) {
        setShowAnilistLogin(true)
      } else {
        toast.error("Failed to fetch user list")
      }
    },
  })

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

  const handleMediaSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = parseInt(mediaId, 10)
    if (!Number.isNaN(id)) {
      mediaMutation.mutate(id)
    }
  }

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userName.trim()) {
      userMutation.mutate(userName)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery)
    }
  }

  const handleSelectSearchResult = (id: number) => {
    navigate({
      to: "/",
      search: (prev: any) => {
        const currentIds = prev?.ids
          ? Array.isArray(prev.ids)
            ? prev.ids
            : prev.ids.split(",")
          : []
        const newIds = [...new Set([...currentIds, String(id)])]
        return {
          ...prev,
          ids: newIds.join(","),
        }
      },
    })
    searchMutation.reset()
    setSearchQuery("")
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Username Input */}
      <form onSubmit={handleUserSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="anilist-user" className="text-sm">
            AniList Username
          </Label>
          <Input
            id="anilist-user"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter username"
            type="text"
          />
        </div>
        <Button type="submit" disabled={userMutation.isPending} size="sm">
          {userMutation.isPending ? "Loading..." : "Fetch User List"}
        </Button>
      </form>

      <Separator />

      {/* Search/Add Toggle Section */}
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
              disabled={mediaMutation.isPending}
              size="sm"
              className="flex-1"
            >
              {mediaMutation.isPending ? "Adding..." : "Add to Graph"}
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

      <Separator />

      {/* Graph Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="popularity-comp"
            checked={usePopularityCompensation}
            onCheckedChange={(checked) => {
              navigate({
                to: "/",
                search: (prev: any) => ({
                  ...prev,
                  usePopularityCompensation: checked === true || undefined,
                }),
                replace: false,
              })
            }}
          />
          <Label htmlFor="popularity-comp" className="text-sm font-medium">
            Popularity Compensation
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="linear-scaling"
            checked={useLinearScaling}
            onCheckedChange={(checked) => {
              navigate({
                to: "/",
                search: (prev: any) => ({
                  ...prev,
                  useLinearScaling: checked === true || undefined,
                }),
                replace: false,
              })
            }}
          />
          <Label htmlFor="linear-scaling" className="text-sm font-medium">
            Linear Node Scaling
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="color-edges"
            checked={colorEdgesByTag}
            onCheckedChange={(checked) => {
              navigate({
                to: "/",
                search: (prev: any) => ({
                  ...prev,
                  colorEdgesByTag: checked === true || undefined,
                }),
                replace: false,
              })
            }}
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
            value={minConnections ?? ""}
            onChange={(e) => {
              const value = e.target.value
              const numValue = value === "" ? null : parseInt(value, 10)
              navigate({
                to: "/",
                search: (prev: any) => ({
                  ...prev,
                  minConnections:
                    numValue === null || Number.isNaN(numValue)
                      ? undefined
                      : numValue,
                }),
                replace: false,
              })
            }}
            placeholder="No limit"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="min-year" className="text-sm">
            Min Release Year
          </Label>
          <Input
            id="min-year"
            type="number"
            min="0"
            value={minStartYear ?? ""}
            onChange={(e) => {
              const value = e.target.value
              const numValue = value === "" ? null : parseInt(value, 10)
              navigate({
                to: "/",
                search: (prev: any) => ({
                  ...prev,
                  minStartYear:
                    numValue === null || Number.isNaN(numValue)
                      ? undefined
                      : numValue,
                }),
                replace: false,
              })
            }}
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
            value={maxStartYear ?? ""}
            onChange={(e) => {
              const value = e.target.value
              const numValue = value === "" ? null : parseInt(value, 10)
              navigate({
                to: "/",
                search: (prev: any) => ({
                  ...prev,
                  maxStartYear:
                    numValue === null || Number.isNaN(numValue)
                      ? undefined
                      : numValue,
                }),
                replace: false,
              })
            }}
            placeholder="No limit"
          />
        </div>

        <Separator />

        {/* Status Filters */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Hide Status:</span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hide-not-on-list"
                checked={searchParams?.hideNotOnList || false}
                onCheckedChange={(checked) => {
                  navigate({
                    to: "/",
                    search: (prev: any) => ({
                      ...prev,
                      hideNotOnList: checked || undefined,
                    }),
                    replace: false,
                  })
                }}
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
                      navigate({
                        to: "/",
                        search: (prev: any) => ({
                          ...prev,
                          hideStatuses:
                            newHideStatuses.length > 0
                              ? newHideStatuses.join(",")
                              : undefined,
                        }),
                        replace: false,
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
      </div>

      <Dialog open={showAnilistLogin} onOpenChange={setShowAnilistLogin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Private List</DialogTitle>
            <DialogDescription>
              This user's list is private. Login with AniList to access it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAnilistLogin(false)}
            >
              Cancel
            </Button>
            <Button asChild>
              <a href={ANILIST_AUTH_URL}>Login with AniList</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
