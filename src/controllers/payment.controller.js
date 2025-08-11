const Stripe = require("stripe");
const Course = require("../models/course.model");
const User = require("../models/user.model");
const { sendResponse } = require("../utils/sendResponse");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.body;

    if (!courseId) {
      return sendResponse(res, 400, false, "Course ID is required");
    }

    // Find course and check existence
    const course = await Course.findById(courseId);
    if (!course) {
      return sendResponse(res, 404, false, "Course not found");
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return sendResponse(res, 401, false, "User not found");
    }

    // Create Stripe customer if not exists
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: course.title,
              description: course.description,
            },
            unit_amount: Math.round(course.price * 100), // price in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
      metadata: {
        userId: user._id.toString(),
        courseId: course._id.toString(),
      },
    });

    return sendResponse(res, 200, true, "Checkout session created", {
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
};

exports.stripeWebhookHandler = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log("=== Stripe Webhook Received ===");
  console.log("Headers:", req.headers);
  console.log("Stripe Signature:", sig ? "Present" : "Missing");
  console.log("Request rawBody length:", req.rawBody ? req.rawBody.length : "No rawBody");
  console.log("Request rawBody type:", typeof req.rawBody);

  let event;

  try {
    // rawBody must be a Buffer or string with raw payload
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    console.log("Stripe event constructed:", event.type);
  } catch (err) {
    console.error("Stripe webhook signature verification failed.");
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("Processing checkout.session.completed for session ID:", session.id);

    const userId = session.metadata.userId;
    const courseId = session.metadata.courseId;
    console.log(`Metadata - userId: ${userId}, courseId: ${courseId}`);

    try {
      const user = await User.findById(userId);
      const course = await Course.findById(courseId);

      if (!user) {
        console.warn(`User not found: ${userId}`);
        return res.status(400).send("User not found");
      }
      if (!course) {
        console.warn(`Course not found: ${courseId}`);
        return res.status(400).send("Course not found");
      }

      if (!user.purchasedCourses.includes(course._id)) {
        user.purchasedCourses.push(course._id);
        await user.save();
        console.log(`User ${user.email} granted access to course ${course.title}`);
      } else {
        console.log(`User ${user.email} already has access to course ${course.title}`);
      }

      return res.json({ received: true });
    } catch (error) {
      console.error("Error processing checkout.session.completed event:", error);
      return res.status(500).send("Internal Server Error");
    }
  } else {
    console.log(`Unhandled event type: ${event.type}`);
    return res.json({ received: true });
  }
};