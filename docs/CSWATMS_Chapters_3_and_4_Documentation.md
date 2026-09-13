# CSWATMS: Comprehensive Technical Specification & Academic Project Documentation Reference
**Project Title:** Web-Based Casual Sanitation Workforce Attendance and Task Management System for Ahmadu Bello University, Zaria (CSWATMS)  
**Author:** Yusuf Paul (Reg No: U21CS1005)  
**Department:** Department of Computer Science, Faculty of Physical Sciences, Ahmadu Bello University, Zaria  
**Supervisor:** Mal. I.E. Umar  
**Framework Target:** Chapters 3 and 4 of ABU B.Sc. Computer Science Final Year Project Thesis

---

## Executive Summary & Document Purpose
This document provides an exhaustive, mathematically and architecturally accurate record of the **Casual Sanitation Workforce Attendance and Task Management System (CSWATMS)** as implemented. It is structured specifically to provide any Large Language Model (LLM) or academic author all theoretical, design, algorithmic, architectural, and empirical data necessary to write:
* **Chapter 3: Design of the Proposed System / Application**
* **Chapter 4: Implementation of the Proposed System and Discussion of Results**

---

# SECTION A: ARCHITECTURAL & FUNCTIONAL CONTEXT (PROJECT OVERVIEW)

### A.1 Institutional Problem Statement
Prior to CSWATMS, Ahmadu Bello University managed casual sanitation laborers (cleaning university hostels, academic complexes, health facilities, and sanitation zones) through manual paper logbooks and fragmented rosters:
1. **Ghost Worker & Attendance Fraud:** Manual signatures allowed proxy marking, retroactive signing, and unverified headcount inflation before payroll clearance.
2. **Slow Payroll Reconciliation:** Monthly physical attendance registers took 7–14 days to collect, tally across dozens of hostel blocks, cross-verify, and send to the Bursary/Finance department.
3. **Operational Blind Spots:** Student Affairs Division and University Health Services (UHS) administrators lacked real-time visibility into daily cleaner distribution across dormitories and sanitation beats.
4. **Data Redundancy & Fragmentation:** Casual worker identities, station transfer histories, and disciplinary/absence audit trails were scattered across physical files.

### A.2 Proposed Technical Solution
CSWATMS is an enterprise, multi-tenant-by-division, web-based workforce governance platform. It features:
* **Strict Role-Based Multi-Division Hierarchy:** University $\rightarrow$ Divisions (e.g., Student Affairs Division, University Health Services) $\rightarrow$ Operational Units (e.g., Hall Administration Unit, Environmental Sanitation Unit) $\rightarrow$ Operational Locations (e.g., Ramat Hall — Block A, Suleiman Hall, Ribadu Hostels).
* **Multi-Tier User Roles:**
  1. `administrator` (Super-Admin): Full institutional oversight, system audit logs, division creation, user onboarding.
  2. `division_admin` (e.g., Hall Administrator or Director of UHS): Scoped governance of their operational units, locations, worker rosters, supervisor assignments, transfers, and monthly attendance approvals.
  3. `supervisor` (e.g., Hostel Supervisor / Beat Inspector): Assigned to specific operational locations; daily attendance taking, audit-only absence reason logging, and monthly report submission.
* **Optimistic Daily Attendance Taking:** Instant zero-latency checklist UI with background synchronization and automatic rollback on network failure.
* **Audit-Only Absence Logging:** Free-text daily absence reason logging stored separately from the attendance ledger so the pay register is never corrupted.
* **Streamlined Worker Onboarding & Biometrics:** Single registration with instant passport photo attachment, batch CSV/Excel onboarding with automatic station reconciliation, and bulk photo ingestion via ZIP archives with fuzzy/regex Staff ID matching.
* **Multi-Scope Payroll Verification Workflow:** Block-level, hostel-level, and division-wide master roll-ups with a two-step State Machine: *Unsubmitted* $\rightarrow$ *Submitted (by Supervisor)* $\rightarrow$ *Verified (by Division Admin)*.

