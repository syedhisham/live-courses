const Course = require("../models/course.model");
const { generateUploadURL } = require("../services/s3Service");
const { sendResponse } = require("../utils/sendResponse");
const User = require("../models/user.model");
const mongoose = require("mongoose");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

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
    console.log("Generated URL:", url);


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
    const { key, filename, contentType, url } = req.body;

    if (!key) {
      return sendResponse(res, 400, false, "Material key is required");
    }

    const course = await Course.findById(courseId);
    if (!course) return sendResponse(res, 404, false, "Course not found");
    if (course.instructor.toString() !== instructorId.toString()) {
      return sendResponse(res, 403, false, "Access denied: Not the course instructor");
    }

    const exists = course.materials.some((m) => m.key === key);
    if (exists) return sendResponse(res, 400, false, "Material already added");

    course.materials.push({
      url,
      key,
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

// When a student clicks "Watch"
exports.getMaterialAccessUrl = async (req, res) => {
  try {
    const { courseId, materialId } = req.params;
    const studentId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    // Check if student enrolled
    if (!course.students.some(id => id.toString() === studentId.toString())) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this course" });
    }

    const material = course.materials.id(materialId);
    if (!material) return res.status(404).json({ success: false, message: "Material not found" });

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: material.key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 }); // valid for 5 minutes

    return res.json({ success: true, url: signedUrl });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.listCourses = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch user to get purchasedCourses
    const user = await User.findById(userId).select("purchasedCourses");
    if (!user) {
      return sendResponse(res, 401, false, "User not found");
    }

    // Find only courses NOT purchased by this user
    const courses = await Course.find({
      _id: { $nin: user.purchasedCourses }
    }).populate("instructor", "name email");

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

exports.fetchPurchasedCourses = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return sendResponse(res, 401, false, "Unauthorized: No user logged in");
    }

    const user = await User.findById(userId)
      .populate({
        path: "purchasedCourses",
        populate: { path: "instructor", select: "name email" },
      })
      .select("purchasedCourses");

    if (!user) {
      return sendResponse(res, 404, false, "User not found");
    }

    if (!user.purchasedCourses || user.purchasedCourses.length === 0) {
      return sendResponse(res, 200, true, "No purchased courses found", []);
    }

    return sendResponse(
      res,
      200,
      true,
      "Purchased courses fetched successfully",
      user.purchasedCourses
    );
  } catch (err) {
    console.error("Error fetching purchased courses:", err);
    return sendResponse(res, 500, false, "Internal server error");
  }
};


