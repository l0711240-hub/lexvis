// public/js/app.js (ES Module) — LexVis 4.0
import * as API from './api.js';

// ════════════════════════════════════════════════════════════════
// 전역 상태
// ════════════════════════════════════════════════════════════════
const S = {
  termDB:       {},
  homeType:     'all',        // all | case | law
  detail:       { type: null, id: null },
  viewTerms:    true,
  currentLawMst: null,        // 현재 열람 중인 법령 MST (법령 내부 조문 다이렉팅용)
  currentLawName: '',
  inlineSearch: { matches: [], idx: 0, lastQ: '' }
};

// ════════════════════════════════════════════════════════════════
// 초기화
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await loadTerms();
  setupHistory();
  showHomeSamples();
});

function initTheme() {
  setMode(localStorage.getItem('lv-theme') || 'dark');
}

async function loadTerms() {
  try { S.termDB = await API.getTerms() ?? {}; }
  catch { S.termDB = {}; }
}

// ════════════════════════════════════════════════════════════════
// 테마
// ════════════════════════════════════════════════════════════════
window.toggleTheme = () => setMode(
  document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light'
);

window.setMode = (mode) => {
  if (mode === 'light') {
    document.body.setAttribute('data-theme', 'light');
    $id('bLight')?.classList.add('active');
    $id('bDark')?.classList.remove('active');
  } else {
    document.body.removeAttribute('data-theme');
    $id('bDark')?.classList.add('active');
    $id('bLight')?.classList.remove('active');
  }
  localStorage.setItem('lv-theme', mode);
};

// ════════════════════════════════════════════════════════════════
// 페이지 전환
// ════════════════════════════════════════════════════════════════
function showPage(id) {
  ['home','subpage','detail'].forEach(p => {
    const el = $id(p);
    if (!el) return;
    const on = p === id;
    el.classList.toggle('active', on);
    el.style.display = on ? (p === 'detail' ? 'flex' : 'block') : 'none';
  });
}

window.goHome = () => {
  showPage('home');
  history.pushState({ page:'home' }, '', '/');
};

window.goSub = (tab) => {
  showPage('subpage');
  setSubNav(tab);
  renderSubContent(tab);
  history.pushState({ page:'subpage', tab }, '', `/${tab}`);
};

function setSubNav(active) {
  ['cases','laws','guide'].forEach(t => {
    $id(`sn-${t}`)?.classList.toggle('active', t === active);
  });
}

// ════════════════════════════════════════════════════════════════
// 서브 페이지
// ════════════════════════════════════════════════════════════════
function renderSubContent(tab) {
  const el = $id('subContent');
  if (!el) return;
  const map = { cases: caseSearchPage, laws: lawSearchPage, guide: guidePage };
  el.innerHTML = (map[tab] ?? (() => ''))();
  if (tab === 'cases') showCaseSamples();
  if (tab === 'laws')  showLawSamples();
}

function caseSearchPage() {
  return `
    <div class="sub-header"><h2>판례 검색</h2></div>
    <div class="sub-body">
      <div class="search-area">
        <div class="full-sb">
          <input id="cSrch" placeholder="사건번호, 키워드, 법령명..."
                 onkeydown="if(event.key==='Enter')window.doCaseSearch()">
          <button class="go-btn" onclick="window.doCaseSearch()">검색</button>
        </div>
        <div class="filter-row">
          <select class="fsel" id="cCourtOrg">
            <option value="">법원 종류 전체</option>
            <option value="400201">대법원</option>
            <option value="400202">하위법원</option>
          </select>
          <select class="fsel" id="cCourtNm">
            <option value="">법원명 전체</option>
            <option value="대법원">대법원</option>
            <option value="서울고등법원">서울고등법원</option>
            <option value="서울중앙지방법원">서울중앙지법</option>
            <option value="수원지방법원">수원지법</option>
            <option value="부산고등법원">부산고등법원</option>
            <option value="대전고등법원">대전고등법원</option>
            <option value="광주고등법원">광주고등법원</option>
          </select>
          <select class="fsel" id="cSearch">
            <option value="1">사건명 검색</option>
            <option value="2">본문 검색</option>
          </select>
          <select class="fsel" id="cSort">
            <option value="ddes">최신순</option>
            <option value="dasc">오래된순</option>
            <option value="lasc">사건명순</option>
          </select>
        </div>
      </div>
      <div id="cRes"><div class="hint-text">검색어를 입력하세요</div></div>
    </div>`;
}

function lawSearchPage() {
  const cats = ['형법','민법','헌법','상법','근로기준법','형사소송법','민사소송법',
                '행정소송법','의료법','저작권법','국세기본법','건축법'];
  return `
    <div class="sub-header"><h2>법령 데이터베이스</h2></div>
    <div class="sub-body">
      <div class="search-area">
        <div class="full-sb">
          <input id="lSrch" placeholder="법령명, 조문, 키워드..."
                 onkeydown="if(event.key==='Enter')window.doLawSearch()">
          <select class="fsel" id="lLawType">
            <option value="">전체</option>
            <option value="법률">법률</option>
            <option value="대통령령">대통령령</option>
            <option value="총리령">총리령</option>
            <option value="부령">부령</option>
          </select>
          <button class="go-btn" onclick="window.doLawSearch()">검색</button>
        </div>
      </div>
      <div class="law-cat-grid">
        ${cats.map(n => `<div class="lcat" onclick="window.doLawByKw('${n}')">${n}</div>`).join('')}
      </div>
      <div id="lRes"><div class="hint-text">법령을 검색하거나 분야를 선택하세요</div></div>
    </div>`;
}

