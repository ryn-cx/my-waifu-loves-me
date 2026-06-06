from collections.abc import Generator
from importlib import import_module
from typing import Annotated

from fastapi import Depends
from sqlmodel import Session, create_engine

from app.config import settings
from app.constants import APP_PATH

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


def get_db() -> Generator[Session]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]


def automatically_import_models() -> None:
    """Dynamically import all of the database models."""
    for model_file in APP_PATH.glob("*/models.py"):
        import_module(f"app.{model_file.parent.name}.models")


def init_db() -> None:
    # make sure all SQLModel models are imported before initializing DB otherwise,
    # SQLModel might fail to initialize relationships properly for more details:
    # https://github.com/fastapi/full-stack-fastapi-template/issues/28
    automatically_import_models()

    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next lines
    # # ERA001 - Error from original template.
    # from sqlmodel import SQLModel # noqa: ERA001
    # SQLModel.metadata.create_all(engine) # noqa: ERA001
