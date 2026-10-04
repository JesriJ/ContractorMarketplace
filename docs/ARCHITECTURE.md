# Architecture

## Application structure

Contractor Marketplace is a Next.js application. Pages, server-rendered views, route handlers, and server actions share one TypeScript codebase.

```text
src/app/                 Routes, pages, layouts, and API handlers
src/components/          Reusable UI and form components
src/lib/actions/         Server actions for authenticated mutations
src/lib/validations/     Zod input schemas
src/lib/                 Authentication and domain-specific data access
prisma/                  Database schema and migration history
scripts/                 End-to-end workflow checks
```

PostgreSQL is the source of truth. Prisma provides typed database access, relations, constraints, migrations, and transactions. The UI does not decide whether an operation is authorized; server actions and API handlers validate the session, role, record ownership, current status, and input before writing.

## Core domain model

- `User` stores credentials and a `CUSTOMER` or `CONTRACTOR` role.
- `ContractorProfile` stores public business information separately from account data.
- `Job` belongs to a customer and may be assigned to one contractor.
- `Bid` joins a contractor to a job, with a unique constraint on that pair.
- `HireRequest` represents a direct request and links to its resulting job after acceptance.
- `Conversation` is unique per job; `Message` records its sender and timestamp.
- `Review` is unique per job and links the customer, contractor, and completed work.
- `Quote` stores negotiated pricing for a job (payments are settled off-platform).
- `Job` includes optional `city` and `state` for structured location matching, plus `imageUrls`.
- `JobRequirements` stores AI/heuristic-extracted structured requirements and optional embeddings.
- `JobRecommendation` stores explainable match scores between jobs and contractors.
- `RecommendationEvent` records recommendation view/click analytics.
- Contractor profiles include skills, service categories, service radius, portfolio images, and optional embeddings.

## Authentication and authorization

NextAuth.js uses the Credentials provider. Passwords are hashed with bcrypt before storage and compared on the server during login. Sessions carry the user ID and role needed for authorization checks.

The application applies three levels of access control:

1. Protected routes require an authenticated session.
2. Role checks separate customer and contractor operations.
3. Resource checks verify ownership or participation before returning data or accepting a mutation.

Registration never accepts an authoritative role value indirectly from a profile or session. Role-specific operations re-read the authenticated identity on the server. Public pages expose contractor and job information intended for discovery, not private account or conversation data.

## Marketplace workflows

### Bid acceptance

A customer can accept a pending bid only on a job they own. The transaction assigns the contractor, accepts the selected bid, rejects competing bids, and updates the job status together. Database constraints and status checks prevent a second assignment.

### Direct hiring

A customer creates a request for a specific contractor. Only that contractor can respond. Acceptance runs in a transaction that creates one assigned job and links it back to the request; the unique job relation prevents repeated acceptance from creating duplicate work.

### Messaging

A conversation is associated with an assigned job. Reads and writes require the current user to be either the job's customer or assigned contractor. Per-participant read timestamps support unread indicators, while the client periodically requests new conversation state.

### Completion and reviews

The contractor marks active work ready for confirmation, then the customer confirms completion. Reviews require a completed job, the owning customer, and the assigned contractor. A unique job constraint allows one review per completed job. Public ratings are calculated from stored reviews rather than cached or seeded statistics.

### Quotes

Contractors propose quotes on assigned jobs; customers can accept, reject, or mark a quote as paid outside the platform. No card processor runs inside the app.

### Recommendations

Gemini (optional) extracts structured job requirements when a job is created or updated. Heuristic keyword extraction is used when `GEMINI_API_KEY` is unset or the API fails. Embeddings may be stored for hybrid semantic scoring.

The matching engine applies hard filters (open job, same city/state or wide service radius), then a weighted score over skills, experience, location, availability, rating, price, and optional semantic similarity. Explanations are built only from database facts. Dashboard and job pages read persisted recommendations; optional Upstash Redis caches responses. `npm run recommendations:refresh` recomputes scores from stored requirements.

### Images

Authenticated clients upload images through `/api/blob/upload` using Vercel Blob client tokens. Public blob URLs are stored on jobs and contractor profiles.

## Production

This project is maintained as a **demo deployment** on Vercel with PostgreSQL and Vercel Blob. It is not a live commercial marketplace; the original production service is no longer available. Account credentials, `BLOB_READ_WRITE_TOKEN`, legal identity env vars, and optional `GEMINI_API_KEY` stay in the deployment environment.
