// src/schemas/teacherSchemas.js
// Field names/enums verified against routes/teachers.js and the create/edit
// form in frontend/src/pages/Teachers.jsx (role + ict_confidence options).
const { z } = require('zod');
const { emailField, phoneField, shortText, uuidField, looseBoolean } = require('./common');

const ROLE = z.enum(['club_leader', 'centre_club_leader', 'additional']);
const ICT_CONFIDENCE = z.enum(['beginner', 'intermediate', 'advanced']);

// POST /api/teachers — role/ict_confidence default server-side if omitted
// (`role||'club_leader'`, `ict_confidence||'beginner'`), so both stay optional.
const createTeacherSchema = z.object({
  school_id: uuidField(),
  full_name: shortText(200).min(1, 'Full name is required'),
  role: ROLE.optional().nullable(),
  phone: phoneField(),
  email: emailField().optional().nullable(),
  ict_confidence: ICT_CONFIDENCE.optional().nullable(),
  training_completed: looseBoolean(),
  safeguarding_done: looseBoolean(),
  survey_done: looseBoolean(),
}).strip();

// PUT /api/teachers/:id — role is passed straight through with no server-side
// default (unlike POST), and the SQL SET clause overwrites every column
// unconditionally, so this is a full schema with role required.
const updateTeacherSchema = z.object({
  school_id: uuidField(),
  full_name: shortText(200).min(1, 'Full name is required'),
  role: ROLE,
  phone: phoneField(),
  email: emailField().optional().nullable(),
  ict_confidence: ICT_CONFIDENCE.optional().nullable(),
  training_completed: looseBoolean(),
  safeguarding_done: looseBoolean(),
  survey_done: looseBoolean(),
  training_date: shortText(30).optional().nullable(),
  safeguarding_date: shortText(30).optional().nullable(),
}).strip();

module.exports = { createTeacherSchema, updateTeacherSchema };
