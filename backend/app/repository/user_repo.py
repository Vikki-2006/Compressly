from sqlalchemy.orm import Session
from app.models.user import UserModel
import uuid
from datetime import datetime, timezone


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: str) -> UserModel:
        """Fetch user by id."""
        return self.db.query(UserModel).filter(UserModel.id == user_id).first()

    def get_by_username(self, username: str) -> UserModel:
        """Fetch user by username."""
        return self.db.query(UserModel).filter(UserModel.username == username).first()

    def get_by_email(self, email: str) -> UserModel:
        """Fetch user by email."""
        return self.db.query(UserModel).filter(UserModel.email == email).first()

    def create(self, username: str, email: str, hashed_password: str) -> UserModel:
        """Create new user account."""
        user = UserModel(
            id=str(uuid.uuid4()),
            username=username,
            email=email,
            hashed_password=hashed_password,
            is_active=True,
            is_admin=False,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
