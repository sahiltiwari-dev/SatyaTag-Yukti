"""Demo seed integrity tests.

Covers the deterministic six-scenario demo dataset:
  * idempotency (re-running replaces demo records, never duplicates)
  * legal knowledge base (17 CURRENT rules, each with a rule version)
  * PASS / REVIEW / VIOLATION / NOT_APPLICABLE / PENDING outcomes
  * findings linked to compliance checks and rule versions
  * officer decisions, ownership, notifications, audit trail
  * demo markers (is_demo, DEMO_FIXTURE source, placeholder evidence)
"""
from app.database import SessionLocal
from app.models import (
    ApplicabilityResult,
    AuditEvent,
    Classification,
    ComplianceCheck,
    EvidenceAsset,
    ExtractedField,
    Finding,
    Inspection,
    LegalRule,
    Notification,
    OfficerDecision,
    ReportMetadata,
    User,
)
from app.models.enums import (
    CheckOutcome,
    FindingStatus,
    InspectionStatus,
    OfficerDecision as OfficerDecisionState,
)

from scripts.seed_demo import DEMO_INSPECTIONS, main as seed_main

# Stable deterministic expectations from the demo fixtures.
NUMBERS = {spec["number"] for spec in DEMO_INSPECTIONS}
SCENARIOS = {spec["number"]: spec["scenario"] for spec in DEMO_INSPECTIONS}
DECISION_BY_NUMBER = {
    "SAT-DEMO-2025-0001": OfficerDecisionState.COMPLIANT,
    "SAT-DEMO-2025-0002": OfficerDecisionState.MANUAL_REVIEW,
    "SAT-DEMO-2025-0003": OfficerDecisionState.NON_COMPLIANT,
    "SAT-DEMO-2025-0004": OfficerDecisionState.COMPLIANT,
    "SAT-DEMO-2025-0005": OfficerDecisionState.COMPLIANT,
    "SAT-DEMO-2025-0006": OfficerDecisionState.PENDING,
}
REPORT_NUMBERS = {spec["number"] for spec in DEMO_INSPECTIONS if spec.get("report")}


def _seeded_counts(db) -> dict:
    inspections = db.query(Inspection).all()
    return {
        "inspections": len(inspections),
        "compliance_checks": db.query(ComplianceCheck).count(),
        "findings": db.query(Finding).count(),
        "officer_decisions": db.query(OfficerDecision).count(),
        "report_metadata": db.query(ReportMetadata).count(),
        "extracted_fields": db.query(ExtractedField).count(),
        "evidence_assets": db.query(EvidenceAsset).count(),
        "classifications": db.query(Classification).count(),
        "applicability_results": db.query(ApplicabilityResult).count(),
        "notifications": db.query(Notification).count(),
        "users": db.query(User).count(),
        "audit_events": db.query(AuditEvent).count(),
    }


def test_seed_populates_full_dataset(db):
    seed_main()
    counts = _seeded_counts(db)

    assert counts["inspections"] == 6
    assert counts["users"] == 3
    assert counts["classifications"] == 6
    assert counts["applicability_results"] == 6
    assert counts["evidence_assets"] == 12  # 2 surfaces per inspection
    assert counts["officer_decisions"] == 5  # Frooti stays PENDING
    assert counts["report_metadata"] == 3  # inspections 0001/0002/0003
    assert counts["compliance_checks"] >= 6 * 10
    assert counts["findings"] >= 4
    assert counts["notifications"] >= 6
    assert counts["extracted_fields"] >= 6 * 8

    numbers = {i.inspection_number for i in db.query(Inspection).all()}
    assert numbers == NUMBERS


