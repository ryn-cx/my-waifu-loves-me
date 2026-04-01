import uuid

from fastapi import status
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.config import settings
from tests.items.utils import create_random_item


def test_create_item(
    session_scoped_client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    data = {"title": "Foo", "description": "Fighters"}
    response = session_scoped_client.post(
        f"{settings.API_V1_STR}/items/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["title"] == data["title"]
    assert content["description"] == data["description"]
    assert "id" in content
    assert "owner_id" in content


def test_read_item(
    session_scoped_client: TestClient,
    superuser_token_headers: dict[str, str],
    session_scoped_db: Session,
) -> None:
    item = create_random_item(session_scoped_db)
    response = session_scoped_client.get(
        f"{settings.API_V1_STR}/items/{item.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["title"] == item.title
    assert content["description"] == item.description
    assert content["id"] == str(item.id)
    assert content["owner_id"] == str(item.owner_id)


def test_read_item_not_found(
    session_scoped_client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    response = session_scoped_client.get(
        f"{settings.API_V1_STR}/items/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    content = response.json()
    assert content["detail"] == "Item not found"


def test_read_item_not_enough_permissions(
    session_scoped_client: TestClient,
    normal_user_token_headers: dict[str, str],
    session_scoped_db: Session,
) -> None:
    item = create_random_item(session_scoped_db)
    response = session_scoped_client.get(
        f"{settings.API_V1_STR}/items/{item.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    content = response.json()
    assert content["detail"] == "Not enough permissions"


def test_read_items(
    session_scoped_client: TestClient,
    superuser_token_headers: dict[str, str],
    session_scoped_db: Session,
) -> None:
    create_random_item(session_scoped_db)
    create_random_item(session_scoped_db)
    response = session_scoped_client.get(
        f"{settings.API_V1_STR}/items/",
        headers=superuser_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    expected_number_of_items = 2
    assert len(content["data"]) >= expected_number_of_items


def test_update_item(
    session_scoped_client: TestClient,
    superuser_token_headers: dict[str, str],
    session_scoped_db: Session,
) -> None:
    item = create_random_item(session_scoped_db)
    data = {"title": "Updated title", "description": "Updated description"}
    response = session_scoped_client.put(
        f"{settings.API_V1_STR}/items/{item.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["title"] == data["title"]
    assert content["description"] == data["description"]
    assert content["id"] == str(item.id)
    assert content["owner_id"] == str(item.owner_id)


def test_update_item_not_found(
    session_scoped_client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    data = {"title": "Updated title", "description": "Updated description"}
    response = session_scoped_client.put(
        f"{settings.API_V1_STR}/items/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    content = response.json()
    assert content["detail"] == "Item not found"


def test_update_item_not_enough_permissions(
    session_scoped_client: TestClient,
    normal_user_token_headers: dict[str, str],
    session_scoped_db: Session,
) -> None:
    item = create_random_item(session_scoped_db)
    data = {"title": "Updated title", "description": "Updated description"}
    response = session_scoped_client.put(
        f"{settings.API_V1_STR}/items/{item.id}",
        headers=normal_user_token_headers,
        json=data,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    content = response.json()
    assert content["detail"] == "Not enough permissions"


def test_delete_item(
    session_scoped_client: TestClient,
    superuser_token_headers: dict[str, str],
    session_scoped_db: Session,
) -> None:
    item = create_random_item(session_scoped_db)
    response = session_scoped_client.delete(
        f"{settings.API_V1_STR}/items/{item.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    content = response.json()
    assert content["message"] == "Item deleted successfully"


def test_delete_item_not_found(
    session_scoped_client: TestClient,
    superuser_token_headers: dict[str, str],
) -> None:
    response = session_scoped_client.delete(
        f"{settings.API_V1_STR}/items/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    content = response.json()
    assert content["detail"] == "Item not found"


def test_delete_item_not_enough_permissions(
    session_scoped_client: TestClient,
    normal_user_token_headers: dict[str, str],
    session_scoped_db: Session,
) -> None:
    item = create_random_item(session_scoped_db)
    response = session_scoped_client.delete(
        f"{settings.API_V1_STR}/items/{item.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    content = response.json()
    assert content["detail"] == "Not enough permissions"
