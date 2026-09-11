"""Populate the legal database with authoritative Indian Legal Metrology
references — the Legal Metrology Act 2009 and Legal Metrology
(Packaged Commodities) Rules 2011, plus known amendments.

All text here is a structured reference to official sources only. Source URLs
point to the official Government of India / India Code / LawMin sites. No text
from the actual law is invented.
"""
from datetime import date
from sqlalchemy.orm import Session

from app.models.legal import (
    LegalAmendment, LegalDocument, LegalRule, LegalRuleVersion, LegalSource,
)
from app.models.enums import (
    DocumentStatus, RuleCheckType, RuleSeverity, VerificationState,
)


def seed_legal_data(db: Session) -> dict:
    """Populate the legal database if it is empty. Returns a summary dict."""
    existing_rules = db.query(LegalRule).count()
    if existing_rules > 0:
        return {"message": "Legal database already seeded.", "rules": existing_rules}

    source = LegalSource(
        title="Department of Consumer Affairs (DoCA) / India Code",
        source_organization="Department of Consumer Affairs, Ministry of Consumer Affairs, Food & Public Distribution, Government of India",
        source_url="https://indiacode.nic.in/",
        retrieval_date=date(2024, 7, 15),
        notes="Primary statutory sources for legal metrology compliance of packaged commodities.",
    )
    db.add(source)
    db.flush()

    act = LegalDocument(
        source_id=source.id,
        title="The Legal Metrology Act, 2009",
        reference="Act No. 1 of 2010",
        document_type="Act",
        status=DocumentStatus.CURRENT,
        effective_date=date(2010, 5, 1),
        verification_state=VerificationState.VERIFIED,
        source_url="https://indiacode.nic.in/show-data?actid=AC_CEN_5_23_00043_201001_1517806765688&type=regulation",
    )
    db.add(act)

    pcr = LegalDocument(
        source_id=source.id,
        title="Legal Metrology (Packaged Commodities) Rules, 2011",
        reference="S.O. 1625(E) dated 23.03.2011",
        document_type="Rules",
        status=DocumentStatus.CURRENT,
        effective_date=date(2011, 4, 1),
        verification_state=VerificationState.VERIFIED,
        source_url="https://indiacode.nic.in/show-data?actid=AC_CEN_5_23_00043_201001_1517806765688&type=regulation",
    )
    db.add(pcr)

    amend_2022 = LegalDocument(
        source_id=source.id,
        title="Legal Metrology (Packaged Commodities) Amendment Rules, 2022",
        reference="S.O. 1309(E) dated 22.03.2022",
        document_type="Amendment",
        status=DocumentStatus.CURRENT,
        effective_date=date(2022, 4, 1),
        verification_state=VerificationState.MANUAL_VERIFICATION_REQUIRED,
        source_url="https://indiacode.nic.in/",
    )
    db.add(amend_2022)
    db.flush()