def test_seed_is_idempotent(db):
    seed_main()
    first = _seeded_counts(db)
    first_ids = {i.id for i in db.query(Inspection).all()}

    seed_main()  # second run must replace, never duplicate
    second = _seeded_counts(db)
    second_ids = {i.id for i in db.query(Inspection).all()}

    # Every deterministic count, notifications and audit events included, must
    # be identical after a re-run (inspection notifications cascade with
    # inspections, the single welcome notification is only created once, and
    # demo-seeded audit rows are removed by _clean_demo_records).
    assert first == second
    assert first_ids.isdisjoint(second_ids), "demo inspections duplicated"


def test_scenario_outcomes_match_fixtures(db):
    seed_main()
    inspections = db.query(Inspection).order_by(
        Inspection.inspection_number
    ).all()

    for insp in inspections:
        scenario = SCENARIOS[insp.inspection_number]
        outcome_counts = {oc.value: 0 for oc in CheckOutcome}
        for check in insp.compliance_checks:
            outcome_counts[check.outcome.value] += 1

        # Every inspection runs the full rule set.
        assert len(insp.compliance_checks) == 17
        assert insp.stage == "COMPLIANCE_EVALUATED"
        assert insp.is_demo is True

        assert insp.officer_decision == DECISION_BY_NUMBER[insp.inspection_number]
        if scenario == "PASS":
            # Lay's / Kurkure: no violations, no officer-generated review.
            assert outcome_counts["VIOLATION"] == 0
            assert outcome_counts["REVIEW"] == 0
            assert insp.status == InspectionStatus.COMPLIANT
        elif scenario == "REVIEW":
            # Britannia: price sticker obscuring the MRP -> many REVIEWs.
            assert outcome_counts["REVIEW"] > 0
            assert outcome_counts["VIOLATION"] == 0
            assert insp.status == InspectionStatus.MANUAL_REVIEW
        elif scenario == "VIOLATION":
            # Thums Up: best-before '31/2027' + MRP -> violations.
            assert outcome_counts["VIOLATION"] > 0
            assert insp.status == InspectionStatus.NON_COMPLIANT
        elif scenario == "NOT_APPLICABLE":
            # Surf Excel: food-only rules are NOT_APPLICABLE.
            assert outcome_counts["NOT_APPLICABLE"] >= 1
            assert insp.status == InspectionStatus.COMPLIANT
        elif scenario == "PENDING":
            # Frooti: analysed but awaiting officer decision.
            assert insp.officer_decision == OfficerDecisionState.PENDING
            assert insp.status == InspectionStatus.UNDER_REVIEW


def test_findings_link_to_checks_and_rules(db):
    seed_main()
    findings = db.query(Finding).all()
    assert findings, "expected findings for REVIEW/VIOLATION scenarios"

    findings_by_inspection: dict = {}
    for f in findings:
        assert f.rule is not None and f.rule.rule_number
        assert f.status == FindingStatus.UNDER_REVIEW
        findings_by_inspection.setdefault(f.inspection_id, []).append(f)

    britannia = db.query(Inspection).filter(
        Inspection.inspection_number == "SAT-DEMO-2025-0002"
    ).one()
    thumsup = db.query(Inspection).filter(
        Inspection.inspection_number == "SAT-DEMO-2025-0003"
    ).one()
    frooti = db.query(Inspection).filter(
        Inspection.inspection_number == "SAT-DEMO-2025-0006"
    ).one()

    # REVIEW scenario generates many findings; VIOLATION at least one.
    assert len(findings_by_inspection[britannia.id]) > 5
    assert len(findings_by_inspection[thumsup.id]) >= 1
    assert len(findings_by_inspection[frooti.id]) >= 1
    # A PASS inspection must carry no findings.
    pass_insp = db.query(Inspection).filter(
        Inspection.inspection_number == "SAT-DEMO-2025-0001"
    ).one()
    assert pass_insp.findings == []

    # The engine raises exactly one finding per flag, and only for checks it
    # flags as VIOLATION or REVIEW in the compliance evaluation.
    flagged_checks = db.query(ComplianceCheck).filter(
        ComplianceCheck.outcome.in_((CheckOutcome.VIOLATION, CheckOutcome.REVIEW))
    ).count()
    assert len(findings) == flagged_checks

    # Each finding maps to the rule + rule version evaluated for its inspection.
    britannia_rule_versions = {c.rule_version_id for c in britannia.compliance_checks}
    britannia_finding_versions = {
        f.rule_version_id for f in findings_by_inspection[britannia.id]
    }
    assert britannia_finding_versions <= britannia_rule_versions
    assert {c.rule_id for c in britannia.compliance_checks} >= {
        f.rule_id for f in findings_by_inspection[britannia.id]
    }


