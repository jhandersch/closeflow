# CloseFlow CRM

A modern CRM built with Next.js, Supabase, TypeScript, and Tailwind CSS.

CloseFlow helps users manage leads, track sales progress, and maintain a complete history of customer interactions.

---

## Features

### Authentication

* Secure login with Supabase Auth
* User-specific data isolation
* Logout functionality

### Lead Management

* Create leads
* Edit leads
* Delete leads
* Store company information
* Store deal values
* Add lead notes

### Pipeline Workflow

* Status-based lead management
* Lead stages:

  * New
  * Contacted
  * Proposal
  * Won

### Activity Timeline

* Automatic lead creation tracking
* Activity history per lead
* Chronological timeline view
* Persistent activity storage

### Status Change Tracking

CloseFlow automatically records status changes.

Examples:

* Lead created
* Status changed from new to contacted
* Status changed from contacted to proposal
* Status changed from proposal to won

This creates a complete history of each lead's journey through the pipeline.

### Dashboard

* Total Leads
* Won Deals
* Revenue Tracking
* Pipeline Value

### Settings

* User profile page
* Account management foundation

---

## Why CloseFlow?

Most simple CRMs only store information.

CloseFlow is being built to understand how leads evolve over time.

The goal is to combine:

* CRM functionality
* Analytics
* Activity tracking
* AI-powered insights

into a lightweight SaaS product.

---

## Tech Stack

### Frontend

* Next.js 14
* React
* TypeScript
* Tailwind CSS

### Backend

* Supabase
* PostgreSQL
* Supabase Auth

---

## Database Structure

### leads

| Column     | Type      |
| ---------- | --------- |
| id         | uuid      |
| user_id    | uuid      |
| name       | text      |
| company    | text      |
| status     | text      |
| value      | numeric   |
| notes      | text      |
| created_at | timestamp |

---

### activities

| Column     | Type      |
| ---------- | --------- |
| id         | uuid      |
| lead_id    | uuid      |
| user_id    | uuid      |
| action     | text      |
| type       | text      |
| created_at | timestamp |

---

## Local Development

### Clone repository

```bash
git clone https://github.com/jhandersch/closeflow.git
cd closeflow
```
### Completed

* [x] Authentication
* [x] Dashboard
* [x] Lead CRUD
* [x] Notes System
* [x] Pipeline Workflow
* [x] Activity Timeline
* [x] Automatic Status Change Tracking
* [x] Settings Page

### Planned

* [ ] Dashboard Analytics
* [ ] Revenue Forecasting
* [ ] AI Lead Scoring
* [ ] Advanced Activity Tracking
* [ ] Email Integration
* [ ] Team Collaboration
* [ ] AI Sales Insights

---

##  Project Goal

CloseFlow is a learning and portfolio SaaS project focused on understanding:

* Real-world CRM architecture
* Full-stack development
* Database design
* SaaS product development
* AI-powered business tools

The project is being built publicly and improved step by step.

