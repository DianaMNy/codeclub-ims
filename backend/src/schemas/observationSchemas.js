// src/schemas/observationSchemas.js
// "Session observations" spans two route files that both write to the
// session_observations table with different (additive) column sets:
//   - routes/visits.js, mounted at /api/visits — the mentor visit-logging
//     form (has the flag/star-club/pathway auto-populate side effects).
//   - routes/mande.js, mounted at /api/mande — its POST /observations is
//     literally headed "── SESSION OBSERVATIONS ──" in that file.
// Both are covered here.
//
// Deviation from the task brief re: pathway enum. visits.js does NOT accept
// a raw pathway string — it accepts `pathway_id`, a foreign key looked up
// against the pathways table (`SELECT label FROM pathways WHERE id = $1`);
// the scratch/web_design/python/... codes only appear server-side, mapped
// from the looked-up label. pathways.id (like schools/mentors/teachers) is
// a UUID (verified live via each GET endpoint — this is Supabase, whose
// default convention is UUID primary keys), so pathway_id is validated as
// a UUID, not the enum — which still makes a non-numeric junk value like
// "basket_weaving" fail validation with 400, satisfying the required test
// case without misrepresenting what the column actually is.
//
// flag_type / escalation_level: also mentioned in the task brief, but
// visits.js hardcodes both ('mentor_initiated' and 1) when it auto-inserts
// into flags — they are never read from req.body, so there is nothing to
// validate for them. Only flag_school (bool) and flag_reason (text) are
// user-supplied.
const { z } = require('zod');
const {
  longText, shortText, uuidField, requiredUuidField, looseBoolean,
  requiredLooseBoolean, optionalNumber, requiredNumber,
} = require('./common');

const latitude = () => optionalNumber({ min: -90, max: 90 });
const longitude = () => optionalNumber({ min: -180, max: 180 });
const nonNegInt = () => optionalNumber({ min: 0, int: true });
const requiredLatitude = () => requiredNumber({ min: -90, max: 90, label: 'Latitude' });
const requiredLongitude = () => requiredNumber({ min: -180, max: 180, label: 'Longitude' });
const requiredNonNegInt = (label) => requiredNumber({ min: 0, int: true, label });

// engagement_rating is NOT a numeric 1-5 rating despite what its name
// suggests — it's a free-text-ish enum. Confirmed in
// frontend/src/pages/MandE.jsx: `const RATINGS = ['Very Active','Active',
// 'Moderate','Low']`, rendered as a <select> whose value is one of those
// four label strings (or '' if unselected). The original Phase-2 schema
// treated it as numeric (`z.coerce.number()...`), which is what actually
// caused the reported bug: selecting any real rating like "Very Active"
// made `Number('Very Active')` produce NaN — the "" case only ever hit the
// quieter bug of silently storing 0. routes/visits.js does
// `engagement_rating||null`, so null is a safe value for this column.
const engagementRating = () => z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.enum(['Very Active', 'Active', 'Moderate', 'Low']).nullable().optional()
);
const requiredEngagementRating = () => z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.enum(['Very Active', 'Active', 'Moderate', 'Low'])
);

// Business rules confirmed with the M&E owner (2026-07-13): beyond
// school_id/date_of_visit, GPS location, all Section 2/3/4/6 fields, and
// pathway_id are now always required; Section 5 project fields, the Star
// Club reason, and the flag reason are required only when their governing
// toggle (creating_projects / recommended_star_club / flag_school) is Yes,
// and likewise not_running_reason/activation_actions only when
// club_running is No, and phone_call_notes only when engagement_type is
// 'Phone Call' — those fields aren't even rendered on the form otherwise,
// so requiring them unconditionally would make the form uncompletable.
// Shared between createObservationSchema and updateObservationSchema so
// editing can't reintroduce a blank that create-time validation blocked.
const isTrue = (v) => v === true || v === 'true';
const isFalse = (v) => v === false || v === 'false';
const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

function checkConditionalObservationFields(data, ctx) {
  if (isFalse(data.club_running)) {
    if (isBlank(data.not_running_reason)) {
      ctx.addIssue({ code: 'custom', message: 'Reason club is not running is required', path: ['not_running_reason'] });
    }
    if (isBlank(data.activation_actions)) {
      ctx.addIssue({ code: 'custom', message: 'Activation actions are required', path: ['activation_actions'] });
    }
  }

  if (data.engagement_type === 'Phone Call' && isBlank(data.phone_call_notes)) {
    ctx.addIssue({ code: 'custom', message: 'Phone call notes are required for a phone call engagement', path: ['phone_call_notes'] });
  }

  if (isTrue(data.creating_projects)) {
    if (isBlank(data.project_id)) {
      ctx.addIssue({ code: 'custom', message: 'Project is required when creating projects', path: ['project_id'] });
    }
    if (isBlank(data.project_notes)) {
      ctx.addIssue({ code: 'custom', message: 'Project notes are required when creating projects', path: ['project_notes'] });
    }
  }

  if (isTrue(data.recommended_star_club) && isBlank(data.star_club_reason)) {
    ctx.addIssue({ code: 'custom', message: 'Star Club reason is required when recommending for Star Club', path: ['star_club_reason'] });
  }

  if (isTrue(data.flag_school) && isBlank(data.flag_reason)) {
    ctx.addIssue({ code: 'custom', message: 'Flag reason is required when flagging this school/centre', path: ['flag_reason'] });
  }
}

