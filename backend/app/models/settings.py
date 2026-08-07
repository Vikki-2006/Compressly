from sqlalchemy import Column, String
from app.database.connection import Base


class SettingsModel(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)
