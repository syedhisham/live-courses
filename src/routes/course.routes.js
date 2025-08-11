const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course.controller");
const auth = require("../middleware/auth.middleware");
const instructorOnly = require("../middleware/instructor-only.middleware");

// Create course (instructor only)
router.post("/create", auth, instructorOnly, courseController.createCourse);

// Generate S3 upload URL
router.post(
  "/:courseId/materials/upload-url",
  auth,
  instructorOnly,
  courseController.getUploadURL
);

// Add uploaded file key to course materials
router.post(
  "/:courseId/materials",
  auth,
  instructorOnly,
  courseController.addMaterialToCourse
);

// List all courses
router.get("/list", courseController.listCourses);

// Fetch course by ID
router.get("/fetch/:courseId", courseController.fetchCourseById);

module.exports = router;
