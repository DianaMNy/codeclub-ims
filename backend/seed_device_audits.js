// Seed device_audits from the Device Audits workbook.
// Usage:
//   node seed_device_audits.js "C:\Users\DNyaata\Downloads\Device Audits (1).xlsx"

const path = require('path');
const xlsx = require('xlsx');
const db = require('./src/db/index');

const file = process.argv[2] || path.join(process.env.USERPROFILE || '', 'Downloads', 'Device Audits (1).xlsx');
const sourceFile = path.basename(file);

function normaliseText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function slug(value) {
  return normaliseText(value).replace(/\s+/g, '-').slice(0, 80) || 'unknown-school';
}

function normaliseCounty(sheetName) {
  const name = normaliseText(sheetName);
  if (name.includes('muranga')) return "Murang'a";
  if (name.includes('kiambu')) return 'Kiambu';
  if (name.includes('kajiado')) return 'Kajiado';
  return sheetName;
}

function normaliseDeviceType(value) {
  const name = normaliseText(value);
  if (!name) return '';
  if (name.includes('desktop')) return 'Desktops';
  if (name.includes('laptop')) return 'Laptops';
  if (name.includes('projector')) return 'Projectors';
  if (name.includes('tablet')) return 'Tablets';
  if (name.includes('phone')) return 'Phones';
  return String(value).trim().replace(/\s+/g, ' ');
}

function toNumber(value) {
  const parsed = parseInt(String(value || '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function tokenScore(a, b) {
  const left = new Set(normaliseText(a).split(' ').filter(Boolean));
  const right = new Set(normaliseText(b).split(' ').filter(Boolean));
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter(token => right.has(token)).length;
  return intersection / Math.max(left.size, right.size);
}

async function ensureDeviceAuditTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS device_audits (
      id SERIAL PRIMARY KEY,
      school_id TEXT NOT NULL,
      school_name_snapshot TEXT,
      county_snapshot TEXT,
      mentor_id TEXT,
      created_by_user_id TEXT,
      audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
      coding_club_id TEXT,
      school_type TEXT,
      device_type TEXT NOT NULL,
      total_devices INTEGER NOT NULL DEFAULT 0,
      functioning_devices INTEGER NOT NULL DEFAULT 0,
      faulty_devices INTEGER NOT NULL DEFAULT 0,
      comments TEXT,
      source_file TEXT,
      source_sheet TEXT,
      source_row INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.query(`ALTER TABLE device_audits DROP CONSTRAINT IF EXISTS device_audits_school_id_fkey`);
  await db.query(`ALTER TABLE device_audits DROP CONSTRAINT IF EXISTS device_audits_mentor_id_fkey`);
  await db.query(`ALTER TABLE device_audits ALTER COLUMN school_id TYPE TEXT USING school_id::text`);
  await db.query(`ALTER TABLE device_audits ALTER COLUMN mentor_id TYPE TEXT USING mentor_id::text`);
  await db.query(`ALTER TABLE device_audits ALTER COLUMN created_by_user_id TYPE TEXT USING created_by_user_id::text`);
  await db.query(`ALTER TABLE device_audits ADD COLUMN IF NOT EXISTS school_name_snapshot TEXT`);
  await db.query(`ALTER TABLE device_audits ADD COLUMN IF NOT EXISTS county_snapshot TEXT`);
  await db.query(`ALTER TABLE device_audits ADD COLUMN IF NOT EXISTS source_file TEXT`);
  await db.query(`ALTER TABLE device_audits ADD COLUMN IF NOT EXISTS source_sheet TEXT`);
  await db.query(`ALTER TABLE device_audits ADD COLUMN IF NOT EXISTS source_row INTEGER`);
}

async function getSchools() {
  const result = await db.query(`
    SELECT id, official_name, county, club_id, type
    FROM schools_and_centres
  `);
  return result.rows.map(school => ({
    ...school,
    id: String(school.id),
    normalised_name: normaliseText(school.official_name),
    normalised_county: normaliseText(school.county),
  }));
}

function findSchool(schools, schoolName, county) {
  const normalisedName = normaliseText(schoolName);
  const normalisedCounty = normaliseText(county);
  const countySchools = schools.filter(school => school.normalised_county === normalisedCounty);
  const pool = countySchools.length ? countySchools : schools;

  const exact = pool.find(school => school.normalised_name === normalisedName);
  if (exact) return exact;

  const ranked = pool
    .map(school => ({ school, score: tokenScore(school.official_name, schoolName) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score >= 0.72 ? ranked[0].school : null;
}

function parseWorkbook() {
  const workbook = xlsx.readFile(file);
  const parsed = [];

  workbook.SheetNames.forEach(sheetName => {
    const county = normaliseCounty(sheetName);
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    let currentSchool = '';

    rows.slice(1).forEach((row, index) => {
      const rowNumber = index + 2;
      const schoolName = String(row[1] || '').trim();
      if (schoolName) currentSchool = schoolName;

      const deviceType = normaliseDeviceType(row[2]);
      const totalDevices = toNumber(row[3]);
      const functioning = toNumber(row[4]);
      const faulty = toNumber(row[5]);
      const comments = String(row[6] || '').trim();

      if (!currentSchool || !deviceType) return;
      if (totalDevices === 0 && functioning === 0 && faulty === 0 && !comments.replace(/-/g, '').trim()) return;

      parsed.push({
        school_name: currentSchool,
        county,
        device_type: deviceType,
        total_devices: totalDevices,
        functioning_devices: functioning,
        faulty_devices: faulty,
        comments: comments && comments !== '-' ? comments : null,
        source_sheet: sheetName,
        source_row: rowNumber,
      });
    });
  });

  return parsed;
}

async function main() {
  console.log(`Reading ${file}`);
  await ensureDeviceAuditTable();
  const schools = await getSchools();
  const records = parseWorkbook();

  await db.query('DELETE FROM device_audits WHERE source_file = $1', [sourceFile]);

  let matched = 0;
  let unmatched = 0;

  for (const [index, record] of records.entries()) {
    const school = findSchool(schools, record.school_name, record.county);
    if (school) matched += 1;
    else unmatched += 1;

    const schoolId = school?.id || `import:${slug(record.county)}:${slug(record.school_name)}`;
    await db.query(
      `INSERT INTO device_audits
        (school_id, school_name_snapshot, county_snapshot, audit_date, coding_club_id,
         school_type, device_type, total_devices, functioning_devices, faulty_devices,
         comments, source_file, source_sheet, source_row)
       VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        schoolId,
        school?.official_name || record.school_name,
        school?.county || record.county,
        school?.club_id || null,
        school?.type || null,
        record.device_type,
        record.total_devices,
        record.functioning_devices,
        record.faulty_devices,
        record.comments,
        sourceFile,
        record.source_sheet,
        record.source_row,
      ]
    );

    if ((index + 1) % 100 === 0) console.log(`Inserted ${index + 1}/${records.length}`);
  }

  console.log(`Done. Inserted ${records.length} device audit records.`);
  console.log(`Matched to existing schools: ${matched}`);
  console.log(`Imported with school-name snapshot only: ${unmatched}`);
  await db.pool.end();
}

main().catch(async err => {
  console.error(err);
  await db.pool.end();
  process.exit(1);
});