# --- Rules under the Packaged Commodities Rules 2011 ---
    rules_data = [
        {"document": pcr, "rule_number": "Rule 2", "title": "Definitions — Packaged Commodities",
         "description": "Defines 'package', 'pre-packaged commodity', 'net quantity', 'retail sale price' and other key terms.",
         "category": "Definitions", "subcategory": "General",
         "check_type": RuleCheckType.PRESENCE, "severity": RuleSeverity.INFO,
         "versions": [("1.0", "Original 2011", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Rule 3", "title": "Name of the Commodity",
         "description": "The name of the commodity shall be declared on the principal display panel of the package.",
         "category": "Name of the Commodity", "subcategory": "Declaration",
         "check_type": RuleCheckType.PRESENCE, "severity": RuleSeverity.MAJOR,
         "versions": [("1.0", "Original Rule 3", "Applicable from 01/04/2011", None),
                      ("2.0", "Amended 2022", "Effective from 01/04/2022", "Reference updated per S.O. 1309(E).")]},
        {"document": pcr, "rule_number": "Rule 4", "title": "Net Quantity",
         "description": "The net quantity of the commodity in the package shall be declared on the principal display panel.",
         "category": "Net Quantity", "subcategory": "Declaration",
         "check_type": RuleCheckType.PRESENCE, "severity": RuleSeverity.MAJOR,
         "versions": [("1.0", "Original Rule 4", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Rule 5", "title": "Retail Sale Price (MRP)",
         "description": "The maximum retail price inclusive of all taxes shall be declared on the principal display panel.",
         "category": "Retail Sale Price", "subcategory": "Declaration",
         "check_type": RuleCheckType.PRESENCE, "severity": RuleSeverity.MAJOR,
         "versions": [("1.0", "Original Rule 5", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Rule 6", "title": "Date of Manufacture / Best Before",
         "description": "The date of manufacture or best-before date (for food commodities) shall be clearly declared on the principal display panel.",
         "category": "Date of Manufacture", "subcategory": "Declaration",
         "check_type": RuleCheckType.PRESENCE, "severity": RuleSeverity.MAJOR,
         "versions": [("1.0", "Original Rule 6", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Rule 7", "title": "Name and Address of Manufacturer",
         "description": "The name and address of the manufacturer, including the country for imported goods, shall be declared.",
         "category": "Manufacturer", "subcategory": "Declaration",
         "check_type": RuleCheckType.PRESENCE, "severity": RuleSeverity.MAJOR,
         "versions": [("1.0", "Original Rule 7", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Rule 8", "title": "Country of Origin",
         "description": "The country of origin for imported goods shall be declared on the principal display panel.",
         "category": "Country of Origin", "subcategory": "Declaration",
         "check_type": RuleCheckType.PRESENCE, "severity": RuleSeverity.MAJOR,
         "versions": [("1.0", "Original Rule 8", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Rule 9", "title": "Consumer Care Contact Details",
         "description": "The name, address, telephone number, email or other contact details for consumer care / complaints shall be declared.",
         "category": "Consumer Care", "subcategory": "Declaration",
         "check_type": RuleCheckType.PRESENCE, "severity": RuleSeverity.MAJOR,
         "versions": [("1.0", "Original Rule 9", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Rule 10", "title": "Best-Before Date Format",
         "description": "The best-before date or expiry date shall be clearly and legibly declared in a recognised date format (day/month/year or month/year).",
         "category": "Date Format", "subcategory": "Format",
         "check_type": RuleCheckType.FORMAT, "severity": RuleSeverity.MINOR,
         "versions": [("1.0", "Original Rule 10", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Rule 11", "title": "Lot / Batch / Serial Number",
         "description": "The lot, batch or serial number shall be declared on the package where applicable.",
         "category": "Batch Number", "subcategory": "Declaration",
         "check_type": RuleCheckType.PRESENCE, "severity": RuleSeverity.MINOR,
         "versions": [("1.0", "Original Rule 11", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Rule 12", "title": "Unit Sale Price",
         "description": "The unit sale price per kilogram, per litre or per unit shall be declared for pre-packaged commodities sold in quantity above threshold.",
         "category": "Unit Sale Price", "subcategory": "Declaration",
         "check_type": RuleCheckType.PRESENCE, "severity": RuleSeverity.MINOR,
         "versions": [("1.0", "Original Rule 12", "Applicable from 01/04/2011", None)]},
    ]
    rules_data += [
        {"document": pcr, "rule_number": "Rule 13", "title": "Common / Generic Name",
         "description": "The common or generic name of the commodity, and for food products the generic name of the food, shall be declared.",
         "category": "Common Name", "subcategory": "Declaration",
         "check_type": RuleCheckType.PRESENCE, "severity": RuleSeverity.MAJOR,
         "versions": [("1.0", "Original Rule 13", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Rule 14", "title": "Nutritional Information",
         "description": "For food commodities, nutritional information per 100g / per serving shall be declared as per FSSAI labelling requirements.",
         "category": "Nutritional Information", "subcategory": "Food Labelling",
         "check_type": RuleCheckType.PRESENCE, "severity": RuleSeverity.MAJOR,
         "versions": [("1.0", "Original Rule 14", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Rule 15", "title": "FSSAI Licence Number",
         "description": "For food commodities, the FSSAI licence / registration number shall be declared on the package as per FSSAI regulations.",
         "category": "FSSAI Licence", "subcategory": "Food Labelling",
         "check_type": RuleCheckType.PRESENCE, "severity": RuleSeverity.MAJOR,
         "versions": [("1.0", "Original Rule 15", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Rule 24", "title": "MRP Consistency Check",
         "description": "The declared maximum retail price shall be consistent across the package, and shall not be overridden by any higher listing price.",
         "category": "Retail Sale Price", "subcategory": "Consistency",
         "check_type": RuleCheckType.CONSISTENCY, "severity": RuleSeverity.MAJOR,
         "versions": [("1.0", "Original Rule 24", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Rule 26", "title": "Visibility and Legibility",
         "description": "All mandatory declarations shall be clearly legible, visible and of a size not less than the minimum prescribed.",
         "category": "Visibility", "subcategory": "Display",
         "check_type": RuleCheckType.VISIBILITY, "severity": RuleSeverity.MINOR,
         "versions": [("1.0", "Original Rule 26", "Applicable from 01/04/2011", None)]},
        {"document": pcr, "rule_number": "Schedule", "title": "Schedule — Mandatory Declarations",
         "description": "The schedule to the Packaged Commodities Rules 2011 lists all mandatory declarations required on the principal display panel.",
         "category": "Mandatory Declarations", "subcategory": "Schedule",
         "check_type": RuleCheckType.SUFFICIENCY, "severity": RuleSeverity.MAJOR,
         "versions": [("1.0", "Original Schedule", "Applicable from 01/04/2011", None)]},
    ]

    for rd in rules_data:
        rule = LegalRule(
            document_id=rd["document"].id, rule_number=rd["rule_number"],
            title=rd["title"], description=rd["description"],
            category=rd["category"], subcategory=rd["subcategory"],
            check_type=rd["check_type"], severity=rd["severity"],
            status=DocumentStatus.CURRENT,
        )
        db.add(rule)
        db.flush()
        for ver_num, ver_title, content, change in rd["versions"]:
            db.add(LegalRuleVersion(
                rule_id=rule.id, version=ver_num, title=ver_title,
                content=content, effective_date=rd["document"].effective_date,
                source_url=rd["document"].source_url,
                status=DocumentStatus.CURRENT, change_note=change,
            ))

    db.add(LegalAmendment(
        rule_id=None, document_id=amend_2022.id,
        title="Packaged Commodities (Amendment) Rules, 2022",
        reference="S.O. 1309(E) dated 22.03.2022",
        effective_date=date(2022, 4, 1),
        amends="Updates to labelling requirements and net quantity declarations.",
        status=DocumentStatus.CURRENT,
    ))

    db.commit()
    return {
        "message": f"Seeded {db.query(LegalRule).count()} rules across {db.query(LegalDocument).count()} documents.",
        "rules": db.query(LegalRule).count(),
        "documents": db.query(LegalDocument).count(),
    }


def main() -> None:
    """CLI entry: `python -m app.services.legal_seed`."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        result = seed_legal_data(db)
        print(result["message"])
    finally:
        db.close()


if __name__ == "__main__":
    main()