# Growth Dashboard
<img width="1918" height="968" alt="Screenshot 2026-02-05 025629" src="https://github.com/user-attachments/assets/095942c1-5261-4f76-badb-23b16b16b611" />
<img width="1910" height="954" alt="Screenshot 2026-02-05 025754" src="https://github.com/user-attachments/assets/b77cb70f-1691-49ea-b7d3-4bc1c1ce4504" />
Personal dashboard for prayer tracking, daily objectives, academic repository, analytics, and events.

## Overview

This project is a full-stack Vite + React frontend with a Node.js + Express backend that uses Supabase as the database and Google Drive for lesson file storage. It includes email notifications for prayer times, task reminders, and event reminders.

## Core Features

### Prayer Tracker
- Daily prayer checklist with completion toggles.
- Automatic daily reset at 12 PM (local server time) using a “prayer day” rule.
- Prayer history for the last 7 days.
- Prayer timings fetched from Aladhan API based on user location.
- “Email Prayer Timings” button to send today’s timings via SMTP.

### Daily Objectives
- Add tasks with optional reminder time.
- Task reminders sent via email when the due time arrives.
- Completion tracking and progress summary.

### Academic Repository
- Subjects → Chapters → Lessons hierarchy.
- Create and delete subjects, chapters, and lessons.
- Lesson editor with rich text controls (bold, italic, underline, alignment, lists).
- Multiple file uploads per lesson stored in Google Drive.
- File removal deletes from Drive and DB.
- Viewer panels can be hidden to expand the reading area.

### Events Calendar
- Create and list events by date.
- Tomorrow’s events trigger an email reminder.

### Analytics
- Activity heatmap based on recorded actions.
- Trend chart and summary statistics.

## Tech Stack
- Frontend: Vite, React, TypeScript, Tailwind CSS, shadcn-ui
- Backend: Node.js, Express
- Database: Supabase (PostgreSQL)
- File storage: Google Drive API
- Email: Gmail SMTP (Nodemailer)
- Scheduling: node-cron

## Project Structure

- src/pages: App pages
- src/components: UI and feature components
- src/lib: API helpers
- server/index.js: Express API server
- server/migrations: Database migrations

## Environment Variables

Create .env in the project root. Required fields:

### Supabase
- SUPABASE_URL
- SUPABASE_ANON_KEY

### Backend
- PORT

### Frontend
- VITE_API_URL

### Google Drive OAuth
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URI
- GOOGLE_DRIVE_FOLDER_NAME (defaults to muneeb_to_do_list)
- GOOGLE_DRIVE_SHARE_PUBLIC

### Prayer timing & notifications
- DEFAULT_LAT
- DEFAULT_LNG
- DEFAULT_TIMEZONE
- NOTIFY_EMAIL

### SMTP
- EMAIL_HOST
- EMAIL_PORT
- EMAIL_USE_TLS
- EMAIL_HOST_USER
- EMAIL_HOST_PASSWORD

## Running Locally

- Install dependencies: npm i
- Frontend: npm run dev
- Backend: npm run dev:server
- Both: npm run dev:all

## Database Migrations

Migrations are stored in server/migrations. To run them:
- Set SUPABASE_DB_URL (Postgres connection string)
- Run: node server/run-migrations.js

## Backend API Summary

### Prayer
- GET /api/prayers/today
- POST /api/prayers/:id/complete
- GET /api/prayers/history?days=7
- GET /api/prayers/timings
- POST /api/prayers/timings/email

### Tasks
- GET /api/tasks?date=YYYY-MM-DD
- POST /api/tasks
- PATCH /api/tasks/:id
- DELETE /api/tasks/:id

### Events
- GET /api/events
- POST /api/events
- DELETE /api/events/:id

### Academic
- GET /api/subjects
- POST /api/subjects
- DELETE /api/subjects/:id
- POST /api/chapters
- DELETE /api/chapters/:id
- GET /api/lessons
- POST /api/lessons
- GET /api/lessons/:id
- PATCH /api/lessons/:id
- DELETE /api/lessons/:id
- POST /api/lessons/:id/upload
- DELETE /api/lessons/:id/files/:fileId

### Analytics
- GET /api/dashboard/stats
- GET /api/analytics/heatmap
- GET /api/analytics/trend
- GET /api/analytics/summary

### Settings / Location
- GET /api/settings/location
- POST /api/settings/location

### Drive
- GET /api/drive/status
- GET /api/drive/auth
- GET /auth/google/callback

## Email Notification Logic

- Prayer start emails: sent at the exact prayer time (checked every 5 minutes).
- Half-time reminder: sent halfway between current prayer and next prayer if not completed.
- Event reminder: sent at 8:00 AM for events scheduled tomorrow.
- Task reminders: sent when a task’s due time has passed (checked every minute).

## Google Drive Logic

- First connection uses OAuth popup and saves refresh token.
- Folder muneeb_to_do_list is created if missing and reused.
- Files are stored in that folder and Drive links are saved in Supabase.
- Deleting a lesson or file removes it from Drive and the database.

## Frontend Logic Notes

- The Academic Repository editor is read-only by default and switches to edit mode when requested.
- Uploads show progress with cancel support.
- The lesson viewer can expand by hiding subject and lesson lists.

## Troubleshooting

- If Google Drive upload fails, ensure the OAuth app has test users or is published.
- If emails don’t send, confirm SMTP credentials and allow Gmail App Passwords.
- If APIs fail, verify that the backend is running and .env is configured.
<img width="1877" height="967" alt="Screenshot 2026-02-05 030020" src="https://github.com/user-attachments/assets/a1e8ccf7-983e-43fa-946d-02674af39955" />
<img width="1893" height="908" alt="Screenshot 2026-02-05 025950" src="https://github.com/user-attachments/assets/c9cc235b-20de-489d-8d16-124c7b1ddb35" />
<img width="1919" height="820" alt="Screenshot 2026-02-05 025930" src="https://github.com/user-attachments/assets/ed0cb5c1-4b41-4334-88e0-7b6489a810ba" />
<img width="1891" height="951" alt="Screenshot 2026-02-05 025916" src="https://github.com/user-attachments/assets/94a3ebd8-a043-4e4c-9508-3cb542a98456" />
