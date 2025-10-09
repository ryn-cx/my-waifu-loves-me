from datetime import datetime

from sqlmodel import TIMESTAMP, Field, SQLModel

from app.utils import tz_datetime


class BaseMetadataMixin(SQLModel):
    """Mixin to add created_at and modified_at fields to a model."""

    # sa_type will create the correct database structure but it will throw an error,
    # alternatives like sa_column have no type errors but when run have an error like
    # "Column entry 'modified_timestamp' already assigned to Table 'source'". For
    # further information see: https://github.com/fastapi/sqlmodel/discussions/743#discussioncomment-10562815

    created_at: datetime = Field(
        sa_type=TIMESTAMP(timezone=True),  # pyright: ignore[reportArgumentType]
        default_factory=tz_datetime.now,
        description="Automatically created by SQLModel. "
        "Timestamp when the record was created",
    )

    modified_at: datetime = Field(
        sa_type=TIMESTAMP(timezone=True),  # pyright: ignore[reportArgumentType]
        sa_column_kwargs={"onupdate": tz_datetime.now},
        default_factory=tz_datetime.now,
        description="Automatically updated by SQLModel. "
        "Timestamp when the record was last modified",
    )

    """Mixin to add created_at, modified_at, and id fields to a model."""

    # This is different than modified_at because modified_at will be updated if the user
    # modifies any value on the entry. This field is for tracking when the data was last
    # updated by the plugin.
    data_timestamp: datetime = Field(sa_type=TIMESTAMP(timezone=True))  # pyright: ignore[reportArgumentType]
    update_at: datetime | None = Field(sa_type=TIMESTAMP(timezone=True), default=None)  # pyright: ignore[reportArgumentType]
    deleted_at: datetime | None = Field(sa_type=TIMESTAMP(timezone=True), default=None)  # pyright: ignore[reportArgumentType]


class MediaFile(BaseMetadataMixin, table=True):
    id: int = Field(primary_key=True)
    content: str = Field()


class UserFile(BaseMetadataMixin, table=True):
    id: str = Field(primary_key=True)
    content: str = Field()


class SearchFile(BaseMetadataMixin, table=True):
    search_query: str = Field(primary_key=True)
    content: str = Field()
