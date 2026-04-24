// Load our secret keys from .env file
require('dotenv').config();

// Connect to database
require('./db/index');

// Import express - our web server tool
const express = require('express');

// Import cors - allows frontend to talk to backend
const cors = require('cors');

// Create our app
const app = express();

// ── Tell the app what tools to use ──────────────────
// Read JSON data from requests
app.use(express.json());

// Allow frontend to connect
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://codeclub-ims.vercel.app'],
  credentials: true,
}));

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
// ── Our first route ───────────────────────────────────
const schoolRoutes = require('./routes/schools');
app.use('/api/schools', schoolRoutes);
// When someone visits /api/health it returns this message
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Code Club IMS is running!',
    timestamp: new Date().toISOString(),
  });
});
const mentorRoutes = require('./routes/mentors');
app.use('/api/mentors', mentorRoutes);

const visitRoutes = require('./routes/visits');
app.use('/api/visits', visitRoutes);

const flagRoutes = require('./routes/flags');
app.use('/api/flags', flagRoutes);

const reflectionRoutes = require('./routes/reflections');
app.use('/api/reflections', reflectionRoutes);

const teacherRoutes = require('./routes/teachers');
app.use('/api/teachers', teacherRoutes);

const ecosystemRoutes = require('./routes/ecosystem');
app.use('/api/ecosystem', ecosystemRoutes);

const safeguardingRoutes = require('./routes/safeguarding');
app.use('/api/safeguarding', safeguardingRoutes);

const pathwayRoutes = require('./routes/pathways');
app.use('/api/pathways', pathwayRoutes);

const mandeRoutes = require('./routes/mande');
app.use('/api/mande', mandeRoutes);

const starclubRoutes = require('./routes/starclub');
app.use('/api/starclub', starclubRoutes);

const flagAlertRoutes = require('./routes/flagalerts');
app.use('/api/flagalerts', flagAlertRoutes);

const reportRoutes = require('./routes/reports');
app.use('/api/reports', reportRoutes);

const donorRoutes = require('./routes/donor');
app.use('/api/donor', donorRoutes);

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

// ── Start the server ──────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Code Club IMS server is running!');
  console.log(`   Open this in your browser: http://localhost:${PORT}/api/health`);
  console.log('');
});