from unittest.mock import patch

from fastapi import status
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.config import settings
from app.media.models import MediaFile, UserFile

MOCK_MEDIA_RESPONSE = {
    "data": {
        "Media": {
            "id": 1,
            "title": {
                "romaji": "Cowboy Bebop",
                "english": "Cowboy Bebop",
                "native": "カウボーイビバップ",
            },
            "averageScore": 86,
            "bannerImage": None,
            "chapters": None,
            "coverImage": {
                "extraLarge": None,
                "large": None,
                "medium": None,
                "color": None,
            },
            "description": "A space bounty hunter crew.",
            "duration": 24,
            "endDate": {"year": 1999, "month": 4, "day": 24},
            "episodes": 26,
            "favourites": 20000,
            "format": "TV",
            "genres": ["Action", "Drama", "Sci-Fi"],
            "isAdult": False,
            "meanScore": 86,
            "popularity": 200000,
            "rankings": [],
            "season": "SPRING",
            "seasonYear": 1998,
            "startDate": {"year": 1998, "month": 4, "day": 3},
            "volumes": None,
            "studios": {
                "nodes": [{"name": "Sunrise", "id": 14, "isAnimationStudio": True}],
                "pageInfo": {
                    "total": 1,
                    "perPage": 25,
                    "currentPage": 1,
                    "lastPage": 1,
                    "hasNextPage": False,
                },
            },
            "type": "ANIME",
            "source": "ORIGINAL",
            "trailer": None,
            "countryOfOrigin": "JP",
            "idMal": 1,
            "siteUrl": "https://anilist.co/anime/1",
            "synonyms": [],
            "tags": [],
            "updatedAt": 1700000000,
            "status": "FINISHED",
            "externalLinks": [],
            "isLicensed": True,
            "recommendations": {
                "nodes": [
                    {
                        "id": 100,
                        "rating": 50,
                        "mediaRecommendation": {
                            "id": 5,
                            "title": {
                                "romaji": "Cowboy Bebop: Tengoku no Tobira",
                                "english": "Cowboy Bebop: Knockin' on Heaven's Door",
                                "native": None,
                            },
                            "averageScore": 82,
                            "bannerImage": None,
                            "chapters": None,
                            "coverImage": {
                                "extraLarge": None,
                                "large": None,
                                "medium": None,
                                "color": None,
                            },
                            "description": "A movie sequel.",
                            "duration": 115,
                            "endDate": {"year": 2001, "month": 9, "day": 1},
                            "episodes": 1,
                            "favourites": 5000,
                            "format": "MOVIE",
                            "genres": ["Action", "Drama", "Sci-Fi"],
                            "isAdult": False,
                            "meanScore": 82,
                            "popularity": 80000,
                            "rankings": [],
                            "season": None,
                            "seasonYear": None,
                            "startDate": {"year": 2001, "month": 9, "day": 1},
                            "volumes": None,
                            "studios": {
                                "nodes": [],
                                "pageInfo": {
                                    "total": 0,
                                    "perPage": 25,
                                    "currentPage": 1,
                                    "lastPage": 1,
                                    "hasNextPage": False,
                                },
                            },
                            "type": "ANIME",
                            "source": "ORIGINAL",
                            "trailer": None,
                            "countryOfOrigin": "JP",
                            "idMal": 5,
                            "siteUrl": "https://anilist.co/anime/5",
                            "synonyms": [],
                            "tags": [],
                            "updatedAt": 1700000000,
                            "status": "FINISHED",
                            "externalLinks": [],
                            "isLicensed": True,
                        },
                    },
                ],
            },
        },
    },
}

MOCK_USER_RESPONSE_ANIME = {
    "data": {
        "MediaListCollection": {
            "lists": [
                {
                    "entries": [{"mediaId": 1}, {"mediaId": 5}],
                    "status": "COMPLETED",
                },
                {
                    "entries": [{"mediaId": 20}],
                    "status": "PLANNING",
                },
            ],
        },
    },
}

MOCK_USER_RESPONSE_MANGA = {
    "data": {
        "MediaListCollection": {
            "lists": [
                {
                    "entries": [{"mediaId": 100}],
                    "status": "CURRENT",
                },
            ],
        },
    },
}

MOCK_SEARCH_RESPONSE = {
    "data": {
        "Page": {
            "pageInfo": {
                "total": 1,
                "currentPage": 1,
                "lastPage": 1,
                "hasNextPage": False,
                "perPage": 20,
            },
            "media": [
                {
                    "id": 1,
                    "title": {
                        "romaji": "Cowboy Bebop",
                        "english": "Cowboy Bebop",
                        "native": None,
                    },
                    "coverImage": {"medium": None, "large": None},
                    "type": "ANIME",
                    "format": "TV",
                    "status": "FINISHED",
                    "averageScore": 86,
                    "startDate": {"year": 1998, "month": 4, "day": 3},
                },
            ],
        },
    },
}


