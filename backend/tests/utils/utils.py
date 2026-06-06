import random
import string


def random_lower_string() -> str:
    # S311 - This does not need to be cryptographically secure.
    return "".join(random.choices(string.ascii_lowercase, k=32))  # noqa: S311


def random_email() -> str:
    return f"{random_lower_string()}@{random_lower_string()}.com"
