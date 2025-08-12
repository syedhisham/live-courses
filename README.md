# Online Learning Platform - Backend API

[![Node.js](https://img.shields.io/badge/node-%3E%3D14-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/express-%5E4.0.0-blue)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/mongodb-%3E%3D4.0-green)](https://www.mongodb.com/)
[![AWS](https://img.shields.io/badge/aws-s3%20storage-orange)](https://aws.amazon.com/s3/)
[![Stripe](https://img.shields.io/badge/stripe-integrated-yellow)](https://stripe.com/)
[![Zoom](https://img.shields.io/badge/zoom-integration-blueviolet)](https://zoom.us/)

---

## Project Overview

This backend API powers a secure online learning platform where:

- **Instructors** create courses, upload course materials (videos, PDFs, slides) securely to cloud storage (stored in AWS S3).
- **Students** purchase courses via Stripe payment gateway.
- Only **paid students** get access to course materials and live streams.
- Live streaming is integrated using **Zoom** for private sessions between instructors and students.
- Access control and content delivery are secured via authenticated API endpoints and signed URLs.

---

## Features

- User authentication & role-based authorization (`student` and `instructor`), using HTTP-only, secure cookies for storing authentication tokens to enhance security.
- Course creation with secure upload of materials to AWS S3.
- Payment integration with Stripe Checkout and webhook confirmation.
- Purchased courses tracking in user profiles.
- Zoom integration for live streaming sessions.
- Secure generation of presigned URLs for course materials.
- Robust error handling and input validation.

---

## Tech Stack

- **Node.js** with **Express.js**
- **MongoDB** with Mongoose ODM
- **AWS S3** for file storage
- **Stripe** for payments
- **Zoom API** for live streaming sessions
- **JWT** for authentication
- Environment variables for secure config

---

## Getting Started

### Prerequisites

- Node.js v14 or higher
- MongoDB (local or cloud instance)
- AWS Account with S3 bucket
- Stripe account with API keys
- Zoom Developer account with OAuth credentials

### Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/syedhisham/live-courses.git
   cd live-courses
```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```env
   PORT=5000
   DATABASE_URL=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_S3_BUCKET_NAME=your_s3_bucket_name
   AWS_REGION=your_aws_region
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_secret_webhook_key
   CLIENT_URL=your_client_url
   ZOOM_ACCOUNT_ID=your_zoom_account_id
   ZOOM_CLIENT_ID=your_zoom_client_id
   ZOOM_CLIENT_SECRET=your_zoom_client_secret
   ```

4. Run the server:

   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:5000`.

---

## API Endpoints

### Auth

| Method | Endpoint             | Description       | Protected | Payload                           |
| ------ | -------------------- | ----------------- | --------- | --------------------------------- |
| POST   | `/api/auth/register` | Register new user | No        | `{ name, email, password, role }` |
| POST   | `/api/auth/login`    | User login        | No        | `{ email, password }`             |
| POST   | `/api/auth/logout`   | User logout       | Yes       | —                                 |

### Courses

| Method | Endpoint                                | Description                                        | Protected                | Payload                         |
| ------ | --------------------------------------- | -------------------------------------------------- | ------------------------ | ------------------------------- |
| POST   | `/api/courses/create`                   | Create new course (instructor)                     | Yes (instructor)         | `{ title, description, price }` |
| GET    | `/api/courses/list`                     | List courses (excludes purchased)                  | Yes (student)            | —                               |
| GET    | `/api/courses/purchased`                | Fetch courses purchased by logged-in student       | Yes (student)            | —                               |
| GET    | `/api/courses/instructor`               | Fetch courses added by instructor                  | Yes (instructor)         | —                               |
| GET    | `/api/courses/:id`                      | Get course details                                 | Yes (student/instructor) | —                               |
| POST   | `/api/courses/:id/materials/upload-url` | Generate signed URL for uploading course materials | Yes (instructor)         | —                               |

### Payments

| Method | Endpoint                                | Description                             | Protected | Payload                |
| ------ | --------------------------------------- | --------------------------------------- | --------- | ---------------------- |
| POST   | `/api/payments/create-checkout-session` | Create Stripe checkout session          | Yes       | `{ courseId }`         |
| POST   | `/api/payments/webhook`                 | Stripe webhook for payment confirmation | No        | Stripe webhook payload |

### Streaming & Zoom

| Method | Endpoint                 | Description                          | Protected        | Payload                             |
| ------ | ------------------------ | ------------------------------------ | ---------------- | ----------------------------------- |
| POST   | `/api/sessions/schedule` | Schedule Zoom live streaming session | Yes (instructor) | `{ courseId, startTime, duration }` |

---

## Architecture Notes

* **Access Control:** Middleware verifies JWT and user roles. Students can only access purchased courses.
* **File Storage:** Files uploaded are stored in private S3 buckets, served via expiring presigned URLs.
* **Payments:** Stripe Checkout is used; payment status confirmed via webhook before granting access.
* **Live Streaming:** Zoom OAuth is used for instructors to link their accounts. Meetings are created on behalf of instructors and shared securely with purchased students.
* **Security:** Sensitive keys are stored in `.env` and never exposed to frontend.
* **Error Handling:** Centralized error handler to send consistent API responses.

---

## Important

* This backend API is designed to be consumed by a separate frontend app.
* Make sure your frontend handles redirection after Stripe payment success and uses tokens for secure requests.
* Zoom OAuth requires setting correct redirect URLs in Zoom Developer Console.
* Keep your AWS credentials secure and restrict S3 bucket permissions.

---

## Contact

Syed Hisham Ali Shah — [syedhishamshah27@gmail.com](mailto:syedhishamshah27@gmail.com)
[GitHub](https://github.com/yourusername)

