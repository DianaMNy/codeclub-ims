// backend/src/routes/cody.js
const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { requireAuth } = require('../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });


const PROGRAMME_CONTEXT = `
You are Cody 🤖, the smart AI assistant for EmpServe Kenya's Code Club IMS.
You are friendly, enthusiastic, and knowledgeable about the RPF 2026 programme.

PROGRAMME BACKGROUND:
- EmpServe Kenya partners with Raspberry Pi Foundation (RPF) to run Code Clubs
- Programme runs Aug 2025 – Jul 2026 across Kiambu, Murang'a, and Kajiado counties in Kenya
- Goal: 150 schools/community centres, 5,000 learners, 200 teachers
- Learners: Grades 4-12, 50% female participation target, neurodivergent support
- Weekly 1-hour Code Club sessions aligned with CBC calendar (Jan 6 – Oct 24, 2025)
- Software: Scratch 3.0, Python (Thonny IDE), Code Club on a Stick (offline)
- Hardware: 10-15 devices per school (computers/tablets/laptops)
- Training: 4-week (8-hour) teacher training, 6-week community champions training
- Safeguarding: 1-hour module mandatory for all facilitators
- Global events: Coolest Projects Talent Showcase (Apr 2026), Astro Pi Challenge
- CBC integration: Digital Literacy (Gr 4-6), ICT (Gr 7-9), Pre-Technical Studies (Gr 10-12)
- Contact: partnerships@empserve.org | +254-710-652215 | www.empserve.org

PATHWAYS:
- Scratch Fundamentals 🐱: L1 Intro to Scratch, L2 More Scratch, L3 Further Scratch
- Python Basics 🐍: L1 Intro to Python, L2 Functions & Loops, L3 Data & Logic
- AI & Machine Learning 🧠: L1 What is AI?, L2 Training Models, L3 Building with AI
- Web Design 🌐: L1 HTML, L2 CSS Styling, L3 Responsive Design
- Physical Computing 🤖: L1 Hardware, L2 Sensors, L3 Building Projects
- Game Design 🎮: L1 Concepts, L2 Mechanics, L3 Building & Testing

ROLES: Admin, Programme Coordinator, Mentor (Youth Mentor), Teacher/Club Leader

Always be helpful, concise, and fun! Use emojis. Keep answers under 150 words unless asked for detail.
If you don't know something, say so and suggest contacting partnerships@empserve.org.
`;

// GET /api/cody/summary — fetch live data for context
const getLiveData = async () => {
  try {
    const [schools, mentors, teachers, flags, pathways, observations, counties] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active, COUNT(*) FILTER (WHERE type='community_centre') as centres, SUM(learner_count) as learners FROM schools_and_centres`),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active FROM mentors`),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE training_completed=true) as trained, COUNT(*) FILTER (WHERE safeguarding_done=true) as safeguarded FROM teachers`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE status='open') as open, COUNT(*) as total FROM flags`),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE completed=true) as completed FROM pathway_progress`),
      pool.query(`SELECT COUNT(*) as total FROM session_observations`),
      pool.query(`SELECT county, COUNT(*) as schools, COUNT(*) FILTER (WHERE status='active') as active, SUM(learner_count) as learners FROM schools_and_centres GROUP BY county`),
    ]);

    return {
      schools: schools.rows[0],
      mentors: mentors.rows[0],
      teachers: teachers.rows[0],
      flags: flags.rows[0],
      pathways: pathways.rows[0],
      observations: observations.rows[0],
      counties: counties.rows,
    };
  } catch(e) {
    console.error('Cody data error:', e.message);
    return null;
  }
};

// POST /api/cody/chat
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    // Get live data
    const liveData = await getLiveData();

    // Build system prompt with live data
    let systemPrompt = PROGRAMME_CONTEXT;
    if (liveData) {
      systemPrompt += `\n\nLIVE SYSTEM DATA (right now):\n`;
      systemPrompt += `- Total Schools: ${liveData.schools?.total}\n`;
      systemPrompt += `- Community Centres: ${liveData.schools?.centres}\n`;
      systemPrompt += `- Active Coding Clubs: ${liveData.schools?.active}\n`;
      systemPrompt += `- Total Learners: ${liveData.schools?.learners}\n`;
      systemPrompt += `- Total Mentors: ${liveData.mentors?.total}\n`;
      systemPrompt += `- Active Mentors: ${liveData.mentors?.active}\n`;
      systemPrompt += `- Total Teachers/Club Leaders: ${liveData.teachers?.total}\n`;
      systemPrompt += `- Training Completed: ${liveData.teachers?.trained}\n`;
      systemPrompt += `- Safeguarding Done: ${liveData.teachers?.safeguarded}\n`;
      systemPrompt += `- Open Flags: ${liveData.flags?.open}\n`;
      systemPrompt += `- Total Flags: ${liveData.flags?.total}\n`;
      systemPrompt += `- Pathways Started: ${liveData.pathways?.total}\n`;
      systemPrompt += `- Pathways Completed: ${liveData.pathways?.completed}\n`;
      systemPrompt += `- Session Observations: ${liveData.observations?.total}\n`;
      systemPrompt += `\nBY COUNTY:\n`;
      liveData.counties?.forEach(c => {
        systemPrompt += `- ${c.county}: ${c.schools} schools, ${c.active} active clubs, ${c.learners||0} learners\n`;
      });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages.slice(-10), // last 10 messages for context
    });

    res.json({ reply: response.content[0].text });
  } catch(err) {
    console.error('Cody error:', err.message);
    res.status(500).json({ error: 'Cody is taking a break! Try again shortly. 🔄' });
  }
});

module.exports = router;