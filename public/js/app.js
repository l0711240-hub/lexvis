// public/js/app.js
import * as API from './api.js';

// ════════════════════════════
// 상태
// ════════════════════════════
let termDB    = {};
// 테스트용 데이터 직접 주입
termDB = {
  "불법행위": { hanja: "不法行爲", def: "고의 또는 과실로 타인에게 손해를 가하는 위법행위입니다.", law: "민법 제750조" },
  "부당이득": { hanja: "不當利得", def: "법률상 원인 없이 타인의 재산으로 이익을 얻는 것입니다.", law: "민법 제741조" },
  "신의성실": { hanja: "信義誠實", def: "권리의 행사와 의무의 이행은 신의에 좇아 성실히 하여야 한다는 원칙입니다.", law: "민법 제2조" }
};
let homeType  = 'all';
let iMatches  = [], iIdx = 0, iLastQ = '';
let currentDetailType = null;
let currentDetailId   = null;

// ════════════════════════════
// 초기화
// ════════════════════════════
// ════════════════════════════
// 초기화 (수정본)
// ════════════════════════════
document.addEventListener('DOMContentLoaded', async () => { // async 추가
  const savedTheme = localStorage.getItem('lexvis-theme') || 'dark';
  
  if (!localStorage.getItem('lexvis-theme')) {
    localStorage.setItem('lexvis-theme', 'dark');
  }

  setMode(savedTheme);

  // ★ 추가: 용어 데이터 로드
  try {
    // API.js에 용어 목록을 가져오는 함수가 있다고 가정합니다.
    const data = await API.getTerms(); 
    if (data) {
      termDB = data; 
      console.log("✔ 용어 데이터 로드 완료:", Object.keys(termDB).length, "개");
    }
  } catch (e) {
    console.error("✘ 용어 로드 실패:", e);
    // 서버가 없다면 테스트용 데이터라도 넣어서 작동 확인 가능
    // termDB = { "불법행위": { hanja: "不法行爲", def: "고의/과실 손해행위", law: "민법" } };
  }
});
// ════════════════════════════
// 테마
// ════════════════════════════
window.toggleTheme = () => document.body.classList.toggle('light-mode');

// ════════════════════════════
// 페이지 전환
// ════════════════════════════
function showOnly(id) {
  ['home', 'subpage', 'detail'].forEach(p => {
    const el = document.getElementById(p);
    el.classList.remove('active');
    el.style.display = 'none';
  });
  const el = document.getElementById(id);
  el.classList.add('active');
  el.style.display = id === 'detail' ? 'flex' : 'block';
}

window.goHome = () => showOnly('home');

window.goSub = (tab) => {
  showOnly('subpage');
  ['cases', 'laws', 'guide'].forEach(t => {
    const n = document.getElementById('sn-' + t);
    if (n) n.classList.toggle('active', t === tab);
  });
  renderSubContent(tab);
};

// ── 서브 페이지 렌더 ──
function renderSubContent(tab) {
  const el = document.getElementById('subContent');
  if (tab === 'cases') {
    el.innerHTML = `
      <div class="sub-header"><h2>판례 검색</h2></div>
      <div class="sub-body">
        <div class="full-sb">
          <input id="cSrch" placeholder="판례번호, 키워드, 당사자명..." onkeydown="if(event.key==='Enter')window.doCaseSearch()">
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
      </div>`;
  } else if (tab === 'laws') {
    el.innerHTML = `
      <div class="sub-header"><h2>법령 데이터베이스</h2></div>
      <div class="sub-body">
        <div class="full-sb">
          <input id="lSrch" placeholder="법령명, 조문, 키워드..." onkeydown="if(event.key==='Enter')window.doLawSearch()">
          <button class="go-btn" onclick="window.doLawSearch()">검색</button>
        </div>
        <div class="law-cat-grid">
          ${['형법','민법','헌법','형사소송법','상법','근로기준법','의료법','저작권법'].map(n =>
            `<div class="lcat" onclick="window.doLawSearchByKw('${n}')">${n}</div>`).join('')}
        </div>
        <div id="lRes"><div class="hint-text">법령을 검색하거나 분야를 선택하세요</div></div>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="sub-header"><h2>사용 가이드</h2></div>
      <div class="sub-body">
        <div class="guide-grid">
          <div class="gcard"><h3>판례 열람</h3>
            <div class="gstep"><div class="snum">1</div><p>판례번호 또는 키워드로 검색합니다.</p></div>
            <div class="gstep"><div class="snum">2</div><p>결과 클릭 → 상세 뷰어로 이동합니다.</p></div>
            <div class="gstep"><div class="snum">3</div><p>밑줄 용어 클릭 → 우측 패널 해설 확인.</p></div>
            <div class="gstep"><div class="snum">4</div><p>'연계 판례' 탭에서 상·하급심 이동.</p></div>
          </div>
          <div class="gcard"><h3>법령 열람</h3>
            <div class="gstep"><div class="snum">1</div><p>법령 DB에서 카테고리 또는 법령명 검색.</p></div>
            <div class="gstep"><div class="snum">2</div><p>판례 본문의 파란색 법령명 클릭 → 팝업 조문 확인.</p></div>
            <div class="gstep"><div class="snum">3</div><p>팝업의 '이동' 버튼 → 법령 전문 뷰어.</p></div>
          </div>
          <div class="gcard"><h3>용어 사전 편집</h3>
            <p>판례 뷰어 우측 '용어 해설' 탭 → ⊞ 버튼으로 용어 추가·삭제 가능. 서버에 저장됩니다.</p>
            <p style="margin-top:8px;">코드로 직접 추가: <code>data/terms.json</code> 파일 편집.</p>
          </div>
          <div class="gcard"><h3>API 연동 구조</h3>
            <p><code>server/lawApi.js</code> → 국가법령정보 API 호출 프록시<br>
            <code>server/routes/law.js</code> → 법령 엔드포인트<br>
            <code>server/routes/precedent.js</code> → 판례 엔드포인트<br>
            <code>.env</code> → OC 키 설정 파일</p>
          </div>
        </div>
      </div>`;
  }
}

