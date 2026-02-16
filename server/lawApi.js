// server/lawApi.js
// 국가법령정보 Open API 공통 호출 모듈
// API 문서: https://open.law.go.kr/LSO/openApi/openApiInfo.do

const axios = require('axios');
const xml2js = require('xml2js');
const NodeCache = require('node-cache');

// 캐시 설정 (기본 1시간, 환경변수로 조정 가능)
const cache = new NodeCache({ 
  stdTTL: parseInt(process.env.CACHE_TTL) || 3600,
  checkperiod: 120,
  useClones: false
});

const BASE_URL = 'https://www.law.go.kr/DRF';
const OC = () => process.env.LAW_API_OC;

// XML → JSON 파서 설정
const xmlParser = new xml2js.Parser({
  explicitArray: false,
  trim: true,
  normalize: true,
  normalizeTags: false,
  mergeAttrs: false
});

/**
 * XML 문자열을 JSON으로 변환
 */
async function parseXml(xmlStr) {
  try {
    return await xmlParser.parseStringPromise(xmlStr);
  } catch (error) {
    console.error('[XML 파싱 오류]', error.message);
    throw new Error('API 응답 파싱 실패');
  }
}

/**
 * 공통 API GET 요청 (캐싱 포함)
 */
async function apiGet(endpoint, params) {
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
  
  // 캐시 확인
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[캐시 히트] ${endpoint}`);
    return cached;
  }
  
  // API 요청
  const url = `${BASE_URL}/${endpoint}`;
  const requestParams = {
    ...params,
    OC: OC(),
    type: 'XML'
  };
  
  console.log(`[API 요청] ${endpoint}`, params);
  
  try {
    const response = await axios.get(url, {
      params: requestParams,
      timeout: 15000,
      headers: {
        'User-Agent': 'LexVis/2.0'
      }
    });
    
    // XML 파싱
    const json = await parseXml(response.data);
    
    // 캐시 저장
    cache.set(cacheKey, json);
    
    console.log(`[API 성공] ${endpoint}`);
    return json;
    
  } catch (error) {
    if (error.response) {
      console.error(`[API 오류] ${endpoint}`, error.response.status, error.response.statusText);
      throw new Error(`API 서버 오류: ${error.response.status}`);
    } else if (error.request) {
      console.error(`[네트워크 오류] ${endpoint}`, error.message);
      throw new Error('국가법령정보 API 서버에 연결할 수 없습니다.');
    } else {
      console.error(`[요청 오류] ${endpoint}`, error.message);
      throw error;
    }
  }
}

/**
 * 법령 검색
 * @param {Object} options
 * @param {string} options.query - 검색어
 * @param {number} options.page - 페이지 번호 (1~)
 * @param {number} options.display - 결과 개수 (1~100)
 * @param {string} options.sort - 정렬 (lasc=법령명순, ldes=최신순)
 */
async function searchLaw({ query, page = 1, display = 20, sort = 'lasc' }) {
  return await apiGet('lawSearch.do', {
    target: 'law',
    query: query || '',
    page,
    display: Math.min(display, 100),
    sort
  });
}

/**
 * 법령 상세 조회
 * @param {string} mst - 법령 MST 코드
 */
async function getLawDetail(mst) {
  return await apiGet('lawService.do', {
    target: 'law',
    MST: mst
  });
}

/**
 * 법령 특정 조문 조회
 * @param {string} mst - 법령 MST 코드
 * @param {string} articleNum - 조문 번호
 */
async function getLawArticle(mst, articleNum) {
  return await apiGet('lawService.do', {
    target: 'lawChrCls',
    MST: mst,
    JO: articleNum
  });
}

/**
 * 판례 검색
 * @param {Object} options
 * @param {string} options.query - 검색어
 * @param {number} options.page - 페이지 번호
 * @param {number} options.display - 결과 개수
 * @param {string} options.court - 법원 코드 (400=대법원, 500=헌재 등)
 */
async function searchPrecedent({ query, page = 1, display = 20, court = '' }) {
  const params = {
    target: 'prec',
    query: query || '',
    page,
    display: Math.min(display, 100)
  };
  
  if (court) {
    params.org = court;
  }
  
  return await apiGet('lawSearch.do', params);
}

/**
 * 판례 상세 조회
 * @param {string} serialNum - 판례 일련번호
 */
async function getPrecedentDetail(serialNum) {
  return await apiGet('lawService.do', {
    target: 'prec',
    ID: serialNum
  });
}

/**
 * 캐시 통계 조회
 */
function getCacheStats() {
  return cache.getStats();
}

/**
 * 캐시 초기화
 */
function clearCache() {
  cache.flushAll();
  console.log('[캐시 초기화 완료]');
}

module.exports = {
  searchLaw,
  getLawDetail,
  getLawArticle,
  searchPrecedent,
  getPrecedentDetail,
  getCacheStats,
  clearCache
};