function guidePage() {
  return `
    <div class="sub-header"><h2>사용 가이드</h2></div>
    <div class="sub-body">
      <div class="guide-grid">
        <article class="gcard">
          <h3>판례 열람</h3>
          <div class="gstep"><div class="snum">1</div><p>사건번호 또는 키워드로 검색합니다.</p></div>
          <div class="gstep"><div class="snum">2</div><p>결과 클릭 → 상세 뷰어로 이동합니다.</p></div>
          <div class="gstep"><div class="snum">3</div><p>본문 내 밑줄 용어 클릭 → 우측 패널 해설.</p></div>
          <div class="gstep"><div class="snum">4</div><p>파란색 법령 참조 클릭 → 팝업으로 조문 확인.</p></div>
        </article>
        <article class="gcard">
          <h3>법령 열람</h3>
          <div class="gstep"><div class="snum">1</div><p>법령 DB에서 법령명 검색 또는 카테고리 선택.</p></div>
          <div class="gstep"><div class="snum">2</div><p>좌측 목차로 원하는 조문 바로 이동.</p></div>
          <div class="gstep"><div class="snum">3</div><p>본문 내 "제N조" 참조 클릭 → 해당 조문 팝업.</p></div>
        </article>
        <article class="gcard">
          <h3>용어 사전</h3>
          <p>뷰어 우측 '용어 해설' → ⊞ 버튼으로 용어 추가·삭제.</p>
        </article>
        <article class="gcard">
          <h3>다이렉팅 기능</h3>
          <p><span style="color:var(--blue);">■</span> 파란색 = 법령 조문 참조</p>
          <p><span style="color:var(--green);">■</span> 초록색 = 판례 참조</p>
          <p><span style="color:var(--accent);">■</span> 노란 밑줄 = 법률 용어</p>
        </article>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
// 검색 — [FIX] 홈 탭 필터링 (가 문제)
// ════════════════════════════════════════════════════════════════
window.hTab = (t) => {
  S.homeType = t;
  ['all','case','law'].forEach(x =>
    $id(`ht-${x}`)?.classList.toggle('active', x === t)
  );
  // 탭 전환 시 기존 결과가 있으면 다시 검색
  const q = $v('hSrch');
  if (q) doHomeSearch();
};

window.doHomeSearch = async () => {
  const q   = $v('hSrch');
  const box = $id('homeResults');
  if (!box) return;
  if (!q) { box.innerHTML = '<div class="hint-text">검색어를 입력하세요</div>'; return; }
  box.innerHTML = loading();
  try {
    let html = '';
    // [FIX] 탭에 따라 판례만/법령만/전체 표시
    if (S.homeType === 'all') {
      const [cr, lr] = await Promise.allSettled([
        API.searchPrecedent(q, { display: 4 }),
        API.searchLaw(q, { display: 3 })
      ]);
      (cr.value?.items || []).forEach(i => html += caseCard(i));
      (lr.value?.items || []).forEach(i => html += lawCard(i));
    } else if (S.homeType === 'case') {
      const r = await API.searchPrecedent(q, { display: 7 });
      (r.items || []).forEach(i => html += caseCard(i));
    } else {
      const r = await API.searchLaw(q, { display: 7 });
      (r.items || []).forEach(i => html += lawCard(i));
    }
    box.innerHTML = html || empty();
  } catch (e) { box.innerHTML = err(e); }
};

// [FIX] 판례 검색 — 필터 실제 적용 (마 문제)
window.doCaseSearch = async () => {
  const q        = $v('cSrch');
  const courtOrg = $v('cCourtOrg');
  const courtNm  = $v('cCourtNm');
  const search   = +($v('cSearch') || 1);
  const sort     = $v('cSort') || 'ddes';
  const box      = $id('cRes');
  if (!box) return;
  if (!q) { showCaseSamples(); return; }
  box.innerHTML = loading();
  try {
    const r = await API.searchPrecedent(q, { display: 30, search, courtOrg, courtNm, sort });
    box.innerHTML = (r.items || []).map(caseCardBig).join('') || empty();
  } catch (e) { box.innerHTML = err(e); }
};

// [FIX] 법령 검색 — lawType 필터 적용 (마 문제)
window.doLawSearch = async () => runLawSearch($v('lSrch'));
window.doLawByKw   = async (kw) => {
  const el = $id('lSrch');
  if (el) el.value = kw;
  runLawSearch(kw, true);
};

async function runLawSearch(q, exact = false) {
  const box     = $id('lRes');
  const lawType = $v('lLawType') || '';
  if (!box) return;
  if (!q) { showLawSamples(); return; }
  box.innerHTML = loading();
  try {
    const r = await API.searchLaw(q, { display: 50, lawType });
    let items = r.items || [];
    if (exact && items.length) {
      const exact2 = items.filter(i => i.name === q);
      items = exact2.length ? exact2 : items.filter(i => i.name.includes(q));
    }
    box.innerHTML = items.map(lawCardBig).join('') || empty();
  } catch (e) { box.innerHTML = err(e); }
}

async function showCaseSamples() {
  const box = $id('cRes');
  if (!box) return;
  box.innerHTML = loading();
  try {
    const r = await API.searchPrecedent('형사', { display: 8 });
    box.innerHTML = (r.items || []).map(caseCardBig).join('') || empty();
  } catch { box.innerHTML = '<div class="hint-text">검색어를 입력하세요</div>'; }
}

async function showLawSamples() {
  const box = $id('lRes');
  if (!box) return;
  box.innerHTML = loading();
  try {
    const r = await API.searchLaw('법', { display: 8 });
    box.innerHTML = (r.items || []).map(lawCardBig).join('') || empty();
  } catch { box.innerHTML = '<div class="hint-text">법령을 검색하세요</div>'; }
}

async function showHomeSamples() {
  const box = $id('homeResults');
  if (!box) return;
  try {
    const [cr, lr] = await Promise.allSettled([
      API.searchPrecedent('형사', { display: 3 }),
      API.searchLaw('법', { display: 2 })
    ]);
    let html = '<div style="text-align:center;color:var(--text-muted);font-size:12px;margin-bottom:8px;">최근 데이터</div>';
    (cr.value?.items || []).forEach(i => html += caseCard(i));
    (lr.value?.items || []).forEach(i => html += lawCard(i));
    if (html.length > 80) box.innerHTML = html;
  } catch { /* 실패 무시 */ }
}

// ════════════════════════════════════════════════════════════════
// 상세 뷰어
// ════════════════════════════════════════════════════════════════
window.goDetail = async (type, id) => {
  if (!id || id === 'undefined') return;
  S.detail = { type, id };
  showPage('detail');
  history.pushState({ page:'detail', type, id }, '', `/${type}/${id}`);

  const body = $id('caseBody');
  body.innerHTML = loading();
  try {
    const data = type === 'case'
      ? await API.getPrecedentDetail(id)
      : await API.getLawDetail(id);
    if (!data) throw new Error('데이터 없음');
    renderDetail(type, data);
  } catch (e) { body.innerHTML = err(e); }
};

function renderDetail(type, data) {
  // 상단 헤더
  $id('dNum').textContent  = type === 'case' ? (data.caseNum || '판례') : (data.name || '법령');
  $id('dChip1').textContent = type === 'case' ? (data.court || '') : (data.type || '');
  $id('dChip2').textContent = type === 'case' ? (data.date  || '') : (data.enforcDate ? `시행 ${data.enforcDate}` : '');

  // [FIX] 사 문제 - 법률 열람 시 연계판례 탭 제거
  const tabs = $id('panelTabs');
  if (type === 'law') {
    tabs.innerHTML = '<div class="ptab active" id="pt-terms" onclick="showTab(\'terms\')">용어 해설</div>';
    $id('pc-related') && ($id('pc-related').style.display = 'none');
  } else {
    tabs.innerHTML = `
      <div class="ptab active" id="pt-terms" onclick="showTab('terms')">용어 해설</div>
      <div class="ptab" id="pt-related" onclick="showTab('related')">연계 판례</div>`;
    $id('pc-related') && ($id('pc-related').style.display = 'none');
  }

  // 좌측 TOC
  $id('panelLeft').innerHTML = type === 'case' ? buildCaseToc(data) : buildLawToc(data);

  // 중앙 본문
  $id('caseBody').innerHTML = type === 'case' ? renderCaseBody(data) : renderLawBody(data);

  // 법령 MST 저장 (법령 내부 다이렉팅용)
  if (type === 'law') {
    S.currentLawMst  = data.mst;
    S.currentLawName = data.name;
  } else {
    S.currentLawMst  = null;
    S.currentLawName = '';
  }

  attachTermClicks();
  attachLawRefClicks();

  const fullText = type === 'case'
    ? [data.summary, data.gist, data.refLaws, data.refCases, data.fullText].join(' ')
    : '';
  extractDocTerms(fullText || collectLawText(data.contents || []));

  if (type === 'case') {
    loadRelated(data);
  }
}

// 법령 본문에서 텍스트 수집 (용어 감지용)
function collectLawText(nodes) {
  let text = '';
  for (const n of nodes) {
    if (n.content) text += ' ' + n.content;
    if (n.paragraphs) {
      for (const p of n.paragraphs) {
        text += ' ' + p.content;
        for (const i of (p.items || [])) {
          text += ' ' + i.content;
          for (const s of (i.subitems || [])) text += ' ' + s.content;
        }
      }
    }
    if (n.children) text += ' ' + collectLawText(n.children);
  }
  return text;
}

// ════════════════════════════════════════════════════════════════
// 좌측 TOC
// ════════════════════════════════════════════════════════════════
function buildCaseToc(data) {
  const cfg = caseTypeConfig(data.caseNum || '');
  let h = `
    <div class="pst">정보</div>
    <div class="case-type-badge ${cfg.cls}">${cfg.name}</div>
    <div class="toc-info"><span class="ml">사건</span>${esc(data.caseNum)}</div>
    <div class="toc-info"><span class="ml">법원</span>${esc(data.court)}</div>
    <div class="toc-info"><span class="ml">선고</span>${esc(data.date)}</div>
    <div class="tdivider"></div>
    <div class="pst">섹션</div>
    <div class="toc active" onclick="scrollTo2('case-top',this)">판례 개요</div>`;
  if (data.summary)  h += `<div class="toc" onclick="scrollTo2('sec-summary',this)">판시사항</div>`;
  if (data.gist)     h += `<div class="toc" onclick="scrollTo2('sec-gist',this)">판결요지</div>`;
  if (data.refLaws)  h += `<div class="toc" onclick="scrollTo2('sec-reflaws',this)">참조조문</div>`;
  if (data.refCases) h += `<div class="toc" onclick="scrollTo2('sec-refcases',this)">참조판례</div>`;
  if (data.fullText) {
    const secs = [...data.fullText.matchAll(/【(.*?)】/g)];
    secs.forEach((m, i) => {
      h += `<div class="toc toc-case-section" onclick="scrollTo2('sec-ft-${i}',this)">${esc(m[1])}</div>`;
    });
  }
  return h;
}

// [FIX] 나 문제 — 가지번호 표시: "제22조의2"
function buildLawToc(data, nodes = data.contents || [], depth = 0) {
  if (depth === 0) {
    return '<div class="pst">법령 목차</div>' + tocTree(nodes, 0);
  }
  return tocTree(nodes, depth);
}

function tocTree(nodes, depth) {
  const indent = depth * 12;
  return nodes.map(n => {
    if (n.type === 'preamble') {
      return `<div class="toc toc-preamble" onclick="scrollTo2('preamble',this)"
               style="padding-left:${indent}px;font-style:italic;">전문(前文)</div>`;
    }
    if (['part','chapter','section','subsection'].includes(n.type)) {
      const cls = { part:'toc-part', chapter:'toc-chapter', section:'toc-section', subsection:'toc-subsection' }[n.type];
      return `<div class="toc ${cls}" style="padding-left:${indent}px;font-weight:bold;margin-top:4px;">${esc(n.title)}</div>`
           + tocTree(n.children || [], depth + 1);
    }
    if (n.type === 'article') {
      const artLabel = artNumLabel(n.num, n.branch);
      const titlePart = n.title ? ` <span class="toc-art-title">(${esc(n.title)})</span>` : '';
      return `<div class="toc toc-art" onclick="scrollTo2('art-${artId(n)}',this)"
               style="padding-left:${indent+12}px;font-size:0.9em;">${artLabel}${titlePart}</div>`;
    }
    return '';
  }).join('');
}

// 가지번호 포함 ID / 라벨 헬퍼
function artId(n) { return n.branch ? `${n.num}-${n.branch}` : n.num; }
function artNumLabel(num, branch) {
  if (branch) return `제${num}조의${branch}`;
  return `제${num}조`;
}

// ════════════════════════════════════════════════════════════════
// 중앙 본문 렌더링
// ════════════════════════════════════════════════════════════════
function renderCaseBody(data) {
  let h = '<div id="case-top"></div>';
  h += `<div class="case-hd">
    <div class="case-court-badge">${esc(data.court)}</div>
    <h1 class="case-title">${esc(data.caseNum)}</h1>
    <div class="case-meta">
      <span class="mi"><span class="ml">선고일</span>${esc(data.date)}</span>
      ${data.result ? `<span class="mi"><span class="ml">결과</span>${esc(data.result)}</span>` : ''}
    </div>
  </div>`;

  if (data.summary)  h += section('sec-summary',  '판시사항',  highlightTerms(highlightAllLawRefs(fmtText(data.summary))));
  if (data.gist)     h += section('sec-gist',     '판결요지',  highlightTerms(highlightAllLawRefs(fmtText(data.gist))));
  if (data.refLaws)  h += section('sec-reflaws',  '참조조문',  highlightAllLawRefs(fmtText(data.refLaws)));
  if (data.refCases) h += section('sec-refcases', '참조판례',  highlightCaseRefs(fmtText(data.refCases)));

  if (data.fullText) {
    let idx = 0;
    let body = data.fullText.replace(/【(.*?)】/g, (m) =>
      `<span id="sec-ft-${idx++}" class="ft-section-anchor">${m}</span>`
    );
    // [개선] 판례 본문 전체에서 법령 참조 다이렉팅
    body = highlightAllLawRefs(fmtText(body));
    // [개선] 판례 본문에서 판례 참조 다이렉팅
    body = highlightCaseRefs(body);
    h += `<div class="ls"><div class="lbody">${highlightTerms(body)}</div></div>`;
  }
  return h;
}

// [FIX] 나 문제 — 가지번호로 조문 렌더링
function renderLawBody(data) {
  const meta = [
    data.type       ? esc(data.type)              : '',
    data.enforcDate ? `시행 ${esc(data.enforcDate)}`   : '',
    data.department ? esc(data.department)        : ''
  ].filter(Boolean).join(' · ');

  return `<div class="case-hd">
    <h1 class="law-main-title">${esc(data.name)}</h1>
    ${meta ? `<div class="law-info-meta">${meta}</div>` : ''}
  </div>${renderLawNodes(data.contents || [])}`;
}

function renderLawNodes(nodes) {
  return nodes.map(n => {
    if (n.type === 'preamble') {
      return `<div class="ls law-preamble" id="preamble">
        <div class="lt">전문(前文)</div>
        <div class="lbody preamble-text">${fmtText(n.content)}</div>
      </div>`;
    }
    if (n.type === 'part')       return `<div class="law-hdr part">${esc(n.title)}</div>${renderLawNodes(n.children||[])}`;
    if (n.type === 'chapter')    return `<div class="law-hdr chapter">${esc(n.title)}</div>${renderLawNodes(n.children||[])}`;
    if (n.type === 'section')    return `<div class="law-hdr section">${esc(n.title)}</div>${renderLawNodes(n.children||[])}`;
    if (n.type === 'subsection') return `<div class="law-hdr subsection">${esc(n.title)}</div>${renderLawNodes(n.children||[])}`;
    if (n.type === 'article')    return renderArticle(n);
    return '';
  }).join('');
}

function renderArticle(a) {
  const label = artNumLabel(a.num, a.branch);
  const titleHtml = a.title ? ` <span class="art-title">(${esc(a.title)})</span>` : '';
  const paras = (a.paragraphs || []).map(p => {
    const items = (p.items || []).map(i => {
      const subs = (i.subitems || []).map(s =>
        `<div class="law-subitem"><span class="art-pt">${esc(s.num)}</span>${highlightTerms(highlightInternalRefs(esc(s.content)))}</div>`
      ).join('');
      return `<div class="law-item"><span class="art-pt">${esc(i.num)}</span>${highlightTerms(highlightInternalRefs(esc(i.content)))}${subs}</div>`;
    }).join('');
    return `<div class="law-para"><span class="art-pt">${esc(p.num)}</span>${highlightTerms(highlightInternalRefs(esc(p.content)))}${items}</div>`;
  }).join('');

  const bodyContent = a.content
    ? `<div class="art-body">${highlightTerms(highlightInternalRefs(esc(a.content)))}</div>`
    : '';

  return `<div class="ls law-article" id="art-${artId(a)}">
    <div class="lt"><span class="ln">${label}</span>${titleHtml}</div>
    <div class="lbody">${bodyContent}${paras}</div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════
// 법령 참조 하이라이트 — [FIX] 자/차 문제
// ════════════════════════════════════════════════════════════════

/**
 * [FIX] 모든 법령 참조 감지 (긴 법령명, 가지번호, 쉼표 연속 조문 지원)
 * 예: "형법 제30조", "특정범죄 가중처벌 등에 관한 법률 제5조의9"
 *     "형사소송법 제298조,제368조"
 */
function highlightAllLawRefs(html) {
  // 1) 법령명 + 제N조(의M)? (+ ,제N조(의M)?)*
  html = html.replace(
    /([가-힣]+(?:\s+[가-힣]+)*(?:법|령|법률|규칙))\s*(제\d+조(?:의\d+)?(?:\s*,\s*제\d+조(?:의\d+)?)*)/g,
    (match, lawName, articles) => {
      // 각 조문을 개별 링크로 분리
      const parts = articles.split(/\s*,\s*/);
      const linked = parts.map(art =>
        `<span class="law-ref" onclick="window.openLawModal('${lawName} ${art}')">${art}</span>`
      ).join(',');
      return `${lawName} ${linked}`;
    }
  );
  return html;
}

/**
 * [개선] 법령 내부에서 "제N조" 참조 감지 (같은 법 안에서의 다이렉팅)
 */
function highlightInternalRefs(html) {
  if (!S.currentLawMst) return html;
  // "제N조(의M)?" 형태 감지 (단, 앞에 법령명이 없는 경우만)
  return html.replace(
    /(?<![가-힣])(제(\d+)조(?:의(\d+))?)/g,
    (match, full, num, branch) => {
      const targetId = branch ? `art-${num}-${branch}` : `art-${num}`;
      return `<span class="internal-ref" onclick="window.scrollToArt('${targetId}')" title="${full} 이동">${full}</span>`;
    }
  );
}

/**
 * [개선] 판례 참조 다이렉팅 (원심판결, 참조판례)
 * 패턴: "대법원 2020. 1. 1. 선고 2019도1234 판결" 또는 "2019도1234"
 */
function highlightCaseRefs(html) {
  // 사건번호 패턴: YYYY + 한글기호 + 숫자
  return html.replace(
    /(\d{4}[가-힣]{1,3}\d+)/g,
    (match) => `<span class="case-ref" onclick="window.searchAndGoCase('${match}')" title="판례 검색: ${match}">${match}</span>`
  );
}

// ════════════════════════════════════════════════════════════════
// 용어 기능 — [FIX] 아 문제: 더 정확한 매칭
// ════════════════════════════════════════════════════════════════
function highlightTerms(html) {
  if (!S.viewTerms || !Object.keys(S.termDB).length) return html;

  // 긴 용어부터 매칭 (긴 것 우선)
  const terms = Object.keys(S.termDB).sort((a, b) => b.length - a.length);

  for (const t of terms) {
    // HTML 태그 내부는 건드리지 않는 안전한 치환
    const re = new RegExp(`(?<![가-힣a-zA-Z])(${reEsc(t)})(?![가-힣a-zA-Z"'<])`, 'g');
    html = html.replace(re, (m, p1) => {
      return `<span class="term" data-term="${esc(p1)}">${p1}</span>`;
    });
  }
  return html;
}

function attachTermClicks() {
  document.querySelectorAll('.term').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      showTermDef(el.dataset.term);
    };
  });
}

