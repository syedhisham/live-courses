const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const auth = require('../middleware/auth');

// Create course (instructor only)
router.post('/', auth, courseController.createCourse);

// Get presigned upload URL
router.post('/upload-url', auth, courseController.getUploadURL);

// Add uploaded material to course
router.post('/add-material', auth, courseController.addMaterialToCourse);

// List all courses
router.get('/', courseController.listCourses);

module.exports = router;