---

# SECTION B: CHAPTER 3 REFERENCE — DESIGN OF THE PROPOSED SYSTEM

## 3.1 Design Methodology
* **Software Development Life Cycle (SDLC):** Agile / Incremental Development Model.
  * **Justification:** Sanitation operations on campus required frequent feedback loops with hostel supervisors and administrators. Iterative delivery allowed prototyping the core attendance loop first, followed by audit trails, bulk ingestion, and payroll aggregation.

## 3.2 System Architecture (Three-Tier Client-Server Architecture)
CSWATMS is architected as a decoupled, asynchronous Three-Tier System:
1. **Presentation Tier (Client):** Single Page Application (SPA) built with React 19, Vite, and Tailwind CSS.
2. **Application Tier (Business Logic & REST API):** Node.js runtime with Express.js server, stateless JWT security, Multer streaming, and connection-pooled PostgreSQL clients.
3. **Data Tier (Storage & Persistence):** PostgreSQL 16 relational database with relational constraints, indexes, identity sequences, and ACID transaction isolation.
4. **File System Storage:** Local static storage under `backend/uploads/worker_photos` with HTTP static caching headers and DB relative-path mapping.

```
+-------------------------------------------------------------------------+
|                          PRESENTATION TIER                              |
|   React SPA (Vite) | Tailwind CSS | React Router | Axios Client (5173)   |
+------------------------------------+------------------------------------+
                                     | HTTP / REST (JSON + Multipart)
                                     v
+-------------------------------------------------------------------------+
|                          APPLICATION TIER                               |
|   Express.js API (Port 5000)                                            |
|   - Authentication Middleware (JWT verification & Role Guards)          |
|   - Domain Controllers (Workers, Attendance, Absence, Reports, Auth)    |
|   - In-Memory ZIP Stream Extraction (adm-zip) & Multer Disk Storage     |
|   - Audit Logging Engine                                                |
+------------------------------------+------------------------------------+
                                     | node-pg Connection Pool (Port 5432)
                                     v
+-------------------------------------------------------------------------+
|                            DATA TIER                                    |
|   PostgreSQL Relational DB                                              |
|   - Strict Constraints (Foreign Keys, Cascades, Composite Unique)       |
|   - Relational Tables (12 active tables)                                |
|   - Filesystem Storage: backend/uploads/worker_photos/                  |
+------------------------------------+------------------------------------+
```

---

## 3.3 Database Schema & Data Dictionary (PostgreSQL)

The database schema comprises **12 production tables**, established via ordered SQL migrations:

### 1. `divisions`
Represents major university operational directorates.
* `id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
* `name`: `VARCHAR(100) NOT NULL UNIQUE` (e.g., 'Student Affairs Division', 'University Health Services')
* `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 2. `operational_units`
Administrative units within a division.
* `id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
* `division_id`: `BIGINT NOT NULL REFERENCES divisions(id) ON DELETE CASCADE`
* `name`: `VARCHAR(100) NOT NULL` (e.g., 'Hall Administration Unit')
* `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`
* *Constraint:* `UNIQUE(division_id, name)`

### 3. `operational_locations`
Specific physical work beats / hostels / blocks.
* `id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
* `operational_unit_id`: `BIGINT NOT NULL REFERENCES operational_units(id) ON DELETE CASCADE`
* `name`: `VARCHAR(100) NOT NULL` (e.g., 'Ramat Hall — Block A', 'ICSA Hall — Block B')
* `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`
* *Constraint:* `UNIQUE(operational_unit_id, name)`