function attachLawRefClicks() {
  // law-ref, internal-ref, case-ref 는 onclick 인라인으로 처리
}

function showTermDef(term) {
  const td = S.termDB[term];
  const detail = $id('termDetail');
  const hint   = $id('termHint');
  if (!td || !detail) return;
  hint && (hint.style.display = 'none');
  detail.innerHTML = `
    <div class="tcrd selected">
      <div class="tw">${esc(term)}</div>
      ${td.hanja ? `<div class="th">${esc(td.hanja)}</div>` : ''}
      <div class="td">${esc(td.def)}</div>
    </div>`;
  showTab('terms');
}

function extractDocTerms(text) {
  const el = $id('autoTerms');
  if (!el) return;
  const found = Object.keys(S.termDB).filter(t => text.includes(t));
  if (!found.length) {
    el.innerHTML = '<div class="hint">등록된 용어를 찾지 못했습니다.</div>';
    return;
  }
  el.innerHTML = found.map(t => `
    <div class="tcrd" onclick="showTermDef('${reEsc(t)}')">
      <div class="tw ellipsis">${esc(t)}</div>
      <div class="td ellipsis">${esc(trunc(S.termDB[t].def,40))}</div>
    </div>`).join('');
}

window.showTermDef = showTermDef;

// ════════════════════════════════════════════════════════════════
// 연계 판례 (판례 전용)
// ════════════════════════════════════════════════════════════════
async function loadRelated(data) {
  const el = $id('relatedContent');
  if (!el) return;
  el.innerHTML = loading();
  try {
    const q = (data.caseName || data.caseNum || '').replace(/\d{4}/g,'').trim();
    if (!q) { el.innerHTML = '<div class="hint">연계 판례 정보 없음</div>'; return; }
    const r = await API.searchPrecedent(q, { display: 8, search: 2 });
    const items = (r.items || []).filter(i => i.id !== S.detail.id).slice(0, 5);
    if (!items.length) { el.innerHTML = '<div class="hint">연계 판례를 찾지 못했습니다.</div>'; return; }
    el.innerHTML = items.map(i => `
      <div class="rcrd" onclick="window.goDetail('case','${i.id}')">
        <div class="rtype">${esc(i.court)}</div>
        <div class="rnum">${esc(i.caseNum)}</div>
        <div class="rdate">${esc(i.date)}</div>
      </div>`).join('');
  } catch (e) { el.innerHTML = err(e); }
}