// ════════════════════════════
// 홈 검색
// ════════════════════════════
window.hTab = (t) => {
  homeType = t;
  ['all','case','law'].forEach(x => document.getElementById('ht-'+x).classList.toggle('active', x===t));
};
window.setSearch = (q) => { document.getElementById('hSrch').value = q; doHomeSearch(); };

window.doHomeSearch = async () => {
  const q   = document.getElementById('hSrch').value.trim();
  const box = document.getElementById('homeResults');
  if (!q) { box.innerHTML = '<div class="hint-text">검색어를 입력하세요</div>'; return; }

  box.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  try {
    const [cases, laws] = await Promise.allSettled([
      homeType !== 'law'  ? API.searchPrecedent(q) : Promise.resolve({ items: [] }),
      homeType !== 'case' ? API.searchLaw(q)       : Promise.resolve({ items: [] }),
    ]);
    let html = '';
    (cases.value?.items || []).slice(0,4).forEach(c => { html += caseCard(c, `window.goDetail('case','${c.id}')`); });
    (laws.value?.items  || []).slice(0,3).forEach(l => { html += lawCard(l,  `window.goDetail('law','${l.mst}')`); });
    box.innerHTML = html || '<div class="hint-text">검색 결과가 없습니다.</div>';
  } catch (e) {
    box.innerHTML = `<div class="hint-text error">오류: ${e.message}</div>`;
  }
};

// ════════════════════════════
// 판례 검색 (서브 페이지)
// ════════════════════════════
window.doCaseSearch = async () => {
  const q     = (document.getElementById('cSrch')?.value || '').trim();
  const court = document.getElementById('cCourt')?.value || '';
  const box   = document.getElementById('cRes');
  if (!q) { box.innerHTML = '<div class="hint-text">검색어를 입력하세요</div>'; return; }

  box.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  try {
    const data = await API.searchPrecedent(q, { court, display: 30 });
    let html = '';
    (data.items || []).forEach(c => { html += caseCardBig(c); });
    box.innerHTML = html || '<div class="hint-text">검색 결과가 없습니다.</div>';
  } catch (e) {
    box.innerHTML = `<div class="hint-text error">오류: ${e.message}</div>`;
  }
};

// ════════════════════════════
// 법령 검색 (서브 페이지)
// ════════════════════════════
window.doLawSearch       = async () => doLawSearchByKw(document.getElementById('lSrch')?.value || '');
window.doLawSearchByKw   = doLawSearchByKw;

async function doLawSearchByKw(kw) {
  const inp = document.getElementById('lSrch');
  if (inp) inp.value = kw;
  const box = document.getElementById('lRes');
  if (!kw.trim()) return;

  box.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  try {
    const data = await API.searchLaw(kw, { display: 30 });
    let html = '';
    (data.items || []).forEach(l => { html += lawCardBig(l); });
    box.innerHTML = html || '<div class="hint-text">검색 결과가 없습니다.</div>';
  } catch (e) {
    box.innerHTML = `<div class="hint-text error">오류: ${e.message}</div>`;
  }
}

