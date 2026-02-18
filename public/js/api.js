// public/js/api.js (ES Module)
'use strict';

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── 법령 ─────────────────────────────────────────────────────────
export const searchLaw = (query, { page=1, display=20, sort='lasc', lawType='', org='' } = {}) => {
  const p = new URLSearchParams({ query, page, display, sort });
  if (lawType) p.append('lawType', lawType);
  if (org)     p.append('org', org);
  return apiFetch(`/api/law/search?${p}`);
};

export const getLawDetail  = (mst)      => apiFetch(`/api/law/detail/${encodeURIComponent(mst)}`);
export const getLawArticle = (mst, jo)  => apiFetch(`/api/law/article?${new URLSearchParams({mst,jo})}`);

/**
 * "형법 제30조" / "특정범죄 가중처벌 등에 관한 법률 제5조의9" → 조문 데이터
 * [FIX] 긴 법령명과 "의N" 가지번호 지원
 */
export async function getLawArticleByName(ref) {
  // 패턴: 법령명 + 제N조 + (의M)?
  const m = ref.match(/^(.+?)\s*제(\d+)조(?:의(\d+))?/);
  if (!m) return null;
  const lawName = m[1].trim();
  const joNum   = m[2];
  const branch  = m[3] || '';
  try {
    const sr  = await searchLaw(lawName, { display: 5 });
    // 정확히 매칭되는 법령 우선, 없으면 포함 매칭
    let item = sr.items?.find(i => i.name === lawName);
    if (!item) item = sr.items?.find(i => i.name.includes(lawName));
    if (!item) item = sr.items?.[0];
    const mst = item?.mst;
    if (!mst) return null;

    // 조문번호+가지번호로 JO 파라미터 구성
    const joParam = branch ? `${joNum}` : joNum;
    const art = await getLawArticle(mst, joParam);
    if (art) {
      art.mst = mst;
      art.lawName = item.name;
    }
    return art;
  } catch { return null; }
}

// ── 판례 ─────────────────────────────────────────────────────────
export const searchPrecedent = (query, {
  page=1, display=20, search=1,
  courtOrg='', courtNm='', refLaw='',
  prncYd='', caseNum='', sort='ddes'
} = {}) => {
  const p = new URLSearchParams({ query, page, display, search, sort });
  if (courtOrg) p.append('courtOrg', courtOrg);
  if (courtNm)  p.append('courtNm',  courtNm);
  if (refLaw)   p.append('refLaw',   refLaw);
  if (prncYd)   p.append('prncYd',   prncYd);
  if (caseNum)  p.append('caseNum',  caseNum);
  return apiFetch(`/api/precedent/search?${p}`);
};

export const getPrecedentDetail = (id) => apiFetch(`/api/precedent/detail/${encodeURIComponent(id)}`);

// ── 용어 사전 ────────────────────────────────────────────────────
export const getTerms   = ()       => apiFetch('/api/term');
export const addTerm    = (d)      => apiFetch('/api/term', { method:'POST', body: JSON.stringify(d) });
export const deleteTerm = (word)   => apiFetch(`/api/term/${encodeURIComponent(word)}`, { method:'DELETE' });