// ════════════════════════════════════════════════════════════════
// [개선] 판례 사건번호로 검색 후 이동
// ════════════════════════════════════════════════════════════════
window.searchAndGoCase = async (caseNum) => {
  try {
    const r = await API.searchPrecedent(caseNum, { display: 3 });
    const item = (r.items || [])[0];
    if (item && item.id) {
      window.goDetail('case', item.id);
    } else {
      alert(`판례 '${caseNum}'을(를) 찾지 못했습니다.`);
    }
  } catch (e) {
    alert('판례 검색 오류: ' + e.message);
  }
};

// ════════════════════════════════════════════════════════════════
// [개선] 법령 내부 조문 스크롤
// ════════════════════════════════════════════════════════════════
window.scrollToArt = (targetId) => {
  const target = $id(targetId);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // 잠시 하이라이트 효과
    target.classList.add('flash-highlight');
    setTimeout(() => target.classList.remove('flash-highlight'), 2000);
  }
};

// ════════════════════════════════════════════════════════════════
// 법령 팝업 모달 — [FIX] 자 문제: 긴 법령명 지원
// ════════════════════════════════════════════════════════════════
window.openLawModal = async (ref) => {
  const modal = $id('lawModal');
  if (!modal) return;
  $id('lmTitle').textContent = ref;
  $id('lmBody').innerHTML    = loading();
  modal.classList.add('show');

  try {
    let art = await API.getLawArticleByName(ref);
    let mst = null;

    if (!art) {
      // 폴백: 법령 전문 로드 후 트리 탐색
      const m = ref.match(/^(.+?)\s*제(\d+)조(?:의(\d+))?/);
      if (!m) { $id('lmBody').innerHTML = '<div class="hint-text">형식 오류</div>'; return; }
      const sr = await API.searchLaw(m[1], { display: 5 });
      let item = sr.items?.find(i => i.name === m[1]) || sr.items?.find(i => i.name.includes(m[1])) || sr.items?.[0];
      mst = item?.mst;
      if (!mst) { $id('lmBody').innerHTML = `<div class="hint-text">'${m[1]}' 법령을 찾지 못했습니다</div>`; return; }
      const ld = await API.getLawDetail(mst);
      art = findArt(ld.contents, m[2], m[3]);
      if (!art) { $id('lmBody').innerHTML = `<div class="hint-text">제${m[2]}조${m[3] ? '의'+m[3] : ''} 없음</div>`; return; }
      art.mst = mst;
    }

    const label = artNumLabel(art.num, art.branch);
    const titleHtml = art.title ? ` (${esc(art.title)})` : '';
    let h = `<div class="modal-art-title">${label}${titleHtml}</div>`;
    if (art.content) h += `<div class="modal-art-body">${fmtText(esc(art.content))}</div>`;
    (art.paragraphs || []).forEach(p => {
      h += `<div class="modal-art-para"><span class="modal-pt">${esc(p.num)}</span>${esc(p.content)}</div>`;
      (p.items || []).forEach(i => {
        h += `<div class="modal-art-item"><span class="modal-pt">${esc(i.num)}</span>${esc(i.content)}</div>`;
      });
    });
    $id('lmBody').innerHTML = h;

    const finalMst = art.mst || mst;
    $id('lmGoBtn').onclick = () => {
      modal.classList.remove('show');
      if (finalMst) window.goDetail('law', finalMst);
    };
  } catch (e) { $id('lmBody').innerHTML = err(e); }
};

