# Contractor Marketplace

This repository includes demo of contractor marketplace. It shows the full product flow—accounts, jobs, bidding, messaging, quotes, recommendations, and reviews—for evaluation and learning. It is **not** an active commercial marketplace, and the original production service is no longer offered.

Sample accounts and data may be reset at any time. Do not use this deployment for real hiring or payment arrangements.

**[Open demo](https://contractor-marketplace-seven.vercel.app/)**

## For customers

- Search contractors by trade and location
- Post a job with city/state, skills, and photos
- Compare incoming bids and recommended contractors
- Request service directly from a contractor profile
- Message the assigned contractor
- Negotiate via in-app quotes (payments happen off-platform)
- Confirm completed work and leave a review

## For contractors

- Publish a business profile with trade, location, skills, portfolio photos, and rate
- Browse open jobs and submit a bid
- See recommended jobs on the dashboard
- Accept or decline direct service requests
- Track assigned work through completion
- Message customers and collect ratings from finished jobs

## Quotes

Pricing is negotiated with quotes. The platform does not process card payments. Contractors and customers agree on an amount in-app, then settle payment outside the marketplace.

## Recommendations

Gemini extracts structured job requirements when a job is created or updated. Matching uses hard filters plus a weighted score over skills, experience, location (city/state), availability, rating, price, and optional embeddings. Without Gemini, heuristic extraction still powers recommendations. Contractors see recommended jobs on the dashboard; customers see recommended contractors on open job pages.

## Images

Job and profile photos upload through Vercel Blob (public store). Set `BLOB_READ_WRITE_TOKEN` in the environment.

## How it works

Customer and contractor permissions are enforced on the server. A user can change only the jobs, bids, requests, conversations, and reviews that belong to them.

Hiring is transactional. Accepting a bid assigns that contractor and closes the other bids together. Accepting a direct request creates one assigned job, and a repeated acceptance cannot create another.

Each job has one conversation and one review. Ratings shown on contractor profiles are calculated from submitted reviews.

[Architecture](docs/ARCHITECTURE.md) describes the data model, access rules, and main workflows.

## Stack

Next.js, React, TypeScript, Tailwind CSS, PostgreSQL, Prisma, NextAuth.js, and Vercel Blob. The demo is hosted on Vercel.
