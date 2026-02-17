// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const lawRouter = require('./routes/law');
const precRouter = require('./routes/precedent');
const termRouter = require('./routes/term');

const app = express();
const PORT = process.env.PORT || 3000;

// ══ 환경 변수 확인 ══
const OC = process.env.LAW_API_OC;
if (!OC || OC === 'your_oc_id_here' || OC.trim() === '') {
  console.error('❌ LAW_API_OC 환경 변수가 설정되지 않았습니다!');
  console.error('💡 .env 파일에 국가법령정보 API OC 키를 입력하세요.');
  console.error('   예시: LAW_API_OC=your_actual_oc_key_here');
  process.exit(1);
}

// ══ 미들웨어 ══
app.use(cors());
app.use(express.json());

// 정적 파일 제공 - public 폴더
app.use(express.static(path.join(__dirname, '..', 'public')));

// API 속도 제한 (국가법령정보 API 보호)
const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1분
  max: 100,             // 분당 최대 100회
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ══ API 라우터 ══
app.use('/api/law', lawRouter);
app.use('/api/precedent', precRouter);
app.use('/api/term', termRouter);

// ══ 헬스 체크 ══
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!OC,
    version: '2.0.0'
  });
});

// ══ SPA 폴백 ══
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ══ 에러 핸들링 ══
app.use((err, req, res, next) => {
  console.error('[서버 오류]', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ══ 서버 시작 ══
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║                                              ║');
  console.log('║       LexVis 서버 실행 중                    ║');
  console.log('║                                              ║');
  console.log(`║       URL: http://localhost:${PORT}             ║`);
  console.log(`║       API: http://localhost:${PORT}/api         ║`);
  console.log('║       국가법령정보 API: 연결됨               ║');
  console.log('║                                              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
});
