const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  materials: [{ type: String }] // URLs to S3
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
