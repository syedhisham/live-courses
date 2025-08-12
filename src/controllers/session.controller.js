const Course = require("../models/course.model");
const { sendResponse } = require("../utils/sendResponse");
const Session = require("../models/session.model");
const axios = require("axios");


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
    const session = await Session.create({
      course: courseId,
      instructor: instructorId,
      startTime,
      zoomMeetingId: zoomRes.data.id,
      zoomJoinUrl: zoomRes.data.join_url,
      zoomStartUrl: zoomRes.data.start_url,
    });

    return sendResponse(res, 201, true, "Live session created & Zoom meeting scheduled", session);
  } catch (err) {
    console.error("Error creating live session:", err?.response?.data || err);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

// async function getZoomAccessToken() {
//   const res = await axios.post(
//     `https://zoom.us/oauth/token`,
//     new URLSearchParams({
//       grant_type: "account_credentials",
//       account_id: process.env.ZOOM_ACCOUNT_ID,
//     }).toString(),
//     {
//       auth: {
//         username: process.env.ZOOM_CLIENT_ID,
//         password: process.env.ZOOM_CLIENT_SECRET,
//       },
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     }
//   );
//   return res.data.access_token;
// }


// exports.startLiveSession = async (req, res) => {
//   try {
//     const { sessionId } = req.params;
//     const instructorId = req.user._id;

//     const session = await Session.findById(sessionId).populate("course");
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