// ════════════════════════════
// 상세 뷰어
// ════════════════════════════
window.goDetail = async (type, id) => {
  currentDetailType = type;
  currentDetailId   = id;
  showOnly('detail');
  clearInlineSearch();
  showTab('terms');

  const body = document.getElementById('caseBody');
  body.innerHTML = '<div class="loading-wrap"><div class="spinner"></div><span style="margin-left:10px;color:var(--text-muted);">불러오는 중...</span></div>';

  try {
    if (type === 'case') {
      const data = await API.getPrecedentDetail(id);
      renderCaseDetail(data);
    } else {
      const data = await API.getLawDetail(id);
      renderLawDetail(data);
    }
  } catch (e) {
    body.innerHTML = `<div class="hint-text error">불러오기 실패: ${e.message}</div>`;
  }
};

// ── 판례 본문 렌더 ──
function renderCaseDetail(d) {
  document.getElementById('dNum').textContent    = `${d.court || ''} ${d.caseNum || ''}`;
  document.getElementById('dChip1').textContent  = d.category || '판례';
  document.getElementById('dChip2').textContent  = d.result   || '';
  document.getElementById('dChip2').style.display = d.result ? '' : 'none';

  // 참조조문에서 법령 링크 생성
  const refLawsHtml = d.refLaws
    ? d.refLaws.replace(/([\w가-힣]+법\s*제\d+조[의\d조항호목]*)/g,
        m => `<span class="law-ref" onclick="window.openLawPopup('${m}')">${m}</span>`)
    : '';

  // 판례내용 정제 (API HTML 태그 처리)
  const fullText = (d.fullText || '본문을 불러올 수 없습니다.')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  document.getElementById('caseBody').innerHTML = `
    <div class="case-hd">
      <div class="case-court-badge">⚖ ${d.court || ''}</div>
      <h1 class="case-title">${d.caseName || d.caseNum || ''}</h1>
      <div class="case-meta">
        <span class="mi"><span class="ml">사건번호</span>${d.caseNum || ''}</span>
        <span class="mi"><span class="ml">선고일</span>${formatDate(d.date)}</span>
        <span class="mi"><span class="ml">결과</span>${d.result || ''}</span>
      </div>
    </div>
    ${d.summary ? `<div class="ls"><div class="lt">판시사항</div><div class="lbody">${d.summary}</div></div>` : ''}
    ${d.gist    ? `<div class="ls"><div class="lt">판결요지</div><div class="lbody">${d.gist}</div></div>`    : ''}
    ${refLawsHtml ? `<div class="ls"><div class="lt">참조조문</div><div class="lbody">${refLawsHtml}</div></div>` : ''}
    ${d.refCases  ? `<div class="ls"><div class="lt">참조판례</div><div class="lbody ref-cases">${d.refCases}</div></div>` : ''}
    <div class="ls" id="fullTextSection">
      <div class="lt">판례 전문</div>
      <div class="lbody" style="white-space:pre-wrap;">${fullText}</div>
    </div>
    <div style="height:80px;"></div>`;

  // renderCaseDetail 함수 최하단 수정
  renderLeftPanel('case', d);
  
  // 브라우저가 본문을 다 그린 후 하이라이트 적용
  requestAnimationFrame(() => { 
    applyTermHighlighting(); 
    buildAutoTermList(); 
  });
}

function renderLawDetail(d) {
  document.getElementById('dNum').textContent = `법령 · ${d.name || ''}`;
  document.getElementById('dChip1').textContent = d.type || '법령';
  document.getElementById('dChip1').className = 'chip chip-b';
  document.getElementById('dChip2').style.display = 'none';

  // 우리가 만든 계층형 렌더러 호출
  const contentsHtml = renderLawContents(d.contents);

  document.getElementById('caseBody').innerHTML = `
    <div class="case-hd">
      <div class="case-court-badge">📄 ${d.type || '법령'}</div>
      <h1 class="case-title">${d.name || ''}</h1>
      <div class="case-meta">
        <span class="mi"><span class="ml">소관부처</span>${d.department || ''}</span>
        <span class="mi"><span class="ml">공포일</span>${formatDate(d.promulgDate)}</span>
        <span class="mi"><span class="ml">시행일</span>${formatDate(d.enforcDate)}</span>
      </div>
    </div>
    <div class="law-viewer-body">
      ${contentsHtml || '<div class="hint-text">조문 정보를 불러올 수 없습니다.</div>'}
    </div>
    <div style="height:80px;"></div>`;

  renderLeftPanel('law', d);
  // 텍스트 강조 및 용어 사전 빌드
  setTimeout(() => { applyTermHighlighting(); buildAutoTermList(); }, 80);
}

