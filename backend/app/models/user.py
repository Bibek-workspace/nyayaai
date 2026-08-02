"""User model — covers all six roles via a discriminator column."""
from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import UserRole


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Role-specific optional fields
    bar_council_id: Mapped[str | None] = mapped_column(String(100), nullable=True)  # lawyers
    court_id: Mapped[str | None] = mapped_column(String(100), nullable=True)         # judges/clerks
    designation: Mapped[str | None] = mapped_column(String(100), nullable=True)

    cases_filed = relationship(
        "Case", back_populates="filer", foreign_keys="Case.filer_id"
    )
    cases_judged = relationship(
        "Case", back_populates="judge", foreign_keys="Case.judge_id"
    )
    notifications = relationship("Notification", back_populates="user")

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role.value})>"
