const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    materials: [
      {
        key: { type: String, required: true }, // S3 object key (e.g., "instructorId/courseId/file.pdf")
        url: { type: String, required: false }, // signed or public URL (optional: store or generate on-demand)
        filename: { type: String },
        contentType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
      // { _id: false }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
