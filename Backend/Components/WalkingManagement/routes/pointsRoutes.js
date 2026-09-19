const express = require("express");
const router = express.Router();
const authMiddleware = require("../../../middleware/authMiddleware");

const {
  createPointsFromTrip,
  getPointsByUser,
  updatePointTransaction,
  deletePointTransaction,
} = require("../controllers/pointsController");

router.post("/points", createPointsFromTrip);
router.get("/points", getPointsByUser);
router.put("/points/:id", authMiddleware, updatePointTransaction);
router.delete("/points/:id", authMiddleware, deletePointTransaction);

module.exports = router;