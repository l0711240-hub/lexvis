// public/js/api.js

/**
 * 공통 API 요청 함수
 * @param {string} url - 요청 URL
 * @param {object} options - fetch 옵션
 * @returns {Promise<object>} API 응답 데이터
 */
async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: response.statusText 
      }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('[API 오류]', url, error.message);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// 법령 API
// ════════════════════════════════════════════════════════════════

/**
 * 법령 검색
 * @param {string} query - 검색어
 * @param {object} options - 검색 옵션
 * @param {number} options.page - 페이지 번호 (기본값: 1)
 * @param {number} options.display - 결과 수 (기본값: 20)
 * @returns {Promise<object>} 검색 결과
 */
export async function searchLaw(query, { page = 1, display = 20 } = {}) {
  const params = new URLSearchParams({
    query: query,
    page: page.toString(),
    display: display.toString()
  });
  
  return apiFetch(`/api/law/search?${params}`);
}

/**
 * 법령 상세 조회
 * @param {string} mst - 법령 MST 코드
 * @returns {Promise<object>} 법령 상세 정보
 */
export async function getLawDetail(mst) {
  return apiFetch(`/api/law/detail/${encodeURIComponent(mst)}`);
}

/**
 * 법령 조문 조회 (법령명으로)
 * @param {string} lawName - "법령명 제N조" 형식
 * @returns {Promise<object|null>} 조문 정보
 */
export async function getLawArticleByName(lawName) {
  // "형법 제268조" 형식 파싱
  const matched = lawName.match(/^(.+?)\s+제(\d+)조/);
  if (!matched) {
    console.warn('법령명 형식이 올바르지 않습니다:', lawName);
    return null;
  }
  
  const [, name, articleNumber] = matched;
  
  try {
    // 1. 법령 검색으로 MST 획득
    const searchResult = await searchLaw(name, { display: 1 });
    if (!searchResult.items?.length) {
      console.warn('법령을 찾을 수 없습니다:', name);
      return null;
    }
    
    const mst = searchResult.items[0].mst;
    
    // 2. 특정 조문 조회 (서버 API 시도)
    try {
      const params = new URLSearchParams({
        mst: mst,
        jo: articleNumber
      });
      
      return await apiFetch(`/api/law/article?${params}`);
    } catch (error) {
      // 서버 API 실패시 null 반환 (클라이언트에서 처리)
      console.warn('서버 API 조문 조회 실패, 클라이언트 검색으로 전환:', error.message);
      return null;
    }
  } catch (error) {
    console.error('법령 조문 조회 실패:', error);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
// 판례 API
// ════════════════════════════════════════════════════════════════

/**
 * 판례 검색
 * @param {string} query - 검색어
 * @param {object} options - 검색 옵션
 * @param {number} options.page - 페이지 번호 (기본값: 1)
 * @param {number} options.display - 결과 수 (기본값: 20)
 * @param {string} options.court - 법원 코드 (옵션)
 * @returns {Promise<object>} 검색 결과
 */
export async function searchPrecedent(query, { page = 1, display = 20, court = '' } = {}) {
  const params = new URLSearchParams({
    query: query,
    page: page.toString(),
    display: display.toString()
  });
  
  if (court) {
    params.append('court', court);
  }
  
  return apiFetch(`/api/precedent/search?${params}`);
}

/**
 * 판례 상세 조회
 * @param {string} id - 판례 ID
 * @returns {Promise<object>} 판례 상세 정보
 */
export async function getPrecedentDetail(id) {
  return apiFetch(`/api/precedent/detail/${encodeURIComponent(id)}`);
}

// ════════════════════════════════════════════════════════════════
// 용어 사전 API
// ════════════════════════════════════════════════════════════════

/**
 * 용어 목록 조회
 * @returns {Promise<object>} 용어 사전 데이터
 */
export async function getTerms() {
  return apiFetch('/api/term');
}

/**
 * 용어 추가
 * @param {object} termData - 용어 데이터
 * @param {string} termData.word - 용어
 * @param {string} termData.hanja - 한자/영문 (옵션)
 * @param {string} termData.def - 정의
 * @param {string} termData.law - 관련 법령 (옵션)
 * @returns {Promise<object>} 추가된 용어 정보
 */
export async function addTerm(termData) {
  return apiFetch('/api/term', {
    method: 'POST',
    body: JSON.stringify(termData)
  });
}

/**
 * 용어 삭제
 * @param {string} word - 삭제할 용어
 * @returns {Promise<object>} 삭제 결과
 */
export async function deleteTerm(word) {
  return apiFetch(`/api/term/${encodeURIComponent(word)}`, {
    method: 'DELETE'
  });
}
