import {
  Badge,
  Box,
  Flex,
  Grid,
  GridItem,
  Image,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react"
import type { app__media__graphql_media_schema__Media } from "@/client"
import {
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
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
    <DialogRoot
      open={open}
      onOpenChange={(e) => !e.open && onClose()}
      size="xl"
    >
      <DialogBackdrop />
      <DialogContent maxW="900px">
        <DialogHeader>
          <DialogTitle>
            {media.title?.romaji || media.title?.english || `Media ${media.id}`}
          </DialogTitle>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <Grid templateColumns={{ base: "1fr", md: "300px 1fr" }} gap={6}>
            <GridItem>
              {media.coverImage?.large && (
                <Image
                  src={media.coverImage.large}
                  alt={media.title?.romaji || "Cover"}
                  borderRadius="md"
                  w="100%"
                  objectFit="cover"
                />
              )}

              <VStack align="stretch" gap={3} mt={4}>
                {media.averageScore && (
                  <Box bg="gray.50" p={3} borderRadius="md">
                    <Text fontSize="sm" color="gray.600">
                      Score
                    </Text>
                    <Text fontSize="xl" fontWeight="bold" color="blue.600">
                      {media.averageScore}%
                    </Text>
                  </Box>
                )}

                <Grid templateColumns="1fr 1fr" gap={3}>
                  {media.episodes && (
                    <Box bg="gray.50" p={3} borderRadius="md">
                      <Text fontSize="sm" color="gray.600">
                        Episodes
                      </Text>
                      <Text fontWeight="bold">{media.episodes}</Text>
                    </Box>
                  )}
                  {media.format && (
                    <Box bg="gray.50" p={3} borderRadius="md">
                      <Text fontSize="sm" color="gray.600">
                        Format
                      </Text>
                      <Text fontWeight="bold">{media.format}</Text>
                    </Box>
                  )}
                </Grid>

                {media.studios?.nodes && media.studios.nodes.length > 0 && (
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" mb={2}>
                      Studio
                    </Text>
                    {media.studios.nodes.map(
                      (studio, idx: number) =>
                        studio && (
                          <Link
                            key={idx}
                            href={`https://anilist.co/studio/${studio.id}`}
                            target="_blank"
                            color="blue.500"
                            display="block"
                          >
                            {studio.name}
                          </Link>
                        ),
                    )}
                  </Box>
                )}
              </VStack>
            </GridItem>

            <GridItem>
              <VStack align="stretch" gap={4}>
                {media.description && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>
                      Description
                    </Text>
                    <Text fontSize="sm" maxH="200px" overflowY="auto">
                      {media.description}
                    </Text>
                  </Box>
                )}

                {media.genres && media.genres.length > 0 && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>
                      Genres
                    </Text>
                    <Flex wrap="wrap" gap={2}>
                      {media.genres.map(
                        (genre, idx: number) =>
                          genre && (
                            <Badge key={idx} colorScheme="purple">
                              {genre}
                            </Badge>
                          ),
                      )}
                    </Flex>
                  </Box>
                )}

                {media.externalLinks && media.externalLinks.length > 0 && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>
                      External Links
                    </Text>
                    <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                      {media.externalLinks.slice(0, 6).map(
                        (link, idx: number) =>
                          link && (
                            <Link
                              key={idx}
                              href={link.url ?? undefined}
                              target="_blank"
                              color="blue.500"
                              fontSize="sm"
                            >
                              {link.site}
                            </Link>
                          ),
                      )}
                    </Grid>
                  </Box>
                )}

                {media.trailer && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>
                      Trailer
                    </Text>
                    <Link
                      href={`https://${media.trailer.site === "youtube" ? "youtube.com/watch?v=" : "dailymotion.com/video/"}${media.trailer.id}`}
                      target="_blank"
                      color="blue.500"
                    >
                      Watch on {media.trailer.site}
                    </Link>
                  </Box>
                )}
              </VStack>
            </GridItem>
          </Grid>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  )
}
