// public/js/api.js
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (e) {
    console.error('[API 오류]', url, e.message);
    throw e;
  }
}

export async function searchLaw(query, { page=1, display=20 }={}) {
  return apiFetch(`/api/law/search?query=${encodeURIComponent(query)}&page=${page}&display=${display}`);
}
export async function getLawDetail(mst) {
  return apiFetch(`/api/law/detail/${encodeURIComponent(mst)}`);
}
export async function getLawArticleByName(lawName) {
  // "형법 제268조" → mst=형법&jo=268 으로 서버에 요청
  const matched = lawName.match(/^(.+?)\s+제(\d+)조/);
  if (!matched) return null;
  const [, name, jo] = matched;
  // 먼저 법령 검색으로 mst 획득
  const srch = await searchLaw(name, { display: 1 });
  if (!srch.items?.length) return null;
  const mst = srch.items[0].mst;
  return apiFetch(`/api/law/article?mst=${encodeURIComponent(mst)}&jo=${jo}`);
}

export async function searchPrecedent(query, { page=1, display=20, court='' }={}) {
  return apiFetch(`/api/precedent/search?query=${encodeURIComponent(query)}&page=${page}&display=${display}&court=${court}`);
}
export async function getPrecedentDetail(id) {
  return apiFetch(`/api/precedent/detail/${encodeURIComponent(id)}`);
}

export async function getTerms()       { return apiFetch('/api/term'); }
export async function addTerm(data)    { return apiFetch('/api/term', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }); }
export async function deleteTerm(word) { return apiFetch(`/api/term/${encodeURIComponent(word)}`, { method:'DELETE' }); }
