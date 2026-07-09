// Load our secret keys from .env file
require('dotenv').config();

// Connect to database
require('./db/index');

// Import express - our web server tool
const express = require('express');

// Import cors - allows frontend to talk to backend
const cors = require('cors');

// Import rate limiting - protects login from brute force / abuse
const rateLimit = require('express-rate-limit');
const { logAudit } = require('./utils/audit');

// Create our app
const app = express();

// Railway sits behind a reverse proxy — trust its X-Forwarded-For header
// so rate limiting (and req.ip generally) sees the real client IP.
app.set('trust proxy', 1);

// ── Tell the app what tools to use ──────────────────
// Read JSON data from requests
app.use(express.json({ limit: '10mb' }));

// Allow frontend to connect
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://codeclub-ims.vercel.app'],
  credentials: true,
}));

// ── Rate limiters ────────────────────────────────────
// Strict limiter for login/forgot-password — only failed attempts count,
// since successful logins from shared/CGNAT IPs (common on Kenyan mobile
// carriers) must never contribute to blocking other users on the same IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    try {
      await logAudit(req, 'rate_limit_triggered', null, null, `Rate limit triggered on ${req.originalUrl} from ${req.ip}`);
    } catch (err) {
      console.error('Rate limit audit log error:', err.message);
    }
    res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
  },
});

// General limiter for all other API traffic.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests. Please slow down.' });
  },
});

app.use('/api', generalLimiter);

// Routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
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

const deviceAuditRoutes = require('./routes/deviceAudits');
app.use('/api/device-audits', deviceAuditRoutes);

const flagAlertRoutes = require('./routes/flagalerts');
app.use('/api/flagalerts', flagAlertRoutes);

const reportRoutes = require('./routes/reports');
app.use('/api/reports', reportRoutes);

const donorRoutes = require('./routes/donor');
app.use('/api/donor', donorRoutes);

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

const hosRoutes = require('./routes/hos');
app.use('/api/hos', hosRoutes);

const ecosystemExtrasRoutes = require('./routes/ecosystem_extras');
app.use('/api/ecosystem-extras', ecosystemExtrasRoutes);

const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

const codyRoutes = require('./routes/cody');
app.use('/api/cody', codyRoutes);

const projectsShowcaseRoutes = require('./routes/projects_showcase');
app.use('/api/projects-showcase', projectsShowcaseRoutes);

const auditLogRoutes = require('./routes/audit_logs');
app.use('/api/audit-logs', auditLogRoutes);

// ── Start the server ──────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Code Club IMS server is running!');
  console.log(`   Open this in your browser: http://localhost:${PORT}/api/health`);
  console.log('');
});
