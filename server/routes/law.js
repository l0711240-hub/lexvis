// server/routes/law.js
'use strict';

const express = require('express');
const router  = express.Router();
const lawApi  = require('../lawApi');

// ── GET /api/law/search ───────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { query='', page=1, display=20, sort='lasc', lawType='', org='' } = req.query;
    const data = await lawApi.searchLaw({
      query, page: +page, display: +display, sort, lawType, org
    });

    const root = data?.LawSearch;
    if (!root?.law) return res.json({ total: 0, page: +page, items: [] });

    const arr = Array.isArray(root.law) ? root.law : [root.law];
    res.json({
      total:   +root.totalCnt || arr.length,
      page:    +page,
      display: +display,
      items: arr.map(l => ({
        mst:          safeStr(l.법령일련번호),
        name:         safeStr(l.법령명한글),
        abbreviation: safeStr(l.법령약칭명),
        type:         safeStr(l.법령구분명),
        department:   safeStr(l.소관부처명),
        promulgDate:  fmtDate(l.공포일자),
        enforcDate:   fmtDate(l.시행일자),
        revisionType: safeStr(l.제개정구분명),
        status:       safeStr(l.현행연혁코드)
      }))
    });
  } catch (err) {
    console.error('[법령 검색]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/law/detail/:mst ──────────────────────────────────────
router.get('/detail/:mst', async (req, res) => {
  try {
    const { mst } = req.params;
    if (!mst) return res.status(400).json({ error: 'MST 필요' });

    const data = await lawApi.getLawDetail(mst);
    const root = data?.법령 ?? data;
    if (!root) return res.status(404).json({ error: '법령 없음' });

    const info = root.기본정보 ?? {};

    // [FIX] [object Object] 방지 — 모든 필드를 safeStr로 추출
    const name = safeStr(
      info['법령명_한글'] ?? info.법령명한글 ?? info.법령명 ?? ''
    );

    const units = root.조문?.조문단위;
    const contents = units ? buildLawHierarchy(units) : [];

    res.json({
      mst,
      name:         name || `법령 ${mst}`,
      englishName:  safeStr(info['법령명_한자'] ?? info.법령명영문 ?? ''),
      abbreviation: safeStr(info.법령명약칭 ?? ''),
      type:         safeStr(info.법종구분 ?? info.법령구분명 ?? ''),
      department:   safeStr(info.소관부처명 ?? info.연락부서 ?? info.소관부처 ?? ''),
      promulgDate:  fmtDate(info.공포일자),
      enforcDate:   fmtDate(info.시행일자),
      revisionType: safeStr(info.제개정구분 ?? ''),
      contents
    });
  } catch (err) {
    console.error('[법령 상세]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/law/article?mst=&jo= ────────────────────────────────
router.get('/article', async (req, res) => {
  try {
    const { mst, jo } = req.query;
    if (!mst || !jo) return res.status(400).json({ error: 'mst, jo 필요' });

    const data  = await lawApi.getLawArticle(mst, jo);
    const root  = data?.법령 ?? data;
    const units = root?.조문?.조문단위;
    if (!units) return res.status(404).json({ error: '조문 없음' });

    const arr = Array.isArray(units) ? units : [units];
    const target = arr.find(u =>
      String(u.조문번호).trim() === String(jo) && String(u.조문여부).trim() === '조문'
    ) ?? arr[0];

    res.json(parseArticle(target));
  } catch (err) {
    console.error('[조문 조회]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// 핵심 파싱 로직
// ══════════════════════════════════════════════════════════════════

/**
 * [FIX] safeStr — object가 넘어올 때 [object Object] 방지
 * xml2js 결과가 { _: "텍스트", 속성명: "값" } 형태일 수 있음
 */
function safeStr(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  // xml2js mergeAttrs 결과: { _: "실제텍스트", ... }
  if (typeof val === 'object') {
    if (val._) return String(val._).trim();
    // 배열이면 첫 번째 요소
    if (Array.isArray(val)) return safeStr(val[0]);
    // 그 외 — JSON 직렬화 방지, 빈 문자열 반환
    return '';
  }
  return String(val).trim();
}

function classifyUnit(u) {
  const key   = safeStr(u.조문키);
  const yeobu = safeStr(u.조문여부);
  const num   = safeStr(u.조문번호);

  if (num === '0' && yeobu === '전문') return 'preamble';
  if (key.length >= 3 && key.slice(-3) === '000') return 'header';
  return 'article';
}

function headerLevel(content) {
  const c = content.trim();
  if (/^제\d+편/.test(c)) return 'part';
  if (/^제\d+장/.test(c)) return 'chapter';
  if (/^제\d+절/.test(c)) return 'section';
  if (/^제\d+관/.test(c)) return 'subsection';
  return 'chapter';
}

function buildLawHierarchy(units) {
  const arr = Array.isArray(units) ? units : [units];

  const result       = [];
  let preambleLines  = [];
  let inPreamble     = false;
  let curPart        = null;
  let curChapter     = null;
  let curSection     = null;
  let curSub         = null;

  const leaf = () => curSub ?? curSection ?? curChapter ?? curPart ?? null;
  const addTo = (node) => {
    const l = leaf();
    l ? l.children.push(node) : result.push(node);
  };

  const flushPreamble = () => {
    if (!preambleLines.length) return;
    const lines = preambleLines.filter(l => l !== '전문' && l !== '전 문');
    if (lines.length) {
      result.push({ type: 'preamble', title: '전문(前文)', content: lines.join('\n') });
    }
    preambleLines = [];
    inPreamble    = false;
  };

  for (const u of arr) {
    const kind    = classifyUnit(u);
    const content = safeStr(u.조문내용);

    if (kind === 'preamble') {
      inPreamble = true;
      if (content) preambleLines.push(content);
      continue;
    }
    if (inPreamble) flushPreamble();

    if (kind === 'header') {
      const level = headerLevel(content);
      if (level === 'part') {
        curPart = curChapter = curSection = curSub = null;
        curPart = { type: 'part', title: content, children: [] };
        result.push(curPart);
      } else if (level === 'chapter') {
        curChapter = curSection = curSub = null;
        curChapter = { type: 'chapter', title: content, children: [] };
        curPart ? curPart.children.push(curChapter) : result.push(curChapter);
      } else if (level === 'section') {
        curSection = curSub = null;
        curSection = { type: 'section', title: content, children: [] };
        const p = curChapter ?? curPart;
        p ? p.children.push(curSection) : result.push(curSection);
      } else {
        curSub = null;
        curSub = { type: 'subsection', title: content, children: [] };
        const p = curSection ?? curChapter ?? curPart;
        p ? p.children.push(curSub) : result.push(curSub);
      }
      continue;
    }

    addTo(parseArticle(u));
  }

  if (inPreamble) flushPreamble();
  return result;
}

/**
 * [FIX] 가지번호 지원 — 제22조의2 형태로 표시
 */
function parseArticle(u) {
  if (!u) return { type: 'article', num: '', branch: '', title: '', content: '', paragraphs: [] };

  const num    = safeStr(u.조문번호);
  const branch = safeStr(u.조문가지번호);   // ← 가지번호 추출
  const title  = safeStr(u.조문제목);
  let content  = safeStr(u.조문내용);

  // "제N조" 또는 "제N조의M" 라벨 제거
  const joLabel = num ? `제${num}조` : '';
  const fullLabel = branch && branch !== '0'
    ? `${joLabel}의${branch}`
    : joLabel;

  if (fullLabel && (content === fullLabel || content === num)) {
    content = '';
  } else if (fullLabel && content.startsWith(fullLabel)) {
    content = content.slice(fullLabel.length).trim();
  } else if (joLabel && content.startsWith(joLabel)) {
    content = content.slice(joLabel.length).trim();
  }

  // "(제목)" 중복 제거
  if (title && content.startsWith(`(${title})`)) {
    content = content.slice(title.length + 2).trim();
  }

  // 항 파싱
  const paragraphs = [];
  if (u.항) {
    const hangArr = Array.isArray(u.항) ? u.항 : [u.항];
    for (const h of hangArr) {
      const pNum     = safeStr(h.항번호);
      let   pContent = safeStr(h.항내용);
      if (pNum && pContent.startsWith(pNum)) pContent = pContent.slice(pNum.length).trim();

      const items = [];
      if (h.호) {
        const hoArr = Array.isArray(h.호) ? h.호 : [h.호];
        for (const ho of hoArr) {
          const iNum     = safeStr(ho.호번호);
          let   iContent = safeStr(ho.호내용);
          if (iNum && iContent.startsWith(iNum)) iContent = iContent.slice(iNum.length).trim();

          const subitems = [];
          if (ho.목) {
            const mokArr = Array.isArray(ho.목) ? ho.목 : [ho.목];
            for (const m of mokArr) {
              const mNum     = safeStr(m.목번호);
              let   mContent = safeStr(m.목내용);
              if (mNum && mContent.startsWith(mNum)) mContent = mContent.slice(mNum.length).trim();
              subitems.push({ num: mNum, content: mContent });
            }
          }
          items.push({ num: iNum, content: iContent, subitems });
        }
      }
      paragraphs.push({ num: pNum, content: pContent, items });
    }
  }

  return {
    type: 'article',
    num,
    branch: (branch && branch !== '0') ? branch : '',  // ← 가지번호
    title,
    content,
    paragraphs
  };
}

function fmtDate(s) {
  const str = safeStr(s);
  if (str.length !== 8) return str;
  return `${str.slice(0,4)}.${str.slice(4,6)}.${str.slice(6,8)}`;
}

module.exports = router;