window.closeLawModal = (e) => {
  if (e.target.id === 'lawModal') e.target.classList.remove('show');
};

// [FIX] 가지번호 포함 조문 찾기
function findArt(nodes, num, branch) {
  if (!Array.isArray(nodes)) return null;
  for (const n of nodes) {
    if (n.type === 'article' && n.num === num) {
      if (!branch || n.branch === branch) return n;
    }
    if (n.children) {
      const f = findArt(n.children, num, branch);
      if (f) return f;
    }
  }
  return null;
}

// ════════════════════════════════════════════════════════════════
// 용어 편집 모달
// ════════════════════════════════════════════════════════════════
window.openTermEdit = () => {
  $id('termEditModal')?.classList.add('show');
  renderTermList();
};
window.closeTermEdit = (e) => {
  if (e.target.id === 'termEditModal') e.target.classList.remove('show');
};

function renderTermList() {
  const list  = $id('termList');
  const count = $id('termCount');
  if (!list) return;
  const keys = Object.keys(S.termDB);
  if (count) count.textContent = `(${keys.length}개)`;
  list.innerHTML = keys.length
    ? keys.map(w => `
        <div class="term-list-item">
          <div class="term-list-word">${esc(w)}</div>
          <div class="term-list-def">${esc(trunc(S.termDB[w].def,50))}</div>
          <button class="term-del-btn" onclick="window.deleteTerm('${esc(w)}')">×</button>
        </div>`).join('')
    : '<div class="hint-text">등록된 용어 없음</div>';
}