@patch("app.media.router.graphql_request")
def test_read_media(
    mock_graphql: object,
    session_scoped_client: TestClient,
    session_scoped_db: Session,
) -> None:
    mock_graphql.return_value = MOCK_MEDIA_RESPONSE  # type: ignore[attr-defined]

    response = session_scoped_client.get(
        f"{settings.API_V1_STR}/media/1",
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["id"] == 1
    assert content["title"]["romaji"] == "Cowboy Bebop"
    assert content["episodes"] == 26
    assert content["averageScore"] == 86
    assert len(content["recommendations"]["nodes"]) == 1


@patch("app.media.router.graphql_request")
def test_read_media_caches_response(
    mock_graphql: object,
    session_scoped_client: TestClient,
    session_scoped_db: Session,
) -> None:
    mock_graphql.return_value = MOCK_MEDIA_RESPONSE  # type: ignore[attr-defined]

    # First call should hit the API
    response1 = session_scoped_client.get(
        f"{settings.API_V1_STR}/media/999",
    )
    assert response1.status_code == status.HTTP_200_OK

    # Second call should use the cache
    response2 = session_scoped_client.get(
        f"{settings.API_V1_STR}/media/999",
    )
    assert response2.status_code == status.HTTP_200_OK

    # graphql_request should only be called once
    assert mock_graphql.call_count == 1  # type: ignore[attr-defined]

    # Verify it was stored in the database
    media_file = session_scoped_db.get(MediaFile, 999)
    assert media_file is not None
    assert media_file.content is not None


@patch("app.media.router.graphql_request")
def test_read_user(
    mock_graphql: object,
    session_scoped_client: TestClient,
    session_scoped_db: Session,
) -> None:
    mock_graphql.side_effect = [MOCK_USER_RESPONSE_ANIME, MOCK_USER_RESPONSE_MANGA]  # type: ignore[attr-defined]

    response = session_scoped_client.get(
        f"{settings.API_V1_STR}/user/testuser",
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["lists"] is not None
    # Should have combined anime + manga lists
    assert len(content["lists"]) == 3


@patch("app.media.router.graphql_request")
def test_read_user_caches_response(
    mock_graphql: object,
    session_scoped_client: TestClient,
    session_scoped_db: Session,
) -> None:
    mock_graphql.side_effect = [MOCK_USER_RESPONSE_ANIME, MOCK_USER_RESPONSE_MANGA]  # type: ignore[attr-defined]

    response1 = session_scoped_client.get(
        f"{settings.API_V1_STR}/user/cacheuser",
    )
    assert response1.status_code == status.HTTP_200_OK

    response2 = session_scoped_client.get(
        f"{settings.API_V1_STR}/user/cacheuser",
    )
    assert response2.status_code == status.HTTP_200_OK

    # Should only call graphql twice (once for anime, once for manga) on first request
    assert mock_graphql.call_count == 2  # type: ignore[attr-defined]

    user_file = session_scoped_db.get(UserFile, "cacheuser")
    assert user_file is not None


@patch("app.media.router.graphql_request")
def test_read_user_case_insensitive(
    mock_graphql: object,
    session_scoped_client: TestClient,
    session_scoped_db: Session,
) -> None:
    mock_graphql.side_effect = [MOCK_USER_RESPONSE_ANIME, MOCK_USER_RESPONSE_MANGA]  # type: ignore[attr-defined]

    response1 = session_scoped_client.get(
        f"{settings.API_V1_STR}/user/CaseUser",
    )
    assert response1.status_code == status.HTTP_200_OK

    # Same user, different case - should use cache
    response2 = session_scoped_client.get(
        f"{settings.API_V1_STR}/user/caseuser",
    )
    assert response2.status_code == status.HTTP_200_OK

    assert mock_graphql.call_count == 2  # type: ignore[attr-defined]


@patch("app.media.router.graphql_request")
def test_search_media(
    mock_graphql: object,
    session_scoped_client: TestClient,
    session_scoped_db: Session,
) -> None:
    mock_graphql.return_value = MOCK_SEARCH_RESPONSE  # type: ignore[attr-defined]

    response = session_scoped_client.get(
        f"{settings.API_V1_STR}/search/cowboy",
        params={"media_type": "ANIME"},
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["media"] is not None
    assert len(content["media"]) == 1
    assert content["media"][0]["title"]["romaji"] == "Cowboy Bebop"


@patch("app.media.router.graphql_request")
def test_search_media_caches_response(
    mock_graphql: object,
    session_scoped_client: TestClient,
    session_scoped_db: Session,
) -> None:
    mock_graphql.return_value = MOCK_SEARCH_RESPONSE  # type: ignore[attr-defined]

    response1 = session_scoped_client.get(
        f"{settings.API_V1_STR}/search/bebop",
        params={"media_type": "ANIME"},
    )
    assert response1.status_code == status.HTTP_200_OK

    response2 = session_scoped_client.get(
        f"{settings.API_V1_STR}/search/bebop",
        params={"media_type": "ANIME"},
    )
    assert response2.status_code == status.HTTP_200_OK

    assert mock_graphql.call_count == 1  # type: ignore[attr-defined]


def test_search_media_invalid_type(
    session_scoped_client: TestClient,
) -> None:
    response = session_scoped_client.get(
        f"{settings.API_V1_STR}/search/test",
        params={"media_type": "INVALID"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "media_type must be 'ANIME' or 'MANGA'."


@patch("app.media.router.graphql_request")
def test_read_media_graphql_error(
    mock_graphql: object,
    session_scoped_client: TestClient,
) -> None:
    mock_graphql.side_effect = ValueError("GraphQL errors occurred")  # type: ignore[attr-defined]

    response = session_scoped_client.get(
        f"{settings.API_V1_STR}/media/99999",
    )
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
