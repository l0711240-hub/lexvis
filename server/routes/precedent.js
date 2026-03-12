// server/routes/precedent.js
'use strict';

const express = require('express');
const router  = express.Router();
const lawApi  = require('../lawApi');

const CASE_NUM_RE = /^\d{4}[가-힣]+\d+/;

// ── GET /api/precedent/search ─────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const {
      query='', page=1, display=20,
      search=1, courtOrg='', courtNm='',
      refLaw='', prncYd='', caseNum='', sort='ddes'
    } = req.query;

    const q = query.trim();
    const isCaseNum = CASE_NUM_RE.test(q.replace(/\s/g, ''));

    const data = await lawApi.searchPrecedent({
      query:    isCaseNum ? '' : q,
      page:     +page,
      display:  +display,
      search:   +search,
      courtOrg, courtNm, refLaw, prncYd,
      caseNum:  isCaseNum ? q : caseNum,
      sort
    });

    const root = data?.PrecSearch ?? data;
    if (!root?.prec) return res.json({ total: 0, page: +page, items: [] });

    const arr = Array.isArray(root.prec) ? root.prec : [root.prec];
    res.json({
      total:   +root.totalCnt || arr.length,
      page:    +page,
      display: +display,
      items: arr.map(p => ({
        id:        safe(p.판례일련번호),
        caseNum:   safe(p.사건번호),
        caseName:  safe(p.사건명),
        court:     safe(p.법원명),
        courtType: safe(p.법원종류코드),
        date:      fmtDate(p.선고일자),
        caseType:  safe(p.사건종류명),
        result:    safe(p.판결유형),
        verdict:   safe(p.선고),
        datSrcNm:  safe(p.데이터출처명)
      }))
    });
  } catch (err) {
    console.error('[판례 검색]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/precedent/detail/:id ────────────────────────────────
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') return res.status(400).json({ error: 'ID 필요' });

    const data = await lawApi.getPrecedentDetail(id);
    const root = data?.PrecService ?? data;
    if (!root) return res.status(404).json({ error: '판례 없음' });

    res.json({
      id,
      caseNum:   safe(root.사건번호),
      caseName:  safe(root.사건명),
      court:     safe(root.법원명),
      courtType: safe(root.법원종류코드),
      date:      fmtDate(root.선고일자),
      verdict:   safe(root.선고),
      caseType:  safe(root.사건종류명),
      result:    safe(root.판결유형),
      summary:   clean(root.판시사항),
      gist:      clean(root.판결요지),
      refLaws:   clean(root.참조조문),
      refCases:  clean(root.참조판례),
      fullText:  clean(root.판례내용)
    });
  } catch (err) {
    console.error('[판례 상세]', err.message);
    res.status(500).json({ error: err.message });
  }
});

function safe(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (val._) return String(val._).trim();
    if (Array.isArray(val)) return safe(val[0]);
    return '';
  }
  return String(val).trim();
}

function clean(text) {
  if (!text) return '';
  return String(text)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function fmtDate(s) {
  const str = safe(s);
  if (str.length !== 8) return str;
  return `${str.slice(0,4)}.${str.slice(4,6)}.${str.slice(6,8)}`;
}

module.exports = router;
