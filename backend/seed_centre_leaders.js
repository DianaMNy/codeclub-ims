// seed_centre_leaders.js
require('dotenv').config();
const XLSX = require('xlsx');
const { Pool } = require('pg');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const wb = XLSX.readFile(path.join(__dirname, 'RPF_2026_Database-Diana.xlsx'));
  const ws = wb.Sheets['Schools & Code club leaders'];
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

  // Centre club leaders are rows 115-130
  const centreRows = rows.slice(115, 131).filter(r => r[0] && r[3] && r[0] !== 'Centre Name');

  console.log(`Found ${centreRows.length} centre club leaders`);

  let inserted = 0;
  for (const r of centreRows) {
    const centreName = r[0]?.toString().trim();
    const fullName = r[3]?.toString().trim();
    const centreId = findCentreId(centreName);

    if (!fullName) continue;

    await pool.query(`
      INSERT INTO teachers (full_name, role, school_id)
      VALUES ($1, 'centre_club_leader', $2)
    `, [fullName, centreId]);

    // Auto-update centre with club leader name
    if (centreId) {
      await pool.query(`
        UPDATE schools_and_centres 
        SET club_leader_name=$1
        WHERE id=$2
      `, [fullName, centreId]);
    }

    console.log(`✅ ${fullName} → ${centreName} (${centreId ? 'linked' : 'not found'})`);
    inserted++;
  }

  console.log(`\n🎉 Inserted ${inserted} centre club leaders!`);
  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});