// src/schemas/common.js
// Shared zod field builders reused across domain schemas.
const { z } = require('zod');

const emailField = () => z.string().trim().toLowerCase().email().max(254);

// Permissive — accepts digits, +, spaces, dashes, parens; empty string allowed
// (handlers already treat '' as "no phone" via `phone || null`).
const phoneField = () => z.string().trim().max(20).regex(/^[0-9+()\-\s]*$/, 'Invalid phone number').optional().nullable();

const shortText = (max = 200) => z.string().trim().max(max);
const longText = (max = 5000) => z.string().trim().max(max);

// This app is on Supabase: schools_and_centres, mentors, teachers, users and
// pathways all use UUID primary keys (verified live via each GET endpoint),
// NOT integers — so FK fields referencing them are validated as UUID
// strings via uuidField()/requiredUuidField() below. positiveIntId() only
// remains correct for the rare column that genuinely is an integer — e.g.
// users.teacher_id, which routes/users.js explicitly migrates as
// `ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_id INTEGER` even
// though teachers.id itself is a UUID (a pre-existing mismatch in the app,
// not something introduced or fixed here — the schema just has to match
// the real column, not the "should be" FK type).
const positiveIntId = () => z.coerce.number().int().positive().optional().nullable();

// For required id fields. NOTE: z.object() shortcuts validation entirely for
// .optional() fields whose key is absent from the input (as opposed to
// explicitly set to undefined, which are indistinguishable over JSON) — so
// positiveIntId().refine(v => v != null, ...) silently passes on a missing
// key. Use this plain (non-optional) variant instead when an id is required.
const requiredPositiveIntId = () => z.coerce.number().int().positive();

const uuidField = () => z.string().trim().uuid().optional().nullable();
const requiredUuidField = () => z.string().trim().uuid();

// Several handlers accept either a real boolean or the literal strings
// 'true'/'false' (see visits.js: `flag_school === true || flag_school === 'true'`)
// — validate the shape without transforming, so handler comparisons still work.
const looseBoolean = () => z.union([z.boolean(), z.enum(['true', 'false'])]).optional().nullable();

module.exports = {
  emailField, phoneField, shortText, longText,
  positiveIntId, requiredPositiveIntId,
  uuidField, requiredUuidField,
  looseBoolean,
};
