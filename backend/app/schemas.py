from sqlmodel import SQLModel


class Message(SQLModel):
    """Generic message."""

    message: str
