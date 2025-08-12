const Course = require("../models/course.model");
const { generateUploadURL } = require("../services/s3Service");
const { sendResponse } = require("../utils/sendResponse");
const User = require("../models/user.model");
const mongoose = require("mongoose");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const Session = require("../models/session.model");

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

// exports.scheduleLiveSession = async (req, res) => {
//   try {
//     const { courseId, startTime } = req.body;
//     const instructorId = req.user._id;

//     if (!courseId || !startTime) {
//       return sendResponse(res, 400, false, "courseId and startTime are required");
//     }

//     const course = await Course.findById(courseId);
//     if (!course) return sendResponse(res, 404, false, "Course not found");

//     if (course.instructor.toString() !== instructorId.toString()) {
//       return sendResponse(res, 403, false, "Not the course instructor");
//     }

//     const session = await Session.create({
//       course: courseId,
//       instructor: instructorId,
//       startTime,
//     });

//     return sendResponse(res, 201, true, "Live session scheduled", session);
//   } catch (err) {
//     console.error("Error scheduling live session:", err);
//     return sendResponse(res, 500, false, "Internal server error");
//   }
// };


async function getZoomAccessToken() {
  const res = await axios.post(
    `https://zoom.us/oauth/token`,
    new URLSearchParams({
      grant_type: "account_credentials",
      account_id: process.env.ZOOM_ACCOUNT_ID,
    }).toString(),
    {
      auth: {
        username: process.env.ZOOM_CLIENT_ID,
        password: process.env.ZOOM_CLIENT_SECRET,
      },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );
  return res.data.access_token;
}

exports.scheduleLiveSession = async (req, res) => {
  try {
    const { courseId, startTime } = req.body;
    const instructorId = req.user._id;

    if (!courseId || !startTime) {
      return sendResponse(res, 400, false, "courseId and startTime are required");
    }

    const course = await Course.findById(courseId);
    if (!course) return sendResponse(res, 404, false, "Course not found");

    if (course.instructor.toString() !== instructorId.toString()) {
      return sendResponse(res, 403, false, "Not the course instructor");
    }

    // Get Zoom token first
    const accessToken = await getZoomAccessToken();

    // Create Zoom meeting
    const zoomRes = await axios.post(
      `https://api.zoom.us/v2/users/me/meetings`,
      {
        topic: `Live session for ${course.title}`,
        type: 2, // scheduled meeting
        start_time: startTime,
        duration: 60,
        timezone: "UTC",
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
        },
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    // Create session in DB with Zoom details
    const session = await LiveSession.create({
      course: courseId,
      instructor: instructorId,
      startTime,
      zoomMeetingId: zoomRes.data.id,
      zoomJoinUrl: zoomRes.data.join_url,
      zoomStartUrl: zoomRes.data.start_url,
      status: "started", // if you want it to be 'scheduled' until start time, change this
    });

    return sendResponse(res, 201, true, "Live session created & Zoom meeting scheduled", session);
  } catch (err) {
    console.error("Error creating live session:", err?.response?.data || err);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

// exports.startLiveSession = async (req, res) => {
//   try {
//     const { sessionId } = req.params;
//     const instructorId = req.user._id;

//     const session = await LiveSession.findById(sessionId).populate("course");
//     if (!session) return sendResponse(res, 404, false, "Session not found");

//     if (session.instructor.toString() !== instructorId.toString()) {
//       return sendResponse(res, 403, false, "Not your session");
//     }

//     // Get Zoom token
//     const accessToken = await getZoomAccessToken();

//     // Create Zoom meeting
//     const zoomRes = await axios.post(
//       `https://api.zoom.us/v2/users/me/meetings`,
//       {
//         topic: `Live session for ${session.course.title}`,
//         type: 2, // scheduled meeting
//         start_time: session.startTime,
//         duration: 60,
//         timezone: "UTC",
//         settings: {
//           host_video: true,
//           participant_video: true,
//           join_before_host: false,
//         },
//       },
//       {
//         headers: { Authorization: `Bearer ${accessToken}` },
//       }
//     );

//     session.zoomMeetingId = zoomRes.data.id;
//     session.zoomJoinUrl = zoomRes.data.join_url;
//     session.zoomStartUrl = zoomRes.data.start_url;
//     session.status = "started";
//     await session.save();

//     return sendResponse(res, 200, true, "Zoom meeting created", session);
//   } catch (err) {
//     console.error("Error starting live session:", err);
//     return sendResponse(res, 500, false, "Internal server error");
//   }
// };

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

    // 1. Find all courses where the user is a student
    const purchasedCourses = await Course.find({ students: userId })
      .populate("instructor", "name email")
      .lean();

    if (!purchasedCourses.length) {
      return sendResponse(res, 200, true, "No purchased courses found", []);
    }

    // 2. Get all course IDs
    const courseIds = purchasedCourses.map((c) => c._id);

    // 3. Find all live sessions for these courses
    const sessions = await Session.find({ course: { $in: courseIds } })
      .select("course startTime zoomJoinUrl zoomStartUrl status createdAt")
      .sort({ startTime: -1 })
      .lean();

    // 4. Attach sessions to the corresponding course
    const coursesWithSessions = purchasedCourses.map((course) => ({
      ...course,
      sessions: sessions.filter(
        (session) => session.course.toString() === course._id.toString()
      ),
    }));

    return sendResponse(
      res,
      200,
      true,
      "Purchased courses fetched successfully",
      coursesWithSessions
    );
  } catch (err) {
    console.error("Error fetching purchased courses:", err);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

exports.fetchInstructorCourses = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return sendResponse(res, 401, false, "Unauthorized: No user logged in");
    }

    const courses = await Course.find({ instructor: userId })
      .populate("instructor", "name email")
      .populate("students", "name email")
      .sort({ createdAt: -1 });

    if (!courses || courses.length === 0) {
      return sendResponse(res, 200, true, "No courses found", []);
    }

    // Fetch sessions for these courses
    const courseIds = courses.map(course => course._id);
    const sessions = await Session.find({ course: { $in: courseIds } });

    // Merge session info into courses
    const coursesWithSessions = courses.map(course => {
      const session = sessions.find(s => s.course.toString() === course._id.toString());
      return {
        ...course.toObject(),
        session: session
          ? {
              _id: session._id,
              startTime: session.startTime,
              status: session.status,
              zoomMeetingId: session.zoomMeetingId || null,
              zoomJoinUrl: session.zoomJoinUrl || null,
              zoomStartUrl: session.zoomStartUrl || null,
            }
          : null,
      };
    });

    return sendResponse(
      res,
      200,
      true,
      "Instructor courses fetched successfully",
      coursesWithSessions
    );
  } catch (err) {
    console.error("Error fetching instructor courses:", err);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

