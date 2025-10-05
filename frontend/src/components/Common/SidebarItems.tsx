import {
  Box,
  Button,
  Card,
  Flex,
  HStack,
  Image,
  Input,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation } from "@tanstack/react-query"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useState } from "react"

import type { MediaListStatus } from "@/client"
import { MediaService } from "@/client"
import { Checkbox } from "../ui/checkbox"
import { Field } from "../ui/field"
import { Radio, RadioGroup } from "../ui/radio"
import { toaster } from "../ui/toaster"

interface SidebarItemsProps {
  onClose?: () => void
}

const STATUS_COLORS: Record<MediaListStatus, string> = {
  COMPLETED: "#48bb78",
  CURRENT: "#4299e1",
  DROPPED: "#f56565",
  PAUSED: "#ed8936",
  PLANNING: "#9f7aea",
  REPEATING: "#38b2ac",
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const navigate = useNavigate()
  const searchParams = useSearch({ from: "/_layout/" })
  const [mediaId, setMediaId] = useState("")
  const [userName, setUserName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [mediaType, setMediaType] = useState<"ANIME" | "MANGA">("ANIME")
  const [useSearchMode, setUseSearchMode] = useState(true)

  // Get from URL params
  const hideStatuses = searchParams?.hideStatuses || []
  const statusFilterArray = Array.isArray(hideStatuses)
    ? hideStatuses
    : typeof hideStatuses === "string"
      ? hideStatuses.split(",").filter(Boolean)
      : []
  const statusFilter = new Set(statusFilterArray as MediaListStatus[])
  const usePopularityCompensation =
    searchParams?.usePopularityCompensation || false

  const mediaMutation = useMutation({
    mutationFn: async (id: number) => {
      return MediaService.readMedia({ mediaId: id })
    },
    onSuccess: (id) => {
      // Navigate to home with the media ID
      navigate({
        to: "/",
        search: (prev: any) => ({
          ...prev,
          ids: prev?.ids ? `${prev.ids},${id}` : String(id),
        }),
      })
      setMediaId("")
      toaster.create({
        title: "Media added successfully",
        type: "success",
      })
      onClose?.()
    },
    onError: () => {
      toaster.create({
        title: "Failed to fetch media",
        type: "error",
      })
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
      toaster.create({
        title: "User list loaded successfully",
        type: "success",
      })
      onClose?.()
    },
    onError: () => {
      toaster.create({
        title: "Failed to fetch user list",
        type: "error",
      })
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
      toaster.create({
        title: `Found ${data.media?.length || 0} results`,
        type: "success",
      })
    },
    onError: () => {
      toaster.create({
        title: "Failed to search",
        type: "error",
      })
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
    onClose?.()
  }

  return (
    <>
      <Box px={4} py={2}>
        <Flex justify="space-between" align="center">
          <Text fontSize="xs" fontWeight="bold">
            Menu
          </Text>
          <Button
            size="xs"
            variant="outline"
            colorScheme="red"
            onClick={() => {
              navigate({ to: "/", search: {} })
              onClose?.()
            }}
          >
            Reset
          </Button>
        </Flex>
      </Box>

      <Separator my={4} />

      {/* Username Input */}
      <Box px={4}>
        <form onSubmit={handleUserSubmit}>
          <VStack gap={3} align="stretch">
            <Field label="AniList Username">
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter username"
                type="text"
                size="sm"
              />
            </Field>
            <Button type="submit" loading={userMutation.isPending} size="sm">
              Fetch User List
            </Button>
          </VStack>
        </form>
      </Box>

      <Separator my={4} />

      {/* Search/Add Toggle Section */}
      <Box px={4}>
        {useSearchMode ? (
          <form onSubmit={handleSearchSubmit}>
            <VStack gap={3} align="stretch">
              <Field label="Search Anime/Manga">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title"
                  type="text"
                  size="sm"
                />
              </Field>
              <RadioGroup
                value={mediaType}
                onValueChange={(e) =>
                  setMediaType(e.value as "ANIME" | "MANGA")
                }
              >
                <HStack gap={2}>
                  <Radio value="ANIME">Anime</Radio>
                  <Radio value="MANGA">Manga</Radio>
                </HStack>
              </RadioGroup>
              <HStack gap={2}>
                <Button
                  type="submit"
                  loading={searchMutation.isPending}
                  size="sm"
                  // Stretch the search bar to be as big as possible in the row.
                  flex={1}
                >
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setUseSearchMode(false)}
                  size="sm"
                >
                  Use ID
                </Button>
              </HStack>
            </VStack>
          </form>
        ) : (
          <form onSubmit={handleMediaSubmit}>
            <VStack gap={3} align="stretch">
              <Field label="Add by ID">
                <Input
                  value={mediaId}
                  onChange={(e) => setMediaId(e.target.value)}
                  placeholder="Enter media ID"
                  type="number"
                  size="sm"
                />
              </Field>
              <HStack gap={2}>
                <Button
                  type="submit"
                  loading={mediaMutation.isPending}
                  size="sm"
                  flex={1}
                >
                  Add to Graph
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setUseSearchMode(true)}
                  size="sm"
                >
                  Use Search
                </Button>
              </HStack>
            </VStack>
          </form>
        )}

        {/* Search Results */}
        {useSearchMode &&
          searchMutation.data?.media &&
          searchMutation.data.media.length > 0 && (
            <Box
              mt={3}
              maxH="300px"
              overflowY="auto"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="md"
              p={2}
            >
              <VStack align="stretch" gap={2}>
                {searchMutation.data.media.map((item) => {
                  if (!item) return null
                  return (
                    <Card.Root
                      key={item.id}
                      cursor="pointer"
                      onClick={() => handleSelectSearchResult(item.id)}
                      _hover={{ bg: "gray.50" }}
                      p={2}
                      size="sm"
                    >
                      <HStack gap={2}>
                        {item.coverImage?.medium && (
                          <Image
                            src={item.coverImage.medium}
                            alt={item.title?.romaji || "Cover"}
                            w="40px"
                            h="60px"
                            objectFit="cover"
                            borderRadius="sm"
                          />
                        )}
                        <VStack align="start" flex={1} gap={0.5}>
                          <Text fontWeight="bold" fontSize="xs" noOfLines={2}>
                            {item.title?.romaji ||
                              item.title?.english ||
                              item.title?.native}{" "}
                            {item.startDate?.year
                              ? `(${item.startDate.year})`
                              : ""}
                          </Text>
                          <HStack gap={1} fontSize="xs" color="gray.600">
                            {item.type && <Text>{item.type}</Text>}
                            {item.format && <Text>• {item.format}</Text>}
                          </HStack>
                        </VStack>
                      </HStack>
                    </Card.Root>
                  )
                })}
              </VStack>
            </Box>
          )}
      </Box>

      <Separator my={4} />

      {/* Graph Filters */}
      <Box px={4}>
        <VStack gap={3} align="stretch">
          <Checkbox
            checked={usePopularityCompensation}
            onCheckedChange={(details) => {
              navigate({
                to: "/",
                search: (prev: any) => ({
                  ...prev,
                  usePopularityCompensation:
                    details.checked === true || undefined,
                }),
                replace: false,
              })
            }}
          >
            <Text fontSize="sm" fontWeight="medium">
              Popularity Compensation
            </Text>
          </Checkbox>

          <Separator my={3} />

          <VStack align="stretch" gap={2}>
            <Text fontSize="sm" fontWeight="medium">
              Hide Status:
            </Text>
            <VStack align="stretch" gap={1}>
              <Checkbox
                checked={searchParams?.hideNotOnList || false}
                onCheckedChange={(details) => {
                  navigate({
                    to: "/",
                    search: (prev: any) => ({
                      ...prev,
                      hideNotOnList: details.checked || undefined,
                    }),
                    replace: false,
                  })
                }}
                size="sm"
              >
                <HStack gap={1}>
                  <Box w={2} h={2} borderRadius="full" bg="#aaaaaa" />
                  <Text fontSize="xs">Not on List</Text>
                </HStack>
              </Checkbox>
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
                  <Checkbox
                    key={status}
                    checked={isChecked}
                    onCheckedChange={(details) => {
                      const newSet = new Set(statusFilter)
                      if (details.checked) {
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
                    size="sm"
                  >
                    <HStack gap={1}>
                      <Box
                        w={2}
                        h={2}
                        borderRadius="full"
                        bg={STATUS_COLORS[status]}
                      />
                      <Text fontSize="xs">{displayText}</Text>
                    </HStack>
                  </Checkbox>
                )
              })}
            </VStack>
          </VStack>
        </VStack>
      </Box>
    </>
  )
}

export default SidebarItems
