// server/lawApi.js
// 국가법령정보 Open API 공통 호출 모듈
'use strict';

const axios     = require('axios');
const xml2js    = require('xml2js');
const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL:      parseInt(process.env.CACHE_TTL) || 3600,
  checkperiod: 120,
  useClones:   false
});

const BASE_URL = 'https://www.law.go.kr/DRF';
const OC = () => process.env.LAW_API_OC;

const xmlParser = new xml2js.Parser({
  explicitArray: false,
  trim:          true,
  normalize:     true,
  normalizeTags: false,
  mergeAttrs:    true
});

async function parseXml(xmlStr) {
  return xmlParser.parseStringPromise(xmlStr);
}

async function apiGet(endpoint, params, fmt = 'XML') {
  const cacheKey = `${endpoint}:${fmt}:${JSON.stringify(params)}`;
  const cached   = cache.get(cacheKey);
  if (cached) return cached;

  const url       = `${BASE_URL}/${endpoint}`;
  const reqParams = { ...params, OC: OC(), type: fmt };

  console.log(`[API] ${endpoint} (${fmt})`, params);

  try {
    const res = await axios.get(url, {
      params:  reqParams,
      timeout: 20000,
      headers: { 'User-Agent': 'LexVis/4.0' }
    });

    let result;
    if (fmt === 'JSON') {
      result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    } else {
      result = await parseXml(res.data);
    }

    cache.set(cacheKey, result);
    return result;

  } catch (err) {
    if (err.response)  throw new Error(`API 오류 ${err.response.status}`);
    if (err.request)   throw new Error('국가법령정보 API에 연결할 수 없습니다.');
    throw err;
  }
}

/** 법령 목록 검색 */
async function searchLaw({ query='', page=1, display=20, sort='lasc', lawType='', org='' } = {}) {
  const p = { target: 'law', query, page, display: Math.min(display,100), sort };
  if (lawType) p.lawType = lawType;
  if (org)     p.org     = org;
  return apiGet('lawSearch.do', p, 'XML');
}

/** 법령 전문 조회 */
async function getLawDetail(mst) {
  return apiGet('lawService.do', { target: 'law', MST: mst }, 'XML');
}

/** 특정 조문 조회 */
async function getLawArticle(mst, jo) {
  return apiGet('lawService.do', { target: 'law', MST: mst, JO: jo }, 'XML');
}

/** 판례 목록 검색 */
async function searchPrecedent({
  query='', page=1, display=20, search=1,
  courtOrg='', courtNm='', refLaw='',
  prncYd='', caseNum='', sort='ddes'
} = {}) {
  const p = { target:'prec', query, page, display: Math.min(display,100), search, sort };
  if (courtOrg) p.org     = courtOrg;
  if (courtNm)  p.curt    = courtNm;
  if (refLaw)   p.JO      = refLaw;
  if (prncYd)   p.prncYd  = prncYd;
  if (caseNum)  p.nb      = caseNum;
  return apiGet('lawSearch.do', p, 'JSON');
}

/** 판례 상세 조회 */
async function getPrecedentDetail(id) {
  return apiGet('lawService.do', { target: 'prec', ID: id }, 'XML');
}

function getCacheStats() { return cache.getStats(); }
function clearCache()    { cache.flushAll(); }

module.exports = {
  searchLaw, getLawDetail, getLawArticle,
  searchPrecedent, getPrecedentDetail,
  getCacheStats, clearCache
};
