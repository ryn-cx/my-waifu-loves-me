import { useMutation } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"

import { ApiError, MediaService } from "@/client"
import { MediaGraphFilters } from "@/components/Media/MediaGraphFilters"
import { MediaSearchInput } from "@/components/Media/MediaSearchInput"
import { Button } from "@/components/ui/button"
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

const ANILIST_CLIENT_ID = import.meta.env.VITE_ANILIST_CLIENT_ID
const ANILIST_AUTH_URL = `https://anilist.co/api/v2/oauth/authorize?client_id=${ANILIST_CLIENT_ID}&response_type=token`

export function MediaSidebarItems() {
  const navigate = useNavigate()
  const searchParams = useSearch({ from: "/_layout/" })
  const [userName, setUserName] = useState("")
  const [showAnilistLogin, setShowAnilistLogin] = useState(false)

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

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userName.trim()) {
      userMutation.mutate(userName)
    }
  }

  const handleAddMedia = (id: number) => {
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
  }

  const handleFilterChange = (patch: Record<string, unknown>) => {
    navigate({
      to: "/",
      search: (prev: any) => ({ ...prev, ...patch }),
      replace: false,
    })
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

      <MediaSearchInput onAddMedia={handleAddMedia} />

      <Separator />

      <MediaGraphFilters values={searchParams} onChange={handleFilterChange} />

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