// ════════════════════════════
// 법령 팝업 (수정본)
// ════════════════════════════
window.openLawPopup = async (lawName) => {
  const titleEl = document.getElementById('lmTitle');
  const subEl = document.getElementById('lmSub');
  const bodyEl = document.getElementById('lmBody');
  const refEl = document.getElementById('lmRef');
  const goBtn = document.getElementById('lmGoBtn');

  titleEl.textContent = lawName;
  subEl.textContent = '조문 불러오는 중...';
  bodyEl.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';
  refEl.textContent = '';
  document.getElementById('lawModal').classList.add('show');

  try {
    const data = await API.getLawArticleByName(lawName);
    if (!data) { 
      subEl.textContent = '조문을 찾을 수 없습니다.'; 
      bodyEl.innerHTML = ''; 
      return; 
    }

    subEl.textContent = '';
    refEl.textContent = `제${data.num}조 ${data.title || ''}`;
    
    // 💡 핵심: 새로운 계층형 구조(paragraphs)를 팝업용 HTML로 변환
    let bodyHtml = `<div class="lbody">`;
    
    // 1. 조문의 기본 문장 (있는 경우)
    if (data.content) {
      bodyHtml += `<div class="art-main-content" style="margin-bottom:10px;">${data.content}</div>`;
    }

    // 2. 항(①), 호(1.), 목(가.) 처리
    // 우리가 만든 renderLawParagraphs 함수를 여기서도 재활용합니다!
    if (data.paragraphs && data.paragraphs.length > 0) {
      bodyHtml += renderLawParagraphs(data.paragraphs);
    } 
    // (하위 호환성용) 이전 구조의 데이터가 올 경우 처리
    else if (data.items && data.items.length > 0) {
      bodyHtml += data.items.map(h => `
        <div style="padding-left:1.2em; margin-top:4px;">
          ${h.num} ${h.content}
        </div>
      `).join('');
    }
    
    bodyHtml += `</div>`;
    bodyEl.innerHTML = bodyHtml;

    // 3. 해당 법률 전문 페이지로 이동하는 버튼 설정
    const matched = lawName.match(/^(.+?)\s+제\d+조/);
    if (matched) {
      goBtn.onclick = async () => {
        document.getElementById('lawModal').classList.remove('show');
        const srch = await API.searchLaw(matched[1], { display: 1 });
        if (srch.items?.length) window.goDetail('law', srch.items[0].mst);
      };
    }
  } catch (e) {
    subEl.textContent = `오류: ${e.message}`;
    bodyEl.innerHTML = '';
  }
};
window.closeLawModal = (e) => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show'); };

// ════════════════════════════
// 용어 사전
// ════════════════════════════
function applyTermHighlighting() {
  document.querySelectorAll('.lbody').forEach(el => {
    // 기존 term span 제거
    el.innerHTML = el.innerHTML.replace(/<span class="term"[^>]*>([^<]+)<\/span>/g, '$1');
    const sorted = Object.keys(termDB).sort((a, b) => b.length - a.length);
    walkAndMark(el, sorted);
  });
}

function walkAndMark(node, words) {
  if (node.nodeType === 3) {
    const text = node.textContent;
    if (!words.some(w => text.includes(w))) return;
    const positions = [];
    words.forEach(w => {
      let i = 0;
      while ((i = text.indexOf(w, i)) !== -1) { positions.push({ s: i, e: i + w.length, w }); i += w.length; }
    });
    positions.sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s));
    const used = [], merged = [];
    positions.forEach(p => { if (!used.some(u => p.s < u.e && p.e > u.s)) { merged.push(p); used.push(p); } });
    merged.sort((a, b) => a.s - b.s);
    const frag = document.createDocumentFragment();
    let cur = 0;
    merged.forEach(p => {
      if (p.s > cur) frag.appendChild(document.createTextNode(text.slice(cur, p.s)));
      const sp = document.createElement('span');
      sp.className = 'term';
      sp.textContent = p.w;
      const ww = p.w;
      sp.onclick = () => showTermPanel(ww);
      frag.appendChild(sp);
      cur = p.e;
    });
    if (cur < text.length) frag.appendChild(document.createTextNode(text.slice(cur)));
    node.parentNode.replaceChild(frag, node);
  } else if (node.nodeType === 1 && !node.classList.contains('term') && !node.classList.contains('law-ref')) {
    Array.from(node.childNodes).forEach(c => walkAndMark(c, words));
  }
}

function buildAutoTermList() {
  const bodyText = document.getElementById('caseBody')?.textContent || '';
  const found = Object.keys(termDB).filter(w => bodyText.includes(w));
  document.getElementById('autoTerms').innerHTML = found.slice(0, 9).map(w =>
    `<div class="tcrd" onclick="window.showTermPanel('${w}')">
      <div class="tw">${w}</div>
      <div class="th">${termDB[w].hanja}</div>
      <div class="td ellipsis">${termDB[w].def.substring(0, 48)}...</div>
    </div>`
  ).join('');
}

