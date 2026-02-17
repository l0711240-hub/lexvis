// server/routes/law.js
const express = require('express');
const router = express.Router();
const lawApi = require('../lawApi');

// ══════════════════════════════════════════════════
// 1. 법령 검색
// GET /api/law/search?query=형법&page=1&display=20
// ══════════════════════════════════════════════════
router.get('/search', async (req, res) => {
  try {
    const { query = '', page = 1, display = 20, sort = 'lasc' } = req.query;

    const apiData = await lawApi.searchLaw({
      query,
      page: parseInt(page),
      display: parseInt(display),
      sort
    });

    const root = apiData?.LawSearch;
    if (!root || !root.law) {
      return res.json({ total: 0, items: [] });
    }

    const lawArray = Array.isArray(root.law) ? root.law : [root.law];

    const items = lawArray.map(law => ({
      // ★ 실제 API: 법령일련번호가 MST 역할
      mst:          String(law.법령일련번호 || '').trim(),
      lawId:        String(law.법령ID || '').trim(),
      name:         String(law.법령명한글 || '').trim(),  // CDATA → trim() 필수
      abbreviation: String(law.법령약칭명 || '').trim(),
      type:         String(law.법령구분명 || '').trim(),
      department:   String(law.소관부처명 || '').trim(),
      promulgDate:  formatDate(String(law.공포일자 || '').trim()),
      enforcDate:   formatDate(String(law.시행일자 || '').trim()),
      status:       String(law.현행연혁코드 || '').trim(),
      category:     String(law.법령구분명 || '기타').trim(),
    }));

    res.json({
      total:   parseInt(root.totalCnt) || items.length,
      page:    parseInt(page),
      display: parseInt(display),
      items
    });

  } catch (error) {
    console.error('[법령 검색 오류]', error.message);
    res.status(500).json({ error: '법령 검색 실패', message: error.message });
  }
});

// ══════════════════════════════════════════════════
// 2. 법령 상세 조회
// GET /api/law/detail/:mst
// ══════════════════════════════════════════════════
router.get('/detail/:mst', async (req, res) => {
  try {
    const { mst } = req.params;

    if (!mst || mst === 'undefined' || mst === 'null') {
      return res.status(400).json({ error: '유효하지 않은 MST 값입니다.' });
    }

    const apiData = await lawApi.getLawDetail(mst);

    const root = apiData?.법령;
    if (!root) {
      console.error('[법령 상세] 응답 구조:', JSON.stringify(apiData).substring(0, 300));
      return res.status(404).json({ error: '법령 데이터를 찾을 수 없습니다.' });
    }

    const basicInfo = root.기본정보 || {};

    // ★ CDATA 공백 제거
    const lawName = String(basicInfo.법령명한글 || basicInfo.법령명 || '').trim();

    console.log('[법령 상세] MST:', mst, '| 법령명:', lawName);

    const response = {
      mst,
      lawId:        String(basicInfo.법령ID || '').trim(),
      name:         lawName,
      abbreviation: String(basicInfo.법령약칭명 || '').trim(),
      englishName:  String(basicInfo.법령명영문 || '').trim(),
      type:         String(basicInfo.법령구분명 || '').trim(),
      department:   String(basicInfo.소관부처명 || '').trim(),
      promulgDate:  formatDate(String(basicInfo.공포일자 || '').trim()),
      enforcDate:   formatDate(String(basicInfo.시행일자 || '').trim()),
      category:     String(basicInfo.법령구분명 || '기타').trim(),
      contents:     buildLawHierarchy(root.조문?.조문단위)
    };

    res.json(response);

  } catch (error) {
    console.error('[법령 상세 오류]', error.message);
    res.status(500).json({ error: '법령 상세 조회 실패', message: error.message });
  }
});

// ══════════════════════════════════════════════════
// 3. 특정 조문 조회
// GET /api/law/article?mst=XXX&jo=1
// ══════════════════════════════════════════════════
router.get('/article', async (req, res) => {
  try {
    const { mst, jo } = req.query;

    if (!mst || !jo) {
      return res.status(400).json({ error: 'mst와 jo 파라미터가 필요합니다.' });
    }

    const apiData = await lawApi.getLawArticle(mst, jo);
    const root = apiData?.법령;

    if (!root?.조문?.조문단위) {
      return res.status(404).json({ error: '조문을 찾을 수 없습니다.' });
    }

    const units = Array.isArray(root.조문.조문단위)
      ? root.조문.조문단위
      : [root.조문.조문단위];

    const article =
      units.find(u => String(u.조문번호).trim() === String(jo).trim()) || units[0];

    if (!article) {
      return res.status(404).json({ error: '해당 조문을 찾을 수 없습니다.' });
    }

    res.json(parseArticleUnit(article));

  } catch (error) {
    console.error('[조문 조회 오류]', error.message);
    res.status(500).json({ error: '조문 조회 실패', message: error.message });
  }
});

