const mongoose = require("mongoose");

const liveSessionSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startTime: { type: Date, required: true },
    zoomMeetingId: { type: String },
    zoomJoinUrl: { type: String },
    zoomStartUrl: { type: String },
    status: { type: String, enum: ["scheduled", "started", "ended"], default: "scheduled" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LiveSession", liveSessionSchema);