window.submitAddTerm = async () => {
  const word = $v('nWord'), hanja = $v('nHanja'), def = $v('nDef');
  if (!word || !def) { alert('용어와 정의는 필수입니다.'); return; }
  try {
    await API.addTerm({ word, hanja, def });
    S.termDB[word] = { hanja, def };
    ['nWord','nHanja','nDef'].forEach(id => { const el = $id(id); if (el) el.value = ''; });
    renderTermList();
  } catch (e) { alert(e.message); }
};

window.deleteTerm = async (word) => {
  if (!confirm(`'${word}' 삭제?`)) return;
  try {
    await API.deleteTerm(word);
    delete S.termDB[word];
    renderTermList();
  } catch (e) { alert(e.message); }
};

// ════════════════════════════════════════════════════════════════
// 본문 내 검색 — [FIX] 라 문제: 두 글자 이상 검색 작동
// ════════════════════════════════════════════════════════════════
window.doInlineSearch = () => {
  const q    = $v('iSrch');
  const body = $id('caseBody');
  if (!body) return;

  // 기존 하이라이트 제거
  clearSearchHL();
  S.inlineSearch = { matches: [], idx: 0, lastQ: '' };
  updateCnt();

  if (!q || q.length < 1) return;

  S.inlineSearch.lastQ = q;

  // [FIX] TreeWalker로 텍스트 노드 수집 후 안전하게 치환
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      // 스크립트, 스타일 태그 내부 무시
      const parent = node.parentNode;
      if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes = [];
  let n;
  while ((n = walker.nextNode())) textNodes.push(n);

  const re = new RegExp(reEsc(q), 'gi');

  textNodes.forEach(tn => {
    if (!re.test(tn.nodeValue)) return;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    let match;
    while ((match = re.exec(tn.nodeValue)) !== null) {
      // 매치 전 텍스트
      if (match.index > lastIdx) {
        frag.appendChild(document.createTextNode(tn.nodeValue.slice(lastIdx, match.index)));
      }
      // 매치된 텍스트를 mark로 감싸기
      const mark = document.createElement('mark');
      mark.className = 'sh';
      mark.textContent = match[0];
      frag.appendChild(mark);
      lastIdx = re.lastIndex;
    }
    // 남은 텍스트
    if (lastIdx < tn.nodeValue.length) {
      frag.appendChild(document.createTextNode(tn.nodeValue.slice(lastIdx)));
    }
    tn.parentNode.replaceChild(frag, tn);
  });

  const marks = [...document.querySelectorAll('.sh')];
  S.inlineSearch.matches = marks;
  S.inlineSearch.idx     = 0;
  if (marks.length) {
    marks[0].classList.add('cur');
    marks[0].scrollIntoView({ behavior:'smooth', block:'center' });
  }
  updateCnt();
};

