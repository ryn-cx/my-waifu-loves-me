"""GraphQL schema models for AniList API user queries."""

from enum import Enum
from typing import TypeAlias

from pydantic import BaseModel, Field

# Type aliases
Int: TypeAlias = int
String: TypeAlias = str


class MediaType(Enum):
    """
    Media type enum, anime or manga.
    """

    anime = "ANIME"
    manga = "MANGA"


class MediaListStatus(Enum):
    """
    Media list watching/reading status enum.
    """

    completed = "COMPLETED"
    current = "CURRENT"
    dropped = "DROPPED"
    paused = "PAUSED"
    planning = "PLANNING"
    repeating = "REPEATING"


class MediaList(BaseModel):
    """
    List of anime or manga.
    """

    media_id: Int = Field(..., alias="mediaId", description="The id of the media")


class MediaListGroup(BaseModel):
    """
    List group of anime or manga entries.
    """

    entries: list[MediaList | None] | None = Field(
        None, description="Media list entries"
    )
    status: MediaListStatus | None = None


class MediaListCollection(BaseModel):
    """
    List of anime or manga.
    """

    lists: list[MediaListGroup | None] | None = Field(
        None, description="Grouped media list entries"
    )
