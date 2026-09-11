"""Evidence assets, OCR results and extracted fields."""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.enums import ExtractionMode, QualityStatus, Surface
from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.inspection import Inspection


class EvidenceAsset(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "evidence_assets"
    __table_args__ = (
        UniqueConstraint(
            "inspection_id", "surface", name="uq_evidence_inspection_surface"
        ),
    )

    inspection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    surface: Mapped[Surface] = mapped_column(Enum(Surface, name="surface"), nullable=False)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255))
    stored_filename: Mapped[Optional[str]] = mapped_column(String(255))
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    sha256: Mapped[Optional[str]] = mapped_column(String(64))
    storage_path: Mapped[Optional[str]] = mapped_column(String(512))
    quality_status: Mapped[QualityStatus] = mapped_column(
        Enum(QualityStatus, name="quality_status"),
        nullable=False,
        default=QualityStatus.POOR,
    )
    quality_score: Mapped[Optional[int]] = mapped_column(Integer)
    label: Mapped[Optional[str]] = mapped_column(String(255))
    is_placeholder: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    captured_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    inspection: Mapped["Inspection"] = relationship(back_populates="evidence")
    ocr_results: Mapped[List["OCRResult"]] = relationship(back_populates="evidence")


class OCRResult(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "ocr_results"

    inspection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    evidence_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("evidence_assets.id", ondelete="SET NULL")
    )
    field: Mapped[Optional[str]] = mapped_column(String(80))
    text: Mapped[Optional[str]] = mapped_column(Text)
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    # Region coordinates are nullable: real CV is currently simulated, so we
    # never invent coordinates.
    region_x: Mapped[Optional[float]] = mapped_column(Float)
    region_y: Mapped[Optional[float]] = mapped_column(Float)
    region_w: Mapped[Optional[float]] = mapped_column(Float)
    region_h: Mapped[Optional[float]] = mapped_column(Float)

    inspection: Mapped["Inspection"] = relationship(back_populates="ocr_results")
    evidence: Mapped[Optional["EvidenceAsset"]] = relationship(back_populates="ocr_results")


class ExtractedField(Base, UUIDPkMixin, TimestampMixin):
    __tablename__ = "extracted_fields"

    inspection_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False, index=True
    )
    evidence_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("evidence_assets.id", ondelete="SET NULL")
    )
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    value: Mapped[Optional[str]] = mapped_column(Text)
    source: Mapped[Optional[str]] = mapped_column(String(255))
    ocr_confidence: Mapped[Optional[float]] = mapped_column(Float)
    extraction_confidence: Mapped[Optional[float]] = mapped_column(Float)
    bounding_box: Mapped[Optional[dict]] = mapped_column(JSON)
    extraction_mode: Mapped[ExtractionMode] = mapped_column(
        Enum(ExtractionMode, name="extraction_mode"),
        nullable=False,
        default=ExtractionMode.DEMO,
    )
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="accepted")

    inspection: Mapped["Inspection"] = relationship(back_populates="extracted_fields")
    evidence: Mapped[Optional["EvidenceAsset"]] = relationship()