window.showTermPanel = showTermPanel;
function showTermPanel(word) {
  showTab('terms');
  const d = termDB[word]; if (!d) return;
  document.getElementById('termHint').style.display = 'none';
  document.getElementById('termDetail').innerHTML = `
    <div class="tcrd selected">
      <div class="tw" style="font-size:15px;">${word}</div>
      <div class="th">${d.hanja}</div>
      <div class="td" style="white-space:pre-line;margin-bottom:6px;">${d.def}</div>
      <div class="tl2">${d.law}</div>
    </div>`;
}

// 용어 편집
window.openTermEdit = () => { renderTermList(); document.getElementById('termEditModal').classList.add('show'); };
window.closeTermEdit = (e) => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show'); };

function renderTermList() {
  renderTermCount();
  document.getElementById('termList').innerHTML = Object.entries(termDB).map(([w, d]) =>
    `<div class="teli">
      <div style="flex:1;"><div class="teliw">${w} <span style="font-size:10px;color:var(--text-dim);">${d.hanja}</span></div>
      <div class="telid">${d.def.substring(0, 50)}${d.def.length > 50 ? '...' : ''}</div></div>
      <button class="tdel" onclick="window.deleteTerm('${w}')">삭제</button>
    </div>`
  ).join('');
}
function renderTermCount() {
  const el = document.getElementById('termCount');
  if (el) el.textContent = `(${Object.keys(termDB).length}개)`;
}

window.submitAddTerm = async () => {
  const word = document.getElementById('nWord').value.trim();
  const def  = document.getElementById('nDef').value.trim();
  if (!word || !def) { showToast('용어와 정의는 필수입니다.'); return; }
  const data = { word, hanja: document.getElementById('nHanja').value.trim(), def, law: document.getElementById('nLaw').value.trim() };
  await API.addTerm(data);
  termDB[word] = { hanja: data.hanja, def: data.def, law: data.law };
  ['nWord','nHanja','nDef','nLaw'].forEach(id => document.getElementById(id).value = '');
  renderTermList(); applyTermHighlighting(); buildAutoTermList();
  showToast(`"${word}" 용어가 추가됐습니다.`);
};
window.deleteTerm = async (word) => {
  if (!confirm(`"${word}" 용어를 삭제하시겠습니까?`)) return;
  await API.deleteTerm(word);
  delete termDB[word];
  renderTermList(); applyTermHighlighting(); buildAutoTermList();
};

