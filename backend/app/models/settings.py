from app.database.connection import Base
from sqlalchemy import Column, String


class SettingsModel(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)
