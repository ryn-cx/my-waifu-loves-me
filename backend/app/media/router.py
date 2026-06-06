import json
import logging
import threading
import time
from datetime import timedelta
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Header, HTTPException, status
from sqlmodel import select

from app.database import SessionDep
from app.media.graphql_media_schema import Media
from app.media.graphql_search_schema import SearchPage
from app.media.graphql_user_schema import MediaListCollection
from app.media.models import MediaFile, SearchFile, UserFile
from app.media.queries import MEDIA_QUERY, SEARCH_QUERY, USER_QUERY
from app.utils import tz_datetime

router = APIRouter(tags=["media"])


logger = logging.getLogger(__name__)

AnilistToken = Annotated[str | None, Header(alias="X-Anilist-Token")]


ANILIST_URL = "https://graphql.anilist.co"

_DEFAULT_RATE_LIMIT_PER_MINUTE = 30
_MAX_RATE_LIMIT_RETRIES = 3
_RATE_LIMIT_FALLBACK_COOLDOWN = 60.0


class _RateLimiter:
    """Spaces and backs off AniList requests to respect the API rate limit.

    A single shared instance is used by every request so concurrent callers are
    throttled together rather than each tracking their own budget.
    """

    def __init__(self, requests_per_minute: int) -> None:
        self._lock = threading.Lock()
        # Minimum seconds between consecutive requests.
        self._min_interval = 60.0 / requests_per_minute
        # Earliest monotonic-clock time at which the next request may be sent.
        self._next_request_at = 0.0

    def reserve_slot(self) -> None:
        """Block until the caller is allowed to issue the next request.

        Spaces requests by the observed rate limit so concurrent callers (e.g. a
        relations traversal fetching many media at once) don't burst past the
        cap.
        """
        with self._lock:
            start_at = max(time.monotonic(), self._next_request_at)
            self._next_request_at = start_at + self._min_interval

        delay = start_at - time.monotonic()
        if delay > 0:
            time.sleep(delay)

    def apply_cooldown(self, seconds: float) -> None:
        """Delay all subsequent requests by ``seconds`` (a hard backoff)."""
        if seconds <= 0:
            return
        with self._lock:
            self._next_request_at = max(
                self._next_request_at,
                time.monotonic() + seconds,
            )

    def learn_limit(self, headers: httpx.Headers) -> None:
        """Tighten request spacing from the X-RateLimit-Limit header."""
        raw_limit = headers.get("X-RateLimit-Limit")
        if raw_limit is None:
            return
        try:
            limit = int(raw_limit)
        except ValueError:
            return
        if limit <= 0:
            return
        with self._lock:
            self._min_interval = 60.0 / limit


_rate_limiter = _RateLimiter(_DEFAULT_RATE_LIMIT_PER_MINUTE)


def _retry_after_seconds(headers: httpx.Headers) -> float:
    """How long to wait after a 429, from Retry-After or X-RateLimit-Reset."""
    raw_retry_after = headers.get("Retry-After")
    if raw_retry_after is not None:
        try:
            return max(0.0, float(raw_retry_after))
        except ValueError:
            pass

    raw_reset = headers.get("X-RateLimit-Reset")
    if raw_reset is not None:
        try:
            return max(0.0, float(raw_reset) - time.time())
        except ValueError:
            pass

    return _RATE_LIMIT_FALLBACK_COOLDOWN


def graphql_request(
    query: str,
    variables: dict[str, int | str],
    access_token: str | None = None,
) -> dict[str, Any]:
    headers: dict[str, str] = {}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    payload = {"query": query, "variables": variables}

    for attempt in range(_MAX_RATE_LIMIT_RETRIES + 1):
        _rate_limiter.reserve_slot()

        response = httpx.post(ANILIST_URL, headers=headers, json=payload, timeout=60)
        _rate_limiter.learn_limit(response.headers)

        if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
            cooldown = _retry_after_seconds(response.headers)
            _rate_limiter.apply_cooldown(cooldown)
            logger.warning(
                "AniList rate limit hit (attempt %d/%d); waiting %.1fs before retry",
                attempt + 1,
                _MAX_RATE_LIMIT_RETRIES + 1,
                cooldown,
            )
            continue

        if response.status_code != status.HTTP_200_OK:
            msg = f"Unexpected response status code: {response.status_code}"
            raise ValueError(msg)

        # If the window is drained, hold off the next request until it resets so
        # we don't deliberately walk into a 429.
        raw_remaining = response.headers.get("X-RateLimit-Remaining")
        raw_reset = response.headers.get("X-RateLimit-Reset")
        if raw_remaining is not None and raw_reset is not None:
            try:
                if int(raw_remaining) <= 0:
                    _rate_limiter.apply_cooldown(float(raw_reset) - time.time())
            except ValueError:
                pass

        output = response.json()
        if output.get("errors"):
            msg = f"GraphQL errors occurred: {output['errors']}"
            raise ValueError(msg)
        return output

    msg = f"AniList rate limit exceeded after {_MAX_RATE_LIMIT_RETRIES + 1} attempts"
    raise ValueError(msg)


