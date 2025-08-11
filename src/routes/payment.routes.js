const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth.middleware");
const paymentController = require("../controllers/payment.controller");
const studentOnly = require("../middleware/student-only.middleware");

// Route to create Stripe checkout session (user must be logged in)
router.post(
  "/create-checkout-session",
  auth,
  studentOnly,
  paymentController.createCheckoutSession
);

// Stripe webhook endpoint (no auth, must receive raw body)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.stripeWebhookHandler
);

module.exports = router;