def test_ownership_and_decision_rows(db):
    seed_main()
    officer = db.query(User).filter(
        User.email == "officer@consumer.gov.in"
    ).one()
    assert officer.role == "officer"

    inspections = db.query(Inspection).all()
    assert all(i.owner_id == officer.id for i in inspections)
    assert all(i.owner.email == officer.email for i in inspections)

    decisions = db.query(OfficerDecision).all()
    assert len(decisions) == 5
    for d in decisions:
        assert d.officer_id == officer.id
        assert d.decided_at is not None
        assert d.previous_decision == "Pending"

    frooti = db.query(Inspection).filter(
        Inspection.inspection_number == "SAT-DEMO-2025-0006"
    ).one()
    assert frooti.officer_decision == OfficerDecisionState.PENDING
    assert db.query(OfficerDecision).filter(
        OfficerDecision.inspection_id == frooti.id
    ).count() == 0

    # NON-COMPLIANT decision carries the explanatory notes.
    thumsup = db.query(Inspection).filter(
        Inspection.inspection_number == "SAT-DEMO-2025-0003"
    ).one()
    assert "31/2027" in thumsup.final_notes


def test_legal_rules_present(db):
    seed_main()
    rules = db.query(LegalRule).all()
    assert len(rules) == 17
    assert all(r.status == "CURRENT" for r in rules)
    assert all(r.versions for r in rules), "every rule needs a version"


def test_demo_markers_and_events(db):
    seed_main()
    officer = db.query(User).filter(
        User.email == "officer@consumer.gov.in"
    ).one()

    # DEMO_FIXTURE source + placeholder evidence, never real images.
    fields = db.query(ExtractedField).all()
    assert all(f.source == "DEMO_FIXTURE" for f in fields)
    assets = db.query(EvidenceAsset).all()
    assert all(a.is_placeholder for a in assets)
    assert all(a.storage_path is None and a.stored_filename is None for a in assets)

    # Notifications exist for every inspection + the welcome message.
    inspections = db.query(Inspection).all()
    for insp in inspections:
        assert db.query(Notification).filter(
            Notification.related_inspection_id == insp.id
        ).count() >= 1, insp.inspection_number
    assert db.query(Notification).filter(
        Notification.user_id == officer.id
    ).count() >= 1

    # Audit trail: at least one event per inspection + login event.
    audit = db.query(AuditEvent).all()
    assert audit
    types = {a.event_type for a in audit}
    assert "INSPECTION_CREATED" in types
    assert "COMPLIANCE_EVALUATED" in types
    assert "LOGIN" in types

    # PDF reports only for the three requested inspections.
    report_insp_ids = {r.inspection_id for r in db.query(ReportMetadata).all()}
    report_numbers = {
        i.inspection_number for i in inspections if i.id in report_insp_ids
    }
    assert report_numbers == REPORT_NUMBERS
    from app.config import settings as _settings

    for r in db.query(ReportMetadata).all():
        assert r.file_size and r.file_size > 0
        assert r.checksum
        # file_path must resolve under upload_root (the download route does
        # `upload_root / file_path`), i.e. always prefixed with "reports".
        normalized = r.file_path.replace("\\", "/")
        assert normalized.startswith("reports/")
        assert (_settings.upload_root / r.file_path).is_file()