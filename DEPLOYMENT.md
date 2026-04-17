# KrishiNova Production Deployment

This app is ready for staged production deployment once you replace local and test credentials with hosted production values.

## Recommended Hosting

- Frontend: Vercel
- Backend API: Render
- Database: Railway MySQL or any managed MySQL provider

## 1. Database

Create a production MySQL database and import:

- `C:\Users\hp\Downloads\agriculture-portal-mern-sql\shared\db\agriculture_portal.sql`

Use a dedicated production database user. Do not use `root`.

## 2. Backend Deployment on Render

Render can use the root blueprint in [render.yaml](C:/Users/hp/Downloads/agriculture-portal-mern-sql/render.yaml).

Service settings:

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`

Set these environment variables in Render:

- `NODE_ENV=production`
- `PORT=10000`
- `CLIENT_ORIGIN=https://your-frontend-domain.vercel.app`
- `CLIENT_ORIGINS=https://your-frontend-domain.vercel.app,https://www.yourdomain.com`
- `FRONTEND_URL=https://your-frontend-domain.vercel.app`
- `DB_HOST=your-mysql-host`
- `DB_PORT=3306`
- `DB_USER=your-db-user`
- `DB_PASSWORD=your-db-password`
- `DB_NAME=agriculture_portal`
- `DB_CONNECTION_LIMIT=10`
- `DB_SSL=true` if your MySQL host requires SSL
- `JWT_SECRET=use-a-new-strong-random-secret`
- `PYTHON_COMMAND=python`
- `NEWS_API_KEY=your-news-api-key`
- `OPENWEATHER_API_KEY=your-openweather-key`
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465`
- `SMTP_USER=your-sender-email`
- `SMTP_PASS=your-app-password`
- `SMTP_SECURE=true`
- `CONTACT_RECEIVER_EMAIL=your-receiver-email`
- `RAZORPAY_KEY_ID=your-live-or-test-key-id`
- `RAZORPAY_KEY_SECRET=your-live-or-test-key-secret`
- `STRIPE_SECRET_KEY=optional-if-you-still-use-stripe`
- `STRIPE_PUBLISHABLE_KEY=optional-if-you-still-use-stripe`
- `STRIPE_SUCCESS_URL=https://your-frontend-domain.vercel.app/customer?payment=success`
- `STRIPE_CANCEL_URL=https://your-frontend-domain.vercel.app/customer?payment=cancelled`
- `GEMINI_API_KEY=your-gemini-key`
- `GEMINI_MODEL=gemini-2.5-flash`
- `OPENAI_API_KEY=optional-openai-fallback-key`
- `OPENAI_CHAT_API_KEY=optional-openai-fallback-key`
- `TWILIO_ACCOUNT_SID=your-twilio-account-sid`
- `TWILIO_AUTH_TOKEN=your-twilio-auth-token`
- `TWILIO_API_KEY_SID=your-twilio-api-key-sid`
- `TWILIO_API_KEY_SECRET=your-twilio-api-key-secret`
- `TWILIO_VERIFY_SERVICE_SID=your-verify-service-sid`
- `GOOGLE_CLIENT_ID=your-google-oauth-client-id`
- `GOOGLE_WEB_CLIENT_ID=your-google-oauth-client-id`

## 3. Frontend Deployment on Vercel

The SPA rewrite is already included in [frontend/vercel.json](C:/Users/hp/Downloads/agriculture-portal-mern-sql/frontend/vercel.json).

Vercel settings:

- Framework preset: `Vite`
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Set these environment variables in Vercel:

- `VITE_API_URL=https://your-backend-domain.onrender.com/api`
- `VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id`

If your frontend and backend share one custom domain behind a proxy, you can leave `VITE_API_URL` empty and use same-origin `/api`.

## 4. Production Checklist

Before launch, verify:

1. `GET /api/health` returns OK on the live API.
2. Public home page loads without console/network errors.
3. Farmer signup/login works with email OTP.
4. Customer signup/login works with email OTP.
5. Phone OTP works on a real mobile number.
6. Google login works for public users, not only test users.
7. Buy crop flow works and invoice history opens correctly.
8. Razorpay checkout opens and verifies successfully.
9. Weather forecast search returns live data.
10. Chatbot responds with Gemini or fallback content.
11. Contact form saves and sends email.
12. Admin dashboard lists farmers, customers, and messages.

## 5. Security Before Public Launch

Rotate every credential that was used during development:

- JWT secret
- Gmail app password
- Google OAuth credentials if exposed
- Twilio credentials
- Gemini and OpenAI keys
- Razorpay keys
- Stripe keys

Also make sure:

- Google OAuth consent screen is published for public use
- Razorpay is switched from test to live only when you are ready
- Database access is limited to the backend service

## 6. Smoke Test Commands

Backend health:

```powershell
Invoke-WebRequest https://your-backend-domain.onrender.com/api/health
```

Frontend build locally:

```powershell
npm run build --prefix frontend
```

Backend start locally with production-like env:

```powershell
npm run start --prefix backend
```
