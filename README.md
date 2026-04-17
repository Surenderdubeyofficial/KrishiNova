# KrishiNova React + Node + MySQL

This folder contains the MERN-style conversion of the original PHP agriculture portal into a modern React frontend with a Node.js + Express backend while keeping MySQL as the database.

The original project in `C:\Users\hp\Downloads\agriculture-portal-main` is not modified by this converted app.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL / MariaDB
- ML bridge: Existing Python scripts reused from `shared/ML`
- Payments: Razorpay and optional Stripe
- Auth: JWT, email OTP, phone OTP, Google sign-in
- Integrations: Gemini AI, OpenAI fallback, OpenWeather, News API, Twilio, Nodemailer

## Project Structure

- `frontend/` React client
- `backend/` Express API
- `shared/db/agriculture_portal.sql` existing SQL schema copy
- `shared/ML/` copied machine learning scripts from the original project

## Local Setup

1. Create the MySQL database and import:
   - `shared/db/agriculture_portal.sql`
2. Copy `backend/.env.example` to `backend/.env`
3. Update database values in `backend/.env`
4. Optional integrations:
   - `NEWS_API_KEY` for agriculture news
   - `OPENWEATHER_API_KEY` for forecast data
   - `SMTP_*` values for contact email delivery and OTP email
   - `TWILIO_*` values for phone OTP
   - `RAZORPAY_*` values for checkout
   - `GEMINI_API_KEY` for the chatbot
   - `GOOGLE_CLIENT_ID` for Google sign-in
5. Install dependencies:

```bash
npm install
npm run install:all
```

6. Start both apps:

```bash
npm run dev
```

## URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Included Converted Areas

- Landing page
- Contact form
- Farmer registration and login
- Customer registration and login
- Admin login
- Farmer dashboard with crop trade and ML predictions
- Customer dashboard with crop marketplace and purchase flow
- Admin dashboard with summary counts
- State and district dropdown data from SQL tables
- Agriculture news feed integration
- Weather forecast integration
- SMTP-backed contact email integration
- Razorpay checkout integration
- Invoice generation and history
- Gemini chatbot with fallback handling
- Hindi / English toggle
- Light / Dark theme toggle

## Notes

- Passwords are currently kept compatible with the original SQL data model, which stores plain text passwords. Moving to hashed passwords is strongly recommended before production use.
- Stripe success handling in this conversion is intended for local development flow. For production-grade payment fulfillment, add a Stripe webhook before marking orders as paid.
- React Router production rewrites are configured for Vercel in `frontend/vercel.json`.
- A production deployment guide is included in [DEPLOYMENT.md](C:/Users/hp/Downloads/agriculture-portal-mern-sql/DEPLOYMENT.md).
