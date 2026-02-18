// server/index.js
'use strict';
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const rateLimit  = require('express-rate-limit');

const lawRouter  = require('./routes/law');
const precRouter = require('./routes/precedent');
const termRouter = require('./routes/term');

const app  = express();
const PORT = process.env.PORT || 3000;

const OC = (process.env.LAW_API_OC || '').trim();
if (!OC || OC === '여기에_OC_키_입력') {
  console.error('\n❌ LAW_API_OC 환경변수가 설정되지 않았습니다.');
  console.error('   .env.example 을 .env 로 복사하고 OC 키를 입력하세요.\n');
  process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const limiter = rateLimit({
  windowMs:        60 * 1000,
  max:             120,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' }
});
app.use('/api', limiter);

app.use('/api/law',       lawRouter);
app.use('/api/precedent', precRouter);
app.use('/api/term',      termRouter);

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  version: '4.0.0',
  timestamp: new Date().toISOString()
}));

// SPA 폴백
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
);

app.use((err, _req, res, _next) => {
  console.error('[서버 오류]', err.message);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║      ✨ LexVis v4.0 실행 중          ║');
  console.log(`║   🌐  http://localhost:${PORT}          ║`);
  console.log('╚══════════════════════════════════════╝\n');
});