window.nextMatch = () => moveMatch(1);
window.prevMatch = () => moveMatch(-1);

function moveMatch(dir) {
  const m = S.inlineSearch.matches;
  if (!m.length) return;
  m[S.inlineSearch.idx]?.classList.remove('cur');
  S.inlineSearch.idx = (S.inlineSearch.idx + dir + m.length) % m.length;
  const cur = m[S.inlineSearch.idx];
  cur.classList.add('cur');
  cur.scrollIntoView({ behavior:'smooth', block:'center' });
  updateCnt();
}

function updateCnt() {
  const el = $id('iCnt');
  if (!el) return;
  const { matches, idx } = S.inlineSearch;
  el.textContent = matches.length ? `${idx+1}/${matches.length}` : '';
}

function clearSearchHL() {
  document.querySelectorAll('mark.sh').forEach(m => {
    const parent = m.parentNode;
    parent.replaceChild(document.createTextNode(m.textContent), m);
    parent.normalize(); // 인접 텍스트 노드 병합
  });
}

// ════════════════════════════════════════════════════════════════
// 하이라이트·폰트·진행도
// ════════════════════════════════════════════════════════════════
window.applyHighlight = () => {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const r = sel.getRangeAt(0);
  if (!r.toString().trim()) return;
  const sp = document.createElement('span');
  sp.className = 'uhl';
  sp.textContent = r.toString();
  r.deleteContents();
  r.insertNode(sp);
  sel.removeAllRanges();
};

window.clearHighlights = () =>
  document.querySelectorAll('.uhl').forEach(h => h.replaceWith(h.textContent));

// [FIX] 카 문제 — 글자 크기가 전체 본문에 적용
window.setFontSize = (v) => {
  const el = $id('caseBody');
  if (el) {
    el.style.fontSize = `${v}px`;
    // 모든 하위 요소에도 강제 적용
    el.querySelectorAll('.lbody, .art-body, .law-para, .law-item, .law-subitem, .case-title, .lt, .ln, .art-title, .ft-section-anchor').forEach(child => {
      child.style.fontSize = `${v}px`;
    });
  }
};

window.updateProgress = () => {
  const pc = $id('panelCenter');
  const pb = $id('readingProgress');
  if (!pc || !pb) return;
  const p = pc.scrollHeight - pc.clientHeight;
  pb.style.width = p > 0 ? `${(pc.scrollTop / p) * 100}%` : '0%';
};

