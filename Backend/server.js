const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
require("dotenv").config();

const walkingTripRoutes = require("./Components/WalkingManagement/routes/tripRoutes");
const walkingPointsRoutes = require("./Components/WalkingManagement/routes/pointsRoutes");
const loginRoutes = require("./Components/Login/loginRoutes");
const oidcRoutes = require("./Components/Login/oidcRoutes");
const userRoutes = require("./Components/User/routes/userRoutes");
const rewardRoutes = require("./Components/RewardAndPoints/routes/rewardRoutes");
const leaderboardRoutes = require("./Components/Leaderboard/routes/leaderboardRoutes");

const path = require("path");
// Import weather/health Advice component
const healthAdviceRoutes = require("./Components/Weather/admin/routes/healthAdviceRoutes");

// User side weather route component
const weatherUserRoutes = require("./Components/Weather/user/routes/weatherRoutes");
const userHealthAdviceRoutes = require("./Components/Weather/user/routes/userHealthAdviceRoutes");

const app = express();

app.get("/api/health", (req, res) => {
  res.status(200).json({
    app: "Walk n Earn",
    status: "OK",
    time: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------
// CORS — only allow the known frontend origin
// This replaces the previous open cors() call which allowed any origin
// ---------------------------------------------------------------
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true, // required for session cookies used in OIDC flow
  })
);

app.use(express.json());

// ---------------------------------------------------------------
// Session middleware — used ONLY for OAuth state/nonce storage
// The main application uses JWT; sessions are not used for regular auth.
// connect-mongo stores sessions in MongoDB to avoid in-memory state issues.
// ---------------------------------------------------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET || "changeme_in_production",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 10 * 60, // Session TTL: 10 minutes (matches OAuth state expiry)
      collectionName: "oidc_sessions",
    }),
    cookie: {
      httpOnly: true,  // Prevent JavaScript access to session cookie
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // Protects against CSRF while allowing OAuth redirects
      maxAge: 10 * 60 * 1000, // 10 minutes
    },
    name: "wne.sid", // Custom session cookie name
  })
);

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// Actual Routes
app.use("/api/login", loginRoutes);
app.use("/auth", oidcRoutes);         // Google OIDC: /auth/google, /auth/google/callback
app.use("/api/walking", walkingTripRoutes);
app.use("/api/walking", walkingPointsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// weather/health route
app.use("/api/admin/health-advice", healthAdviceRoutes);

// User weather routes
app.use("/api/weather", weatherUserRoutes);
app.use("/api/user/health-advice", userHealthAdviceRoutes);

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
