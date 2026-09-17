# CSWATMS System Documentation Handoff

## Purpose of this document

This document is a code-grounded handoff for generating the **Chapter Three (System Analysis and Methodology)** and **Chapter Four (System Design, Implementation, and Results)** sections of the final-year project report.

It describes the system currently implemented in the repository. It is intended to be supplied to Claude together with manually selected screenshots from the running application.

Claude should:

1. Use the implemented facts in this document as the primary technical reference.
2. Use screenshots supplied separately as visual evidence.
3. Avoid inventing features, test results, database fields, or deployment details that are not stated here or visible in the source code.
4. Use an academic project-writing style appropriate for a Computer Science undergraduate project.
5. Preserve the project identity, institution, roles, workflows, and terminology used below.

---

## 1. Project identity

### Project title

**Web-Based Casual Sanitation Workforce Attendance and Task Management System for Ahmadu Bello University, Zaria**

### Short name

**CSWATMS**

The source code also contains the related spelling `CSATMS` in one backend startup message. The preferred project name for the report is **CSWATMS**.

### Project author

- Name: Yusuf Paul
- Matriculation number: U21CS1005
- Department: Computer Science
- Institution: Ahmadu Bello University, Zaria
- Supervisor: Mal. I.E. Umar

### Main problem addressed

The system supports the administration of casual sanitation workers whose activities are distributed across university divisions, operational units, hostels, blocks, faculties, centres, and other locations.

It centralizes:

- Worker registration
- Worker identity and dossier information
- Operational assignment
- Location and hierarchy management
- Supervisor allocation
- Daily attendance recording
- Absence reasons
- Worker transfers
- Transfer approval
- Monthly attendance registers
- Report submission and verification
- User account management
- Audit logging
- Worker photo management

The system is intended to replace fragmented paper records, spreadsheets, informal communication, and manual consolidation with a role-controlled web application.

---

## 2. System scope

### Included scope

The implemented system covers:

1. Authentication using username and password.
2. JWT-based session management.
3. Three primary user roles:
   - General administrator
   - Division administrator
   - Supervisor
4. Division, operational unit, and operational location hierarchy.
5. Worker registration and worker profile management.
6. Worker assignment history.
7. Location-specific supervisor allocation.
8. Daily attendance marking and unmarking.
9. Absence reason logging.
10. Inter-division transfer requests.
11. Central transfer approval and rejection.
12. Monthly attendance report generation.
13. Supervisor report submission.
14. Administrator report verification.
15. CSV and PDF report export.
16. User creation, activation, deactivation, and password reset.
17. Forced password change for temporary or reset passwords.
18. Audit event recording.
19. Worker passport photo upload and bulk photo upload.
20. Responsive desktop and mobile user interfaces.

### Out-of-scope or not demonstrated in the repository

The following should not be claimed as implemented unless separately verified:

- Native Android or iOS application
- Biometric attendance capture
- GPS or geofencing
- Payroll processing
- SMS or email notifications
- Facial recognition
- Artificial intelligence or machine-learning prediction
- Automated cloud deployment
- Public self-registration
- Multi-tenant infrastructure outside the university hierarchy
- A dedicated automated test suite

---

## 3. Existing system analysis

### Likely existing challenges

The project is designed around common problems in manual casual-workforce administration:

- Worker records distributed across paper files or spreadsheets.
- Difficulty knowing where a worker is currently assigned.
- Delayed consolidation of daily attendance.
- Duplicate or inconsistent worker records.
- Weak visibility of transfer history.
- Unclear responsibility for attendance at different locations.
- Slow production of monthly attendance registers.
- Limited accountability for changes to records.
- Difficulty enforcing division-level access boundaries.
- Manual approval of cross-division movement.

### Proposed improvement

CSWATMS provides a central database and browser-based interface. It gives each user role only the operational functions needed for that role, while preserving administrator oversight and auditability.

---

## 4. Development methodology

The repository README identifies the methodology as **iterative development**.

An academic explanation can describe the implementation as a sequence of increments:

1. Requirements and domain understanding.
2. Database and hierarchy foundation.
3. Authentication and role control.
4. Worker registration and assignment.
5. Attendance and absence logging.
6. Transfer workflow.
7. Reports and verification.
8. User administration and audit logging.
9. Responsive interface refinement.
10. Validation through build and lint checks.

