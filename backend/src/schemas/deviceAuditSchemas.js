// src/schemas/deviceAuditSchemas.js
// Field names verified against routes/deviceAudits.js and its own
// CREATE TABLE statement.
//
// Deviation from the task brief: it stated "school_id is nullable", but the
// table DDL declares `school_id TEXT NOT NULL` and the handler itself
// rejects a missing school_id with 400 ('School or centre is required') —
// the actual code says required, so the schema requires it too. school_id
// is TEXT (not a numeric FK — the FK constraint was explicitly dropped in
// the migration block), so it's validated as a non-empty string, not an id.
const { z } = require('zod');
const { shortText, longText, optionalNumber } = require('./common');

// total/functioning/faulty_devices come from <input type="number"> fields
// that default to '' — optionalNumber() treats that as null instead of
// z.coerce.number()'s old silent-0 behavior (Number('') === 0). Either way
// the handler's `parseInt(x, 10) || 0` ends up with the same final 0 in the
// DB, so this is a cleanup, not a behavior change, for that path.
const deviceAuditSchema = z.object({
  school_id: shortText(100).min(1, 'School or centre is required'),
  audit_date: shortText(30).optional().nullable(),
  device_type: shortText(100).min(1, 'Device type is required'),
  total_devices: optionalNumber({ min: 0, int: true }),
  functioning_devices: optionalNumber({ min: 0, int: true }),
  faulty_devices: optionalNumber({ min: 0, int: true }),
  comments: longText().optional().nullable(),
}).strip();

// PUT /api/device-audits/:id destructures the identical field set with the
// same requiredness, so POST and PUT share one schema.
module.exports = { createDeviceAuditSchema: deviceAuditSchema, updateDeviceAuditSchema: deviceAuditSchema };