// ── routes/visits.js ─────────────────────────────────────────
// POST /api/visits — school_id and date_of_visit are the only fields passed
// to the INSERT with no `|| fallback` (i.e. no tolerance for undefined) and
// both are load-bearing (school_id drives the visit_number COUNT query and
// every auto-populate side effect); everything else has a handler-side
// default and stays optional/nullable.
const createObservationSchema = z.object({
  school_id: requiredUuidField(),
  mentor_id: uuidField(),
  teacher_id: uuidField(),
  date_of_visit: shortText(30).min(1, 'Date of visit is required'),
  is_first_visit: looseBoolean(),
  engagement_type: shortText(100).min(1, 'Type of engagement is required'),
  latitude: requiredLatitude(),
  longitude: requiredLongitude(),
  gps_raw: shortText(500).optional().nullable(),
  club_running: requiredLooseBoolean('Club running status is required'),
  not_running_reason: longText(1000).optional().nullable(),
  activation_actions: longText(2000).optional().nullable(),
  club_day: shortText(50).min(1, 'Club day is required'),
  time_band: shortText(50).min(1, 'Time band is required'),
  device_count: nonNegInt(),
  total_learners: requiredNonNegInt('Total learners'),
  male_learners: requiredNonNegInt('Male learners'),
  female_learners: requiredNonNegInt('Female learners'),
  engagement_rating: requiredEngagementRating(),
  pathway_id: requiredUuidField(),
  scratch_level: shortText(50).optional().nullable(),
  creating_projects: looseBoolean(),
  // project_id is NOT a numeric id — GET /pathways-with-projects mints
  // composite string ids like "python_2" (`${p.key}_${i}`), so it's text.
  project_id: shortText(100).optional().nullable(),
  project_notes: longText(2000).optional().nullable(),
  showcase_photo: shortText(2000).optional().nullable(),
  showcase_status: shortText(50).optional().nullable(),
  observations: longText().min(1, 'Observations are required'),
  phone_call_notes: longText().optional().nullable(),
  challenges: longText().min(1, 'Challenges are required'),
  club_leader_confidence: shortText(50).min(1, "Club leader's confidence level is required"),
  actions_agreed: longText(2000).optional().nullable(),
  recommended_star_club: looseBoolean(),
  star_club_reason: longText(2000).optional().nullable(),
  flag_school: looseBoolean(),
  flag_reason: longText(2000).optional().nullable(),
  next_visit_date: shortText(30).optional().nullable(),
  other_details: longText().optional().nullable(),
}).strip().superRefine(checkConditionalObservationFields);

// PUT /api/visits/:id — same shape minus school_id/mentor_id/teacher_id,
// which aren't part of this handler's destructure at all.
const updateObservationSchema = z.object({
  date_of_visit: shortText(30).min(1, 'Date of visit is required'),
  is_first_visit: looseBoolean(),
  engagement_type: shortText(100).min(1, 'Type of engagement is required'),
  latitude: requiredLatitude(),
  longitude: requiredLongitude(),
  gps_raw: shortText(500).optional().nullable(),
  club_running: requiredLooseBoolean('Club running status is required'),
  not_running_reason: longText(1000).optional().nullable(),
  activation_actions: longText(2000).optional().nullable(),
  club_day: shortText(50).min(1, 'Club day is required'),
  time_band: shortText(50).min(1, 'Time band is required'),
  device_count: nonNegInt(),
  total_learners: requiredNonNegInt('Total learners'),
  male_learners: requiredNonNegInt('Male learners'),
  female_learners: requiredNonNegInt('Female learners'),
  engagement_rating: requiredEngagementRating(),
  pathway_id: requiredUuidField(),
  scratch_level: shortText(50).optional().nullable(),
  creating_projects: looseBoolean(),
  project_id: shortText(100).optional().nullable(),
  project_notes: longText(2000).optional().nullable(),
  observations: longText().min(1, 'Observations are required'),
  phone_call_notes: longText().optional().nullable(),
  challenges: longText().min(1, 'Challenges are required'),
  club_leader_confidence: shortText(50).min(1, "Club leader's confidence level is required"),
  actions_agreed: longText(2000).optional().nullable(),
  recommended_star_club: looseBoolean(),
  star_club_reason: longText(2000).optional().nullable(),
  flag_school: looseBoolean(),
  flag_reason: longText(2000).optional().nullable(),
  next_visit_date: shortText(30).optional().nullable(),
  other_details: longText().optional().nullable(),
}).strip().superRefine(checkConditionalObservationFields);

// ── routes/mande.js — POST /observations ("SESSION OBSERVATIONS") ──────
// No `if (!x)` checks exist in this handler at all today; school_id and
// observation_date are required here as the minimum needed to avoid a DB
// error (both are joined/ordered on elsewhere as if always present).
const createMandeObservationSchema = z.object({
  school_id: requiredUuidField(),
  observation_date: shortText(30).min(1, 'Observation date is required'),
  observed_teacher: shortText(200).optional().nullable(),
  session_type: shortText(100).optional().nullable(),
  learner_count: nonNegInt(),
  session_quality: shortText(100).optional().nullable(),
  student_engagement: shortText(100).optional().nullable(),
  safeguarding_noted: looseBoolean(),
  safeguarding_category: shortText(200).optional().nullable(),
  observation_notes: longText().optional().nullable(),
  follow_up_required: looseBoolean(),
  action_items: longText(2000).optional().nullable(),
  quality_score: optionalNumber(),
  engagement_score: optionalNumber(),
  gps_lat: latitude(),
  gps_lng: longitude(),
  gps_accuracy: optionalNumber({ min: 0 }),
}).strip();

module.exports = { createObservationSchema, updateObservationSchema, createMandeObservationSchema };
