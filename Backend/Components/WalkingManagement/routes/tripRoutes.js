const express = require("express");
const router = express.Router();
const authMiddleware = require("../../../middleware/authMiddleware");

const {
  createTrip,
  getTripsByUser,
  updateTrip,
  deleteTrip,
  endTrip,
} = require("../controllers/tripController");

router.post("/trips", authMiddleware, createTrip);
router.get("/trips", authMiddleware, getTripsByUser);
router.put("/trips/:id", authMiddleware, updateTrip);
router.delete("/trips/:id", authMiddleware, deleteTrip);
router.put("/trips/:id/end", authMiddleware, endTrip);

module.exports = router;