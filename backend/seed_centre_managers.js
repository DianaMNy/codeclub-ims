// seed_centre_managers.js
require('dotenv').config();
const XLSX = require('xlsx');
const { Pool } = require('pg');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const wb = XLSX.readFile(path.join(__dirname, 'RPF_2026_Database-Diana.xlsx'));
  const ws = wb.Sheets['Ecosystem building'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Get all community centres from DB
  const { rows: centres } = await pool.query(`
    SELECT id, official_name FROM schools_and_centres WHERE type = 'community_centre'
  `);

  function findCentreId(name) {
    if (!name) return null;
    const n = name.toLowerCase().trim();
    const match = centres.find(c => c.official_name.toLowerCase().trim() === n);
    return match ? match.id : null;
  }

  // Centre managers rows 2-17
  const managerRows = rows.slice(2, 18).filter(r => r[0] && r[1] && r[0] !== 'Center Managers');

  console.log(`Found ${managerRows.length} centre managers`);

  let inserted = 0;
  for (const r of managerRows) {
    const centreName = r[0]?.toString().trim();
    const fullName = r[1]?.toString().trim();
    const county = r[2]?.toString().trim() || null;
    const centreId = findCentreId(centreName);

    if (!fullName) continue;

    // Insert into heads_of_school as centre manager
    await pool.query(`
      INSERT INTO heads_of_school 
        (full_name, county, school_id, training_completed, safeguarding_done)
      VALUES ($1, $2, $3, true, true)
    `, [fullName, county, centreId]);

    // Update centre with hos_name (centre manager)
    if (centreId) {
      await pool.query(`
        UPDATE schools_and_centres 
        SET hos_name=$1, safeguarding_sponsor=$1
        WHERE id=$2
      `, [fullName, centreId]);
    }

    console.log(`✅ ${fullName} → ${centreName} (${centreId ? 'linked' : 'NOT FOUND'})`);
    inserted++;
  }

  console.log(`\n🎉 Inserted ${inserted} centre managers!`);
  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});