The repository contains frontend build and lint scripts. The backend package currently contains a placeholder test script rather than a configured automated test suite.

---

## 5. High-level architecture

CSWATMS follows a client-server architecture:

```text
User Browser
    |
    | React interface and React Router
    v
Frontend API layer (Axios)
    |
    | HTTP/JSON requests with JWT Bearer token
    v
Node.js + Express backend
    |
    | Authentication middleware, authorization, controllers
    v
PostgreSQL database
```

Worker photos are stored under the backend upload directory and exposed through the Express static `/uploads` route.

### Main layers

#### Presentation layer

Implemented with:

- React
- React Router
- JSX components
- Tailwind CSS utility classes
- Responsive desktop/mobile layouts

#### API/client layer

Implemented in `frontend/src/api` using Axios. The shared API client:

- Uses the configured API base URL.
- Reads the JWT from browser local storage.
- Sends the token as a Bearer authorization header.
- Redirects to `/login` when the backend returns HTTP 401.

#### Application/business layer

Implemented in Express routes, controllers, models, middleware, and utility modules.

Responsibilities include:

- Request validation
- Role authorization
- Database operations
- Attendance rules
- Assignment rules
- Transfer rules
- Report verification
- Audit event creation

#### Data layer

Implemented with PostgreSQL and the `pg` Node.js driver.

Database connection values are read from environment variables:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

The JWT configuration also uses environment variables:

- `JWT_SECRET`
- `JWT_EXPIRES_IN`

No secret values should be placed in the report or committed to source control.

---

## 6. Technology stack

### Frontend

- React 19
- React DOM 19
- React Router DOM 7
- Axios
- Vite
- Tailwind CSS
- Oxlint

### Backend

- Node.js
- Express 5
- PostgreSQL
- `pg`
- JSON Web Token (`jsonwebtoken`)
- `bcrypt`
- `multer`
- `cors`
- `dotenv`
- `express-rate-limit`
- `adm-zip`

### File and report support

- PDF generation uses browser-loaded jsPDF assets.
- PDF tables use the jsPDF AutoTable plugin.
- CSV export is implemented in the frontend.
- Worker photo uploads use multipart form data.
- Bulk worker photo upload accepts a ZIP file through the frontend API layer.

---

## 7. User roles and permissions

### 7.1 General administrator

The general administrator has university-wide oversight.

Frontend routes:

- `/dashboard`
- `/hierarchy`
- `/workers`
- `/workers/:id`
- `/approvals`
- `/pending-reports`
- `/users`
- `/audit-logs`
- `/attendance`
- `/reports`

Typical responsibilities:

- Manage the university hierarchy.
- Manage users and divisions.
- Review inter-division transfers.
- View and verify pending reports.
- View audit logs.
- View workforce and attendance information.
- Produce consolidated reports.

### 7.2 Division administrator

The division administrator manages the assigned division.

Frontend routes:

- `/dashboard`
- `/hierarchy`
- `/workers`
- `/workers/:id`
- `/pending-reports`
- `/users`
- `/attendance`
- `/reports`

Typical responsibilities:

- Manage workers within the permitted division.
- Manage or view operational structure within the permitted scope.
- Create and manage supervisors for the division.
- Monitor reports and attendance.
- Produce division-level or location-level reports.

The backend remains the final authority for access control. Frontend menu visibility is only a user-interface convenience.

### 7.3 Supervisor

The supervisor is responsible for assigned operational locations.

Frontend routes:

- `/attendance`
- `/reports`

Typical responsibilities:

- View assigned locations.
- Mark and unmark worker attendance.
- Record absence reasons.
- Submit monthly attendance registers for verification.
- View reports relevant to assigned locations.

### 7.4 Authentication and authorization

The backend uses:

- Password hashing with bcrypt.
- JWT access tokens.
- `authenticate` middleware to verify Bearer tokens.
- `authorize` middleware to restrict routes by role.

The frontend uses:

- `AuthProvider` for token and user state.
- `ProtectedRoute` for route-level access.
- Role-specific redirects.

When a user has `must_change_password = true`, the forced password-change modal is shown. On successful password change, the backend returns a fresh token with the flag cleared.

---

## 8. Database design

The database is built incrementally through migration files in `backend/migrations`.

### Migration sequence

