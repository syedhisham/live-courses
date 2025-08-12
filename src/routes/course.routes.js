const express = require("express");
const router = express.Router();
const courseController = require("../controllers/course.controller");
const auth = require("../middleware/auth.middleware");
const instructorOnly = require("../middleware/instructor-only.middleware");
const studentOnly = require("../middleware/student-only.middleware");

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
router.get("/list", auth, studentOnly, courseController.listCourses);

// Fetch course by ID
router.get("/fetch/:courseId", courseController.fetchCourseById);

router.get("/purchased",auth, studentOnly, courseController.fetchPurchasedCourses);

router.get("/:courseId/materials/:materialId/access-url",auth, studentOnly, courseController.getMaterialAccessUrl);

router.get("/instructor",auth, instructorOnly, courseController.fetchInstructorCourses);

module.exports = router;
