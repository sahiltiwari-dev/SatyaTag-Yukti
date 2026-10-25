# SATYATAG — Routes and Features

## Frontend Routes (React Router)

| Path | Page Component | Auth Required | Status |
|------|---------------|---------------|--------|
| /login | LoginPage | No | IMPLEMENTED_AND_VERIFIED |
| /signup | SignupPage | No | IMPLEMENTED_AND_VERIFIED |
| /verify-email | VerifyEmailPage | No | IMPLEMENTED_AND_VERIFIED |
| /forgot-password | ForgotPasswordPage | No | IMPLEMENTED_AND_VERIFIED |
| /reset-password | ForgotPasswordPage | No | IMPLEMENTED_AND_VERIFIED |
| /dashboard | DashboardPage | Yes | IMPLEMENTED_AND_VERIFIED |
| /inspection/new | NewInspectionPage | Yes | IMPLEMENTED_AND_VERIFIED |
| /inspection/:id/scan | ScanProductPage | Yes | IMPLEMENTED_AND_VERIFIED |
| /inspection/:id/listing | ListingSetupPage | Yes | IMPLEMENTED_AND_VERIFIED |
| /inspection/:id/listing/analyse | ListingAnalysePage | Yes | IMPLEMENTED_AND_VERIFIED |
| /inspection/:id/analyse | AnalysePage | Yes | IMPLEMENTED_AND_VERIFIED |
| /inspection/:id/result | ComplianceResultPage | Yes | IMPLEMENTED_AND_VERIFIED |
| /inspection/:id/finding/:findingId | FindingDetailPage | Yes | IMPLEMENTED_AND_VERIFIED |
| /inspection/:id/review | OfficerReviewPage | Yes | IMPLEMENTED_AND_VERIFIED |
| /inspection/:id/report | InspectionReportPage | Yes | IMPLEMENTED_AND_VERIFIED |
| /inspections | RepositoryPage | Yes | IMPLEMENTED_AND_VERIFIED |
| /analytics | AnalyticsPage | Yes | IMPLEMENTED_AND_VERIFIED |
| /rules | RuleLibraryPage | Yes | IMPLEMENTED_AND_VERIFIED |
| /rules/:ruleId | RuleDetailPage | Yes | IMPLEMENTED_AND_VERIFIED |
| /profile | ProfilePage | Yes | IMPLEMENTED_AND_VERIFIED |
| /settings | SettingsPage | Yes | PARTIALLY_IMPLEMENTED |
| /notifications | NotificationsPage | Yes | IMPLEMENTED_AND_VERIFIED |
| /audit | AuditPage | Yes | IMPLEMENTED_AND_VERIFIED |
| * | NotFoundPage | No | IMPLEMENTED_AND_VERIFIED |

## Backend API Endpoints

### Health
| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | /api/health | No | IMPLEMENTED_AND_VERIFIED |
| GET | / | No | IMPLEMENTED_AND_VERIFIED |

### Auth (/api/auth)
| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | /api/auth/signup | No | IMPLEMENTED_AND_VERIFIED |
| POST | /api/auth/login | No | IMPLEMENTED_AND_VERIFIED |
| POST | /api/auth/logout | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/auth/me | Session | IMPLEMENTED_AND_VERIFIED |
| POST | /api/auth/verify-email | No | IMPLEMENTED_AND_VERIFIED |
| POST | /api/auth/resend-otp | No | IMPLEMENTED_AND_VERIFIED |
| POST | /api/auth/forgot-password | No | IMPLEMENTED_AND_VERIFIED |
| POST | /api/auth/reset-password | No | IMPLEMENTED_AND_VERIFIED |
| POST | /api/auth/change-password | Session | IMPLEMENTED_AND_VERIFIED |

### Inspections (/api/inspections)
| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | /api/inspections | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/inspections | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/inspections/{id} | Session | IMPLEMENTED_AND_VERIFIED |
| PATCH | /api/inspections/{id} | Session | IMPLEMENTED_AND_VERIFIED |
| DELETE | /api/inspections/{id} | Session | IMPLEMENTED_AND_VERIFIED |
| POST | /api/inspections/{id}/decision | Session | IMPLEMENTED_AND_VERIFIED |

### Evidence
| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | /api/inspections/{id}/evidence | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/inspections/{id}/evidence | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/evidence/{id}/file | Session | IMPLEMENTED_AND_VERIFIED |
| DELETE | /api/evidence/{id} | Session | IMPLEMENTED_AND_VERIFIED |

### Analysis
| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | /api/inspections/{id}/analyse | Session | IMPLEMENTED_BUT_NOT_VERIFIED (demo only) |
| GET | /api/inspections/{id}/analysis | Session | IMPLEMENTED_BUT_NOT_VERIFIED (demo only) |
| POST | /api/inspections/{id}/findings/{fid}/decision | Session | IMPLEMENTED_AND_VERIFIED |

### Listing
| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | /api/inspections/{id}/listing | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/inspections/{id}/listing | Session | IMPLEMENTED_AND_VERIFIED |
| POST | /api/inspections/{id}/listing/{lid}/analyse | Session | IMPLEMENTED_AND_VERIFIED |

### Legal
| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | /api/legal/rules | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/legal/rules/{id} | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/legal/documents | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/legal/sources | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/legal/categories | Session | IMPLEMENTED_AND_VERIFIED |
| POST | /api/legal/seed | Session | IMPLEMENTED_AND_VERIFIED |

### Dashboard / Analytics
| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | /api/dashboard/stats | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/analytics/overview | Session | IMPLEMENTED_AND_VERIFIED |

### Notifications / Audit
| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | /api/notifications | Session | IMPLEMENTED_AND_VERIFIED |
| POST | /api/notifications/{id}/read | Session | IMPLEMENTED_AND_VERIFIED |
| POST | /api/notifications/read-all | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/audit | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/audit/event-types | Session | IMPLEMENTED_AND_VERIFIED |

### Reports
| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | /api/inspections/{id}/report | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/inspections/{id}/report/download | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/inspections/{id}/report/metadata | Session | IMPLEMENTED_AND_VERIFIED |

### Users
| Method | Path | Auth | Status |
|--------|------|------|--------|
| GET | /api/users/me | Session | IMPLEMENTED_AND_VERIFIED |
| PATCH | /api/users/me | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/users/me/sessions | Session | IMPLEMENTED_AND_VERIFIED |
| GET | /api/users/{id} | Session (admin) | IMPLEMENTED_BUT_NOT_VERIFIED |