| Migration | Purpose |
|---|---|
| `000_setup_functions.sql` | Database helper functions and setup |
| `001_create_divisions.sql` | University divisions |
| `002_create_operational_units.sql` | Units belonging to divisions |
| `003_create_operational_locations.sql` | Locations belonging to units |
| `004_create_users.sql` | User accounts |
| `005_create_location_supervisors.sql` | Supervisor-to-location relationships |
| `006_create_workers.sql` | Casual worker records |
| `007_create_assignments.sql` | Worker assignment history |
| `008_create_transfers.sql` | Worker transfer requests |
| `009_create_attendance.sql` | Attendance records |
| `010_create_report_verifications.sql` | Monthly report workflow |
| `011_create_audit_logs.sql` | Audit trail |
| `012_alter_users_add_username.sql` | Username support |
| `013_alter_workers_add_dossier_fields.sql` | Extended worker profile fields |
| `014_add_must_change_password_to_users.sql` | Forced password-change state |
| `015_create_absence_logs.sql` | Absence reason records |
| `016_update_transfer_type_check.sql` | Transfer-type constraint update |

### Main entities

#### Divisions

Represents a high-level administrative or operational division such as:

- Student Affairs Division
- University Health Services

#### Operational units

Represents a unit under a division, for example:

- Hall Administration Unit
- Environmental Sanitation Unit

#### Operational locations

Represents the station, hostel, block, or operational location where workers are deployed.

The frontend recognizes compound location names using the pattern:

```text
Hostel or group name — Block or station name
```

#### Users

Stores authenticated accounts and role information. Important values include:

- Full name
- Username
- Email where available
- Password hash
- Role
- Division
- Active/inactive status
- Must-change-password flag
- Last-login information where provided by the model

#### Workers

Stores casual workforce identity and dossier information, including:

- Staff ID
- Full name
- Phone number
- Appointment date
- National Identification Number (NIN), where supplied
- Next-of-kin name
- Next-of-kin phone
- Employment status
- Photo filename/path where supplied

#### Assignments

Stores the relationship between a worker and an operational location over time. Assignment history allows the system to identify the current active assignment and previous assignments.

#### Location supervisors

Maps supervisors to operational locations.

#### Transfers

Stores movement requests between locations or divisions. Intra-division and inter-division movement are handled differently. Inter-division transfer requests require central administrator approval.

#### Attendance

Stores attendance records for an assignment and date. The attendance page supports marking, unmarking, and batch marking.

#### Absence logs

Stores explanatory notes for worker absence on a selected date. The system presents this as an audit/operational note associated with attendance management.

#### Report verifications

Stores the monthly submission and verification state of attendance registers. The main statuses used by the frontend are:

- `not_submitted`
- `submitted`
- `verified`

#### Audit logs

Stores significant actions such as:

- Login success/failure
- Attendance marking
- Report verification
- Worker creation/update
- Transfer creation
- Transfer approval/rejection
- Password changes

---

## 9. Backend API structure

The backend starts the Express application in `backend/src/app.js`.

### Base URL

During local development, the backend defaults to:

```text
http://localhost:5000
```

The API prefix is:

```text
/api
```

### Mounted route groups

| Route group | Responsibility |
|---|---|
| `/api/auth` | Login, current identity, password change |
| `/api/divisions` | Division CRUD and division retrieval |
| `/api/operational-units` | Operational unit CRUD |
| `/api/operational-locations` | Operational location CRUD |
| `/api/location-supervisors` | Supervisor/location assignment |
| `/api/workers` | Worker registration, retrieval, update, dossier, photos |
| `/api/assignments` | Worker assignment operations |
| `/api/transfers` | Transfer requests and approvals |
| `/api/attendance` | Attendance retrieval and marking |
| `/api/absence-logs` | Absence reason records |
| `/api/reports` | Report generation, submission, verification, dashboard metrics |
| `/api/users` | User administration and password reset |
| `/api/audit-logs` | Audit trail retrieval |

### Health endpoint

```http
GET /api/health
```

Returns a simple server-running response.

### Authentication endpoints

```http
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/change-password
```

### Worker operations

The worker API supports:

- List workers
- Retrieve a worker
- Create a worker
- Update a worker
- Retrieve a worker dossier
- Create an assignment
- Retrieve assignment history
- Retrieve current assignment
- Upload an individual worker photo
- Bulk import workers
- Bulk upload worker photos

### Attendance operations

The attendance API supports:

