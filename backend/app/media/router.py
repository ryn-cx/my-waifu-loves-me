import json
import logging
from typing import Any

import requests
from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.dependencies import SessionDep
from app.media.graphql_media_schema import Media
from app.media.graphql_search_schema import SearchPage
from app.media.graphql_user_schema import MediaListCollection
from app.media.models import MediaFile, SearchFile, UserFile
from app.media.query import MEDIA_QUERY, SEARCH_QUERY, USER_QUERY
from app.utils import tz_datetime

router = APIRouter(prefix="/media", tags=["media"])


logger = logging.getLogger(__name__)


def graphql_request(query: str, variables: dict[str, int | str]) -> dict[str, Any]:
    response = requests.post(
        "https://graphql.anilist.co",
        json={
            "query": query,
            "variables": variables,
        },
        timeout=60,
    )

    if response.status_code != 200:  # noqa: PLR2004
        msg = f"Unexpected response status code: {response.status_code}"
        raise ValueError(msg)

    output = response.json()

    if output.get("errors"):
        msg = f"GraphQL errors occurred: {output['errors']}"
        raise ValueError(msg)

    return output


@router.get("/{media_id}")
def read_media(session: SessionDep, media_id: int) -> Media:
    """
    Retrieve media.
    """

    statement = select(MediaFile).where(MediaFile.id == media_id)
    media_file = session.exec(statement).first()

    if not media_file:
        graphql_data = graphql_request(MEDIA_QUERY, {"mediaId": media_id})

        media_file = MediaFile(
            id=media_id,
            content=json.dumps(graphql_data["data"]["Media"]),
            data_timestamp=tz_datetime.now(),
        )
        session.add(media_file)
        session.commit()
        session.refresh(media_file)

    return Media.model_validate_json(media_file.content)


@router.get("/user/{user_name}")
def read_user(session: SessionDep, user_name: str) -> MediaListCollection:
    """
    Retrieve media.
    """

    statement = select(UserFile).where(UserFile.id == user_name.lower())
    user_file = session.exec(statement).first()

    if not user_file:
        raw_anime = graphql_request(
            USER_QUERY, {"userName": user_name, "type": "ANIME"}
        )
        raw_manga = graphql_request(
            USER_QUERY, {"userName": user_name, "type": "MANGA"}
        )

        anime_data = MediaListCollection.model_validate(
            raw_anime["data"]["MediaListCollection"]
        )
        manga_data = MediaListCollection.model_validate(
            raw_manga["data"]["MediaListCollection"]
        )

        combined_data = MediaListCollection(
            lists=[
                *(anime_data.lists or []),
                *(manga_data.lists or []),
            ]
        )

        user_file = UserFile(
            id=user_name.lower(),
            content=json.dumps(combined_data.model_dump()),
            data_timestamp=tz_datetime.now(),
        )
        session.add(user_file)
        session.commit()
        session.refresh(user_file)

    return MediaListCollection.model_validate_json(user_file.content)


@router.get("/search/{search_query}")
def search_media(
    session: SessionDep,
    search_query: str,
    media_type: str,
) -> SearchPage:
    """
    Search for media by title.
    media_type can be 'ANIME', 'MANGA', or None for both.
    """
    if media_type not in ("ANIME", "MANGA"):
        msg = "media_type must be 'ANIME' or 'MANGA'."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    cache_key = f"{search_query}:{media_type or 'ALL'}"
    statement = select(SearchFile).where(SearchFile.search_query == cache_key)
    search_file = session.exec(statement).first()

    if not search_file:
        variables: dict[str, Any] = {
            "search": search_query,
            "page": 1,
            "perPage": 20,
            "type": media_type,
        }

        graphql_data = graphql_request(SEARCH_QUERY, variables)

        search_file = SearchFile(
            search_query=cache_key,
            content=json.dumps(graphql_data["data"]["Page"]),
            data_timestamp=tz_datetime.now(),
        )
        session.add(search_file)
        session.commit()
        session.refresh(search_file)

    return SearchPage.model_validate_json(search_file.content)
