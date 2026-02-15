// server/index.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const rateLimit = require('express-rate-limit');

const lawRouter  = require('./routes/law');
const precRouter = require('./routes/precedent');
const termRouter = require('./routes/term');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── 미들웨어 ──
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API 속도 제한 (국가법령정보 API 쿼터 보호)
const limiter = rateLimit({
  windowMs: 60 * 1000,   // 1분
  max: 60,               // 분당 최대 60회
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// ── API 라우터 ──
app.use('/api/law',       lawRouter);   // 법령
app.use('/api/precedent', precRouter);  // 판례
app.use('/api/term',      termRouter);  // 용어 사전 (서버 사이드 저장 선택사항)

// ── SPA 폴백: 모든 나머지 경로는 index.html ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ LexVis 서버 실행 중: http://localhost:${PORT}`);
  console.log(`📋 API OC: ${process.env.LAW_API_OC ? '설정됨' : '⚠️  미설정 (.env 확인 필요)'}`);
});
