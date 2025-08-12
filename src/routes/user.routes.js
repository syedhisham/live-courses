const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const userController = require("../controllers/user.controller");
const studentOnly = require("../middleware/student-only.middleware");

router.get("/me", auth, userController.getLoggedInUser)

module.exports = router;