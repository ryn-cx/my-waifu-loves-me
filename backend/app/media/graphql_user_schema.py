"""GraphQL schema models for AniList API user queries."""

from enum import Enum
from typing import TypeAlias

from pydantic import BaseModel

# Type aliases
Int: TypeAlias = int
String: TypeAlias = str


class MediaType(str, Enum):
    """Type of media; anime or manga."""

    anime = "ANIME"
    manga = "MANGA"


class MediaListStatus(str, Enum):
    """Media list watching/reading status enum."""

    completed = "COMPLETED"
    current = "CURRENT"
    dropped = "DROPPED"
    paused = "PAUSED"
    planning = "PLANNING"
    repeating = "REPEATING"


class MediaList(BaseModel):
    """List of anime or manga."""

    mediaId: Int


class MediaListGroup(BaseModel):
    """List group of anime or manga entries."""

    entries: list[MediaList | None] | None
    status: MediaListStatus | None


class MediaListCollection(BaseModel):
    """List of anime or manga."""

    lists: list[MediaListGroup | None] | None
