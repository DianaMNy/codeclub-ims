#!/usr/bin/env node
// run: node patch_routes.js  (from backend/src/routes/)
// Removes requireAdmin from GET routes — makes all read routes open to any logged-in user

const fs = require('fs');
const path = require('path');

const FILES_TO_PATCH = [
  'teachers.js',
  'starclub.js', 
  'ecosystem.js',
  'ecosystem_extras.js',
  'safeguarding.js',
  'reports.js',
  'donor.js',
  'pathways.js',
  'flagalerts.js',
  'mande.js',
  'visits.js',
  'reflections.js',
  'hos.js',
];

const routesDir = __dirname;

FILES_TO_PATCH.forEach(file => {
  const filePath = path.join(routesDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} — not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Fix GET routes: router.get('/', requireAuth, requireAdmin, ...
  // → router.get('/', requireAuth, ...
  content = content.replace(
    /router\.get\(([^,]+),\s*requireAuth,\s*requireAdmin,/g,
    'router.get($1, requireAuth,'
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Patched ${file}`);
  } else {
    console.log(`ℹ️  No changes needed in ${file}`);
  }
});

console.log('\nDone! Restart your backend server.');