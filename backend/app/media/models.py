from __future__ import annotations

from datetime import datetime

from sqlmodel import DateTime, Field, SQLModel

from app.utils import tz_datetime

SA_TYPE = DateTime(timezone=True)


class BaseMetadataMixin(SQLModel):
    """Mixin to add created_at and modified_at fields to a model."""

    # This is basically the same as the "official" example of how to implement a
    # created_at timestamp as seen here:
    # https://github.com/fastapi/full-stack-fastapi-template/blob/master/backend/app/models.py
    # call-overload - From the original template
    created_at: datetime = Field(sa_type=SA_TYPE, default_factory=tz_datetime.now)  # type: ignore[call-overload]

    # This is basically the same as the implementation of created_at, but it includes
    # the addition of an onupdate to automatically update the timestamp when the record
    # is modified.
    modified_at: datetime = Field(
        sa_type=SA_TYPE,  # type: ignore[call-overload]
        sa_column_kwargs={"onupdate": tz_datetime.now},
        default_factory=tz_datetime.now,
    )

    data_timestamp: datetime | None = Field(sa_type=SA_TYPE, default=None)  #  type: ignore[call-overload]
    update_at: datetime | None = Field(sa_type=SA_TYPE, default=None)  # type: ignore[call-overload]
    deleted_at: datetime | None = Field(sa_type=SA_TYPE, default=None)  # type: ignore[call-overload]


class MediaFile(BaseMetadataMixin, table=True):
    id: int = Field(primary_key=True)
    content: str = Field()


class UserFile(BaseMetadataMixin, table=True):
    id: str = Field(primary_key=True)
    content: str = Field()


class SearchFile(BaseMetadataMixin, table=True):
    search_query: str = Field(primary_key=True)
    content: str = Field()
