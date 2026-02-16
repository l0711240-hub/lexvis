// routes/law.js - 국가법령정보 API 전용 (수정완료)
const express = require('express');
const router = express.Router();
const lawApi = require('../lawApi');

// =================================================================
// 1. 법령 검색
// =================================================================
router.get('/search', async (req, res) => {
  try {
    const { query = '', page = 1, display = 20, sort = 'lasc' } = req.query;
    
    const apiData = await lawApi.searchLaw({ 
      query, 
      page: parseInt(page), 
      display: parseInt(display),
      sort 
    });
    
    const root = apiData?.LawSearch || apiData?.법령검색 || apiData;
    
    if (!root || !root.law) {
      return res.json({ total: 0, items: [] });
    }
    
    const lawArray = Array.isArray(root.law) ? root.law : [root.law];
    
    // [수정 3] 법령명, MST 등 필드 매핑 정확화
    const items = lawArray.map(law => ({
      mst: law.법령일련번호 || law.법령MST || law.MST || '',
      name: law.법령명한글 || law.법령명 || '',
      type: law.법령구분명 || '',
      department: law.소관부처명 || '',
      promulgDate: law.공포일자 || '',
      enforcDate: law.시행일자 || '',
      category: law.법령구분명 || '기타', // '법률', '대통령령' 등 표시
      date: formatDate(law.시행일자 || law.공포일자)
    }));
    
    res.json({
      total: parseInt(root.totalCnt) || items.length,
      page: parseInt(page),
      display: parseInt(display),
      items
    });
    
  } catch (error) {
    console.error('[법령 검색 오류]', error.message);
    res.status(500).json({ error: '법령 검색 실패', message: error.message });
  }
});

