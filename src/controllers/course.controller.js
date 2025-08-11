const Course = require("../models/course.model");
const { generateUploadURL } = require("../services/s3Service");
const { sendResponse } = require("../utils/sendResponse");
const mongoose = require("mongoose");

exports.createCourse = async (req, res) => {
  try {
    const { title, description, price } = req.body;
    const instructor = req.user._id;

    if (!title || !price) {
      return sendResponse(res, 400, false, "Title and price are required");
    }

    const course = await Course.create({
      title,
      description,
      price,
      instructor,
      materials: [],
    });

    return sendResponse(res, 201, true, "Course created successfully", course);
  } catch (err) {
    console.error("Create course error:", err);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

// Request presigned URL for file upload
exports.getUploadURL = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { courseId } = req.params;
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return sendResponse(
        res,
        400,
        false,
        "fileName and contentType are required"
      );
    }

    // Check course exists and belongs to instructor
    const course = await Course.findById(courseId);
    if (!course) {
      return sendResponse(res, 404, false, "Course not found");
    }
    if (course.instructor.toString() !== instructorId.toString()) {
      return sendResponse(
        res,
        403,
        false,
        "Access denied: Not the course instructor"
      );
    }

    // Construct S3 key (e.g., courses/{courseId}/{uniqueFileName})
    const timestamp = Date.now();
    const key = `courses/${courseId}/${timestamp}-${fileName}`;

    const url = await generateUploadURL(key, contentType);

    return sendResponse(res, 200, true, "Upload URL generated", {
      uploadURL: url,
      key,
    });
  } catch (err) {
    console.error("Error generating upload URL:", err);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

// Add uploaded file URL to course materials
exports.addMaterialToCourse = async (req, res) => {
  try {
    const instructorId = req.user._id;
    const { courseId } = req.params;
    const { key, url, filename, contentType } = req.body;

    if (!key || !url) {
      return sendResponse(res, 400, false, "Material key and url are required");
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return sendResponse(res, 404, false, "Course not found");
    }

    if (course.instructor.toString() !== instructorId.toString()) {
      return sendResponse(
        res,
        403,
        false,
        "Access denied: Not the course instructor"
      );
    }

    // Check if material already added by key
    const exists = course.materials.some((material) => material.key === key);
    if (exists) {
      return sendResponse(res, 400, false, "Material already added");
    }

    course.materials.push({
      key,
      url,
      filename,
      contentType,
      uploadedAt: new Date(),
    });
    await course.save();

    return sendResponse(res, 200, true, "Material added to course", {
      materials: course.materials,
    });
  } catch (err) {
    console.error("Error adding material to course:", err);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

exports.listCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate("instructor", "name email");
    return sendResponse(
      res,
      200,
      true,
      "Courses retrieved successfully",
      courses
    );
  } catch (err) {
    console.error("Error fetching courses:", err);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

exports.fetchCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      return sendResponse(res, 400, false, "Course ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return sendResponse(res, 400, false, "Invalid course ID format");
    }

    const course = await Course.findById(courseId).populate(
      "instructor",
      "name email"
    );
    if (!course) {
      return sendResponse(res, 404, false, "Course not found");
    }

    return sendResponse(res, 200, true, "Course fetched successfully", course);
  } catch (err) {
    console.error("Error fetching course by ID:", err);
    return sendResponse(res, 500, false, "Internal server error");
  }
};
