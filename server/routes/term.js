// server/routes/term.js
// 용어 사전을 서버 파일(terms.json)에 저장
// 추후 DB(MongoDB/SQLite)로 교체 용이한 구조

const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const TERMS_FILE = path.join(__dirname, '../../data/terms.json');

function readTerms() {
  try {
    return JSON.parse(fs.readFileSync(TERMS_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function writeTerms(data) {
  fs.mkdirSync(path.dirname(TERMS_FILE), { recursive: true });
  fs.writeFileSync(TERMS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// GET /api/term  — 전체 목록
router.get('/', (req, res) => res.json(readTerms()));

// POST /api/term  — 추가/수정
router.post('/', (req, res) => {
  const { word, hanja, def, law } = req.body;
  if (!word || !def) return res.status(400).json({ error: 'word, def 필수' });
  const terms = readTerms();
  terms[word] = { hanja: hanja || '', def, law: law || '' };
  writeTerms(terms);
  res.json({ ok: true, term: terms[word] });
});

// DELETE /api/term/:word  — 삭제
router.delete('/:word', (req, res) => {
  const terms = readTerms();
  const word  = decodeURIComponent(req.params.word);
  if (!terms[word]) return res.status(404).json({ error: '없는 용어' });
  delete terms[word];
  writeTerms(terms);
  res.json({ ok: true });
});

module.exports = router;
