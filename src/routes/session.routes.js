const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/session.controller");
const auth = require("../middleware/auth.middleware");
const instructorOnly = require("../middleware/instructor-only.middleware");

router.post("/schedule", auth, instructorOnly, sessionController.scheduleLiveSession);
// router.post("/:sessionId/start", auth, instructorOnly, sessionController.startLiveSession);

module.exports = router;