- Retrieve locations for a supervisor
- Retrieve attendance for a location/date
- Mark attendance
- Unmark attendance
- Mark attendance in a batch
- Retrieve absence logs
- Add an absence log
- Remove an absence log

### Report operations

The report API supports:

- Generate a report for one location.
- Generate a batch report for multiple locations.
- Retrieve a division aggregate report.
- Submit one monthly report.
- Submit multiple monthly reports.
- Verify one report.
- Verify multiple reports.
- Retrieve pending reports.
- Retrieve dashboard statistics.

### Transfer operations

The transfer API supports:

- Create a transfer request.
- Retrieve worker transfer history.
- Retrieve pending transfer requests.
- Approve a transfer.
- Reject a transfer.

### User and audit operations

The user API supports:

- Retrieve users.
- Filter users by role.
- Create a user.
- Deactivate a user.
- Reactivate a user.
- Reset a user password.
- Retrieve audit logs.

---

## 10. Frontend structure

### Application entry points

- `frontend/src/main.jsx`
- `frontend/src/App.jsx`

`App.jsx` defines the browser routes and wraps the application with `AuthProvider`.

### Pages

| Page | Purpose |
|---|---|
| `Login.jsx` | User login |
| `Dashboard.jsx` | Administrator metrics and quick actions |
| `Hierarchy.jsx` | Divisions, units, locations, and supervisor assignment |
| `Workers.jsx` | Workforce directory, registration, import, and photo management |
| `WorkerProfile.jsx` | Individual worker profile, assignment, transfer, and dossier |
| `Attendance.jsx` | Daily attendance and absence management |
| `Reports.jsx` | Monthly report generation, submission, verification, and export |
| `Approvals.jsx` | Central review of pending transfers |
| `PendingReports.jsx` | Review and verification of submitted reports |
| `Users.jsx` | User account administration |
| `AuditLogs.jsx` | System activity history |

### Reusable components

| Component | Purpose |
|---|---|
| `ProtectedRoute.jsx` | Route authentication and role protection |
| `AuthContext.jsx` | Authentication state and token handling |
| `SideNavBar.jsx` | Desktop navigation and account actions |
| `MobileHeader.jsx` | Mobile header and navigation drawer |
| `DivisionBanner.jsx` | Current division/unit context |
| `ChangePasswordModal.jsx` | Normal and forced password changes |
| `WorkerImportModal.jsx` | CSV worker import |
| `BulkPhotoUploadModal.jsx` | ZIP-based worker photo upload |
| `WorkerDossierModal.jsx` | Worker dossier display/edit |

### Frontend navigation model

Menu definitions are centralized in:

```text
frontend/src/navigation/menuItems.js
```

The desktop sidebar and mobile drawer use the same role-aware menu configuration.

---

## 11. Main workflows

### 11.1 Login workflow

1. User enters username and password.
2. Frontend sends credentials to `/api/auth/login`.
3. Backend finds the user and checks active status.
4. Backend compares the password using bcrypt.
5. Backend creates an audit event.
6. Backend returns a JWT and user information.
7. Frontend stores the token in local storage.
8. The user is redirected:
   - Supervisor: attendance page
   - Administrator/division administrator: dashboard
9. If a temporary password must be changed, the forced password modal is shown.

### 11.2 Worker registration workflow

1. Administrator opens the registration form.
2. The form collects staff identity, appointment, contact, next-of-kin, and optional photo data.
3. The administrator selects division, unit, and location where permitted.
4. The frontend submits the worker record.
5. If a photo was selected, the photo is uploaded after worker creation.
6. The workforce directory reloads.

Workers can also be imported from CSV using the worker import modal.

### 11.3 Assignment workflow

1. An administrator selects a worker.
2. The system loads available divisions, units, and locations.
3. The administrator selects the destination and effective date.
4. The assignment is submitted.
5. The worker dossier displays current and historical assignments.

### 11.4 Attendance workflow

1. The supervisor opens Attendance.
2. The system loads locations assigned to the supervisor.
3. The supervisor selects a date and location/hostel filter.
4. The system displays assigned workers.
5. The supervisor marks individual workers or marks a batch.
6. Attendance changes are sent to the backend.
7. The interface uses optimistic feedback and rolls back state when a request fails.
8. An absence reason can be recorded for a worker/date.

Administrators can also view attendance according to their permitted scope.

### 11.5 Transfer workflow

