// src/schemas/common.js
// Shared zod field builders reused across domain schemas.
const { z } = require('zod');

const emailField = () => z.string().trim().toLowerCase().email().max(254);

// Permissive — accepts digits, +, spaces, dashes, parens; empty string allowed
// (handlers already treat '' as "no phone" via `phone || null`).
const phoneField = () => z.string().trim().max(20).regex(/^[0-9+()\-\s]*$/, 'Invalid phone number').optional().nullable();

const shortText = (max = 200) => z.string().trim().max(max);
const longText = (max = 5000) => z.string().trim().max(max);

// React form fields (both <input type="number"> and unselected <select>
// dropdowns) default to '' and send that literally in the JSON body —
// treat it, and whitespace-only strings, the same as "not provided".
const emptyToNull = (v) => {
  if (typeof v === 'string' && v.trim() === '') return null;
  return v === undefined ? null : v;
};
// Same idea but for required fields, where "not provided" should surface as
// a plain "expected X, received undefined" rather than silently coercing to
// 0/false or a coercion-failure error further down.
const emptyToUndefined = (v) => {
  if (typeof v === 'string' && v.trim() === '') return undefined;
  return v;
};

// For number-ish fields (counts, ratings, coordinates). Coercion still
// accepts numeric strings ("3" from a controlled <input>), but '' is
// intercepted before coercion so it becomes null instead of silently
// becoming 0 (the old `z.coerce.number()` behavior: Number('') === 0) or a
// confusing "received NaN" error (Number('some text') === NaN).
const optionalNumber = ({ min, max, int = false } = {}) => {
  let schema = z.coerce.number();
  if (int) schema = schema.int();
  if (min !== undefined) schema = schema.min(min);
  if (max !== undefined) schema = schema.max(max);
  return z.preprocess(emptyToNull, schema.nullable().optional());
};

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
const positiveIntId = () => z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable().optional());

// For required id fields. NOTE: z.object() shortcuts validation entirely for
// .optional() fields whose key is absent from the input (as opposed to
// explicitly set to undefined, which are indistinguishable over JSON) — so
// positiveIntId().refine(v => v != null, ...) silently passes on a missing
// key. Use this plain (non-optional) variant instead when an id is required.
// Wrapping in z.preprocess does not reintroduce that shortcut — verified:
// preprocess always runs, even for an absent key, because the field's
// top-level schema type is the preprocess wrapper, not ZodOptional itself.
//
// Known limitation: z.coerce.number() converts undefined to NaN internally
// before any custom error message can inspect the original input, so unlike
// requiredUuidField() below, a missing/empty value here still reports
// "received NaN" rather than a friendlier "required" message — tried a
// custom `error` callback and it never sees the pre-coercion value. Not
// worth fighting further: nothing in this codebase's schemas currently uses
// a required *numeric* id (every numeric field turned out optional once
// checked against its handler), so this exists for completeness only.
const requiredPositiveIntId = () => z.preprocess(emptyToUndefined, z.coerce.number().int().positive());

const uuidField = () => z.preprocess(emptyToNull, z.string().trim().uuid().nullable().optional());
const requiredUuidField = () => z.preprocess(emptyToUndefined, z.string().trim().uuid());

// Several handlers accept either a real boolean or the literal strings
// 'true'/'false' (see visits.js: `flag_school === true || flag_school === 'true'`)
// — validate the shape without transforming, so handler comparisons still work.
const looseBoolean = () => z.union([z.boolean(), z.enum(['true', 'false'])]).optional().nullable();

module.exports = {
  emailField, phoneField, shortText, longText,
  optionalNumber,
  positiveIntId, requiredPositiveIntId,
  uuidField, requiredUuidField,
  looseBoolean,
};
