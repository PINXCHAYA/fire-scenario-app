const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const ExcelJS = require('exceljs');

const app = express();
if (TRUST_PROXY) app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'museum-admin-1234';
const TRUST_PROXY = String(process.env.TRUST_PROXY || '').toLowerCase() === 'true';
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'fire_scenario.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  participant_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  rank1_choice TEXT,
  rank2_choice TEXT,
  rank3_choice TEXT,
  rank1_score INTEGER NOT NULL DEFAULT 0,
  rank2_score INTEGER NOT NULL DEFAULT 0,
  rank3_score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  result_label TEXT NOT NULL,
  seconds_used INTEGER NOT NULL DEFAULT 0,
  seconds_remaining INTEGER NOT NULL DEFAULT 0,
  completed_in_time INTEGER NOT NULL DEFAULT 0,
  total_answered INTEGER NOT NULL DEFAULT 0,
  user_agent TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_created_at ON attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_name ON attempts(participant_name);
`);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use(express.static(path.join(__dirname, 'public')));

const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'ส่งข้อมูลถี่เกินไป กรุณารอสักครู่' }
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'เรียกใช้งานส่วนผู้ดูแลบ่อยเกินไป กรุณารอสักครู่' }
});

const CHOICES = [
  'ตะโกนบอกคนในบ้าน',
  'คลานต่ำ',
  'เปิดประตูออกจากห้อง',
  'โทรแจ้ง 199',
  'ไปหยิบโทรศัพท์, ของมีค่า'
];

const SCORE_RULES = {
  1: { 'ตะโกนบอกคนในบ้าน': 1 },
  2: { 'เปิดประตูออกจากห้อง': 1 },
  3: { 'คลานต่ำ': 1 }
};

function normalizeChoice(choice) {
  return typeof choice === 'string' ? choice.trim() : '';
}

function scoreChoice(rank, choice) {
  const normalized = normalizeChoice(choice);
  return SCORE_RULES[rank]?.[normalized] || 0;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '';
}

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลส่วนผู้ดูแล' });
  }
  next();
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'Mini Decision Task: Fire Scenario', timestamp: new Date().toISOString() });
});

app.post('/api/submit', submitLimiter, (req, res) => {
  try {
    const participantName = String(req.body.participantName || '').trim();
    const sessionId = String(req.body.sessionId || '').trim() || `session-${Date.now()}`;
    const rank1Choice = normalizeChoice(req.body.rank1Choice || 'ไม่ได้เลือก');
    const rank2Choice = normalizeChoice(req.body.rank2Choice || 'ไม่ได้เลือก');
    const rank3Choice = normalizeChoice(req.body.rank3Choice || 'ไม่ได้เลือก');
    const secondsRemaining = Math.max(0, Math.min(20, Number(req.body.secondsRemaining || 0)));
    const completedInTime = Boolean(req.body.completedInTime);

    if (!participantName) {
      return res.status(400).json({ message: 'กรุณากรอกชื่อผู้ทำแบบทดสอบ' });
    }

    const choices = [rank1Choice, rank2Choice, rank3Choice].filter((item) => item && item !== 'ไม่ได้เลือก');
    const uniqueChoices = new Set(choices);
    const invalidChoices = choices.filter((choice) => !CHOICES.includes(choice));

    if (invalidChoices.length > 0) {
      return res.status(400).json({ message: 'มีตัวเลือกที่ไม่ถูกต้องในคำตอบ' });
    }

    if (uniqueChoices.size !== choices.length) {
      return res.status(400).json({ message: 'คำตอบซ้ำกันในหลายอันดับ ไม่สามารถบันทึกได้' });
    }

    const rank1Score = scoreChoice(1, rank1Choice);
    const rank2Score = scoreChoice(2, rank2Choice);
    const rank3Score = scoreChoice(3, rank3Choice);
    const totalScore = rank1Score + rank2Score + rank3Score;
    const resultLabel = totalScore === 3 ? 'คุณรอดแล้ว' : 'เกือบตุยแล้ว';
    const totalAnswered = choices.length;
    const secondsUsed = 20 - secondsRemaining;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO attempts (
        participant_name, session_id, rank1_choice, rank2_choice, rank3_choice,
        rank1_score, rank2_score, rank3_score, total_score, result_label,
        seconds_used, seconds_remaining, completed_in_time, total_answered,
        user_agent, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      participantName,
      sessionId,
      rank1Choice,
      rank2Choice,
      rank3Choice,
      rank1Score,
      rank2Score,
      rank3Score,
      totalScore,
      resultLabel,
      secondsUsed,
      secondsRemaining,
      completedInTime ? 1 : 0,
      totalAnswered,
      req.headers['user-agent'] || '',
      getClientIp(req),
      createdAt
    );

    res.json({
      success: true,
      id: info.lastInsertRowid,
      totalScore,
      resultLabel,
      rankScores: { rank1Score, rank2Score, rank3Score }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
});

app.get('/api/admin/summary', adminLimiter, requireAdmin, (req, res) => {
  try {
    const totalParticipants = db.prepare('SELECT COUNT(*) AS count FROM attempts').get().count;
    const survivors = db.prepare("SELECT COUNT(*) AS count FROM attempts WHERE result_label = 'คุณรอดแล้ว'").get().count;
    const nearMiss = db.prepare("SELECT COUNT(*) AS count FROM attempts WHERE result_label = 'เกือบตุยแล้ว'").get().count;
    const averageScore = db.prepare('SELECT ROUND(AVG(total_score), 2) AS avg_score FROM attempts').get().avg_score || 0;

    const choiceBreakdown = db.prepare(`
      SELECT choice, COUNT(*) AS total
      FROM (
        SELECT rank1_choice AS choice FROM attempts WHERE rank1_choice IS NOT NULL
        UNION ALL
        SELECT rank2_choice AS choice FROM attempts WHERE rank2_choice IS NOT NULL
        UNION ALL
        SELECT rank3_choice AS choice FROM attempts WHERE rank3_choice IS NOT NULL
      )
      GROUP BY choice
      ORDER BY total DESC
    `).all();

    const latest = db.prepare(`
      SELECT id, participant_name, total_score, result_label, created_at
      FROM attempts
      ORDER BY id DESC
      LIMIT 10
    `).all();

    res.json({
      totalParticipants,
      survivors,
      nearMiss,
      averageScore,
      choiceBreakdown,
      latest
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลสรุปได้' });
  }
});

app.get('/api/admin/attempts', adminLimiter, requireAdmin, (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 100)));
    const rows = db.prepare(`
      SELECT * FROM attempts
      ORDER BY id DESC
      LIMIT ?
    `).all(limit);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลผู้ทำแบบทดสอบได้' });
  }
});

app.get('/api/admin/export.xlsx', adminLimiter, requireAdmin, async (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM attempts ORDER BY id DESC').all();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Fire Scenario Results');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'ชื่อผู้ทำ', key: 'participant_name', width: 24 },
      { header: 'Session ID', key: 'session_id', width: 22 },
      { header: 'อันดับ 1', key: 'rank1_choice', width: 24 },
      { header: 'อันดับ 2', key: 'rank2_choice', width: 24 },
      { header: 'อันดับ 3', key: 'rank3_choice', width: 24 },
      { header: 'คะแนนอันดับ 1', key: 'rank1_score', width: 14 },
      { header: 'คะแนนอันดับ 2', key: 'rank2_score', width: 14 },
      { header: 'คะแนนอันดับ 3', key: 'rank3_score', width: 14 },
      { header: 'คะแนนรวม', key: 'total_score', width: 12 },
      { header: 'ผลลัพธ์', key: 'result_label', width: 18 },
      { header: 'ตอบไปกี่ข้อ', key: 'total_answered', width: 12 },
      { header: 'ใช้เวลา(วิ)', key: 'seconds_used', width: 12 },
      { header: 'เหลือเวลา(วิ)', key: 'seconds_remaining', width: 12 },
      { header: 'เสร็จในเวลา', key: 'completed_in_time', width: 12 },
      { header: 'User Agent', key: 'user_agent', width: 32 },
      { header: 'IP Address', key: 'ip_address', width: 20 },
      { header: 'บันทึกเมื่อ', key: 'created_at', width: 24 }
    ];

    rows.forEach((row) => {
      sheet.addRow({
        ...row,
        completed_in_time: row.completed_in_time ? 'ใช่' : 'ไม่ใช่'
      });
    });

    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = {
      from: 'A1',
      to: 'R1'
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="fire-scenario-results.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'ไม่สามารถ export Excel ได้' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
