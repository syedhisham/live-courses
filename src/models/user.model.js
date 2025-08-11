const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["instructor", "student"], default: "student" },
    stripeCustomerId: { type: String, default: null },
    purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],

    // Optional: Payment history or status (can be expanded later)
    // payments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
  },
  { timestamps: true }
);

// hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// password check
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
