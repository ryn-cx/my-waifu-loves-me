from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from pydantic_core import MultiHostUrl
from sqlmodel import Session, SQLModel, create_engine, delete, text

from app.config import settings
from app.database import init_db, load_models
from app.deps import get_db
from app.items.models import Item
from app.main import app
from app.tests.utils.user import authentication_token_from_email
from app.tests.utils.utils import get_superuser_token_headers
from app.users.models import User

TEST_POSTGRES_DB = settings.POSTGRES_DB + "_test"

TEST_DATABASE_URI = MultiHostUrl.build(
    scheme="postgresql+psycopg",
    username=settings.POSTGRES_USER,
    password=settings.POSTGRES_PASSWORD,
    host=settings.POSTGRES_SERVER,
    port=settings.POSTGRES_PORT,
    path=TEST_POSTGRES_DB,
)

test_engine = create_engine(str(TEST_DATABASE_URI))


def create_test_database() -> None:
    """Create the test database if it doesn't exist."""
    # Use the default database settings to create the test database
    postgres_engine = create_engine(
        str(settings.SQLALCHEMY_DATABASE_URI),
        isolation_level="AUTOCOMMIT",
    )
    with Session(postgres_engine) as session:
        # Check if database exists
        result = session.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :test_db_name"),
            {"test_db_name": TEST_POSTGRES_DB},
        )
        # If the database does not exist create it
        if not result.fetchone():
            session.execute(text(f'CREATE DATABASE "{TEST_POSTGRES_DB}"'))

    # Create the tables in the test database
    load_models()
    SQLModel.metadata.create_all(test_engine)


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session, None, None]:
    create_test_database()
    with Session(test_engine) as session:
        init_db(session)
        yield session
        statement = delete(Item)
        session.execute(statement)
        statement = delete(User)
        session.execute(statement)
        session.commit()


def get_test_db() -> Generator[Session, None, None]:
    """Database dependency override for testing."""
    with Session(test_engine) as session:
        yield session


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    # Override the get_db dependency so the test database is used
    app.dependency_overrides[get_db] = get_test_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="module")
def superuser_token_headers(client: TestClient) -> dict[str, str]:
    return get_superuser_token_headers(client)


@pytest.fixture(scope="module")
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    return authentication_token_from_email(
        client=client, email=settings.EMAIL_TEST_USER, db=db
    )
