from fastapi.encoders import jsonable_encoder
from pwdlib.hashers.bcrypt import BcryptHasher
from sqlmodel import Session

from app.auth import service as auth_service
from app.auth.security import verify_password
from app.users import service as user_service
from app.users.models import User
from app.users.schemas import UserCreate, UserUpdate
from tests.utils.utils import random_email, random_lower_string


def test_create_user(session_scoped_db: Session) -> None:
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password)
    user = user_service.create_user(session=session_scoped_db, user_create=user_in)
    assert user.email == email
    assert hasattr(user, "hashed_password")


def test_authenticate_user(session_scoped_db: Session) -> None:
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password)
    user = user_service.create_user(session=session_scoped_db, user_create=user_in)
    authenticated_user = auth_service.authenticate(
        session=session_scoped_db,
        email=email,
        password=password,
    )
    assert authenticated_user
    assert user.email == authenticated_user.email


def test_not_authenticate_user(session_scoped_db: Session) -> None:
    email = random_email()
    password = random_lower_string()
    user = auth_service.authenticate(
        session=session_scoped_db,
        email=email,
        password=password,
    )
    assert user is None


def test_check_if_user_is_active(session_scoped_db: Session) -> None:
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password)
    user = user_service.create_user(session=session_scoped_db, user_create=user_in)
    assert user.is_active is True


def test_check_if_user_is_active_inactive(session_scoped_db: Session) -> None:
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password, is_active=False)
    user = user_service.create_user(session=session_scoped_db, user_create=user_in)
    assert user.is_active is False


def test_check_if_user_is_superuser(session_scoped_db: Session) -> None:
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password, is_superuser=True)
    user = user_service.create_user(session=session_scoped_db, user_create=user_in)
    assert user.is_superuser is True


def test_check_if_user_is_superuser_normal_user(session_scoped_db: Session) -> None:
    username = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=username, password=password)
    user = user_service.create_user(session=session_scoped_db, user_create=user_in)
    assert user.is_superuser is False


def test_get_user(session_scoped_db: Session) -> None:
    password = random_lower_string()
    username = random_email()
    user_in = UserCreate(email=username, password=password, is_superuser=True)
    user = user_service.create_user(session=session_scoped_db, user_create=user_in)
    user_2 = session_scoped_db.get(User, user.id)
    assert user_2
    assert user.email == user_2.email
    assert jsonable_encoder(user) == jsonable_encoder(user_2)


def test_get_user_by_email_case_insensitive(session_scoped_db: Session) -> None:
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password)
    user = user_service.create_user(session=session_scoped_db, user_create=user_in)
    found_user = user_service.get_user_by_email(
        session=session_scoped_db,
        email=email.upper(),
    )
    assert found_user
    assert found_user.id == user.id


def test_update_user(session_scoped_db: Session) -> None:
    password = random_lower_string()
    email = random_email()
    user_in = UserCreate(email=email, password=password, is_superuser=True)
    user = user_service.create_user(session=session_scoped_db, user_create=user_in)
    new_password = random_lower_string()
    user_in_update = UserUpdate(password=new_password, is_superuser=True)
    if user.id is not None:
        user_service.update_user(
            session=session_scoped_db,
            db_user=user,
            user_in=user_in_update,
        )
    user_2 = session_scoped_db.get(User, user.id)
    assert user_2
    assert user.email == user_2.email
    verified, _ = verify_password(new_password, user_2.hashed_password)
    assert verified


def test_authenticate_user_with_bcrypt_upgrades_to_argon2(
    session_scoped_db: Session,
) -> None:
    """Test that a user with bcrypt password hash gets upgraded to argon2 on login."""
    email = random_email()
    password = random_lower_string()

    # Create a bcrypt hash directly (simulating legacy password)
    bcrypt_hasher = BcryptHasher()
    bcrypt_hash = bcrypt_hasher.hash(password)
    assert bcrypt_hash.startswith("$2")  # bcrypt hashes start with $2

    # Create user with bcrypt hash directly in the database
    user = User(email=email, hashed_password=bcrypt_hash)
    session_scoped_db.add(user)
    session_scoped_db.commit()
    session_scoped_db.refresh(user)

    # Verify the hash is bcrypt before authentication
    assert user.hashed_password.startswith("$2")

    # Authenticate - this should upgrade the hash to argon2
    authenticated_user = auth_service.authenticate(
        session=session_scoped_db,
        email=email,
        password=password,
    )
    assert authenticated_user
    assert authenticated_user.email == email

    session_scoped_db.refresh(authenticated_user)

    # Verify the hash was upgraded to argon2
    assert authenticated_user.hashed_password.startswith("$argon2")

    verified, updated_hash = verify_password(
        password,
        authenticated_user.hashed_password,
    )
    assert verified
    # Should not need another update since it's already argon2
    assert updated_hash is None
