// routes/precedent.js - 국가법령정보 API 전용
const express = require('express');
const router = express.Router();
const lawApi = require('../lawApi');

/**
 * 1. 판례 검색
 * GET /api/precedent/search?query=업무상과실&court=400&page=1&display=20
 */
router.get('/search', async (req, res) => {
  try {
    const { query = '', court = '', page = 1, display = 20 } = req.query;
    
    const apiData = await lawApi.searchPrecedent({ 
      query, 
      page: parseInt(page), 
      display: parseInt(display),
      court 
    });
    
    const root = apiData?.PrecSearch;
    
    if (!root || !root.prec) {
      return res.json({ total: 0, items: [] });
    }
    
    // API 응답을 통일된 형식으로 변환
    const precArray = Array.isArray(root.prec) ? root.prec : [root.prec];
    const items = precArray.map(prec => ({
      id: prec.판례일련번호,
      caseNum: prec.사건번호,
      caseName: prec.사건명,
      court: prec.법원명,
      date: prec.선고일자,
      result: prec.판결유형,
      category: prec.판례분야,
      summary: prec.판시사항 || ''
    }));
    
    res.json({
      total: parseInt(root.totalCnt) || items.length,
      page: parseInt(page),
      display: parseInt(display),
      items
    });
    
  } catch (error) {
    console.error('[판례 검색 오류]', error.message);
    res.status(500).json({ 
      error: '판례 검색 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

/**
 * 2. 판례 상세 조회
 * GET /api/precedent/detail/:id
 */
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('[판례 상세 요청] ID:', id);
    
    const apiData = await lawApi.getPrecedentDetail(id);
    
    console.log('[판례 API 응답 구조]', JSON.stringify(apiData, null, 2).substring(0, 500));
    
    // API 응답 구조 확인 - 여러 가능한 경로 시도
    const root = apiData?.PrecService || apiData?.판례서비스 || apiData;
    
    if (!root) {
      console.error('[판례 상세] 응답 데이터가 비어있음');
      return res.status(404).json({ error: '판례를 찾을 수 없습니다.' });
    }
    
    // HTML 태그 제거 및 정리
    const cleanText = (text) => {
      if (!text) return '';
      return text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
    };
    
    // 응답 데이터 구성 - 여러 필드명 시도
    const response = {
      id,
      caseNum: root.사건번호 || root.caseNumber || '',
      caseName: root.사건명 || root.caseName || '',
      court: root.법원명 || root.courtName || '',
      courtType: root.법원종류코드 || root.courtType || '',
      date: root.선고일자 || root.judgmentDate || '',
      result: root.판결유형 || root.judgmentType || '',
      category: root.사건종류명 || root.caseType || '',
      summary: cleanText(root.판시사항 || root.summary || ''),
      gist: cleanText(root.판결요지 || root.gist || ''),
      refLaws: cleanText(root.참조조문 || root.referenceLaws || ''),
      refCases: cleanText(root.참조판례 || root.referenceCases || ''),
      fullText: cleanText(root.판례내용 || root.content || '')
    };
    
    console.log('[판례 상세 성공] 사건번호:', response.caseNum);
    res.json(response);
    
  } catch (error) {
    console.error('[판례 상세 조회 오류]', error.message);
    console.error('[에러 스택]', error.stack);
    res.status(500).json({ 
      error: '판례 상세 조회 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

module.exports = router;
