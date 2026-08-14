from app.auth.auth_service import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database.connection import get_db
from app.models.user import UserModel
from app.repository.user_repo import UserRepository
from app.schemas.user import TokenResponse, UserCreate, UserResponse
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account with secure password hashing."""
    repo = UserRepository(db)

    # Validation checks
    if repo.get_by_username(user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    if repo.get_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered",
        )

    hashed = hash_password(user_data.password)
    user = repo.create(
        username=user_data.username, email=user_data.email, hashed_password=hashed
    )
    return user


@router.post("/login", response_model=TokenResponse)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    """Authenticate a user credentials and generate standard JWT access tokens."""
    repo = UserRepository(db)

    # Try username lookup, fall back to email lookup
    user = repo.get_by_username(form_data.username)
    if not user:
        user = repo.get_by_email(form_data.username)

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user account"
        )

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_user_profile(current_user: UserModel = Depends(get_current_user)):
    """Retrieve details of the currently logged-in user session."""
    return current_user
