// seed_ecosystem.js
// Seeds heads_of_school and ecosystem_extras from RPF_2026_Database-Diana.xlsx

require('dotenv').config();
const XLSX = require('xlsx');
const { Pool } = require('pg');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const wb = XLSX.readFile(path.join(__dirname, 'RPF_2026_Database-Diana.xlsx'));
  const ws = wb.Sheets['Ecosystem building'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // ── 1. Get all schools from DB for matching ──────────────────
  const { rows: schools } = await pool.query('SELECT id, official_name FROM schools_and_centres');

  function findSchoolId(name) {
    if (!name) return null;
    const n = name.toLowerCase().trim();
    const match = schools.find(s => s.official_name.toLowerCase().trim() === n);
    return match ? match.id : null;
  }

  // ── 2. Parse sections ─────────────────────────────────────────
  // Rows 20-124: Heads of School
  const hosRows = rows.slice(20, 125).filter(r => r[0] && r[1] && r[0] !== 'School');

  // Rows 175-181: ICT Interns
  const ictRows = rows.slice(175, 182).filter(r => r[0] && r[1] && r[0] !== 'Center Managers');

  // Rows 184-188: Sub-county Directors
  const dirRows = rows.slice(184, 189).filter(r => r[0] && r[1] && r[0] !== 'Center Managers');

  console.log(`Found: ${hosRows.length} HOS, ${ictRows.length} ICT interns, ${dirRows.length} directors`);

  // ── 3. Seed HOS ───────────────────────────────────────────────
  let hosInserted = 0;
  for (const r of hosRows) {
    const schoolName = r[0]?.toString().trim();
    const fullName = r[1]?.toString().trim();
    const county = r[2]?.toString().trim() || null;
    const training = r[3]?.toString().trim().toLowerCase() === 'yes';
    const safeguarding = r[4]?.toString().trim().toLowerCase() === 'yes';
    const schoolId = findSchoolId(schoolName);

    if (!fullName) continue;

    await pool.query(`
      INSERT INTO heads_of_school (full_name, county, school_id, training_completed, safeguarding_done)
      VALUES ($1, $2, $3, $4, $5)
    `, [fullName, county, schoolId, training, safeguarding]);
    hosInserted++;
  }
  console.log(`✅ Inserted ${hosInserted} Heads of School`);

  // ── 4. Seed ICT Interns ───────────────────────────────────────
  let ictInserted = 0;
  for (const r of ictRows) {
    const subcounty = r[0]?.toString().trim();
    const fullName = r[1]?.toString().trim();
    const county = r[2]?.toString().trim() || null;
    const training = r[3]?.toString().trim().toLowerCase() === 'yes';
    const safeguarding = r[4]?.toString().trim().toLowerCase() === 'yes';
    const survey = r[5]?.toString().trim().toLowerCase() === 'yes';

    if (!fullName) continue;

    await pool.query(`
      INSERT INTO ecosystem_extras (full_name, role, county, subcounty_area, training_completed, safeguarding_done, survey_done)
      VALUES ($1, 'ict_intern', $2, $3, $4, $5, $6)
    `, [fullName, county, subcounty, training, safeguarding, survey]);
    ictInserted++;
  }
  console.log(`✅ Inserted ${ictInserted} ICT Interns`);

  // ── 5. Seed Sub-county Directors ──────────────────────────────
  let dirInserted = 0;
  for (const r of dirRows) {
    const subcounty = r[0]?.toString().trim();
    const fullName = r[1]?.toString().trim();
    const county = r[2]?.toString().trim() || null;
    const training = r[3]?.toString().trim().toLowerCase() === 'yes';
    const safeguarding = r[4]?.toString().trim().toLowerCase() === 'yes';
    const survey = r[5]?.toString().trim().toLowerCase() === 'yes';

    if (!fullName) continue;

    await pool.query(`
      INSERT INTO ecosystem_extras (full_name, role, county, subcounty_area, training_completed, safeguarding_done, survey_done)
      VALUES ($1, 'subcounty_director', $2, $3, $4, $5, $6)
    `, [fullName, county, subcounty, training, safeguarding, survey]);
    dirInserted++;
  }
  console.log(`✅ Inserted ${dirInserted} Sub-county Directors`);

  await pool.end();
  console.log('🎉 Ecosystem seeding complete!');
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});