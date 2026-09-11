"""Classification, applicability and listing models."""
import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Boolean,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.enums import ListingCheckStatus
from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.inspection import Inspection


class Classification(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "classifications"

    inspection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    category: Mapped[Optional[str]] = mapped_column(String(120))
    subcategory: Mapped[Optional[str]] = mapped_column(String(120))
    product_type: Mapped[Optional[str]] = mapped_column(String(120))
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    signals: Mapped[Optional[list]] = mapped_column(JSON)
    candidates: Mapped[Optional[list]] = mapped_column(JSON)

    inspection: Mapped["Inspection"] = relationship(back_populates="classification")


class ApplicabilityResult(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "applicability_results"

    inspection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    product_type: Mapped[Optional[str]] = mapped_column(String(120))
    is_food: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_retail: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_imported: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_special_category: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    quantity_condition: Mapped[Optional[str]] = mapped_column(String(120))
    machine_checkable_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    officer_review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    inspection: Mapped["Inspection"] = relationship(back_populates="applicability")


class ListingCheck(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "listing_checks"

    inspection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    platform_name: Mapped[Optional[str]] = mapped_column(String(120))
    listing_url: Mapped[Optional[str]] = mapped_column(String(512))
    listing_title: Mapped[Optional[str]] = mapped_column(String(255))
    listing_price: Mapped[Optional[str]] = mapped_column(String(40))
    listing_quantity: Mapped[Optional[str]] = mapped_column(String(40))
    seller_name: Mapped[Optional[str]] = mapped_column(String(255))
    status: Mapped[ListingCheckStatus] = mapped_column(
        Enum(ListingCheckStatus, name="listing_check_status"),
        nullable=False,
        default=ListingCheckStatus.CREATED,
    )
    captured_url: Mapped[Optional[str]] = mapped_column(String(512))

    inspection: Mapped["Inspection"] = relationship()


class ListingAnalysis(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "listing_analyses"

    listing_check_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("listing_checks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="COMPLETED")
    summary: Mapped[Optional[str]] = mapped_column(Text)
    results: Mapped[Optional[dict]] = mapped_column(JSON)
    machine_checks: Mapped[Optional[list]] = mapped_column(JSON)

    listing_check: Mapped["ListingCheck"] = relationship()