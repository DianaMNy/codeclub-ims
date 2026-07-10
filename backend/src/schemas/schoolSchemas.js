// src/schemas/schoolSchemas.js
// Field names, requiredness and enums verified against routes/schools.js
// and the create/edit form in frontend/src/pages/Schools.jsx.
const { z } = require('zod');
const { emailField, phoneField, shortText, longText, uuidField, looseBoolean, optionalNumber } = require('./common');

// createSchoolSchema mirrors POST /api/schools' destructured body.
const createSchoolSchema = z.object({
  club_id: shortText(50).optional().nullable(),
  official_name: shortText(200).min(1, 'Official name is required'),
  type: z.enum(['school', 'community_centre']),
  county: shortText(100).min(1, 'County is required'),
  subcounty_area: shortText(200).optional().nullable(),
  referral_source: z.enum(['ministry', 'self', 'other']).optional().nullable(),
  club_leader_name: shortText(200).optional().nullable(),
  club_leader_phone: phoneField(),
  club_leader_email: emailField().optional().nullable(),
  safeguarding_sponsor: shortText(200).optional().nullable(),
  sponsor_phone: phoneField(),
  learner_count: optionalNumber({ min: 0, int: true }),
  status: z.enum(['enrolled', 'active', 'inactive']).optional().nullable(),
  guidelines_signed: looseBoolean(),
  notes: longText().optional().nullable(),
  mentor_id: uuidField(),
  enrollment_date: shortText(30).optional().nullable(),
  cohort: shortText(100).optional().nullable(),
  hos_name: shortText(200).optional().nullable(),
  hos_phone: phoneField(),
  hos_email: emailField().optional().nullable(),
}).strip();

// PUT /api/schools/:id destructures the same fields minus hos_phone/hos_email,
// and its SQL SET clause overwrites every column unconditionally — so this
// stays a full (non-partial) schema, not .partial().
const updateSchoolSchema = z.object({
  club_id: shortText(50).optional().nullable(),
  official_name: shortText(200).min(1, 'Official name is required'),
  type: z.enum(['school', 'community_centre']),
  county: shortText(100).min(1, 'County is required'),
  subcounty_area: shortText(200).optional().nullable(),
  referral_source: z.enum(['ministry', 'self', 'other']).optional().nullable(),
  club_leader_name: shortText(200).optional().nullable(),
  club_leader_phone: phoneField(),
  club_leader_email: emailField().optional().nullable(),
  safeguarding_sponsor: shortText(200).optional().nullable(),
  sponsor_phone: phoneField(),
  learner_count: optionalNumber({ min: 0, int: true }),
  status: z.enum(['enrolled', 'active', 'inactive']).optional().nullable(),
  guidelines_signed: looseBoolean(),
  notes: longText().optional().nullable(),
  mentor_id: uuidField(),
  enrollment_date: shortText(30).optional().nullable(),
  cohort: shortText(100).optional().nullable(),
  hos_name: shortText(200).optional().nullable(),
}).strip();

module.exports = { createSchoolSchema, updateSchoolSchema };