1. An administrator opens a worker profile.
2. The administrator selects transfer.
3. The system loads divisions, units, and locations.
4. The request records the target location and reason.
5. Intra-division movement can complete under the relevant backend rule.
6. Inter-division movement enters the pending approval process.
7. A general administrator opens Approvals.
8. The administrator approves with effective date and optional letter reference, or rejects the request.

### 11.6 Monthly report workflow

1. The user opens Reports.
2. The user selects:
   - Scope
   - Hostel or block where applicable
   - Reporting month
   - Reporting year
3. The system generates attendance data for the selected locations.
4. The report displays worker totals, locations, days worked, and attendance percentages.
5. A supervisor submits the register.
6. An administrator reviews and verifies it.
7. The report can be exported as CSV or PDF.

### 11.7 User administration workflow

1. An administrator opens Users.
2. The system displays accounts and role filters.
3. A general administrator can create administrator, division administrator, or supervisor accounts according to backend rules.
4. A division administrator can create supervisors for the assigned division.
5. Accounts can be deactivated or reactivated.
6. A general administrator can reset a password and optionally require a password change on next login.

### 11.8 Audit workflow

1. Significant operations create audit entries in backend models/controllers.
2. A general administrator opens Audit Logs.
3. The log can be searched and filtered by action.
4. The screen shows timestamp, action, performer/entity identifiers, and details.

---

## 12. Security and access control

Implemented security-related measures include:

- Password hashing with bcrypt.
- JWT authentication.
- Expiry checking in the frontend token restoration flow.
- Backend authentication middleware.
- Backend role authorization middleware.
- Frontend protected routes.
- Frontend role-aware navigation.
- Login rate limiting through the authentication routes.
- Active/inactive user checks.
- Forced password change support.
- Audit events for important operations.
- Parameterized PostgreSQL queries in model modules.
- Server-side division and role restrictions in controllers/routes.

Important academic wording:

The frontend hides navigation items for convenience, but security enforcement must be attributed to the backend middleware and controller rules, not to menu visibility alone.

---

## 13. User interface and design decisions

The frontend is responsive and provides:

- Desktop fixed sidebar navigation.
- Mobile header and navigation drawer.
- Role-specific menu visibility.
- Consistent forms and table layouts.
- Loading states.
- Error and success feedback.
- Attendance toast messages.
- Responsive report tables with horizontal overflow where required.

The interface has been intentionally refined toward a restrained institutional style:

- ABU green as the primary identity color.
- Plain administrative cards.
- Reduced gradients and decorative motion.
- Simple user icon instead of synthetic initials/avatar styling.
- Institutional crest presented without artificial color inversion.
- Long-form date display such as `17 September 2026`.
- Clear division and operational-unit context.

Screenshots should be inserted by the report author in the relevant sections. Suggested screenshot evidence:

1. Login page.
2. Administrator dashboard.
3. Division/unit/location hierarchy.
4. Workforce directory.
5. Worker profile.
6. Supervisor attendance page.
7. Monthly reports page.
8. Transfer approvals page.
9. User management page.
10. Audit log page.

---

## 14. Reporting and export implementation

### CSV export

The frontend creates CSV output from the generated report worker rows. Export includes fields such as:

- Serial number
- Staff ID
- Full name
- Hostel/location
- Block
- Phone number
- NIN
- Days worked
- Working days in month
- Attendance percentage
- Period
- Register status

### PDF export

The frontend uses jsPDF and AutoTable to generate an institutional attendance register with:

- ABU crest
- University title
- Report title
- Register scope
- Reporting period
- Working days
- Report status
- Generated-by information
- Attendance table
- Total workers
- Aggregate days worked
- Signature areas
- Page numbering and print timestamp

The PDF export is a presentation/reporting feature and does not replace the database verification workflow.

---

## 15. Validation performed during development

The frontend provides:

```text
npm run lint
npm run build
```

The production build was successfully executed during the development review after the frontend changes. The linter completes with warnings from existing React patterns, but no blocking lint failure was present.

The backend package currently contains:

```text
npm test
```

as a placeholder script that reports no configured automated tests. Therefore, the report should not claim a full automated backend test suite unless one is added later.

Suitable validation language:

- Functional workflows were checked through implementation review and manual application interaction.
- Frontend production compilation was verified with Vite.
- Frontend linting was run with Oxlint.
- Backend endpoint behavior should be described as manually verified unless separate test evidence is supplied.

---

## 16. Limitations and future improvements

