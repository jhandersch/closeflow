# CloseFlow 🚀

A modern CRM SaaS built with Next.js, Supabase and Tailwind.

---

## 📌 Current Features

### 🧠 Dashboard
- KPI overview (total leads, won, revenue, pipeline value)
- Clean analytics layout

### 📋 Leads System
- Full lead list
- Lead detail page with notes
- User-specific data via Supabase

### 🔄 Pipeline
- Kanban-style CRM pipeline
- Drag & drop lead movement
- Status sync with Supabase

---

## 🏗️ Architecture (IMPORTANT)

The app is now structured using the Next.js App Router:


src/app/(dashboard)/
│
├── layout.tsx # Global dashboard layout (Sidebar)
├── dashboard/
├── leads/
│ ├── page.tsx
│ └── [id]/page.tsx
└── pipeline/


### Key improvement:
- Single global layout system
- No duplicate sidebar
- Fully scalable SaaS structure

---

## 🔧 Tech Stack

- Next.js (App Router)
- Supabase (Auth + Database)
- Tailwind CSS
- React DnD (@hello-pangea/dnd)

---

## 🚀 Current Status

CloseFlow is evolving from a simple dashboard into a real SaaS CRM system.

Next steps:
- Authentication & protected routes
- Settings page
- Automation features
- AI lead scoring improvements

---

## 📈 Vision

Building a lightweight, modern CRM alternative to tools like HubSpot & Pipedrive.