"""Domain enums — shared across models, schemas, and services."""
import enum


class UserRole(str, enum.Enum):
    JUDGE = "judge"
    LAWYER = "lawyer"
    LITIGANT = "litigant"
    CLERK = "clerk"
    PROSECUTOR = "prosecutor"
    ADMIN = "admin"


class CaseStatus(str, enum.Enum):
    """The 9-state case lifecycle from the NyayaAI design."""
    FILED = "filed"
    REGISTERED = "registered"
    NOTICE_ISSUED = "notice_issued"
    PLEADINGS = "pleadings"
    EVIDENCE = "evidence"
    ARGUMENTS = "arguments"
    JUDGMENT_RESERVED = "judgment_reserved"
    DISPOSED = "disposed"
    APPEALED = "appealed"


class CaseCategory(str, enum.Enum):
    CIVIL = "civil"
    CRIMINAL = "criminal"
    FAMILY = "family"
    CONSTITUTIONAL = "constitutional"
    COMMERCIAL = "commercial"
    LABOUR = "labour"
    TAX = "tax"
    OTHER = "other"


class DocumentKind(str, enum.Enum):
    PETITION = "petition"
    AFFIDAVIT = "affidavit"
    EVIDENCE = "evidence"
    JUDGMENT = "judgment"
    ORDER = "order"
    NOTICE = "notice"
    PRECEDENT = "precedent"
    OTHER = "other"


class HearingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    ADJOURNED = "adjourned"
    CANCELLED = "cancelled"


class NotificationChannel(str, enum.Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    SMS = "sms"


# Valid transitions in the case state machine.
# Key = current status, value = allowed next statuses.
CASE_TRANSITIONS: dict[CaseStatus, set[CaseStatus]] = {
    CaseStatus.FILED: {CaseStatus.REGISTERED},
    CaseStatus.REGISTERED: {CaseStatus.NOTICE_ISSUED},
    CaseStatus.NOTICE_ISSUED: {CaseStatus.PLEADINGS},
    CaseStatus.PLEADINGS: {CaseStatus.EVIDENCE},
    CaseStatus.EVIDENCE: {CaseStatus.ARGUMENTS},
    CaseStatus.ARGUMENTS: {CaseStatus.JUDGMENT_RESERVED},
    CaseStatus.JUDGMENT_RESERVED: {CaseStatus.DISPOSED},
    CaseStatus.DISPOSED: {CaseStatus.APPEALED},
    CaseStatus.APPEALED: set(),
}
