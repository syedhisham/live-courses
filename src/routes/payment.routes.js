const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const paymentController = require("../controllers/payment.controller");
const studentOnly = require("../middleware/student-only.middleware");

// Route to create Stripe checkout session
router.post(
  "/create-checkout-session",
  auth,
  studentOnly,
  paymentController.createCheckoutSession
);

// Stripe webhook endpoint
// router.post(
//   "/webhook",
//   paymentController.stripeWebhookHandler
// );

module.exports = router;