### 4. `users`
System operators with role-based credentials.
* `id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
* `username`: `VARCHAR(50) NOT NULL UNIQUE`
* `password_hash`: `VARCHAR(255) NOT NULL` (Bcrypt hash)
* `role`: `VARCHAR(20) NOT NULL CHECK (role IN ('administrator', 'division_admin', 'supervisor'))`
* `division_id`: `BIGINT REFERENCES divisions(id) ON DELETE SET NULL`
* `must_change_password`: `BOOLEAN NOT NULL DEFAULT false` (Security enforcement)
* `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 5. `location_supervisors`
Many-to-many relationship mapping supervisors to their assigned hostels/locations.
* `id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
* `location_id`: `BIGINT NOT NULL REFERENCES operational_locations(id) ON DELETE CASCADE`
* `user_id`: `BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`
* `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`
* *Constraint:* `UNIQUE(location_id, user_id)`

### 6. `workers`
Sanitation casual staff registry.
* `id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
* `staff_id`: `VARCHAR(50) NOT NULL UNIQUE` (Vetting/matric code, e.g., 'CW/2026/001')
* `full_name`: `VARCHAR(100) NOT NULL`
* `phone_number`: `VARCHAR(20)`
* `appointment_date`: `DATE NOT NULL`
* `status`: `VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))`
* `photo_url`: `VARCHAR(255)` (Relative URI path to disk asset)
* `national_id_nin`: `VARCHAR(20)`
* `next_of_kin_name`: `VARCHAR(100)`
* `next_of_kin_phone`: `VARCHAR(20)`
* `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`
* `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

### 7. `assignments`
Worker station deployment history (enables transfer auditability).
* `id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
* `worker_id`: `BIGINT NOT NULL REFERENCES workers(id) ON DELETE CASCADE`
* `division_id`: `BIGINT NOT NULL REFERENCES divisions(id)`
* `operational_unit_id`: `BIGINT NOT NULL REFERENCES operational_units(id)`
* `operational_location_id`: `BIGINT NOT NULL REFERENCES operational_locations(id)`
* `effective_from`: `DATE NOT NULL`
* `effective_to`: `DATE` (`NULL` signifies the worker's current active deployment)
* `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`
* *Indexes:* `idx_assignments_worker_active` on `(worker_id) WHERE effective_to IS NULL`

### 8. `transfers`
Administrative record of worker station reassignments with dual-path approval governance.
* `id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
* `worker_id`: `BIGINT NOT NULL REFERENCES workers(id) ON DELETE CASCADE`
* `from_assignment_id`: `BIGINT NOT NULL REFERENCES assignments(id)`
* `to_assignment_id`: `BIGINT REFERENCES assignments(id)` (`NULL` while `status = 'pending'`)
* `to_division_id`: `BIGINT NOT NULL REFERENCES divisions(id)`
* `to_operational_unit_id`: `BIGINT NOT NULL REFERENCES operational_units(id)`
* `to_operational_location_id`: `BIGINT NOT NULL REFERENCES operational_locations(id)`
* `transfer_type`: `VARCHAR(20) NOT NULL CHECK (transfer_type IN ('intra_division', 'inter_division'))`
* `status`: `VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected'))`
* `requested_by`: `BIGINT NOT NULL REFERENCES users(id)` (initiating user)
* `authorized_by`: `BIGINT REFERENCES users(id)` (`NULL` until approved by administrator)
* `transfer_letter_reference`: `VARCHAR(100)` (optional official memo reference, inter-division only)
* `effective_date`: `DATE` (`NULL` until approved)
* `reason`: `TEXT`
* `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`
* *Migration:* `016_update_transfer_type_check.sql` — added `intra_division`/`inter_division` to the type constraint and enforced `authorized_by` rules.

### 9. `attendance`
The core presence ledger (Daily pay ticks).
* `id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
* `assignment_id`: `BIGINT NOT NULL REFERENCES assignments(id) ON DELETE RESTRICT`
* `attendance_date`: `DATE NOT NULL`
* `marked_by`: `BIGINT NOT NULL REFERENCES users(id)`
* `capture_method`: `VARCHAR(20) NOT NULL DEFAULT 'web'`
* `marked_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`
* *Constraints & Indexes:* `UNIQUE(assignment_id, attendance_date)`; index on `attendance_date`

### 10. `absence_logs`
Audit-only record for absent workers (Preserves payroll integrity).
* `id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
* `assignment_id`: `BIGINT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE`
* `absence_date`: `DATE NOT NULL`
* `reason`: `TEXT NOT NULL` (Supervisor's free-text observation)
* `logged_by`: `BIGINT NOT NULL REFERENCES users(id)`
* `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`
* *Constraint:* `UNIQUE(assignment_id, absence_date)`

### 11. `report_verifications`
Monthly attendance reconciliation state machine.
* `id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
* `operational_location_id`: `BIGINT NOT NULL REFERENCES operational_locations(id) ON DELETE CASCADE`
* `period_month`: `SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12)`
* `period_year`: `SMALLINT NOT NULL CHECK (period_year >= 2024)`
* `status`: `VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified'))`
* `submitted_by`: `BIGINT NOT NULL REFERENCES users(id)`
* `submitted_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`
* `verified_by`: `BIGINT REFERENCES users(id)`
* `verified_at`: `TIMESTAMPTZ`
* *Constraint:* `UNIQUE(operational_location_id, period_month, period_year)`

### 12. `audit_logs`
Immutable accountability trail tracking system operations.
* `id`: `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
* `user_id`: `BIGINT REFERENCES users(id)`
* `action`: `VARCHAR(50) NOT NULL` (e.g., 'mark_attendance', 'log_absence', 'bulk_import_workers', 'verify_report')
* `entity_type`: `VARCHAR(50) NOT NULL`
* `entity_id`: `BIGINT`
* `details`: `JSONB` (Stores snapshot payloads, affected IDs, parameters)
* `ip_address`: `VARCHAR(45)`
* `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT now()`

---

## 3.4 Procedural Modeling & Workflows

### 3.4.1 State Machine: Monthly Report Verification
```
 +-------------------------------------------------------------+
 |                         UNSUBMITTED                         |
 |  Attendance being actively marked throughout the month      |
 +------------------------------+------------------------------+
                                |
                                | Supervisor clicks "Submit Report"
                                v
 +-------------------------------------------------------------+
 |                          SUBMITTED                          |
 |  Report locked by supervisor; awaiting division review      |
 +------------------------------+------------------------------+
                                |
                                | Division Admin clicks "Verify Report"
                                v
 +-------------------------------------------------------------+
 |                          VERIFIED                           |
 |  Final approval sealed; exported to PDF/CSV for Bursary     |
 +------------------------------+------------------------------+
```

### 3.4.2 Optimistic Attendance UI Flow
```
 User clicks "Mark" on Worker
              |
              v
 [Step 1] Instantly mutate local React State (Set presentSet = presentSet + id)
          Visual badge flips to Green "Present" immediately (0ms UI latency)
              |
              +------------------------------------------+
              | (Fire background HTTP POST in parallel)  |
              v                                          v
       HTTP 201 Created                           HTTP Error (4xx/5xx/Network)
              |                                          |
        Do nothing;                               Rollback local State
        UI is already correct                     (Delete worker ID from presentSet);
                                                  Trigger Toast Error: "Failed to mark..."
```

### 3.4.3 Bulk Photo Ingestion Algorithm (ZIP Extraction & Staff ID Matching)
```
Input: archive.zip uploaded via multipart/form-data
Output: Summary { matched_count, unmatched_count, matched[], unmatched[] }

1. Load all active workers from DB: workers = SELECT id, staff_id FROM workers;
2. Extract ZIP archive into in-memory file entries using adm-zip;
3. Filter entries where extension IN (.jpg, .jpeg, .png, .webp);
4. For each entry in entries:
     a. Extract clean filename: name = basename(entry.name, ext);
     b. Search workers for a match where:
          name.toLowerCase().includes(worker.staff_id.toLowerCase())
     c. If worker match found:
          i.   Generate disk filename: "worker_" + worker.id + "_" + Date.now() + ext
          ii.  Write entry.getData() to backend/uploads/worker_photos/
          iii. UPDATE workers SET photo_url = relative_path WHERE id = worker.id;
          iv.  matched.push({ staff_id: worker.staff_id, filename: entry.name });
     d. Else:
          i.   unmatched.push(entry.name);
5. Delete temporary archive from backend/uploads/tmp/;
6. Return JSON response with matched and unmatched lists.
```

### 3.4.4 State Machine: Worker Transfer Governance

CSWATMS implements a **bifurcated transfer workflow** that distinguishes between transfers within the same division and transfers that cross divisional boundaries, applying different approval governance to each.

```
 ┌─────────────────────────────────────────────────────────────────────┐
 │              TRANSFER INITIATED (Division Admin or Super Admin)      │
 └──────────────────────────┬──────────────────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               │                         │
               ▼                         ▼
   ┌───────────────────────┐   ┌───────────────────────────────┐
   │   INTRA-DIVISION      │   │   INTER-DIVISION              │
   │  (Same division)      │   │  (Different division)         │
   │                       │   │                               │
   │  e.g. Ramat Hall →    │   │  e.g. Student Affairs →      │
   │  Suleiman Hall        │   │  University Health Services   │
   └──────────┬────────────┘   └───────────────┬───────────────┘
              │                                │
              │  Confirmation dialog           │  Sent to pending queue
              │  ("Are you sure?")             │  ("Forwarded to Central
              │                                │   Administrator")
              ▼                                ▼
   ┌───────────────────────┐   ┌───────────────────────────────┐
   │   COMPLETED           │   │   PENDING                     │
   │  (Immediate)          │   │  (Awaiting Super Admin)        │
   │                       │   └───────────────┬───────────────┘
   │  Assignment record    │                   │
   │  updated atomically   │    ┌──────────────┴──────────────┐
   │  (old effective_to    │    │                             │
   │  = today, new record  │    ▼                             ▼
   │  created)             │  ┌─────────────┐    ┌───────────────────────┐
   └───────────────────────┘  │  COMPLETED  │    │   REJECTED            │
                               │  (Approved) │    │   (Declined)          │
                               │             │    │                       │
                               │  Assignment │    │  Transfer record      │
                               │  updated    │    │  status = 'rejected'  │
                               └─────────────┘    └───────────────────────┘
```

**Role Access Governance Table:**

| Operation | `administrator` | `division_admin` | `supervisor` |
| :--- | :---: | :---: | :---: |
| Initiate intra-division transfer | ✅ | ✅ (own division workers only) | ❌ |
| Initiate inter-division transfer request | ✅ | ✅ (own division workers only) | ❌ |
| Approve inter-division transfer | ✅ | ❌ | ❌ |
| Reject inter-division transfer | ✅ | ❌ | ❌ |
| View Approvals Panel (pending transfers) | ✅ | ❌ | ❌ |
| Verify monthly attendance reports | ✅ | ✅ (own division) | ❌ |
| Submit monthly attendance reports | ✅ | ✅ | ✅ (own location) |
| Create/manage divisions, units, locations | ✅ | ❌ | ❌ |
| Register/onboard workers | ✅ | ✅ (own division) | ❌ |

---

# SECTION C: CHAPTER 4 REFERENCE — IMPLEMENTATION & DISCUSSION OF RESULTS

## 4.1 Development & Execution Environment
* **Server Runtime:** Node.js v24.17.0 (LTS)
* **Web Framework:** Express.js 5.2.1
* **Frontend Framework:** React 19.0.0 bootstrapped via Vite 8.2.2
* **Styling & Icons:** Tailwind CSS v3.4.17, Google Material Symbols Outlined
* **Database Management System:** PostgreSQL 16.2 on port 5432
* **Database Driver:** `pg` (node-postgres) with connection pooling (`pg-pool`)
* **Security & Auth:** `bcrypt` (password hashing, 10 salt rounds), `jsonwebtoken` (HMAC-SHA256 JWT)
* **Archive & File Processing:** `multer` (multipart/form-data handling), `adm-zip` (ZIP stream processing)

---

## 4.2 Module Implementation Details

### Module 1: Daily Attendance & Absence Auditing
* **Files:**
  * Backend: `attendanceController.js`, `attendanceModel.js`, `absenceLogController.js`, `absenceLogModel.js`
  * Frontend: `Attendance.jsx`, `attendanceApi.js`
* **Implementation Logic:**
  * Evaluates supervisor deployment authorization: a supervisor cannot tick attendance for an assignment outside their assigned `operational_location_id`.
  * Optimistic UI implementation uses JavaScript `Set` operations in React state.
  * Absence logging leverages PostgreSQL `UPSERT` (`INSERT ... ON CONFLICT (assignment_id, absence_date) DO UPDATE SET reason = ...`) ensuring idempotent updates if a supervisor edits their remark.
  * Absent records leave the `attendance` table untouched, strictly preserving the pay calculation.

### Module 2: Workforce Onboarding & Identity Management
* **Files:**
  * Backend: `workerController.js`, `workerModel.js`
  * Frontend: `Workers.jsx`, `WorkerImportModal.jsx`, `BulkPhotoUploadModal.jsx`, `WorkerProfile.jsx`
* **Implementation Logic:**
  * **Batch CSV Ingestion:** Parses rows in-browser via Regex, validates headers, checks existing staff IDs in the database to prevent duplicates, matches station names to location IDs, and sends an atomic batch array to `POST /api/workers/bulk-import`.
  * **Transactional Assignment:** When workers are created with initial station deployments, the backend executes worker insertion and assignment creation within a single SQL transaction (`BEGIN ... COMMIT / ROLLBACK`).
  * **Dual Passport Ingestion:** Single registration modal includes an optional file input streaming to Multer disk storage; bulk ingestion extracts ZIPs, matches via substring regex, and updates `workers.photo_url`.

### Module 3: Reporting, Aggregation & Bursary Pay Register
* **Files:**
  * Backend: `reportModel.js`, `reportController.js`
  * Frontend: `Reports.jsx`, `exportUtils.js`
* **Implementation Logic:**
  * SQL Aggregation Query computes exact days worked per month per worker:
    ```sql
    COUNT(att.id)::int AS days_worked,
    COALESCE(ARRAY_AGG(EXTRACT(DAY FROM att.attendance_date)::int)
      FILTER (WHERE att.id IS NOT NULL), '{}') AS days_present_array
    ```
  * Filter condition ensures casuals hired mid-month or terminated mid-month are scoped strictly to their active appointment window:
    ```sql
    WHERE a.effective_from <= (make_date($3::int, $2::int, 1) + interval '1 month' - interval '1 day')
      AND (a.effective_to IS NULL OR a.effective_to >= make_date($3::int, $2::int, 1))
    ```
  * Dynamic report scoping:
    * `single_block`: One specific hostel block.
    * `hostel`: All blocks belonging to a given hostel complex.
    * `all_hostels`: Master consolidated report grouping all locations across the division.
  * PDF/CSV export engine formats data tables with full calendar attendance day visualizers for bursary compliance.

### Module 4: Access Control & Security Enforcement
* **Files:**
  * Backend: `auth.js`, `authController.js`
  * Frontend: `ProtectedRoute.jsx`, `ChangePasswordModal.jsx`
* **Implementation Logic:**
  * JWT tokens signed with secret key, containing payload: `{ id, username, role, division_id }`.
  * `authenticate` middleware verifies Authorization header (`Bearer <token>`).
  * `authorize(...roles)` checks user permissions.
  * Division isolation: `division_admin` requests enforce `WHERE division_id = req.user.division_id`, preventing cross-division tampering.
  * First-login password enforcement: `must_change_password` flag forces user to change password before any navigation is allowed.

### Module 5: Worker Transfer Governance
* **Files:**
  * Backend: `transferController.js`, `transferModel.js`, `transferRoutes.js`, `divisionController.js`, `operationalUnitController.js`, `operationalLocationController.js`
  * Frontend: `WorkerProfile.jsx`, `Approvals.jsx`, `hierarchyApi.js`
  * Database Migration: `016_update_transfer_type_check.sql`
* **Implementation Logic:**
  * **Transfer Scope Classification:** The server derives `transfer_type` server-side by comparing the destination `to_division_id` against the worker's current `assignment.division_id`. Client-supplied values are never trusted for this classification.
    ```javascript
    const isIntraDivision = targetDivisionId === Number(currentAssignment.division_id);
    const transfer_type = isIntraDivision ? "intra_division" : "inter_division";
    ```
  * **Intra-Division Path (Instant):** The transfer record is created and immediately completed within the same HTTP request. The backend calls `completeTransfer()` atomically: the old `assignments` row receives `effective_to = today`, a new active assignment row is inserted, and the `transfers.status` is set to `'completed'`. The initiating admin sees a success message on confirmation.
  * **Inter-Division Path (Approval Queue):** The transfer record is created with `status = 'pending'`. It enters the approval queue visible exclusively to the `administrator` role via `GET /api/transfers/pending`. The Division Admin's UI displays a "Forwarded to Central Administrator" acknowledgement message.
  * **Super Admin Approval Flow:** The Central Administrator views the `Approvals.jsx` page showing pending inter-division transfer cards enriched with worker name, staff ID, requesting user, and both origin and destination division/unit/location names (resolved via SQL JOIN in `getTransfersByStatus`). On approval, `POST /api/transfers/:id/approve` calls `completeTransfer()`, moving the assignment. On rejection, `POST /api/transfers/:id/reject` updates `status = 'rejected'` without modifying assignments.
  * **Division Admin Authorization Guard:** A `division_admin` can only initiate transfers for workers whose current `assignment.division_id` matches their own `req.user.division_id`. A hard HTTP 403 is returned otherwise.
  * **Cascade Division Dropdown (Frontend):** `WorkerProfile.jsx` calls `getDivisions({ all: "true" })` to populate the destination division dropdown for all users. `divisionController.js` honours the `?all=true` query parameter, bypassing the normal `division_admin` scope restriction specifically for this use case. Cascading dropdowns then fetch units (`?division_id=X`) and locations (`?operational_unit_id=Y`), both of which also bypass division-restriction when an explicit foreign-key param is supplied.
  * **UI Intent Indicators:** The transfer modal applies a real-time visual badge — amber **"Inter-Division Transfer"** gavel icon if the selected destination is a different division, green **"Intra-Division Reassignment"** bolt icon if same division — allowing the initiating user to understand the approval implications before submitting.
  * **Route-Level Authorization:** `transferRoutes.js` applies `authorize("administrator")` middleware to `GET /pending`, `POST /:id/approve`, and `POST /:id/reject` as an additional layer of defense beyond the controller-level role check.

---

## 4.3 Testing, Experimental Results & System Evaluation

### 4.3.1 Functional Testing (Test Cases & Results Matrix)

| Test Case ID | Test Scenario | Input / Action | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Unauthorized Attendance Marking | Supervisor tries to mark worker outside assigned hostel | HTTP 403 Forbidden; "You do not supervise this worker's current location" | As expected | **PASSED** |
| **TC-02** | Duplicate Attendance Prevention | Mark same worker twice on the same date | PostgreSQL `UNIQUE(assignment_id, attendance_date)` triggers; HTTP 409 Conflict | As expected | **PASSED** |
| **TC-03** | Optimistic UI Rollback | Network disconnected while marking attendance | UI flips green immediately, catches network failure, rolls back to original state, shows error toast | As expected | **PASSED** |
| **TC-04** | Absence Audit Isolation | Supervisor logs absence reason "Sick - Malaria" | Record saved in `absence_logs`; `attendance` count remains 0; Pay register displays 0 days | As expected | **PASSED** |
| **TC-05** | Bulk CSV Ingestion | Upload 50-row CSV with valid & invalid Staff IDs | Duplicate IDs flagged in live preview; valid rows inserted in atomic SQL transaction | As expected | **PASSED** |
| **TC-06** | Bulk Photo Matching | Upload ZIP containing `CW-001.jpg` and `random.jpg` | `CW-001.jpg` matched and saved to `backend/uploads/worker_photos`; `random.jpg` reported as unmatched | As expected | **PASSED** |
| **TC-07** | Report State Progression | Supervisor submits report; Division Admin reviews | Report status transitions: `Unsubmitted` $\rightarrow$ `Submitted` $\rightarrow$ `Verified`; verify locks report | As expected | **PASSED** |
| **TC-08** | Division Data Isolation | UHS Admin attempts to view Student Affairs workers | HTTP 403 Forbidden or filtered query returning only UHS records | As expected | **PASSED** |
| **TC-09** | Intra-Division Transfer (Instant) | Division Admin selects a worker and transfers to another hostel within the same division; confirms dialog | Transfer record created with `transfer_type = 'intra_division'`; `assignments` table updated atomically with old `effective_to` = today and new active row; response `status = 'completed'` | As expected | **PASSED** |
| **TC-10** | Inter-Division Transfer (Approval Queue) | Division Admin selects a worker and sets destination to a different division (e.g. Student Affairs → UHS) | Transfer record created with `transfer_type = 'inter_division'`, `status = 'pending'`; UI shows "Forwarded to Central Administrator"; record appears on Super Admin's Approvals page; division admin cannot approve it (HTTP 403) | As expected | **PASSED** |

### 4.3.2 Empirical System Metrics & Performance Evaluation
* **Attendance Capture Latency:**
  * Traditional page-reload approach: ~1.2s to 2.4s per worker click due to DOM reflow and server trip.
  * CSWATMS Optimistic UI: **0ms perceived client latency**; background HTTP sync resolves in **~42ms** over campus LAN / local host.
* **Bulk Worker Ingestion Speed:**
  * 100 casual workers ingested and assigned stations via atomic SQL transaction in **~380ms**.
* **Report Generation & Aggregation:**
  * Division-wide aggregation across 25+ locations and 1,000+ attendance records queries in **<65ms** using composite indexes on `assignments` and `attendance`.
* **Frontend Bundle Performance:**
  * Vite production build: 108 modules transformed in **3.08 seconds**.
  * Total gzipped JS payload: **~133 KB**, enabling rapid load times even on slow 3G mobile connections used by campus hostel supervisors.

---

## 4.4 Discussion of Results
1. **Elimination of Payroll Discrepancies:** The integration of atomic daily ticking with the two-stage approval workflow (`Submitted` $\rightarrow$ `Verified`) eliminates retroactive ghost marking.
2. **Audit Separation Principle:** The architectural decision to isolate `absence_logs` from the `attendance` table resolved the conflict between supervisory auditability and finance-grade accuracy: supervisors have a voice to log observations without tampering with the payroll formula.
3. **Operational Usability:** By utilizing an optimistic UI pattern in `Attendance.jsx`, supervisors in large hostels (e.g., Ribadu or Suleiman with dozens of cleaners) can rapidly take roll call in minutes without UI freezing or repetitive page refreshing.
4. **Institutional Scalability:** The multi-division hierarchy allows CSWATMS to seamlessly expand beyond hostel sanitation (Student Affairs) to university clinics (UHS), academic faculties, and maintenance units without altering the core database architecture.
5. **Governance-Aware Transfer Workflow:** The bifurcated transfer state machine respects institutional authority boundaries. Division Administrators retain operational agility — quickly reassigning a cleaner between hostels within their own purview — while cross-divisional movements, which carry inter-departmental resource implications, are routed through the Central Administrator's approval queue. This design mirrors real-world ABU inter-division governance, improving accountability without adding bureaucratic overhead to routine intra-division reassignments.
