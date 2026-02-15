// server/routes/precedent.js
const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const CASES_FILE = path.join(__dirname, '../../data/cases.json');

function readLocalCases() {
  try { return JSON.parse(fs.readFileSync(CASES_FILE, 'utf8')); }
  catch { return []; }
}
function apiAvailable() {
  const oc = process.env.LAW_API_OC;
  return !!(oc && oc !== 'your_oc_id_here' && oc.trim() !== '여기에_발급받은_OC_아이디_입력');
}

// 판례 검색
router.get('/search', async (req, res) => {
  const { query = '', court = '' } = req.query;
  const local = readLocalCases();
  const ql = query.toLowerCase().trim();
  const results = local.filter(c => {
    const mq = !ql || c.caseNum.toLowerCase().includes(ql) || c.caseName.toLowerCase().includes(ql)
      || (c.category||'').toLowerCase().includes(ql) || (c.summary||'').toLowerCase().includes(ql)
      || (c.fullText||'').toLowerCase().includes(ql);
    const mc = !court || c.court.includes(court);
    return mq && mc;
  });

  if (apiAvailable() && ql) {
    try {
      const { searchPrecedent } = require('../lawApi');
      const apiData = await searchPrecedent({ query, page: 1, display: 20, court });
      const root = apiData?.PrecSearch;
      const apiItems = root?.prec
        ? (Array.isArray(root.prec) ? root.prec : [root.prec]).map(p => ({
            id: p.판례일련번호, caseNum: p.사건번호, caseName: p.사건명,
            court: p.법원명, date: p.선고일자, result: p.판결유형,
            category: p.판례분야, source: 'api',
          }))
        : [];
      const merged = [
        ...results.map(c => ({...c, source:'local'})),
        ...apiItems.filter(a => !results.some(l => l.caseNum === a.caseNum)),
      ];
      return res.json({ total: merged.length, items: merged });
    } catch(e) { console.warn('[API 실패, 로컬만 사용]', e.message); }
  }

  res.json({ total: results.length, items: results.map(c => ({...c, source:'local'})) });
});

// 판례 본문
router.get('/detail/:id', async (req, res) => {
  const id = req.params.id;
  const local = readLocalCases();
  const found = local.find(c => c.id === id || c.caseNum === id);
  if (found) return res.json({...found, source:'local'});

  if (apiAvailable()) {
    try {
      const { getPrecedentDetail } = require('../lawApi');
      const raw = await getPrecedentDetail(id);
      const root = raw?.PrecService;
      if (!root) return res.status(404).json({ error: '판례를 찾을 수 없습니다.' });
      return res.json({
        id, caseNum: root.사건번호||'', caseName: root.사건명||'',
        court: root.법원명||'', date: root.선고일자||'', result: root.판결유형||'',
        summary: root.판시사항||'', gist: root.판결요지||'',
        refLaws: root.참조조문||'', refCases: root.참조판례||'',
        fullText: (root.판례내용||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,''),
        source: 'api',
      });
    } catch(e) { console.error('[API 오류]', e.message); }
  }
  res.status(404).json({ error: '판례를 찾을 수 없습니다.' });
});

// 로컬 판례 추가
router.post('/local', (req, res) => {
  const cases = readLocalCases();
  const entry = { id:'local-'+Date.now(), relatedUpper:[], relatedLower:[], ...req.body };
  cases.push(entry);
  fs.writeFileSync(CASES_FILE, JSON.stringify(cases, null, 2), 'utf8');
  res.json({ ok:true, id:entry.id });
});

// 로컬 판례 삭제
router.delete('/local/:id', (req, res) => {
  let cases = readLocalCases();
  const before = cases.length;
  cases = cases.filter(c => c.id !== req.params.id);
  if (cases.length === before) return res.status(404).json({ error: '없는 판례' });
  fs.writeFileSync(CASES_FILE, JSON.stringify(cases, null, 2), 'utf8');
  res.json({ ok:true });
});

module.exports = router;