// ════════════════════════════
// 하이라이트 (드래그)
// ════════════════════════════
// 하이라이트 실행 함수 (이전 답변에서 드린 개선된 버전)
window.applyHighlight = () => {
  const selection = window.getSelection();
  if (selection.rangeCount === 0 || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const span = document.createElement('span');
  span.className = 'uhl'; // viewer.css의 .uhl 스타일 사용
  
  try {
    range.surroundContents(span);
    selection.removeAllRanges();
  } catch (e) {
    console.warn("영역이 복잡하여 하이라이트를 적용할 수 없습니다.");
  }
};

// 하이라이트 전체 삭제
window.clearHighlights = () => {
  const highlights = document.querySelectorAll('.uhl');
  highlights.forEach(el => {
    const parent = el.parentNode;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  });
};

// 💡 용어 토글 함수만 남김
let showTerms = true;
window.toggleTerms = () => {
  const bodyEl = document.getElementById('caseBody');
  const btn = document.getElementById('btnTermToggle');
  if (!bodyEl || !btn) return;

  showTerms = !showTerms;
  if (showTerms) {
    bodyEl.classList.remove('hide-terms');
    btn.classList.add('active');
    btn.textContent = '법률 용어 : 켬';
  } else {
    bodyEl.classList.add('hide-terms');
    btn.classList.remove('active');
    btn.textContent = '법률 용어 : 끔';
  }
};

// 모든 하이라이트 지우기
window.clearHighlights = () => {
  const highlights = document.querySelectorAll('.uhl');
  highlights.forEach(el => {
    const parent = el.parentNode;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
  });
};
// 본문 내 검색
// ════════════════════════════
window.doInlineSearch = doInlineSearch;
function doInlineSearch() {
  const q = document.getElementById('iSrch').value.trim();
  if (q === iLastQ) return;
  iLastQ = q;
  document.querySelectorAll('.sh').forEach(el => { el.outerHTML = el.textContent; });
  iMatches = []; iIdx = 0;
  if (!q) { document.getElementById('iCnt').textContent = ''; return; }

  const center = document.getElementById('panelCenter');
  const walker = document.createTreeWalker(center, NodeFilter.SHOW_TEXT, {
    acceptNode: n => {
      const p = n.parentElement;
      if (!p || ['SCRIPT','STYLE','BUTTON'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
      if (p.closest('.viewer-toolbar')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  const ql = q.toLowerCase();
  nodes.forEach(node => {
    const text  = node.textContent;
    const lower = text.toLowerCase();
    let i = 0;
    while ((i = lower.indexOf(ql, i)) !== -1) {
      const range = document.createRange();
      range.setStart(node, i); range.setEnd(node, i + q.length);
      const sp = document.createElement('span');
      sp.className = 'sh';
      try { range.surroundContents(sp); iMatches.push(sp); } catch (e) {}
      i += q.length;
    }
  });

  const cntEl = document.getElementById('iCnt');
  cntEl.textContent = iMatches.length > 0 ? `1/${iMatches.length}` : '없음';
  if (iMatches.length) hlCurrent();
}

function hlCurrent() {
  iMatches.forEach((m, i) => m.classList.toggle('cur', i === iIdx));
  if (iMatches[iIdx]) iMatches[iIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('iCnt').textContent = `${iIdx + 1}/${iMatches.length}`;
}
window.nextMatch = () => { if (!iMatches.length) { doInlineSearch(); return; } iIdx = (iIdx + 1) % iMatches.length; hlCurrent(); };
window.prevMatch = () => { if (!iMatches.length) return; iIdx = (iIdx - 1 + iMatches.length) % iMatches.length; hlCurrent(); };
function clearInlineSearch() {
  const inp = document.getElementById('iSrch');
  if (inp) inp.value = '';
  document.getElementById('iCnt').textContent = '';
  document.querySelectorAll('.sh').forEach(el => { el.outerHTML = el.textContent; });
  iMatches = []; iIdx = 0; iLastQ = '';
}

// ════════════════════════════
// 뷰어 설정
// ════════════════════════════
// 1. 테마 적용 핵심 함수
window.setMode = (mode) => {
  const html = document.documentElement;
  
  // 모든 테마 관련 클래스/속성 초기화
  html.removeAttribute('data-theme'); 
  
  if (mode === 'light') {
    html.setAttribute('data-theme', 'light');
  } 
  // 만약 'coding' 모드 같은 게 더 있다면 여기에 else if 추가 가능

  // 로컬 스토리지 저장 (새로고침해도 유지되게)
  localStorage.setItem('lexvis-theme', mode);

  // UI 버튼들 상태 업데이트 (활성화 표시)
  updateThemeUI(mode);
};

// 2. 상단 아이콘(☀) 클릭 시 토글 로직
window.toggleTheme = () => {
  const current = localStorage.getItem('lexvis-theme') || 'dark';
  const target = current === 'dark' ? 'light' : 'dark';
  window.setMode(target);
};

// 3. 버튼들의 'active' 클래스 관리
function updateThemeUI(mode) {
  const btnDark = document.getElementById('bDark');
  const btnLight = document.getElementById('bLight');
  const themeIcons = document.querySelectorAll('.icon-btn'); // 상단 ☀ 버튼들

  if (mode === 'dark') {
    btnDark?.classList.add('active');
    btnLight?.classList.remove('active');
    themeIcons.forEach(icon => { if(icon.innerText === '☀') icon.innerText = '🌙' });
  } else {
    btnLight?.classList.add('active');
    btnDark?.classList.remove('active');
    themeIcons.forEach(icon => { if(icon.innerText === '🌙') icon.innerText = '☀' });
  }
}

// 4. 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('lexvis-theme') || 'dark';
  window.setMode(saved);
});

window.updateProgress = () => {
  const centerEl = document.getElementById('panelCenter');
  if (!centerEl) return;

  // 1. 상단 게이지
  const progress = (centerEl.scrollTop / (centerEl.scrollHeight - centerEl.clientHeight)) * 100;
  const progBar = document.getElementById('readingProgress');
  if (progBar) progBar.style.width = progress + '%';

  // 2. 실시간 위치 추적 (Scroll Spy)
  if (currentDetailType === 'law') {
    const targets = document.querySelectorAll('.article-box, .law-para-box');
    let currentId = "";

    for (const target of targets) {
      const rect = target.getBoundingClientRect();
      // 중앙 패널 상단 기준 150px 이내에 들어오면 "현재 읽는 중"으로 간주
      if (rect.top <= 150) {
        currentId = target.id;
      } else {
        break;
      }
    }

    if (currentId) {
      // 1) 모든 목차에서 active 제거
      document.querySelectorAll('.toc').forEach(t => t.classList.remove('active'));
      
      // 2) 현재 위치의 목차 항목 활성화
      const activeToc = document.getElementById(`toc-${currentId}`);
      if (activeToc) {
        activeToc.classList.add('active');
        
        // 3) 활성화된 목차가 목차 패널 밖으로 나갔으면 부드럽게 스크롤
        const panelLeft = document.getElementById('panelLeft');
        const activeRect = activeToc.getBoundingClientRect();
        const panelRect = panelLeft.getBoundingClientRect();

        if (activeRect.top < panelRect.top || activeRect.bottom > panelRect.bottom) {
          activeToc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }
  }
};

window.scrollToArt = (id, el) => {
  const t = document.getElementById(id);
  if (t) document.getElementById('panelCenter').scrollTo({ top: t.offsetTop - 16, behavior: 'smooth' });
  document.querySelectorAll('.toc').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
};
window.scrollToSection = (title, el) => {
  const all = document.querySelectorAll('.lt');
  for (const lt of all) {
    if (lt.textContent.includes(title)) {
      document.getElementById('panelCenter').scrollTo({ top: lt.parentElement.offsetTop - 16, behavior: 'smooth' });
      break;
    }
  }
  document.querySelectorAll('.toc').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
};

// ════════════════════════════
// 카드 렌더 헬퍼
// ════════════════════════════
function caseCard(c, onclick) {
  return `<div class="ri" onclick="${onclick}">
    <div class="rc">${c.court} · ${c.caseNum} · ${formatDate(c.date)}</div>
    <div class="rt">${c.caseName || c.caseNum}</div>
    <div class="rtags"><span class="ts t형법">${c.category || '판례'}</span></div>
  </div>`;
}
function lawCard(l, onclick) {
  return `<div class="ri law-ri" onclick="${onclick}">
    <div class="rc">법령 · ${l.department || ''}</div>
    <div class="rt">${l.name}</div>
    <div class="rtags"><span class="ts tlaw">${l.type || '법률'}</span></div>
  </div>`;
}
function caseCardBig(c) {
  return `<div class="bri" onclick="window.goDetail('case','${c.id}')">
    <div>
      <div class="bri-court">${c.court}</div>
      <div class="bri-title">${c.caseName || c.caseNum}</div>
      <div class="rtags" style="margin-top:4px;">
        <span class="ts t형법">${c.category || '판례'}</span>
        <span class="badge badge-c">${c.caseNum}</span>
      </div>
    </div>
    <div style="text-align:right;flex-shrink:0;margin-left:16px;">
      <div style="font-size:11px;font-family:var(--font-mono);color:var(--text-dim);">${formatDate(c.date)}</div>
      <div class="badge badge-c" style="margin-top:4px;">${c.result || '판례'}</div>
    </div>
  </div>`;
}
function lawCardBig(l) {
  return `<div class="bri" onclick="window.goDetail('law','${l.mst}')">
    <div>
      <div class="bri-court">${l.department || ''}</div>
      <div class="bri-title">${l.name}</div>
      <div class="rtags" style="margin-top:4px;"><span class="badge badge-l">${l.type || '법률'}</span></div>
    </div>
    <div style="text-align:right;flex-shrink:0;margin-left:16px;">
      <div style="font-size:11px;color:var(--text-dim);">시행 ${formatDate(l.enforcDate)}</div>
    </div>
  </div>`;
}

function formatDate(d) {
  if (!d) return '';
  const s = String(d);
  if (s.length === 8) return `${s.slice(0,4)}.${s.slice(4,6)}.${s.slice(6,8)}.`;
  return s;
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// 💡 [함수 1] 법령 본문 전체 렌더링 (재귀 구조)
function renderLawContents(nodes) {
  if (!nodes || !Array.isArray(nodes)) return "";
  let html = "";

  nodes.forEach(node => {
    if (node.type === "part") {
      html += `<div class="law-part">${node.title}</div>`;
      if (node.children) html += renderLawContents(node.children);
    } 
    else if (node.type === "chapter") {
      html += `<div class="law-chapter">${node.title}</div>`;
      if (node.children) html += renderLawContents(node.children);
    } 
    else if (node.type === "section") {
      html += `<div class="law-section">${node.title}</div>`;
      if (node.children) html += renderLawContents(node.children);
    } 
    else if (node.type === "article") {
      const artId = `art-${node.num}`;
      html += `
        <div class="ls article-box" id="${artId}">
          <div class="lt"><span class="ln">제${node.num}조</span> ${node.title || ''}</div>
          <div class="lbody">
            ${node.content ? `<div class="art-main-content">${node.content}</div>` : ""}
            ${node.paragraphs ? renderLawParagraphs(node.paragraphs, artId) : ""}
          </div>
        </div>`;
    }
  });
  return html;
}

// 💡 [함수 2] 본문의 '항(①)' 렌더링 (ID 부여 핵심)
function renderLawParagraphs(paras, articleId) {
  return paras.map((p, idx) => {
    const pId = `${articleId}-p${idx}`; // 예: art-1-p0
    return `
      <div class="lp-para law-para-box" id="${pId}">
        <span class="p-num">${p.num}</span> ${p.content}
        ${p.items ? renderLawItems(p.items) : ""}
      </div>
    `;
  }).join('');
}

// 💡 [함수 3] 본문의 '호(1.)' 및 '목(가.)' 렌더링
function renderLawItems(items) {
  return `<div class="li-wrap">` + items.map(i => `
    <div class="li-item">
      <span class="i-num">${i.num}.</span> ${i.content}
      ${i.sub_items ? renderLawSubItems(i.sub_items) : ""}
    </div>
  `).join('') + `</div>`;
}

function renderLawSubItems(subs) {
  return `<div class="ls-wrap">` + subs.map(s => `
    <div class="ls-sub"><span class="s-num">${s.num}.</span> ${s.content}</div>
  `).join('') + `</div>`;
}

// 💡 [수정] 좌측 계층형 목차 생성 (항 표시 로직 제거)
function renderLeftPanel(type, d) {
  const el = document.getElementById('panelLeft');
  if (type !== 'law') {
    // 판례(case) 목차 로직
    el.innerHTML = `
      <div class="pst">정보</div>
      <div class="toc-info"><span class="ml">법원</span>${d.court || ''}</div>
      <div class="toc-info"><span class="ml">선고일</span>${formatDate(d.date)}</div>
      <div class="tdivider"></div>
      <div class="pst">섹션</div>
      <div class="toc active" onclick="scrollToSection('판례 전문',this)">판례 전문</div>`;
    return;
  }

  let html = `<div class="pst">법령 목차</div>`;
  
  const buildTocHtml = (nodes) => {
    let res = "";
    nodes.forEach(node => {
      if (node.type === 'part' || node.type === 'chapter' || node.type === 'section') {
        const cls = `toc-${node.type}`;
        res += `<div class="toc ${cls}">${node.title}</div>`;
        if (node.children) res += buildTocHtml(node.children);
      } 
      else if (node.type === 'article') {
        const id = `art-${node.num}`;
        // 💡 조문 목차만 생성 (항 반복 로직 삭제됨)
        res += `<div class="toc toc-art" id="toc-${id}" onclick="scrollToArt('${id}', this)">제${node.num}조 ${node.title || ''}</div>`;
      }
    });
    return res;
  };

  el.innerHTML = html + buildTocHtml(d.contents || []);
}

let viewSettings = { terms: true, highlights: true };

window.toggleViewLayer = (type) => {
  const bodyEl = document.getElementById('caseBody');
  if (!bodyEl) return;

  viewSettings[type] = !viewSettings[type];
  const isActive = viewSettings[type];
  
  const btn = document.getElementById(type === 'terms' ? 'btnTermToggle' : 'btnHighlightToggle');
  const label = type === 'terms' ? '용어 밑줄' : '형광펜';
  const className = type === 'terms' ? 'hide-terms' : 'hide-highlights';

  if (isActive) {
    bodyEl.classList.remove(className);
    btn.classList.add('active');
    btn.textContent = `${label}: 켬`;
  } else {
    bodyEl.classList.add(className);
    btn.classList.remove('active');
    btn.textContent = `${label}: 끔`;
  }
};

// 탭 전환 및 용어해설 패널 표시 함수 (수정본)
window.showTab = (tabName) => {
  // 1. 모든 콘텐츠 패널(.pc) 숨기기
  const contents = document.querySelectorAll('.pc');
  contents.forEach(c => { c.style.display = 'none'; });

  // 2. 모든 탭 버튼(.ptab) 비활성화
  const tabs = document.querySelectorAll('.ptab');
  tabs.forEach(t => { t.classList.remove('active'); });

  // 3. ★ 핵심: pc-terms, pc-related 형식을 사용합니다.
  const targetContent = document.getElementById('pc-' + tabName);
  if (targetContent) {
    targetContent.style.display = 'block';
  }

  // 4. 클릭된 버튼 활성화
  const targetBtn = document.getElementById('pt-' + tabName); // pt-terms 등
  if (targetBtn) {
    targetBtn.classList.add('active');
  }
};

