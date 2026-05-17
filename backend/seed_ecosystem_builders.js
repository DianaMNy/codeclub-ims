// backend/seed_ecosystem_builders.js
require('dotenv').config();
const pool = require('./src/db/index');
const XLSX = require('xlsx');
const path = require('path');

function boolVal(val) {
  if (!val) return false;
  return String(val).trim().toLowerCase() === 'yes';
}

async function getSchoolId(name) {
  if (!name) return null;
  const res = await pool.query(
    `SELECT id FROM schools_and_centres WHERE official_name ILIKE $1 LIMIT 1`,
    [`%${String(name).trim()}%`]
  );
  return res.rows[0]?.id || null;
}

async function seed() {
  const wb = XLSX.readFile(path.join(__dirname, 'ecosystem_builders.xlsx'));
  const ws = wb.Sheets['Sheet1'];
  const all = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // ── Exact row boundaries (0-indexed, inclusive) ──────────────────────────
  // Row 1  = header "Center Managers..."
  // Row 2  = column headers
  // Row 3-17 = 15 centre managers  (index 2-16)
  // Row 19 = header "Heads of school..."
  // Row 20 = column headers
  // Row 21-125 = 105 HOS            (index 20-124)
  // Row 127 = header "Additional Educators"
  // Row 128 = column headers
  // Row 129-173 = 45 additional     (index 128-172)
  // Row 174 = header "ICT..."
  // Row 175 = column headers (or first data)
  // Row 175-181 = 7 ICT interns     (index 174-180)
  // Row 183 = header "Sub-county..."
  // Row 184-187 = 4 directors       (index 183-186)

  function parseSection(startIdx, endIdx) {
    const records = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const row = all[i];
      if (!row) continue;
      const place = row[0] ? String(row[0]).trim() : '';
      const name  = row[1] ? String(row[1]).trim() : '';
      // Skip header rows
      if (!name || ['name','school','center managers'].includes(name.toLowerCase())) continue;
      if (!place || ['school','county'].includes(place.toLowerCase())) continue;
      records.push({
        place,
        name,
        county:       row[2] ? String(row[2]).trim() : null,
        training:     boolVal(row[3]),
        safeguarding: boolVal(row[4]),
        survey:       boolVal(row[5]),
      });
    }
    return records;
  }

  const centreManagers     = parseSection(2,  16);   // 15
  const headsOfSchool      = parseSection(20, 124);  // 105
  const additionalEducators= parseSection(128,172);  // 45
  const ictInterns         = parseSection(174,180);  // 7
  const subcountyDirectors = parseSection(183,186);  // 4

  console.log('\n📊 Parsed:');
  console.log(`  Centre Managers:      ${centreManagers.length}`);
  console.log(`  Heads of School:      ${headsOfSchool.length}`);
  console.log(`  Additional Educators: ${additionalEducators.length}`);
  console.log(`  ICT Interns:          ${ictInterns.length}`);
  console.log(`  Sub-County Directors: ${subcountyDirectors.length}`);

  let inserted = 0, skipped = 0;

  // 1. Centre Managers → ecosystem_extras
  console.log('\n🏢 Centre Managers...');
  for (const r of centreManagers) {
    try {
      await pool.query(
        `INSERT INTO ecosystem_extras (full_name, role, county, training_completed, safeguarding_done, survey_done)
         VALUES ($1,'centre_manager',$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [r.name, r.county, r.training, r.safeguarding, r.survey]
      );
      console.log(`  ✅ ${r.name} (${r.place})`); inserted++;
    } catch(e) { console.log(`  ⚠️  ${r.name}: ${e.message}`); skipped++; }
  }

  // 2. Heads of School → heads_of_school
  console.log('\n🏫 Heads of School...');
  for (const r of headsOfSchool) {
    const schoolId = await getSchoolId(r.place);
    try {
      await pool.query(
        `INSERT INTO heads_of_school (full_name, role, county, school_id, training_completed, safeguarding_done)
         VALUES ($1,'head_of_school',$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [r.name, r.county, schoolId, r.training, r.safeguarding]
      );
      console.log(`  ✅ ${r.name} (${r.place})`); inserted++;
    } catch(e) { console.log(`  ⚠️  ${r.name}: ${e.message}`); skipped++; }
  }

  // 3. Additional Educators → teachers
  console.log('\n👩‍🏫 Additional Educators...');
  for (const r of additionalEducators) {
    const schoolId = await getSchoolId(r.place);
    try {
      await pool.query(
        `INSERT INTO teachers (full_name, role, school_id, training_completed, safeguarding_done)
         VALUES ($1,'additional',$2,$3,$4) ON CONFLICT DO NOTHING`,
        [r.name, schoolId, r.training, r.safeguarding]
      );
      console.log(`  ✅ ${r.name} (${r.place})`); inserted++;
    } catch(e) { console.log(`  ⚠️  ${r.name}: ${e.message}`); skipped++; }
  }

  // 4. ICT Interns → ecosystem_extras
  console.log('\n💻 ICT Interns...');
  for (const r of ictInterns) {
    try {
      await pool.query(
        `INSERT INTO ecosystem_extras (full_name, role, county, subcounty_area, training_completed, safeguarding_done, survey_done)
         VALUES ($1,'ict_intern',$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [r.name, r.county, r.place, r.training, r.safeguarding, r.survey]
      );
      console.log(`  ✅ ${r.name} (${r.place})`); inserted++;
    } catch(e) { console.log(`  ⚠️  ${r.name}: ${e.message}`); skipped++; }
  }

  // 5. Sub-County Directors → ecosystem_extras
  console.log('\n📋 Sub-County Directors...');
  for (const r of subcountyDirectors) {
    try {
      await pool.query(
        `INSERT INTO ecosystem_extras (full_name, role, county, subcounty_area, training_completed, safeguarding_done, survey_done)
         VALUES ($1,'subcounty_director',$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [r.name, r.county, r.place, r.training, r.safeguarding, r.survey]
      );
      console.log(`  ✅ ${r.name} (${r.place})`); inserted++;
    } catch(e) { console.log(`  ⚠️  ${r.name}: ${e.message}`); skipped++; }
  }

  console.log(`\n✅ Done! Inserted: ${inserted} | Skipped: ${skipped}`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });