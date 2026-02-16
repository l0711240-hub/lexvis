// public/js/app.js
import * as API from './api.js';

// ════════════════════════════════════════════════════════════════
// 전역 상태 관리
// ════════════════════════════════════════════════════════════════
const state = {
  termDB: {},
  homeType: 'all',
  inlineSearch: {
    matches: [],
    currentIndex: 0,
    lastQuery: ''
  },
  currentDetail: {
    type: null,
    id: null
  },
  viewSettings: {
    terms: true,
    highlights: true
  }
};

// ════════════════════════════════════════════════════════════════
// 초기화
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  initializeTheme();
  await loadTermDatabase();
  displayInitialSamples();
});

function initializeTheme() {
  const savedTheme = localStorage.getItem('lexvis-theme') || 'dark';
  setMode(savedTheme);
}

async function loadTermDatabase() {
  try {
    const data = await API.getTerms();
    if (data) {
      state.termDB = data;
      console.log(`✔ 용어 데이터 로드 완료: ${Object.keys(state.termDB).length}개`);
    }
  } catch (error) {
    console.error('✘ 용어 로드 실패:', error);
    state.termDB = {};
  }
}

// 초기 샘플 데이터 표시
async function displayInitialSamples() {
  const resultsBox = document.getElementById('homeResults');
  if (!resultsBox) return;
  
  try {
    // API에서 최신 데이터 가져오기 (빈 쿼리로 최신 데이터 요청)
    const [casesResult, lawsResult] = await Promise.allSettled([
      API.searchPrecedent('형사', { display: 4 }), // 형사 판례 샘플
      API.searchLaw('법', { display: 3 })  // 기본 법령 샘플
    ]);
    
    let html = '<div style="text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:12px;">최근 데이터</div>';
    
    if (casesResult.status === 'fulfilled' && casesResult.value?.items?.length) {
      casesResult.value.items.slice(0, 3).forEach(caseItem => {
        html += caseCard(caseItem, `window.goDetail('case','${caseItem.id}')`);
      });
    }
    
    if (lawsResult.status === 'fulfilled' && lawsResult.value?.items?.length) {
      lawsResult.value.items.slice(0, 2).forEach(lawItem => {
        html += lawCard(lawItem, `window.goDetail('law','${lawItem.mst}')`);
      });
    }
    
    if (html.length > 100) {
      resultsBox.innerHTML = html;
    }
  } catch (error) {
    console.log('초기 샘플 로드 실패:', error);
    // 실패해도 에러 표시하지 않음 (빈 화면 유지)
  }
}

// ════════════════════════════════════════════════════════════════
// 테마 관리
// ════════════════════════════════════════════════════════════════
window.toggleTheme = () => {
  const currentMode = document.body.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const newMode = currentMode === 'dark' ? 'light' : 'dark';
  setMode(newMode);
};

window.setMode = (mode) => {
  const body = document.body;
  const darkBtn = document.getElementById('bDark');
  const lightBtn = document.getElementById('bLight');
  
  if (mode === 'light') {
    body.setAttribute('data-theme', 'light');
    lightBtn?.classList.add('active');
    darkBtn?.classList.remove('active');
  } else {
    body.removeAttribute('data-theme');
    darkBtn?.classList.add('active');
    lightBtn?.classList.remove('active');
  }
  
  localStorage.setItem('lexvis-theme', mode);
};

// ════════════════════════════════════════════════════════════════
// 페이지 네비게이션
// ════════════════════════════════════════════════════════════════
function showPage(pageId) {
  const pages = ['home', 'subpage', 'detail'];
  pages.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle('active', id === pageId);
      element.style.display = id === pageId 
        ? (id === 'detail' ? 'flex' : 'block') 
        : 'none';
    }
  });
}

window.goHome = () => showPage('home');

window.goSub = (tab) => {
  showPage('subpage');
  updateSubNavigation(tab);
  renderSubContent(tab);
};

function updateSubNavigation(activeTab) {
  ['cases', 'laws', 'guide'].forEach(tab => {
    const navItem = document.getElementById(`sn-${tab}`);
    navItem?.classList.toggle('active', tab === activeTab);
  });
}

// ════════════════════════════════════════════════════════════════
// 서브 페이지 렌더링
// ════════════════════════════════════════════════════════════════
function renderSubContent(tab) {
  const container = document.getElementById('subContent');
  if (!container) return;
  
  const contentRenderers = {
    cases: renderCasesContent,
    laws: renderLawsContent,
    guide: renderGuideContent
  };
  
  const renderer = contentRenderers[tab];
  if (renderer) {
    container.innerHTML = renderer();
  }
}

function renderCasesContent() {
  return `
    <div class="sub-header"><h2>판례 검색</h2></div>
    <div class="sub-body">
      <div class="full-sb">
        <input id="cSrch" placeholder="판례번호, 키워드, 당사자명..." 
               onkeydown="if(event.key==='Enter')window.doCaseSearch()">
        <select class="fsel" id="cCourt">
          <option value="">법원 전체</option>
          <option value="400">대법원</option>
          <option value="500">헌법재판소</option>
          <option value="300">고등법원</option>
          <option value="200">지방법원</option>
        </select>
        <button class="go-btn" onclick="window.doCaseSearch()">검색</button>
      </div>
      <div id="cRes"><div class="hint-text">검색어를 입력하세요</div></div>
    </div>
  `;
}

