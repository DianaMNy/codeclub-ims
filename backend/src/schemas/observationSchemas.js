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
const { longText, shortText, uuidField, requiredUuidField, looseBoolean } = require('./common');

const latitude = () => z.coerce.number().min(-90).max(90).optional().nullable();
const longitude = () => z.coerce.number().min(-180).max(180).optional().nullable();
const nonNegInt = () => z.coerce.number().int().nonnegative().optional().nullable();

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
  engagement_type: shortText(100).optional().nullable(),
  latitude: latitude(),
  longitude: longitude(),
  gps_raw: shortText(500).optional().nullable(),
  club_running: looseBoolean(),
  not_running_reason: longText(1000).optional().nullable(),
  activation_actions: longText(2000).optional().nullable(),
  club_day: shortText(50).optional().nullable(),
  time_band: shortText(50).optional().nullable(),
  device_count: nonNegInt(),
  total_learners: nonNegInt(),
  male_learners: nonNegInt(),
  female_learners: nonNegInt(),
  engagement_rating: nonNegInt(),
  pathway_id: uuidField(),
  scratch_level: shortText(50).optional().nullable(),
  creating_projects: looseBoolean(),
  // project_id is NOT a numeric id — GET /pathways-with-projects mints
  // composite string ids like "python_2" (`${p.key}_${i}`), so it's text.
  project_id: shortText(100).optional().nullable(),
  project_notes: longText(2000).optional().nullable(),
  showcase_photo: shortText(2000).optional().nullable(),
  showcase_status: shortText(50).optional().nullable(),
  observations: longText().optional().nullable(),
  phone_call_notes: longText().optional().nullable(),
  challenges: longText().optional().nullable(),
  club_leader_confidence: shortText(50).optional().nullable(),
  actions_agreed: longText(2000).optional().nullable(),
  recommended_star_club: looseBoolean(),
  star_club_reason: longText(2000).optional().nullable(),
  flag_school: looseBoolean(),
  flag_reason: longText(2000).optional().nullable(),
  next_visit_date: shortText(30).optional().nullable(),
  other_details: longText().optional().nullable(),
}).strip();

// PUT /api/visits/:id — same shape minus school_id/mentor_id/teacher_id,
// which aren't part of this handler's destructure at all.
const updateObservationSchema = z.object({
  date_of_visit: shortText(30).min(1, 'Date of visit is required'),
  is_first_visit: looseBoolean(),
  engagement_type: shortText(100).optional().nullable(),
  latitude: latitude(),
  longitude: longitude(),
  gps_raw: shortText(500).optional().nullable(),
  club_running: looseBoolean(),
  not_running_reason: longText(1000).optional().nullable(),
  activation_actions: longText(2000).optional().nullable(),
  club_day: shortText(50).optional().nullable(),
  time_band: shortText(50).optional().nullable(),
  device_count: nonNegInt(),
  total_learners: nonNegInt(),
  male_learners: nonNegInt(),
  female_learners: nonNegInt(),
  engagement_rating: nonNegInt(),
  pathway_id: uuidField(),
  scratch_level: shortText(50).optional().nullable(),
  creating_projects: looseBoolean(),
  project_id: shortText(100).optional().nullable(),
  project_notes: longText(2000).optional().nullable(),
  observations: longText().optional().nullable(),
  phone_call_notes: longText().optional().nullable(),
  challenges: longText().optional().nullable(),
  club_leader_confidence: shortText(50).optional().nullable(),
  actions_agreed: longText(2000).optional().nullable(),
  recommended_star_club: looseBoolean(),
  star_club_reason: longText(2000).optional().nullable(),
  flag_school: looseBoolean(),
  flag_reason: longText(2000).optional().nullable(),
  next_visit_date: shortText(30).optional().nullable(),
  other_details: longText().optional().nullable(),
}).strip();

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
  quality_score: z.coerce.number().optional().nullable(),
  engagement_score: z.coerce.number().optional().nullable(),
  gps_lat: latitude(),
  gps_lng: longitude(),
  gps_accuracy: z.coerce.number().nonnegative().optional().nullable(),
}).strip();

module.exports = { createObservationSchema, updateObservationSchema, createMandeObservationSchema };
