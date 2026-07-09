// src/schemas/userSchemas.js
// Field names verified against routes/users.js. Role enum verified against
// the ROLES constant in frontend/src/pages/UserManagement.jsx — it has FIVE
// values, not the four the task brief listed (county_official is real and
// must stay allowed, or legitimate admin requests would start failing).
const { z } = require('zod');
const { emailField, shortText, positiveIntId, uuidField } = require('./common');

const ROLE = z.enum(['admin', 'programme_coordinator', 'mentor', 'teacher', 'county_official']);

// POST /api/users — full_name/email/password/role are all explicitly
// required by the handler (`if (!full_name || !email || !password || !role)`).
// Password minimum of 6 matches the frontend's own label ("min 6 characters");
// the backend currently enforces no length at all, so this is a gate, not a
// behavior change for any request that was already following the UI's rule.
//
// mentor_id references mentors.id, which is a UUID (verified live) — but
// teacher_id stays a coerced integer because routes/users.js explicitly
// migrates it as `ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_id
// INTEGER`, even though teachers.id itself is a UUID. That's a pre-existing
// mismatch elsewhere in the app; the schema matches the real column, not
// what the FK "should" be.
const createUserSchema = z.object({
  full_name: shortText(200).min(1, 'Full name is required'),
  email: emailField(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  role: ROLE,
  mentor_id: uuidField(),
  teacher_id: positiveIntId(),
}).strip();

// PUT /api/users/:id — full_name/email/role are explicitly required by the
// handler (`if (!full_name || !email || !role)`); no password/teacher_id here.
const updateUserSchema = z.object({
  full_name: shortText(200).min(1, 'Full name is required'),
  email: emailField(),
  role: ROLE,
  mentor_id: uuidField(),
}).strip();

module.exports = { createUserSchema, updateUserSchema };