function renderLawsContent() {
  const categories = ['형법', '민법', '헌법', '형사소송법', '상법', '근로기준법', '의료법', '저작권법'];
  
  return `
    <div class="sub-header"><h2>법령 데이터베이스</h2></div>
    <div class="sub-body">
      <div class="full-sb">
        <input id="lSrch" placeholder="법령명, 조문, 키워드..." 
               onkeydown="if(event.key==='Enter')window.doLawSearch()">
        <button class="go-btn" onclick="window.doLawSearch()">검색</button>
      </div>
      <div class="law-cat-grid">
        ${categories.map(name => 
          `<div class="lcat" onclick="window.doLawSearchByKw('${name}')">${name}</div>`
        ).join('')}
      </div>
      <div id="lRes"><div class="hint-text">법령을 검색하거나 분야를 선택하세요</div></div>
    </div>
  `;
}

function renderGuideContent() {
  return `
    <div class="sub-header"><h2>사용 가이드</h2></div>
    <div class="sub-body">
      <div class="guide-grid">
        <div class="gcard">
          <h3>판례 열람</h3>
          <div class="gstep"><div class="snum">1</div><p>판례번호 또는 키워드로 검색합니다.</p></div>
          <div class="gstep"><div class="snum">2</div><p>결과 클릭 → 상세 뷰어로 이동합니다.</p></div>
          <div class="gstep"><div class="snum">3</div><p>밑줄 용어 클릭 → 우측 패널 해설 확인.</p></div>
          <div class="gstep"><div class="snum">4</div><p>'연계 판례' 탭에서 상·하급심 이동.</p></div>
        </div>
        <div class="gcard">
          <h3>법령 열람</h3>
          <div class="gstep"><div class="snum">1</div><p>법령 DB에서 카테고리 또는 법령명 검색.</p></div>
          <div class="gstep"><div class="snum">2</div><p>판례 본문의 파란색 법령명 클릭 → 팝업 조문 확인.</p></div>
          <div class="gstep"><div class="snum">3</div><p>팝업의 '이동' 버튼 → 법령 전문 뷰어.</p></div>
        </div>
        <div class="gcard">
          <h3>용어 사전 편집</h3>
          <p>판례 뷰어 우측 '용어 해설' 탭 → ⊞ 버튼으로 용어 추가·삭제 가능. 서버에 저장됩니다.</p>
          <p style="margin-top:8px;">코드로 직접 추가: <code>data/terms.json</code> 파일 편집.</p>
        </div>
        <div class="gcard">
          <h3>API 연동 구조</h3>
          <p><code>server/lawApi.js</code> → 국가법령정보 API 호출 프록시<br>
          <code>server/routes/law.js</code> → 법령 엔드포인트<br>
          <code>server/routes/precedent.js</code> → 판례 엔드포인트<br>
          <code>.env</code> → OC 키 설정 파일</p>
        </div>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
// 스크롤 네비게이션
// ════════════════════════════════════════════════════════════════
window.scrollToSectionId = function(id, element) {
  const target = document.getElementById(id);
  if (!target) {
    console.error(`스크롤 실패: ID '${id}'를 찾을 수 없습니다.`);
    return;
  }
  
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateTocHighlight(element);
};

window.scrollToLawArt = function(id, element) {
  const target = document.getElementById(id);
  if (!target) {
    console.error(`스크롤 실패: ID '${id}'를 찾을 수 없습니다.`);
    return;
  }
  
  const offset = 100;
  const elementPosition = target.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;
  
  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
  
  updateTocHighlight(element);
};

function updateTocHighlight(activeElement) {
  document.querySelectorAll('.toc').forEach(toc => toc.classList.remove('active'));
  activeElement?.classList.add('active');
}

// ════════════════════════════════════════════════════════════════
// 홈 페이지 검색
// ════════════════════════════════════════════════════════════════
window.hTab = (type) => {
  state.homeType = type;
  ['all', 'case', 'law'].forEach(tab => {
    document.getElementById(`ht-${tab}`)?.classList.toggle('active', tab === type);
  });
};

window.setSearch = (query) => {
  document.getElementById('hSrch').value = query;
  doHomeSearch();
};

window.doHomeSearch = async () => {
  const query = document.getElementById('hSrch').value.trim();
  const resultsBox = document.getElementById('homeResults');
  
  if (!query) {
    resultsBox.innerHTML = '<div class="hint-text">검색어를 입력하세요</div>';
    return;
  }
  
  resultsBox.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  
  try {
    const searchPromises = [];
    
    if (state.homeType !== 'law') {
      searchPromises.push(API.searchPrecedent(query));
    }
    if (state.homeType !== 'case') {
      searchPromises.push(API.searchLaw(query));
    }
    
    const results = await Promise.allSettled(searchPromises);
    
    let html = '';
    const casesResult = state.homeType !== 'law' ? results[0] : null;
    const lawsResult = state.homeType === 'all' ? results[1] : (state.homeType === 'law' ? results[0] : null);
    
    if (casesResult?.status === 'fulfilled') {
      (casesResult.value?.items || []).slice(0, 4).forEach(caseItem => {
        html += caseCard(caseItem, `window.goDetail('case','${caseItem.id}')`);
      });
    }
    
    if (lawsResult?.status === 'fulfilled') {
      (lawsResult.value?.items || []).slice(0, 3).forEach(lawItem => {
        html += lawCard(lawItem, `window.goDetail('law','${lawItem.mst}')`);
      });
    }
    
    resultsBox.innerHTML = html || '<div class="hint-text">검색 결과가 없습니다.</div>';
  } catch (error) {
    resultsBox.innerHTML = `<div class="hint-text error">오류: ${error.message}</div>`;
  }
};

// ════════════════════════════════════════════════════════════════
// 판례 검색 (서브 페이지)
// ════════════════════════════════════════════════════════════════
window.doCaseSearch = async () => {
  const query = document.getElementById('cSrch')?.value.trim();
  const court = document.getElementById('cCourt')?.value || '';
  const resultsBox = document.getElementById('cRes');
  
  if (!query) {
    // 검색어가 없으면 샘플 표시
    displayCaseSamples();
    return;
  }
  
  resultsBox.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  
  try {
    const data = await API.searchPrecedent(query, { court, display: 30 });
    const html = (data.items || []).map(caseItem => caseCardBig(caseItem)).join('');
    resultsBox.innerHTML = html || '<div class="hint-text">검색 결과가 없습니다.</div>';
  } catch (error) {
    resultsBox.innerHTML = `<div class="hint-text error">오류: ${error.message}</div>`;
  }
};

// 판례 샘플 데이터 표시
async function displayCaseSamples() {
  const box = document.getElementById('cRes');
  if (!box) return;
  
  try {
    // 형사 판례를 기본 샘플로 표시
    const data = await API.searchPrecedent('형사', { display: 10 });
    const items = data.items || [];
    
    let html = '<div style="text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:12px;">최근 판례</div>';
    html += items.slice(0, 8).map(caseItem => caseCardBig(caseItem)).join('');
    
    box.innerHTML = html || '<div class="hint-text">검색어를 입력하세요</div>';
  } catch (error) {
    box.innerHTML = '<div class="hint-text">검색어를 입력하세요</div>';
  }
}

// ════════════════════════════════════════════════════════════════
// 법령 검색 (서브 페이지)
// ════════════════════════════════════════════════════════════════
window.doLawSearch = async () => {
  const query = document.getElementById('lSrch')?.value.trim();
  await performLawSearch(query);
};

window.doLawSearchByKw = async (keyword) => {
  const input = document.getElementById('lSrch');
  if (input) input.value = keyword;
  await performLawSearch(keyword, true); // 정확한 매칭 플래그 추가
};

async function performLawSearch(query, exactMatch = false) {
  const resultsBox = document.getElementById('lRes');
  
  if (!query) {
    // 검색어가 없으면 샘플 표시
    displayLawSamples();
    return;
  }
  
  resultsBox.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  
  try {
    const data = await API.searchLaw(query, { display: 50 });
    let items = data.items || [];
    
    // 정확한 매칭이 요구되면 법령명이 정확히 일치하는 것만 필터링
    if (exactMatch && items.length > 0) {
      items = items.filter(item => 
        item.name === query || item.name.includes(query)
      );
      
      // 정확히 일치하는 것을 우선 표시
      items.sort((a, b) => {
        if (a.name === query) return -1;
        if (b.name === query) return 1;
        return 0;
      });
    }
    
    const html = items.map(lawItem => lawCardBig(lawItem)).join('');
    resultsBox.innerHTML = html || '<div class="hint-text">검색 결과가 없습니다.</div>';
  } catch (error) {
    resultsBox.innerHTML = `<div class="hint-text error">오류: ${error.message}</div>`;
  }
}

// 법령 샘플 데이터 표시
async function displayLawSamples() {
  const resultsBox = document.getElementById('lRes');
  if (!resultsBox) return;
  
  try {
    // 주요 법령 키워드로 샘플 표시
    const data = await API.searchLaw('법', { display: 10 });
    const items = data.items || [];
    
    let html = '<div style="text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:12px;">주요 법령</div>';
    html += items.slice(0, 8).map(lawItem => lawCardBig(lawItem)).join('');
    
    resultsBox.innerHTML = html || '<div class="hint-text">법령을 검색하거나 분야를 선택하세요</div>';
  } catch (error) {
    resultsBox.innerHTML = '<div class="hint-text">법령을 검색하거나 분야를 선택하세요</div>';
  }
}

// ════════════════════════════════════════════════════════════════
// 상세 페이지 표시
// ════════════════════════════════════════════════════════════════
window.goDetail = async (type, id) => {
  state.currentDetail.type = type;
  state.currentDetail.id = id;
  
  showPage('detail');
  
  const bodyElement = document.getElementById('caseBody');
  bodyElement.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  
  try {
    const data = type === 'case' 
      ? await API.getPrecedentDetail(id)
      : await API.getLawDetail(id);
    
    if (!data) throw new Error('데이터를 불러올 수 없습니다');
    
    renderDetailView(type, data);
  } catch (error) {
    bodyElement.innerHTML = `<div class="hint-text error">오류: ${error.message}</div>`;
  }
};

function renderDetailView(type, data) {
  updateDetailHeader(type, data);
  renderLeftPanel(type, data);
  renderCenterPanel(type, data);
  
  if (type === 'case') {
    loadRelatedCases(data);
    extractAndDisplayTerms(data.fullText || '');
  }
}

function updateDetailHeader(type, data) {
  const numElement = document.getElementById('dNum');
  const chip1 = document.getElementById('dChip1');
  const chip2 = document.getElementById('dChip2');
  
  if (type === 'case') {
    numElement.textContent = data.caseNum || '판례';
    chip1.textContent = data.court || '';
    chip2.textContent = data.date || '';
  } else {
    numElement.textContent = data.name || '법령';
    chip1.textContent = data.category || '';
    chip2.textContent = data.date || '';
  }
}

// ════════════════════════════════════════════════════════════════
// 좌측 패널 렌더링
// ════════════════════════════════════════════════════════════════
function renderLeftPanel(type, data) {
  const panelElement = document.getElementById('panelLeft');
  if (!panelElement) return;
  
  if (type === 'case') {
    panelElement.innerHTML = renderCaseToc(data);
  } else {
    panelElement.innerHTML = renderLawToc(data);
  }
}

function renderCaseToc(data) {
  const config = getCaseTypeConfig(data.caseNum || '');
  
  let html = `
    <div class="pst">정보</div>
    <div class="case-type-badge ${config.class}">${config.name}</div>
    <div class="toc-info"><span class="ml">사건</span>${data.caseNum || ''}</div>
    <div class="toc-info"><span class="ml">법원</span>${data.court || ''}</div>
    <div class="toc-info"><span class="ml">선고일</span>${data.date || ''}</div>
    <div class="tdivider"></div>
    <div class="pst">관계인</div>
  `;
  
  config.labels.forEach(label => {
    html += `<div class="toc-info"><span class="ml">${label}</span>정보 확인 중</div>`;
  });
  
  html += `
    <div class="tdivider"></div>
    <div class="pst">섹션</div>
    <div class="toc active" onclick="scrollToSectionId('case-top', this)">판례 개요</div>
  `;
  
  if (data.summary) html += `<div class="toc" onclick="scrollToSectionId('section-summary', this)">판시사항</div>`;
  if (data.gist) html += `<div class="toc" onclick="scrollToSectionId('section-gist', this)">판결요지</div>`;
  if (data.refLaws) html += `<div class="toc" onclick="scrollToSectionId('section-ref-laws', this)">참조조문</div>`;
  if (data.refCases) html += `<div class="toc" onclick="scrollToSectionId('section-ref-cases', this)">참조판례</div>`;
  
  if (data.fullText) {
    const sections = data.fullText.match(/【(.*?)】/g);
    if (sections) {
      sections.forEach((title, idx) => {
        const cleanTitle = title.replace(/[【】]/g, '');
        html += `<div class="toc toc-case-section" onclick="scrollToSectionId('section-${idx}', this)">${cleanTitle}</div>`;
      });
    }
  }
  
  return html;
}

function renderLawToc(data) {
  let html = '<div class="pst">법령 목차</div>';
  html += buildLawTocTree(data.contents || []);
  return html;
}

function buildLawTocTree(nodes) {
  if (!Array.isArray(nodes)) return '';
  
  return nodes.map(node => {
    if (['part', 'chapter', 'section', 'sub-section'].includes(node.type)) {
      const childrenHtml = node.children ? buildLawTocTree(node.children) : '';
      return `
        <div class="toc toc-${node.type}" style="font-weight:bold; color:#34495e; margin-top:10px;">
          ${node.title}
        </div>
        ${childrenHtml}
      `;
    } else if (node.type === 'article') {
      const articleId = `art-${node.num}`;
      return `
        <div class="toc toc-art" onclick="scrollToLawArt('${articleId}', this)" 
             style="padding-left:20px; font-size:0.9em;">
          제${node.num}조 ${node.title || ''}
        </div>
      `;
    }
    return '';
  }).join('');
}

// ════════════════════════════════════════════════════════════════
// 중앙 패널 렌더링
// ════════════════════════════════════════════════════════════════
function renderCenterPanel(type, data) {
  const bodyElement = document.getElementById('caseBody');
  if (!bodyElement) return;
  
  if (type === 'case') {
    bodyElement.innerHTML = renderCaseBody(data);
  } else {
    bodyElement.innerHTML = renderLawBody(data);
  }
  
  attachTermClickHandlers();
}

function renderCaseBody(data) {
  let html = '<div id="case-top"></div>';
  
  // 판례 제목 및 메타 정보
  html += `
    <div class="case-hd">
      <div class="case-court-badge">${data.court || ''}</div>
      <h1 class="case-title">${data.caseNum || ''}</h1>
      <div class="case-meta">
        <span class="mi"><span class="ml">선고일</span>${data.date || ''}</span>
      </div>
    </div>
  `;
  
  if (data.summary) {
    html += `
      <div class="ls" id="section-summary">
        <div class="lt">판시사항</div>
        <div class="lbody">${formatText(data.summary)}</div>
      </div>
    `;
  }
  
  if (data.gist) {
    html += `
      <div class="ls" id="section-gist">
        <div class="lt">판결요지</div>
        <div class="lbody">${formatText(data.gist)}</div>
      </div>
    `;
  }
  
  if (data.refLaws) {
    html += `
      <div class="ls" id="section-ref-laws">
        <div class="lt">참조조문</div>
        <div class="lbody">${highlightLawReferences(data.refLaws)}</div>
      </div>
    `;
  }
  
  if (data.refCases) {
    html += `
      <div class="ls" id="section-ref-cases">
        <div class="lt">참조판례</div>
        <div class="lbody">${formatText(data.refCases)}</div>
      </div>
    `;
  }
  
  if (data.fullText) {
    let sectionIndex = 0;
    const processedText = data.fullText.replace(/【(.*?)】/g, (match) => {
      return `<div id="section-${sectionIndex++}" class="case-section-target" style="font-weight:bold; margin-top:20px; color:var(--accent);">${match}</div>`;
    });
    
    html += `<div class="ls"><div class="lbody">${highlightTermsInText(processedText)}</div></div>`;
  }
  
  return html;
}

function renderLawBody(data) {
  let html = `
    <div class="case-hd">
      <h1 class="law-main-title">${data.name || ''}</h1>
      <div class="law-info-meta">
        ${data.category ? `<span>${data.category}</span> · ` : ''}
        ${data.date ? `<span>${data.date}</span>` : ''}
      </div>
    </div>
  `;
  
  html += renderLawStructure(data.contents || []);
  return html;
}

function renderLawStructure(nodes) {
  if (!Array.isArray(nodes)) return '';
  
  return nodes.map(node => {
    if (node.type === 'part') {
      const childrenHtml = node.children ? renderLawStructure(node.children) : '';
      return `
        <div class="law-hierarchy-header part">${node.title}</div>
        ${childrenHtml}
      `;
    } else if (node.type === 'chapter') {
      const childrenHtml = node.children ? renderLawStructure(node.children) : '';
      return `
        <div class="law-hierarchy-header chapter">${node.title}</div>
        ${childrenHtml}
      `;
    } else if (node.type === 'section' || node.type === 'sub-section') {
      const childrenHtml = node.children ? renderLawStructure(node.children) : '';
      return `
        <div class="law-hierarchy-header section">${node.title}</div>
        ${childrenHtml}
      `;
    } else if (node.type === 'article') {
      return renderArticle(node);
    }
    return '';
  }).join('');
}

function renderArticle(article) {
  const articleId = `art-${article.num}`;
  const paragraphsHtml = article.paragraphs ? renderParagraphs(article.paragraphs, articleId) : '';
  
  return `
    <div class="ls law-article" id="${articleId}">
      <div class="lt">
        <span class="ln">제${article.num}조</span>
        ${article.title || ''}
      </div>
      <div class="lbody">
        ${article.content ? `<div class="art-main-content">${article.content}</div>` : ''}
        ${paragraphsHtml}
      </div>
    </div>
  `;
}

function renderParagraphs(paragraphs, articleId) {
  if (!Array.isArray(paragraphs)) return '';
  
  return paragraphs.map((para, index) => {
    const paraId = `${articleId}-p${index}`;
    const itemsHtml = para.items ? renderItems(para.items) : '';
    
    return `
      <div class="law-paragraph" id="${paraId}">
        <span class="art-num-point">${para.num}</span>${para.content}
        ${itemsHtml}
      </div>
    `;
  }).join('');
}

function renderItems(items) {
  if (!Array.isArray(items)) return '';
  
  const itemsHtml = items.map(item => {
    const subItemsHtml = item.sub_items ? renderSubItems(item.sub_items) : '';
    return `
      <div class="law-item">
        <span class="art-num-point">${item.num}.</span>${item.content}
        ${subItemsHtml}
      </div>
    `;
  }).join('');
  
  return `<div style="margin-top:10px;">${itemsHtml}</div>`;
}

function renderSubItems(subItems) {
  if (!Array.isArray(subItems)) return '';
  
  const subItemsHtml = subItems.map(sub => 
    `<div class="law-sub-item"><span class="art-num-point">${sub.num}.</span>${sub.content}</div>`
  ).join('');
  
  return `<div style="margin-left:20px;margin-top:8px;">${subItemsHtml}</div>`;
}

// ════════════════════════════════════════════════════════════════
// 텍스트 포매팅 및 하이라이팅
// ════════════════════════════════════════════════════════════════
function formatText(text) {
  return text.replace(/\n/g, '<br>');
}

function highlightLawReferences(text) {
  // 법령명 패턴: "법령명 제N조" 형식을 찾아 클릭 가능하게 만듦
  return text.replace(/([가-힣]+법|[가-힣]+령)\s*제(\d+)조/g, (match, lawName, articleNum) => {
    return `<span class="law-ref" onclick="openLawModal('${lawName} 제${articleNum}조')">${match}</span>`;
  });
}

function highlightTermsInText(text) {
  if (!state.termDB || Object.keys(state.termDB).length === 0) {
    return formatText(text);
  }
  
  let result = text;
  Object.keys(state.termDB).forEach(term => {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'g');
    result = result.replace(regex, `<span class="term" data-term="$1">$1</span>`);
  });
  
  return formatText(result);
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function attachTermClickHandlers() {
  document.querySelectorAll('.term').forEach(element => {
    element.addEventListener('click', function() {
      const term = this.getAttribute('data-term');
      showTermDefinition(term);
    });
  });
}

// ════════════════════════════════════════════════════════════════
// 용어 해설 기능
// ════════════════════════════════════════════════════════════════
function showTermDefinition(term) {
  const termData = state.termDB[term];
  const detailElement = document.getElementById('termDetail');
  const hintElement = document.getElementById('termHint');
  
  if (!termData) {
    detailElement.innerHTML = '';
    hintElement.style.display = 'block';
    return;
  }
  
  hintElement.style.display = 'none';
  detailElement.innerHTML = `
    <div class="tcrd selected">
      <div class="tw">${term}</div>
      ${termData.hanja ? `<div class="th">${termData.hanja}</div>` : ''}
      <div class="td">${termData.def || ''}</div>
      ${termData.law ? `<div class="tl2">근거: ${termData.law}</div>` : ''}
    </div>
  `;
  
  // 우측 패널이 닫혀있으면 열기
  showTab('terms');
}

function extractAndDisplayTerms(text) {
  const foundTerms = new Set();
  
  Object.keys(state.termDB).forEach(term => {
    if (text.includes(term)) {
      foundTerms.add(term);
    }
  });
  
  const autoTermsElement = document.getElementById('autoTerms');
  if (!autoTermsElement) return;
  
  if (foundTerms.size === 0) {
    autoTermsElement.innerHTML = '<div class="hint-text">이 문서에서 등록된 용어를 찾지 못했습니다.</div>';
    return;
  }
  
  const html = Array.from(foundTerms).map(term => 
    `<div class="tcrd" onclick="showTermDefinition('${term}')">
      <div class="tw ellipsis">${term}</div>
      <div class="td ellipsis">${truncateText(state.termDB[term].def || '', 40)}</div>
    </div>`
  ).join('');
  
  autoTermsElement.innerHTML = html;
}

// ════════════════════════════════════════════════════════════════
// 연계 판례 로드
// ════════════════════════════════════════════════════════════════
async function loadRelatedCases(caseData) {
  const relatedElement = document.getElementById('relatedContent');
  if (!relatedElement) return;
  
  relatedElement.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  
  try {
    // 판례번호에서 키워드 추출하여 관련 판례 검색
    const keyword = extractKeywordFromCaseNum(caseData.caseNum);
    const results = await API.searchPrecedent(keyword, { display: 10 });
    
    if (!results.items || results.items.length === 0) {
      relatedElement.innerHTML = '<div class="hint">연계 판례를 찾지 못했습니다.</div>';
      return;
    }
    
    const html = results.items
      .filter(item => item.id !== state.currentDetail.id) // 현재 판례 제외
      .slice(0, 5)
      .map(item => `
        <div class="rcrd" onclick="window.goDetail('case', '${item.id}')">
          <div class="rtype">${item.court || ''}</div>
          <div class="rnum">${item.caseNum || ''}</div>
          <div class="rdate">${item.date || ''}</div>
        </div>
      `).join('');
    
    relatedElement.innerHTML = html || '<div class="hint">연계 판례를 찾지 못했습니다.</div>';
  } catch (error) {
    relatedElement.innerHTML = `<div class="hint-text error">오류: ${error.message}</div>`;
  }
}

function extractKeywordFromCaseNum(caseNum) {
  // 사건번호에서 연도와 사건 유형 제거하여 핵심 키워드만 추출
  if (!caseNum) return '';
  return caseNum.replace(/\d+/g, '').replace(/[도나다두헌]/g, '').trim();
}

// ════════════════════════════════════════════════════════════════
// 사건 유형 판단
// ════════════════════════════════════════════════════════════════
function getCaseTypeConfig(caseNum) {
  const defaultConfig = { 
    name: '일반재판', 
    class: 'default', 
    labels: ['당사자', '상대방'] 
  };
  
  if (!caseNum) return defaultConfig;
  
  if (caseNum.includes('헌')) {
    return { name: '헌법재판', class: 'const', labels: ['청구인', '이해관계인'] };
  }
  
  if (/[푸로오]/.test(caseNum)) {
    return { name: '소년보호', class: 'juvenile', labels: ['소년', '보호자'] };
  }
  
  if (/[드르느]/.test(caseNum)) {
    return { name: '가사재판', class: 'family', labels: ['원고/청구인', '피고/상대방'] };
  }
  
  const caseTypeMap = {
    '도': { name: '형사재판', class: 'criminal', labels: ['피고인', '검사'] },
    '나': { name: '민사재판', class: 'civil', labels: ['원고', '피고'] },
    '다': { name: '민사재판', class: 'civil', labels: ['원고', '피고'] },
    '두': { name: '행정재판', class: 'admin', labels: ['원고', '피고(행정청)'] }
  };
  
  const code = caseNum.replace(/[0-9]/g, '').trim();
  return caseTypeMap[code] || defaultConfig;
}

// ════════════════════════════════════════════════════════════════
// 우측 패널 탭 전환
// ════════════════════════════════════════════════════════════════
window.showTab = (tabName) => {
  // 모든 콘텐츠 숨기기
  document.querySelectorAll('.pc').forEach(panel => {
    panel.style.display = 'none';
  });
  
  // 모든 탭 버튼 비활성화
  document.querySelectorAll('.ptab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // 선택된 콘텐츠 표시
  const targetContent = document.getElementById(`pc-${tabName}`);
  if (targetContent) {
    targetContent.style.display = 'block';
  }
  
  // 선택된 탭 버튼 활성화
  const targetButton = document.getElementById(`pt-${tabName}`);
  if (targetButton) {
    targetButton.classList.add('active');
  }
};

// ════════════════════════════════════════════════════════════════
// 뷰어 설정 토글
// ════════════════════════════════════════════════════════════════
window.toggleViewLayer = (layerType) => {
  const bodyElement = document.getElementById('caseBody');
  if (!bodyElement) return;
  
  state.viewSettings[layerType] = !state.viewSettings[layerType];
  const isActive = state.viewSettings[layerType];
  
  const buttonId = layerType === 'terms' ? 'btnTermToggle' : 'btnHighlightToggle';
  const button = document.getElementById(buttonId);
  const label = layerType === 'terms' ? '용어 밑줄' : '형광펜';
  const className = layerType === 'terms' ? 'hide-terms' : 'hide-highlights';
  
  if (isActive) {
    bodyElement.classList.remove(className);
    button?.classList.add('active');
    if (button) button.textContent = `${label}: 켬`;
  } else {
    bodyElement.classList.add(className);
    button?.classList.remove('active');
    if (button) button.textContent = `${label}: 끔`;
  }
};

// ════════════════════════════════════════════════════════════════
// 본문 내 검색
// ════════════════════════════════════════════════════════════════
window.doInlineSearch = () => {
  const query = document.getElementById('iSrch')?.value.trim();
  const bodyElement = document.getElementById('caseBody');
  
  if (!query || !bodyElement) {
    clearInlineSearchHighlights();
    state.inlineSearch.matches = [];
    state.inlineSearch.currentIndex = 0;
    updateSearchCounter();
    return;
  }
  
  if (query === state.inlineSearch.lastQuery) return;
  
  state.inlineSearch.lastQuery = query;
  clearInlineSearchHighlights();
  
  const textContent = bodyElement.textContent || '';
  const regex = new RegExp(escapeRegex(query), 'gi');
  const matches = [];
  let match;
  
  while ((match = regex.exec(textContent)) !== null) {
    matches.push(match.index);
  }
  
  state.inlineSearch.matches = matches;
  state.inlineSearch.currentIndex = 0;
  
  if (matches.length > 0) {
    highlightInlineSearchMatches(bodyElement, query);
    scrollToMatch(0);
  }
  
  updateSearchCounter();
};

function highlightInlineSearchMatches(container, query) {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  
  textNodes.forEach(textNode => {
    if (!textNode.nodeValue.match(regex)) return;
    
    const span = document.createElement('span');
    span.innerHTML = textNode.nodeValue.replace(regex, '<mark class="sh">$1</mark>');
    textNode.parentNode.replaceChild(span, textNode);
  });
}

function clearInlineSearchHighlights() {
  document.querySelectorAll('.sh').forEach(mark => {
    const text = mark.textContent;
    mark.replaceWith(text);
  });
}

function scrollToMatch(index) {
  const marks = document.querySelectorAll('.sh');
  if (index < 0 || index >= marks.length) return;
  
  // 이전 활성화 제거
  marks.forEach(mark => mark.classList.remove('cur'));
  
  // 현재 항목 활성화 및 스크롤
  const currentMark = marks[index];
  currentMark.classList.add('cur');
  currentMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateSearchCounter() {
  const counterElement = document.getElementById('iCnt');
  if (!counterElement) return;
  
  const total = state.inlineSearch.matches.length;
  const current = total > 0 ? state.inlineSearch.currentIndex + 1 : 0;
  
  counterElement.textContent = total > 0 ? `${current}/${total}` : '';
}

window.nextMatch = () => {
  if (state.inlineSearch.matches.length === 0) return;
  
  state.inlineSearch.currentIndex = 
    (state.inlineSearch.currentIndex + 1) % state.inlineSearch.matches.length;
  scrollToMatch(state.inlineSearch.currentIndex);
  updateSearchCounter();
};

window.prevMatch = () => {
  if (state.inlineSearch.matches.length === 0) return;
  
  state.inlineSearch.currentIndex = 
    (state.inlineSearch.currentIndex - 1 + state.inlineSearch.matches.length) % 
    state.inlineSearch.matches.length;
  scrollToMatch(state.inlineSearch.currentIndex);
  updateSearchCounter();
};

// ════════════════════════════════════════════════════════════════
// 하이라이트 기능
// ════════════════════════════════════════════════════════════════
window.applyHighlight = () => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  
  const range = selection.getRangeAt(0);
  const selectedText = range.toString().trim();
  
  if (!selectedText) return;
  
  const span = document.createElement('span');
  span.className = 'uhl';
  span.textContent = selectedText;
  
  range.deleteContents();
  range.insertNode(span);
  
  selection.removeAllRanges();
};

window.clearHighlights = () => {
  document.querySelectorAll('.uhl').forEach(highlight => {
    const text = highlight.textContent;
    highlight.replaceWith(text);
  });
};

// ════════════════════════════════════════════════════════════════
// 폰트 크기 조절
// ════════════════════════════════════════════════════════════════
window.setFontSize = (size) => {
  const bodyElement = document.getElementById('caseBody');
  if (bodyElement) {
    bodyElement.style.fontSize = `${size}px`;
  }
};

// ════════════════════════════════════════════════════════════════
// 읽기 진행도 표시
// ════════════════════════════════════════════════════════════════
window.updateProgress = () => {
  const panelCenter = document.getElementById('panelCenter');
  const progressBar = document.getElementById('readingProgress');
  
  if (!panelCenter || !progressBar) return;
  
  const scrollTop = panelCenter.scrollTop;
  const scrollHeight = panelCenter.scrollHeight - panelCenter.clientHeight;
  const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
  
  progressBar.style.width = `${progress}%`;
};

// ════════════════════════════════════════════════════════════════
// 카드 렌더링 헬퍼 함수들 (CSS 클래스 맞춤)
// ════════════════════════════════════════════════════════════════
function caseCard(caseItem, onclickHandler) {
  return `
    <div class="ri" onclick="${onclickHandler}">
      <div class="rc">판례</div>
      <div class="rt">${caseItem.caseNum || ''}</div>
      <div class="rtags">
        <span class="ts">${caseItem.court || ''}</span>
        <span class="ts">${caseItem.date || ''}</span>
      </div>
    </div>
  `;
}

function caseCardBig(caseItem) {
  return `
    <div class="bri" onclick="window.goDetail('case', '${caseItem.id}')">
      <div>
        <div class="bri-court">${caseItem.court || ''}</div>
        <div class="bri-title">${caseItem.caseNum || ''}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
          ${truncateText(caseItem.summary || '', 100)}
        </div>
      </div>
      <div>
        <span class="badge badge-c">${caseItem.date || ''}</span>
      </div>
    </div>
  `;
}

function lawCard(lawItem, onclickHandler) {
  return `
    <div class="ri law-ri" onclick="${onclickHandler}">
      <div class="rc">법령</div>
      <div class="rt">${lawItem.name || ''}</div>
      <div class="rtags">
        <span class="ts tlaw">${lawItem.category || ''}</span>
      </div>
    </div>
  `;
}

function lawCardBig(lawItem) {
  return `
    <div class="bri" onclick="window.goDetail('law', '${lawItem.mst}')">
      <div>
        <div class="bri-court">${lawItem.category || ''}</div>
        <div class="bri-title">${lawItem.name || ''}</div>
      </div>
      <div>
        <span class="badge badge-l">${lawItem.date || ''}</span>
      </div>
    </div>
  `;
}

function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// ════════════════════════════════════════════════════════════════
// 법령 모달 (서버 API 우선, 실패시 클라이언트 검색)
// ════════════════════════════════════════════════════════════════
window.openLawModal = async (lawReference) => {
  const modal = document.getElementById('lawModal');
  const titleElement = document.getElementById('lmTitle');
  const bodyElement = document.getElementById('lmBody');
  const goButton = document.getElementById('lmGoBtn');
  
  if (!modal) return;
  
  modal.classList.add('show');
  titleElement.textContent = lawReference;
  bodyElement.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  
  try {
    // 먼저 서버 API 시도
    let articleData = await API.getLawArticleByName(lawReference);
    let lawMst = null;
    
    // 서버 API 실패시 클라이언트 검색
    if (!articleData) {
      console.log('서버 API 실패, 클라이언트 검색 시작...');
      
      // 법령명과 조문 번호 파싱
      const matched = lawReference.match(/^(.+?)\s+제(\d+)조/);
      if (!matched) {
        bodyElement.innerHTML = '<div class="hint-text">법령명 형식이 올바르지 않습니다.</div>';
        return;
      }
      
      const [, lawName, articleNum] = matched;
      
      // 법령 검색
      const searchResult = await API.searchLaw(lawName, { display: 1 });
      if (!searchResult.items?.length) {
        bodyElement.innerHTML = `<div class="hint-text">"${lawName}" 법령을 찾을 수 없습니다.</div>`;
        return;
      }
      
      lawMst = searchResult.items[0].mst;
      
      // 법령 전체 데이터 가져오기
      const lawData = await API.getLawDetail(lawMst);
      if (!lawData) {
        bodyElement.innerHTML = '<div class="hint-text">법령 데이터를 불러올 수 없습니다.</div>';
        return;
      }
      
      // 조문 찾기 (재귀적으로 contents 탐색)
      const article = findArticleInContents(lawData.contents, articleNum);
      
      if (!article) {
        bodyElement.innerHTML = `<div class="hint-text">제${articleNum}조를 찾을 수 없습니다.</div>`;
        return;
      }
      
      // 클라이언트 검색 결과를 서버 API 형식으로 변환
      articleData = {
        mst: lawMst,
        num: article.num,
        title: article.title,
        content: article.content,
        paragraphs: article.paragraphs
      };
    }
    
    // 조문 내용 렌더링
    let articleHtml = `<div class="modal-article-title">제${articleData.num || '?'}조 ${articleData.title || ''}</div>`;
    
    if (articleData.content) {
      articleHtml += `<div class="modal-article-content">${formatText(articleData.content)}</div>`;
    }
    
    if (articleData.paragraphs && articleData.paragraphs.length > 0) {
      articleData.paragraphs.forEach(para => {
        articleHtml += `<div class="modal-article-para"><span class="modal-para-num">${para.num}</span> ${para.content}</div>`;
        
        if (para.items) {
          para.items.forEach(item => {
            articleHtml += `<div class="modal-article-item"><span class="modal-item-num">${item.num}.</span> ${item.content}</div>`;
          });
        }
      });
    }
    
    bodyElement.innerHTML = articleHtml;
    
    // 전체 법령으로 이동 버튼
    const finalMst = articleData.mst || lawMst;
    goButton.onclick = () => {
      modal.classList.remove('show');
      if (finalMst) {
        window.goDetail('law', finalMst);
      }
    };
  } catch (error) {
    bodyElement.innerHTML = `<div class="hint-text error">오류: ${error.message}</div>`;
  }
};

// 재귀적으로 조문 찾기 (클라이언트 폴백용)
function findArticleInContents(contents, articleNum) {
  if (!Array.isArray(contents)) return null;
  
  for (const node of contents) {
    if (node.type === 'article' && node.num === articleNum) {
      return node;
    }
    
    if (node.children) {
      const found = findArticleInContents(node.children, articleNum);
      if (found) return found;
    }
  }
  
  return null;
}

window.closeLawModal = (event) => {
  if (event.target.id === 'lawModal') {
    event.target.classList.remove('show');
  }
};

// ════════════════════════════════════════════════════════════════
// 용어 편집 모달
// ════════════════════════════════════════════════════════════════
window.openTermEdit = () => {
  const modal = document.getElementById('termEditModal');
  if (!modal) return;
  
  modal.classList.add('show');
  renderTermList();
};

window.closeTermEdit = (event) => {
  if (event.target.id === 'termEditModal') {
    event.target.classList.remove('show');
  }
};

function renderTermList() {
  const listElement = document.getElementById('termList');
  const countElement = document.getElementById('termCount');
  
  if (!listElement) return;
  
  const terms = Object.keys(state.termDB);
  countElement.textContent = `(${terms.length}개)`;
  
  if (terms.length === 0) {
    listElement.innerHTML = '<div class="hint-text">등록된 용어가 없습니다.</div>';
    return;
  }
  
  const html = terms.map(word => {
    const data = state.termDB[word];
    return `
      <div class="term-list-item">
        <div class="term-list-word">${word}</div>
        <div class="term-list-def">${truncateText(data.def || '', 50)}</div>
        <button class="term-delete-btn" onclick="deleteTerm('${word}')">×</button>
      </div>
    `;
  }).join('');
  
  listElement.innerHTML = html;
}

window.submitAddTerm = async () => {
  const word = document.getElementById('nWord')?.value.trim();
  const hanja = document.getElementById('nHanja')?.value.trim();
  const def = document.getElementById('nDef')?.value.trim();
  const law = document.getElementById('nLaw')?.value.trim();
  
  if (!word || !def) {
    alert('용어와 정의는 필수 입력 항목입니다.');
    return;
  }
  
  try {
    await API.addTerm({ word, hanja, def, law });
    
    // 로컬 상태 업데이트
    state.termDB[word] = { hanja, def, law };
    
    // UI 초기화
    document.getElementById('nWord').value = '';
    document.getElementById('nHanja').value = '';
    document.getElementById('nDef').value = '';
    document.getElementById('nLaw').value = '';
    
    renderTermList();
    
    alert('용어가 추가되었습니다.');
  } catch (error) {
    alert(`오류: ${error.message}`);
  }
};

window.deleteTerm = async (word) => {
  if (!confirm(`'${word}' 용어를 삭제하시겠습니까?`)) return;
  
  try {
    await API.deleteTerm(word);
    
    // 로컬 상태 업데이트
    delete state.termDB[word];
    
    renderTermList();
    
    alert('용어가 삭제되었습니다.');
  } catch (error) {
    alert(`오류: ${error.message}`);
  }
};
