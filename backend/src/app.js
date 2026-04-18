import "dotenv/config";
import cors from "cors";
import express from "express";
import adminRoutes from "./routes/adminRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import integrationRoutes from "./routes/integrationRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";
import predictionRoutes from "./routes/predictionRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import { ensureAuthTables } from "./services/authSchema.js";
import { ensureInvoiceTables } from "./services/invoiceSchema.js";

const app = express();

ensureInvoiceTables().catch((error) => {
  console.error("Failed to ensure invoice tables", error);
});

ensureAuthTables().catch((error) => {
  console.error("Failed to ensure auth tables", error);
});

function parseAllowedOrigins() {
  const rawOrigins = [
    process.env.CLIENT_ORIGIN,
    process.env.CLIENT_ORIGINS,
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set(rawOrigins);
}

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      // Allow browserless requests and local dev hosts.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "agriculture-portal-api" });
});

app.use("/api/public", publicRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/predictions", predictionRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong",
  });
});

export default app;
