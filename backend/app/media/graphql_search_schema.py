"""GraphQL schema models for AniList API search queries."""

from __future__ import annotations

from enum import Enum
from typing import Literal, TypeAlias

from pydantic import BaseModel, ConfigDict, Field

# Type aliases
Int: TypeAlias = int
String: TypeAlias = str
Boolean: TypeAlias = bool


class MediaType(Enum):
    """
    Media type enum, anime or manga.
    """

    anime = "ANIME"
    manga = "MANGA"


class MediaFormat(Enum):
    """
    The format the media was released in
    """

    manga = "MANGA"
    movie = "MOVIE"
    music = "MUSIC"
    novel = "NOVEL"
    ona = "ONA"
    one_shot = "ONE_SHOT"
    ova = "OVA"
    special = "SPECIAL"
    tv = "TV"
    tv_short = "TV_SHORT"


class MediaStatus(Enum):
    """
    The current releasing status of the media
    """

    cancelled = "CANCELLED"
    finished = "FINISHED"
    hiatus = "HIATUS"
    not_yet_released = "NOT_YET_RELEASED"
    releasing = "RELEASING"


class FuzzyDate(BaseModel):
    """
    Date object that allows for incomplete date values (fuzzy)
    """

    model_config = ConfigDict(
        extra="forbid",
    )
    day: Int | None = Field(None, description="Numeric Day (24)")
    month: Int | None = Field(None, description="Numeric Month (3)")
    year: Int | None = Field(None, description="Numeric Year (2017)")
    typename__: Literal["FuzzyDate"] | None = Field("FuzzyDate", alias="__typename")


class MediaTitle(BaseModel):
    """
    The official titles of the media in various languages
    """

    model_config = ConfigDict(
        extra="forbid",
    )
    english: String | None = Field(None, description="The official english title")
    native: String | None = Field(
        None, description="Official title in it's native language"
    )
    romaji: String | None = Field(
        None, description="The romanization of the native language title"
    )


class MediaCoverImage(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )

    large: String | None = Field(
        None, description="The cover image url of the media at a large size"
    )
    medium: String | None = Field(
        None, description="The cover image url of the media at medium size"
    )


class Media(BaseModel):
    """
    Anime or Manga
    """

    model_config = ConfigDict(
        extra="forbid",
    )

    id: Int = Field(..., description="The id of the media")
    title: MediaTitle | None = Field(
        None, description="The official titles of the media in various languages"
    )
    cover_image: MediaCoverImage | None = Field(
        None, alias="coverImage", description="The cover images of the media"
    )
    type: MediaType | None = Field(
        None, description="The type of the media; anime or manga"
    )
    format: MediaFormat | None = Field(
        None, description="The format the media was released in"
    )
    status: MediaStatus | None = Field(
        None, description="The current releasing status of the media"
    )
    average_score: Int | None = Field(
        None,
        alias="averageScore",
        description="A weighted average score of all the user's scores of the media",
    )

    start_date: FuzzyDate | None = Field(
        None,
        alias="startDate",
        description="The first official release date of the media",
    )


class PageInfo(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    current_page: Int | None = Field(
        None, alias="currentPage", description="The current page"
    )
    has_next_page: Boolean | None = Field(
        None, alias="hasNextPage", description="If there is another page"
    )
    last_page: Int | None = Field(None, alias="lastPage", description="The last page")
    per_page: Int | None = Field(
        None, alias="perPage", description="The count on a page"
    )
    total: Int | None = Field(
        None,
        description="The total number of items. Note: This value is not guaranteed to be accurate, do not rely on this for logic",
    )
    typename__: Literal["PageInfo"] | None = Field("PageInfo", alias="__typename")


class SearchPage(BaseModel):
    """Search page response."""

    pageInfo: PageInfo | None = None
    media: list[Media | None] | None = None