// ══════════════════════════════════════════════════
// 헬퍼 함수
// ══════════════════════════════════════════════════

/**
 * 평면 조문단위 배열 → 편/장/절/관 계층 트리
 * 각 조문단위 안에 편명/장명/절명/관명이 포함되어 있음
 */
function buildLawHierarchy(units) {
  if (!units) return [];
  const unitArray = Array.isArray(units) ? units : [units];

  const result       = [];
  let curPart        = null;
  let curChapter     = null;
  let curSection     = null;
  let curSubsection  = null;

  for (const unit of unitArray) {
    const partName    = String(unit.편명 || '').trim();
    const chapterName = String(unit.장명 || '').trim();
    const sectionName = String(unit.절명 || '').trim();
    const subName     = String(unit.관명 || '').trim();

    // 편 전환
    if (partName && (!curPart || curPart.title !== partName)) {
      curPart = { type: 'part', title: partName, children: [] };
      curChapter = curSection = curSubsection = null;
      result.push(curPart);
    }

    // 장 전환
    if (chapterName && (!curChapter || curChapter.title !== chapterName)) {
      curChapter = { type: 'chapter', title: chapterName, children: [] };
      curSection = curSubsection = null;
      (curPart ? curPart.children : result).push(curChapter);
    }

    // 절 전환
    if (sectionName && (!curSection || curSection.title !== sectionName)) {
      curSection = { type: 'section', title: sectionName, children: [] };
      curSubsection = null;
      const p = curChapter || curPart;
      (p ? p.children : result).push(curSection);
    }

    // 관 전환
    if (subName && (!curSubsection || curSubsection.title !== subName)) {
      curSubsection = { type: 'subsection', title: subName, children: [] };
      const p = curSection || curChapter || curPart;
      (p ? p.children : result).push(curSubsection);
    }

    // 조문 추가
    if (unit.조문번호 !== undefined && unit.조문번호 !== null) {
      const node = parseArticleUnit(unit);
      const p = curSubsection || curSection || curChapter || curPart;
      (p ? p.children : result).push(node);
    }
  }

  return result;
}

/**
 * 조문 단위 하나를 정제
 */
function parseArticleUnit(unit) {
  const num   = String(unit.조문번호  || '').trim();
  const title = String(unit.조문제목  || '').trim();
  let content = String(unit.조문내용  || '').trim();

  // 내용 앞부분 중복 제거
  for (const prefix of [`제${num}조`, `(${title})`, title]) {
    if (prefix && content.startsWith(prefix)) {
      content = content.slice(prefix.length).trim();
    }
  }

  // 항 파싱
  const paragraphs = [];
  if (unit.항) {
    const hangArr = Array.isArray(unit.항) ? unit.항 : [unit.항];
    for (const h of hangArr) {
      const pNum     = String(h.항번호 || '').trim();
      let   pContent = String(h.항내용 || '').trim();
      if (pNum && pContent.startsWith(pNum)) pContent = pContent.slice(pNum.length).trim();

      // 호 파싱
      const items = [];
      if (h.호) {
        const hoArr = Array.isArray(h.호) ? h.호 : [h.호];
        for (const ho of hoArr) {
          const iNum     = String(ho.호번호 || '').trim();
          let   iContent = String(ho.호내용 || '').trim();
          if (iNum && iContent.startsWith(iNum)) iContent = iContent.slice(iNum.length).trim();

          // 목 파싱
          const subitems = [];
          if (ho.목) {
            const mokArr = Array.isArray(ho.목) ? ho.목 : [ho.목];
            for (const mok of mokArr) {
              const mNum     = String(mok.목번호 || '').trim();
              let   mContent = String(mok.목내용 || '').trim();
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

  return { type: 'article', num, title, content, paragraphs };
}

/**
 * "20250101" → "2025.01.01"
 */
function formatDate(str) {
  if (!str || str.length !== 8) return str || '';
  return `${str.slice(0,4)}.${str.slice(4,6)}.${str.slice(6,8)}`;
}

module.exports = router;
