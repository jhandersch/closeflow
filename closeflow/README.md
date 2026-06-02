# 🚀 CloseFlow CRM

A modern lightweight CRM built with **Next.js 14**, **Supabase**, and **Tailwind CSS**.

---

## ✨ Features

- 🔐 Authentication (Supabase Auth)
- 📊 Dashboard with KPIs
- 👤 Full Lead Management (Create / Edit / Delete)
- 📝 Lead Notes system
- 📌 Pipeline workflow (status-based)
- 📈 Activity Timeline per lead
- ⚙️ Settings page
- 🔓 Logout system

---

## 🧠 Activity System

CloseFlow tracks all important actions automatically:

- Lead created
- Lead updated (planned expansion)
- Status changes (planned)
- Notes updates (planned)

Each activity is stored in Supabase and displayed in a timeline per lead.

---

## 🧱 Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Database)
- React Hooks

---

## 📦 Database Schema

### leads

| Column     | Type      |
|------------|----------|
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
|------------|----------|
| id         | uuid      |
| lead_id    | uuid      |
| user_id    | uuid      |
| action     | text      |
| type       | text      |
| created_at | timestamp |

---

## ⚙️ Setup

### 1. Clone repo

```bash
git clone https://github.com/jhandersch/closeflow.git
cd closeflow