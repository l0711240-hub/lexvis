// server/lawApi.js
// 국가법령정보 Open API 공통 호출 모듈
// API 문서: https://open.law.go.kr/LSO/openApi/openApiInfo.do

const axios  = require('axios');
const xml2js = require('xml2js');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL) || 3600 });

const BASE_URL = 'https://www.law.go.kr/DRF';
const OC       = () => process.env.LAW_API_OC;

// XML → JSON 파싱
async function parseXml(xmlStr) {
  return xml2js.parseStringPromise(xmlStr, { explicitArray: false, trim: true });
}

// 공통 GET 요청 (캐시 포함)
async function apiGet(endpoint, params) {
  const cacheKey = endpoint + JSON.stringify(params);
  const cached   = cache.get(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/${endpoint}`;
  const res = await axios.get(url, {
    params: { ...params, OC: OC(), type: 'XML' },
    timeout: 10000,
  });

  const json = await parseXml(res.data);
  cache.set(cacheKey, json);
  return json;
}

// ──────────────────────────────────────
// 법령 검색
// query: 검색어 | page: 페이지(1~) | display: 개수(1~100)
// ──────────────────────────────────────
async function searchLaw({ query, page = 1, display = 20, sort = 'lasc' }) {
  const data = await apiGet('lawSearch.do', {
    target: 'law',
    query,
    page,
    display,
    sort,        // lasc=법령명순, ldes=최신순
  });
  return data;
}

// ──────────────────────────────────────
// 법령 본문 조회 (MST 번호로)
// ──────────────────────────────────────
async function getLawDetail(mst) {
  const data = await apiGet('lawService.do', {
    target: 'law',
    MST: mst,
  });
  return data;
}

// ──────────────────────────────────────
// 판례 검색
// query: 검색어 | page | display
// court: 법원 (1=대법원, 2=헌법재판소, 3=고등법원 등)
// ──────────────────────────────────────
async function searchPrecedent({ query, page = 1, display = 20, court = '' }) {
  const params = { target: 'prec', query, page, display };
  if (court) params.org = court;
  const data = await apiGet('lawSearch.do', params);
  return data;
}

// ──────────────────────────────────────
// 판례 본문 조회 (판례 일련번호로)
// ──────────────────────────────────────
async function getPrecedentDetail(serialNum) {
  const data = await apiGet('lawService.do', {
    target: 'prec',
    ID: serialNum,
  });
  return data;
}

// ──────────────────────────────────────
// 법령 조문 조회 (법령 내 특정 조 조회)
// ──────────────────────────────────────
async function getLawArticle(mst, articleNum) {
  const data = await apiGet('lawService.do', {
    target: 'lawChrCls',
    MST: mst,
    JO: articleNum,
  });
  return data;
}

module.exports = {
  searchLaw,
  getLawDetail,
  searchPrecedent,
  getPrecedentDetail,
  getLawArticle,
};