// [FIX] 타 문제 — 용어 켜기/끄기 작동
window.toggleTermLayer = () => {
  S.viewTerms = !S.viewTerms;
  const body = $id('caseBody');
  if (body) {
    body.querySelectorAll('.term').forEach(el => {
      if (S.viewTerms) {
        el.classList.remove('term-hidden');
      } else {
        el.classList.add('term-hidden');
      }
    });
  }
  const btn = $id('btnTermToggle');
  if (btn) {
    btn.textContent = `법률 용어: ${S.viewTerms ? '켬' : '끔'}`;
    btn.classList.toggle('active', S.viewTerms);
  }
};

// ════════════════════════════════════════════════════════════════
// 스크롤 / TOC
// ════════════════════════════════════════════════════════════════
window.scrollTo2 = (id, el) => {
  const target = $id(id);
  if (!target) return;
  target.scrollIntoView({ behavior:'smooth', block:'start' });
  document.querySelectorAll('.toc').forEach(t => t.classList.remove('active'));
  el?.classList.add('active');
};

// ════════════════════════════════════════════════════════════════
// 탭 전환 (우측 패널)
// ════════════════════════════════════════════════════════════════
window.showTab = (tab) => {
  ['terms','related'].forEach(t => {
    const pc = $id(`pc-${t}`);
    const pt = $id(`pt-${t}`);
    if (pc) pc.style.display = t === tab ? 'block' : 'none';
    if (pt) pt.classList.toggle('active', t === tab);
  });
};

// ════════════════════════════════════════════════════════════════
// 히스토리 관리
// ════════════════════════════════════════════════════════════════
function setupHistory() {
  if (!history.state) history.replaceState({ page:'home' }, '', '/');
  window.addEventListener('popstate', (e) => {
    const s = e.state;
    if (!s) return;
    if (s.page === 'home') { showPage('home'); }
    else if (s.page === 'subpage') { showPage('subpage'); setSubNav(s.tab); renderSubContent(s.tab); }
    else if (s.page === 'detail') {
      S.detail = { type: s.type, id: s.id };
      showPage('detail');
      $id('caseBody').innerHTML = loading();
      (s.type === 'case' ? API.getPrecedentDetail(s.id) : API.getLawDetail(s.id))
        .then(d => { if (d) renderDetail(s.type, d); })
        .catch(e => { $id('caseBody').innerHTML = err(e); });
    }
  });
}

// ════════════════════════════════════════════════════════════════
// 카드 컴포넌트 — [개선] 라 문제: 좌측 색상 선으로 구분
// ════════════════════════════════════════════════════════════════
function caseCard(i) {
  return `<div class="ri ri-case" onclick="window.goDetail('case','${i.id}')">
    <div class="rc">판례</div>
    <div class="rt">${esc(i.caseNum)}</div>
    <div class="rtags"><span class="ts">${esc(i.court)}</span><span class="ts">${esc(i.date)}</span></div>
  </div>`;
}

function caseCardBig(i) {
  return `<div class="bri bri-case" onclick="window.goDetail('case','${i.id}')">
    <div>
      <div class="bri-court">${esc(i.court)}</div>
      <div class="bri-title">${esc(i.caseNum)}</div>
      ${i.caseName ? `<div class="bri-sub">${esc(trunc(i.caseName,80))}</div>` : ''}
    </div>
    <div><span class="badge badge-c">${esc(i.date)}</span></div>
  </div>`;
}

function lawCard(i) {
  return `<div class="ri ri-law" onclick="window.goDetail('law','${i.mst}')">
    <div class="rc rc-law">법령</div>
    <div class="rt">${esc(i.name)}</div>
    <div class="rtags"><span class="ts tlaw">${esc(i.type)}</span></div>
  </div>`;
}

function lawCardBig(i) {
  return `<div class="bri bri-law" onclick="window.goDetail('law','${i.mst}')">
    <div>
      <div class="bri-court">${esc(i.type)}</div>
      <div class="bri-title">${esc(i.name)}</div>
      ${i.department ? `<div class="bri-sub">${esc(i.department)}</div>` : ''}
    </div>
    <div><span class="badge badge-l">${esc(i.enforcDate||i.promulgDate||'')}</span></div>
  </div>`;
}

// ════════════════════════════════════════════════════════════════
// 사건 유형 판단
// ════════════════════════════════════════════════════════════════
function caseTypeConfig(num) {
  if (!num) return { name:'일반재판', cls:'default' };
  if (num.includes('헌'))        return { name:'헌법재판', cls:'const' };
  if (/[드르느]/.test(num))      return { name:'가사재판', cls:'family' };
  if (/[푸로오]/.test(num))      return { name:'소년보호', cls:'juvenile' };
  if (num.includes('도'))        return { name:'형사재판', cls:'criminal' };
  if (/[나다]/.test(num))        return { name:'민사재판', cls:'civil' };
  if (num.includes('두'))        return { name:'행정재판', cls:'admin' };
  return { name:'일반재판', cls:'default' };
}

// ════════════════════════════════════════════════════════════════
// 유틸
// ════════════════════════════════════════════════════════════════
const $id = (id)   => document.getElementById(id);
const $v  = (id)   => ($id(id)?.value ?? '').trim();
const esc = (s)    => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const reEsc = (s)  => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const trunc = (s,n)=> String(s).length > n ? String(s).slice(0,n)+'…' : String(s);
const loading = () => '<div class="loading-wrap"><div class="spinner"></div></div>';
const empty   = () => '<div class="hint-text">검색 결과가 없습니다.</div>';
const err     = (e) => `<div class="hint-text err">오류: ${esc(e.message)}</div>`;
const section = (id, title, body) =>
  `<div class="ls" id="${id}"><div class="lt">${title}</div><div class="lbody">${body}</div></div>`;
const fmtText = (s) => String(s ?? '').replace(/\n/g,'<br>');
