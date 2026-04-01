import type { app__media__graphql_media_schema__Media } from "@/client"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface MediaModalProps {
  media: app__media__graphql_media_schema__Media | null
  open: boolean
  onClose: () => void
}

export function MediaModal({ media, open, onClose }: MediaModalProps) {
  if (!media) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[900px]">
        <DialogHeader>
          <DialogTitle>
            {media.title?.romaji || media.title?.english || `Media ${media.id}`}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[300px_1fr]">
          <div>
            {media.coverImage?.large && (
              <img
                src={media.coverImage.large}
                alt={media.title?.romaji || "Cover"}
                className="w-full rounded-md object-cover"
              />
            )}

            <div className="mt-4 flex flex-col gap-3">
              {media.averageScore && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-xl font-bold text-blue-600">
                    {media.averageScore}%
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {media.episodes && (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-sm text-muted-foreground">Episodes</p>
                    <p className="font-bold">{media.episodes}</p>
                  </div>
                )}
                {media.format && (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-sm text-muted-foreground">Format</p>
                    <p className="font-bold">{media.format}</p>
                  </div>
                )}
              </div>

              {media.studios?.nodes && media.studios.nodes.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-bold">Studio</p>
                  {media.studios.nodes.map(
                    (studio, idx: number) =>
                      studio && (
                        <a
                          key={idx}
                          href={`https://anilist.co/studio/${studio.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-blue-500 hover:underline"
                        >
                          {studio.name}
                        </a>
                      ),
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {media.description && (
              <div>
                <p className="mb-2 font-bold">Description</p>
                <p className="max-h-[200px] overflow-y-auto text-sm">
                  {media.description}
                </p>
              </div>
            )}

            {media.genres && media.genres.length > 0 && (
              <div>
                <p className="mb-2 font-bold">Genres</p>
                <div className="flex flex-wrap gap-2">
                  {media.genres.map(
                    (genre, idx: number) =>
                      genre && (
                        <Badge key={idx} variant="secondary">
                          {genre}
                        </Badge>
                      ),
                  )}
                </div>
              </div>
            )}

            {media.externalLinks && media.externalLinks.length > 0 && (
              <div>
                <p className="mb-2 font-bold">External Links</p>
                <div className="grid grid-cols-2 gap-2">
                  {media.externalLinks.slice(0, 6).map(
                    (link, idx: number) =>
                      link && (
                        <a
                          key={idx}
                          href={link.url ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-500 hover:underline"
                        >
                          {link.site}
                        </a>
                      ),
                  )}
                </div>
              </div>
            )}

            {media.trailer && (
              <div>
                <p className="mb-2 font-bold">Trailer</p>
                <a
                  href={`https://${media.trailer.site === "youtube" ? "youtube.com/watch?v=" : "dailymotion.com/video/"}${media.trailer.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Watch on {media.trailer.site}
                </a>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