MAX_CACHE_AGE = timedelta(days=30)


def _is_outdated(data_timestamp: tz_datetime.datetime | None) -> bool:
    return data_timestamp is None or tz_datetime.now() - data_timestamp > MAX_CACHE_AGE


@router.get("/media/{media_id}")
def read_media(
    session: SessionDep,
    media_id: int,
    anilist_token: AnilistToken = None,
) -> Media:
    """
    Retrieve media.
    """

    statement = select(MediaFile).where(MediaFile.id == media_id)
    media_file = session.exec(statement).first()

    if not media_file or _is_outdated(media_file.data_timestamp):
        try:
            graphql_data = graphql_request(
                MEDIA_QUERY,
                {"mediaId": media_id},
                anilist_token,
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e),
            ) from e

        if media_file:
            media_file.content = json.dumps(graphql_data["data"]["Media"])
            media_file.data_timestamp = tz_datetime.now()
            reason = "refresh"
        else:
            media_file = MediaFile(
                id=media_id,
                content=json.dumps(graphql_data["data"]["Media"]),
                data_timestamp=tz_datetime.now(),
            )
            session.add(media_file)
            reason = "new"
        session.commit()
        session.refresh(media_file)
        logger.info("Downloaded media %s from AniList (%s)", media_id, reason)

    return Media.model_validate_json(media_file.content)


@router.get("/user/{user_name}", tags=["user"])
def read_user(
    session: SessionDep,
    user_name: str,
    anilist_token: AnilistToken = None,
) -> MediaListCollection:
    """
    Retrieve user's media list.
    """

    statement = select(UserFile).where(UserFile.id == user_name.lower())
    user_file = session.exec(statement).first()

    if not user_file or _is_outdated(user_file.data_timestamp):
        try:
            raw_anime = graphql_request(
                USER_QUERY,
                {"userName": user_name, "type": "ANIME"},
                anilist_token,
            )
            raw_manga = graphql_request(
                USER_QUERY,
                {"userName": user_name, "type": "MANGA"},
                anilist_token,
            )
        except ValueError as e:
            if "Private" in str(e):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User list is private. Login with AniList to access it.",
                ) from e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e),
            ) from e

        anime_data = MediaListCollection.model_validate(
            raw_anime["data"]["MediaListCollection"],
        )
        manga_data = MediaListCollection.model_validate(
            raw_manga["data"]["MediaListCollection"],
        )

        combined_data = MediaListCollection(
            lists=[
                *(anime_data.lists or []),
                *(manga_data.lists or []),
            ],
        )

        if user_file:
            user_file.content = combined_data.model_dump_json(by_alias=True)
            user_file.data_timestamp = tz_datetime.now()
            reason = "refresh"
        else:
            user_file = UserFile(
                id=user_name.lower(),
                content=combined_data.model_dump_json(by_alias=True),
                data_timestamp=tz_datetime.now(),
            )
            session.add(user_file)
            reason = "new"
        session.commit()
        session.refresh(user_file)
        logger.info("Downloaded user list %r from AniList (%s)", user_name, reason)

    return MediaListCollection.model_validate_json(user_file.content)


@router.get("/search/{search_query}", tags=["search"])
def search_media(
    session: SessionDep,
    search_query: str,
    media_type: str,
    anilist_token: AnilistToken = None,
) -> SearchPage:
    """
    Search for media by title.
    media_type can be 'ANIME' or 'MANGA'.
    """
    if media_type not in ("ANIME", "MANGA"):
        msg = "media_type must be 'ANIME' or 'MANGA'."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    cache_key = f"{search_query}:{media_type or 'ALL'}"
    statement = select(SearchFile).where(SearchFile.search_query == cache_key)
    search_file = session.exec(statement).first()

    if not search_file or _is_outdated(search_file.data_timestamp):
        variables: dict[str, Any] = {
            "search": search_query,
            "page": 1,
            "perPage": 20,
            "type": media_type,
        }

        graphql_data = graphql_request(SEARCH_QUERY, variables, anilist_token)

        if search_file:
            search_file.content = json.dumps(graphql_data["data"]["Page"])
            search_file.data_timestamp = tz_datetime.now()
            reason = "refresh"
        else:
            search_file = SearchFile(
                search_query=cache_key,
                content=json.dumps(graphql_data["data"]["Page"]),
                data_timestamp=tz_datetime.now(),
            )
            session.add(search_file)
            reason = "new"
        session.commit()
        session.refresh(search_file)
        logger.info(
            "Downloaded search results for %r [%s] from AniList (%s)",
            search_query,
            media_type,
            reason,
        )

    return SearchPage.model_validate_json(search_file.content)