Reasonable future improvements include:

1. Add automated backend and frontend tests.
2. Add request cancellation or a shared data-fetching abstraction.
3. Add pagination for very large worker and audit datasets.
4. Add stronger CSV parsing for quoted commas and malformed rows.
5. Add formal API schema documentation.
6. Add database backup and recovery procedures.
7. Add configurable report templates.
8. Add notification support for submitted reports and transfers.
9. Add deployment documentation.
10. Add more granular permissions if the university’s governance model expands.
11. Move authentication tokens from local storage to a more hardened cookie strategy if the deployment threat model requires it.
12. Add server-side file validation and storage policies for uploaded photos and ZIP files.

---

## 17. Suggested Chapter Three structure

Claude may organize Chapter Three using the following structure:

### Chapter Three: System Analysis and Methodology

3.1 Introduction  
3.2 Analysis of the Existing System  
3.3 Problems Identified in the Existing System  
3.4 Analysis of the Proposed System  
3.5 Functional Requirements  
3.6 Non-Functional Requirements  
3.7 Feasibility Considerations  
3.8 Development Methodology: Iterative Development  
3.9 System Users and Access Levels  
3.10 Use-Case Descriptions  
3.11 Data Requirements  
3.12 System Constraints and Assumptions  
3.13 Chapter Summary

Functional requirements should be derived from the workflows in this document.

Non-functional requirements may cover:

- Security
- Availability
- Usability
- Maintainability
- Performance
- Scalability
- Data integrity
- Responsiveness

Do not claim measured performance targets unless actual measurements are supplied.

---

## 18. Suggested Chapter Four structure

Claude may organize Chapter Four using the following structure:

### Chapter Four: System Design, Implementation, and Results

4.1 Introduction  
4.2 System Architecture  
4.3 Database Design  
4.4 System Module Design  
4.5 Authentication and Authorization Design  
4.6 User Interface Design  
4.7 Implementation Environment  
4.8 Implementation of Major Modules  
4.9 Attendance and Absence Workflow  
4.10 Transfer and Approval Workflow  
4.11 Monthly Report Workflow  
4.12 Report Export Design  
4.13 Audit Logging  
4.14 Screenshots and Interface Results  
4.15 Validation and Observed Results  
4.16 Limitations  
4.17 Chapter Summary

Screenshots should be inserted manually by the project author, with figure numbers and captions such as:

- Figure 4.1: CSWATMS login interface
- Figure 4.2: Administrator dashboard
- Figure 4.3: Workforce directory
- Figure 4.4: Daily attendance interface
- Figure 4.5: Monthly report interface
- Figure 4.6: Transfer approval interface

---

## 19. Important writing cautions for Claude

1. Do not call the system an AI system. It is a rule-based web application.
2. Do not claim biometric, GPS, payroll, notification, or machine-learning features.
3. Do not claim the system is deployed to production unless deployment evidence is supplied.
4. Do not invent database columns beyond the migration/model evidence.
5. Do not present screenshots as automated test evidence.
6. Do not claim automated tests pass; the backend test script is not configured.
7. Distinguish report generation from report submission and report verification.
8. Distinguish general administrator, division administrator, and supervisor permissions.
9. Explain that the backend enforces authorization; frontend visibility supports usability.
10. Use “operational location”, “hostel”, “block”, and “station” consistently with the actual context.
11. Treat the PDF and CSV output as export functions, not separate reporting systems.
12. Keep the academic narrative specific to Ahmadu Bello University and casual sanitation workforce management.

---

## 20. Source locations for further verification

### Backend

- `backend/src/app.js`
- `backend/src/config/db.js`
- `backend/src/middleware/auth.js`
- `backend/src/utils/auth.js`
- `backend/src/controllers`
- `backend/src/models`
- `backend/src/routes`
- `backend/migrations`

### Frontend

- `frontend/src/App.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/components`
- `frontend/src/pages`
- `frontend/src/api`
- `frontend/src/utils`

### Project-level

- `README.md`
- `frontend/package.json`
- `backend/package.json`

---

## Final handoff instruction

Generate Chapters Three and Four as original academic writing based on this implementation. Include suitable tables for requirements, roles, modules, database entities, and use cases. Add figure placeholders where screenshots will be inserted. Keep the writing clear, technically accurate, and consistent with an undergraduate Computer Science final-year project at Ahmadu Bello University.

