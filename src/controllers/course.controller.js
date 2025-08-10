const Course = require('../models/course.model');
const { generateUploadURL } = require('../services/s3Service');

// Create a new course (instructor only)
exports.createCourse = async (req, res) => {
  try {
    const { title, description, price } = req.body;
    const instructor = req.user._id; // from auth middleware

    const course = await Course.create({
      title,
      description,
      price,
      instructor,
      materials: []
    });

    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Request presigned URL for file upload
exports.getUploadURL = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) {
      return res.status(400).json({ message: 'fileName and fileType are required' });
    }

    // Construct key: organize by instructorId/courseId/timestamp_filename
    const instructorId = req.user._id.toString();
    const timestamp = Date.now();
    const key = `courses/${instructorId}/${timestamp}_${fileName}`;

    const uploadURL = await generateUploadURL(key, fileType);
    res.json({ uploadURL, key }); // key will be saved in course materials after upload
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add uploaded file URL to course materials
exports.addMaterialToCourse = async (req, res) => {
  try {
    const { courseId, key } = req.body;
    if (!courseId || !key) {
      return res.status(400).json({ message: 'courseId and key are required' });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Check if current user is instructor of the course
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Construct the S3 URL (private, but we will generate signed URLs for downloads later)
    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    course.materials.push(fileUrl);
    await course.save();

    res.json({ message: 'Material added to course', fileUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// List courses (optionally filter by instructor or student purchase later)
exports.listCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate('instructor', 'name email');
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
