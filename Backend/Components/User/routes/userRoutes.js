const rateLimit = require("express-rate-limit");
const express = require("express");
const router = express.Router();

const { registerUser, loginUser, getUserById, getAllUsers } = require("../controllers/userController");
const authMiddleware  = require("../../../middleware/authMiddleware");
const adminMiddleware = require("../../../middleware/adminMiddleware");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

router.post("/register", registerUser);
router.post("/login", loginLimiter, loginUser);
router.get("/", authMiddleware, adminMiddleware, getAllUsers);
router.get("/:id", getUserById);

module.exports = router;