// =================================================================
// 2. 법령 상세 조회
// =================================================================
router.get('/detail/:mst', async (req, res) => {
  try {
    const { mst } = req.params;
    const apiData = await lawApi.getLawDetail(mst);
    
    // API 응답 구조 확인 (법령 or Law)
    const root = apiData?.법령 || apiData?.Law || apiData;
    if (!root) {
      return res.status(404).json({ error: '법령 데이터를 찾을 수 없습니다.' });
    }
    
    const basicInfo = root.기본정보 || {};

    // [수정 3] 기본 정보 매핑 강화 (화면 상단 제목 표시용)
    const response = {
      mst,
      name: basicInfo.법령명한글 || basicInfo.법령명 || '제목 없음',
      englishName: basicInfo.법령명영문 || '',
      abbreviation: basicInfo.법령약칭명 || '',
      type: basicInfo.법령구분명 || '',
      department: basicInfo.소관부처명 || '',
      promulgDate: basicInfo.공포일자 || '',
      enforcDate: basicInfo.시행일자 || '',
      category: basicInfo.법령구분명 || '기타',
      // [수정 1] 새로운 파싱 로직 적용
      contents: buildLawHierarchy(root.조문?.조문단위) 
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('[법령 상세 오류]', error.message);
    res.status(500).json({ error: '법령 상세 조회 실패', message: error.message });
  }
});

// =================================================================
// 3. 특정 조문 조회
// =================================================================
router.get('/article', async (req, res) => {
  try {
    const { mst, jo } = req.query;
    const apiData = await lawApi.getLawArticle(mst, jo);
    const root = apiData?.법령 || apiData;
    
    if (!root?.조문?.조문단위) {
      return res.status(404).json({ error: '조문을 찾을 수 없습니다.' });
    }
    
    // 조문단위가 배열일 수도 있고 객체일 수도 있음
    const units = Array.isArray(root.조문.조문단위) ? root.조문.조문단위 : [root.조문.조문단위];
    // 요청한 조문번호와 일치하는 것 찾기
    const article = units.find(u => parseInt(u.조문번호) === parseInt(jo)) || units[0];

    // 조문 데이터 정제
    const cleanedArticle = parseArticleUnit(article);

    res.json({
      mst,
      num: cleanedArticle.num,
      title: cleanedArticle.title,
      content: cleanedArticle.content,
      paragraphs: cleanedArticle.paragraphs
    });
    
  } catch (error) {
    console.error('[조문 조회 오류]', error.message);
    res.status(500).json({ error: '조문 조회 실패', message: error.message });
  }
});

// =================================================================
// 헬퍼 함수들 (핵심 로직)
// =================================================================

/**
 * [수정 1] 평면적인 조문 리스트를 계층형 목차(Tree)로 변환
 * 편/장/절 정보가 조문단위 안에 들어있는 경우를 처리
 */
function buildLawHierarchy(units) {
  if (!units) return [];
  const unitArray = Array.isArray(units) ? units : [units];
  
  const result = [];
  let currentPart = null;   // 편
  let currentChapter = null; // 장
  let currentSection = null; // 절
  let currentSubsection = null; // 관

  unitArray.forEach(unit => {
    // 1. 편(Part) 변경 확인
    if (unit.편명 && (!currentPart || currentPart.title !== unit.편명)) {
      currentPart = { type: 'part', title: unit.편명, children: [] };
      result.push(currentPart);
      currentChapter = null; currentSection = null; currentSubsection = null;
    }

    // 2. 장(Chapter) 변경 확인
    if (unit.장명 && (!currentChapter || currentChapter.title !== unit.장명)) {
      currentChapter = { type: 'chapter', title: unit.장명, children: [] };
      // 편이 있으면 편 아래에, 없으면 최상위에 추가
      if (currentPart) currentPart.children.push(currentChapter);
      else result.push(currentChapter);
      currentSection = null; currentSubsection = null;
    }

    // 3. 절(Section) 변경 확인
    if (unit.절명 && (!currentSection || currentSection.title !== unit.절명)) {
      currentSection = { type: 'section', title: unit.절명, children: [] };
      if (currentChapter) currentChapter.children.push(currentSection);
      else if (currentPart) currentPart.children.push(currentSection);
      else result.push(currentSection);
      currentSubsection = null;
    }

    // 4. 관(Subsection) 변경 확인 (헌법 등에서 사용)
    if (unit.관명 && (!currentSubsection || currentSubsection.title !== unit.관명)) {
      currentSubsection = { type: 'sub-section', title: unit.관명, children: [] };
      if (currentSection) currentSection.children.push(currentSubsection);
      else if (currentChapter) currentChapter.children.push(currentSubsection);
      else result.push(currentSubsection);
    }

    // 5. 조문 추가
    const articleNode = parseArticleUnit(unit);
    
    // 현재 가장 하위 컨테이너에 조문 추가
    if (currentSubsection) currentSubsection.children.push(articleNode);
    else if (currentSection) currentSection.children.push(articleNode);
    else if (currentChapter) currentChapter.children.push(articleNode);
    else if (currentPart) currentPart.children.push(articleNode);
    else result.push(articleNode); // 아무 체계도 없는 경우
  });

  return result;
}

/**
 * 조문 단위 하나를 깔끔하게 정제
 */
function parseArticleUnit(unit) {
  // 조문 내용 정제 (번호 중복 제거)
  const num = unit.조문번호 || '';
  let content = unit.조문내용 || '';
  
  // "제1조(목적)" 같은 제목 추출
  // API가 조문제목을 따로 주면 그걸 쓰고, 없으면 조문내용에서 파싱 시도
  let title = unit.조문제목 || '';
  
  // 조문내용에서 "제1조(목적)" 텍스트 제거하고 순수 본문만 남기기
  // (API에 따라 조문내용에 제목이 포함될 수도, 아닐 수도 있음)
  content = cleanText(content, `제${num}조`);
  if (title) content = cleanText(content, title);
  content = cleanText(content, `(${title})`);

  // [수정 2] 항/호 번호 중복 제거 로직 적용
  const paragraphs = [];
  if (unit.항) {
    const hangArray = Array.isArray(unit.항) ? unit.항 : [unit.항];
    hangArray.forEach(h => {
      const pNum = h.항번호 ? h.항번호.trim() : ''; // ①
      let pContent = h.항내용 ? h.항내용.trim() : '';

      // "① ① 본문..." 처럼 번호가 내용에 포함된 경우 제거
      if (pNum && pContent.startsWith(pNum)) {
        pContent = pContent.substring(pNum.length).trim();
      }

      const paragraph = {
        num: pNum,
        content: pContent,
        items: []
      };

      // 호 파싱
      if (h.호) {
        const hoArray = Array.isArray(h.호) ? h.호 : [h.호];
        paragraph.items = hoArray.map(ho => {
          const iNum = ho.호번호 ? ho.호번호.trim() : ''; // 1.
          let iContent = ho.호내용 ? ho.호번호.trim() : ''; // 내용이 없는 경우 대비

          // API 데이터 구조상 호내용이 호번호 텍스트로 오는 경우가 있음
          // 호내용 필드가 있으면 그걸 씀
          if (ho.호내용) iContent = ho.호내용.trim();

          // "1. 1. 본문..." 중복 제거
          if (iNum && iContent.startsWith(iNum)) {
            iContent = iContent.substring(iNum.length).trim();
          }

          return { num: iNum, content: iContent };
        });
      }
      paragraphs.push(paragraph);
    });
  }

  return {
    type: 'article',
    num: num,
    title: title,
    content: content, // 조문 자체에 항 없이 본문만 있는 경우
    paragraphs: paragraphs
  };
}

/**
 * 텍스트 앞부분에서 특정 문자열(번호 등)을 안전하게 제거
 */
function cleanText(text, removeStr) {
  if (!text || !removeStr) return text;
  const t = text.trim();
  const r = removeStr.trim();
  if (t.startsWith(r)) {
    return t.substring(r.length).trim();
  }
  return t;
}

function formatDate(str) {
  if (!str || str.length !== 8) return str;
  return `${str.substring(0,4)}.${str.substring(4,6)}.${str.substring(6,8)}`;
}

module.exports = router;