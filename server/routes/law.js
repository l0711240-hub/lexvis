const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const LAWS_FILE = path.join(__dirname, '../../data/laws.json');

function readLocalLaws() {
  try { return JSON.parse(fs.readFileSync(LAWS_FILE, 'utf8')); }
  catch { return []; }
}
function apiAvailable() {
  const oc = process.env.LAW_API_OC;
  return !!(oc && oc !== 'your_oc_id_here' && oc.trim() !== '여기에_발급받은_OC_아이디_입력');
}

// 💡 헬퍼 함수: 계층형 구조(contents)에서 조문을 재귀적으로 찾는 함수
function findArticleInContents(contents, joNum) {
  if (!contents) return null;
  for (const node of contents) {
    if (node.type === 'article' && String(node.num) === String(joNum)) {
      return node;
    }
    if (node.children) {
      const found = findArticleInContents(node.children, joNum);
      if (found) return found;
    }
  }
  return null;
}

// 💡 헬퍼 함수: 계층형 구조 내에 검색어가 포함되어 있는지 확인
function checkKeywordInContents(contents, ql) {
  if (!contents) return false;
  return contents.some(node => {
    const match = (node.title || '').toLowerCase().includes(ql) || (node.content || '').toLowerCase().includes(ql);
    if (match) return true;
    if (node.children) return checkKeywordInContents(node.children, ql);
    return false;
  });
}

// 1. 법령 검색
router.get('/search', async (req, res) => {
  const { query = '', display = 20 } = req.query;
  const local = readLocalLaws();
  const ql = query.toLowerCase().trim();

  const results = local.filter(l => {
    if (!ql) return true;
    const nameMatch = l.name.toLowerCase().includes(ql) || (l.department || '').includes(ql);
    
    // 💡 옛날 구조(articles)와 새 구조(contents) 모두 안전하게 검사
    const artMatch = l.articles && Array.isArray(l.articles) 
                     ? l.articles.some(a => (a.title || '').includes(ql) || (a.content || '').includes(ql))
                     : false;
    const contMatch = checkKeywordInContents(l.contents, ql);

    return nameMatch || artMatch || contMatch;
  });

  if (apiAvailable() && ql) {
    try {
      const { searchLaw } = require('../lawApi');
      const apiData = await searchLaw({ query, page: 1, display: +display });
      const root = apiData?.LawSearch;
      const apiItems = root?.law
        ? (Array.isArray(root.law) ? root.law : [root.law]).map(l => ({
            mst: l.법령MST, name: l.법령명한글, type: l.법령구분명,
            department: l.소관부처명, promulgDate: l.공포일자,
            enforcDate: l.시행일자, source: 'api',
          }))
        : [];
      const merged = [
        ...results.map(l => ({...l, source:'local'})),
        ...apiItems.filter(a => !results.some(ll => ll.name === a.name)),
      ];
      return res.json({ total: merged.length, items: merged });
    } catch(e) { console.warn('[API 실패, 로컬만 사용]', e.message); }
  }

  res.json({ total: results.length, items: results.map(l => ({...l, source:'local'})) });
});

// 2. 법령 본문
router.get('/detail/:mst', async (req, res) => {
  const mst = req.params.mst;
  const local = readLocalLaws();
  const found = local.find(l => l.mst === mst || l.name === mst);
  if (found) return res.json({...found, source:'local'});

  if (apiAvailable()) {
    try {
      const { getLawDetail } = require('../lawApi');
      const raw  = await getLawDetail(mst);
      const root = raw?.법령;
      if (!root) return res.status(404).json({ error: '법령을 찾을 수 없습니다.' });
      
      const 조문편장 = root?.조문?.조문단위;
      const articles = [];
      if (조문편장) {
        const arr = Array.isArray(조문편장) ? 조문편장 : [조문편장];
        arr.forEach(u => {
          const 항 = u?.항 ? (Array.isArray(u.항)?u.항:[u.항]) : [];
          articles.push({ 
            num: u?.조문번호||'', 
            title: u?.조문제목||'', 
            content: u?.조문내용||'',
            paragraphs: 항.map(h => ({ num: h?.항번호||'', content: h?.항내용||'' })) // 💡 paragraphs로 통일
          });
        });
      }
      return res.json({
        mst, name: root?.기본정보?.법령명한글||'', type: root?.기본정보?.법령구분명||'',
        department: root?.기본정보?.소관부처명||'',
        promulgDate: root?.기본정보?.공포일자||'', enforcDate: root?.기본정보?.시행일자||'',
        articles, source: 'api',
      });
    } catch(e) { console.error('[법령 API 오류]', e.message); }
  }
  res.status(404).json({ error: '법령을 찾을 수 없습니다.' });
});

// 3. 조문 팝업용 (핵심 수정 구역)
router.get('/article', async (req, res) => {
  const { mst, jo } = req.query;
  if (!mst || !jo) return res.status(400).json({ error: 'mst, jo 필요' });

  const local = readLocalLaws();
  const law = local.find(l => l.mst === mst || l.name === mst);
  
  if (law) {
    // 💡 새 구조(contents)에서 먼저 찾고, 없으면 구 구조(articles)에서 찾음
    let art = findArticleInContents(law.contents, jo);
    if (!art && law.articles) {
      art = law.articles.find(a => String(a.num) === String(jo));
    }
    
    if (art) return res.json(art);
  }

  if (apiAvailable()) {
    try {
      const { getLawArticle } = require('../lawApi');
      const raw  = await getLawArticle(mst, jo);
      const unit = raw?.법령?.조문?.조문단위;
      if (!unit) return res.status(404).json({ error: '조문 없음' });
      const u = Array.isArray(unit) ? unit[0] : unit;
      const 항 = u?.항 ? (Array.isArray(u.항)?u.항:[u.항]) : [];
      return res.json({ 
        num: u?.조문번호||jo, 
        title: u?.조문제목||'', 
        content: u?.조문내용||'',
        paragraphs: 항.map(h => ({ num: h?.항번호||'', content: h?.항내용||'' })) // 💡 구조 통일
      });
    } catch(e) { console.error('[조문 API 오류]', e.message); }
  }
  res.status(404).json({ error: '조문을 찾을 수 없습니다.' });
});

// 로컬 법령 추가/삭제는 기존과 동일하게 유지...
router.post('/local', (req, res) => {
  const laws = readLocalLaws();
  const entry = { mst:'local-law-'+Date.now(), articles:[], contents:[], ...req.body };
  laws.push(entry);
  fs.writeFileSync(LAWS_FILE, JSON.stringify(laws, null, 2), 'utf8');
  res.json({ ok:true, mst:entry.mst });
});

router.delete('/local/:mst', (req, res) => {
  let laws = readLocalLaws();
  const before = laws.length;
  laws = laws.filter(l => l.mst !== req.params.mst);
  if (laws.length === before) return res.status(404).json({ error: '없는 법령' });
  fs.writeFileSync(LAWS_FILE, JSON.stringify(laws, null, 2), 'utf8');
  res.json({ ok:true });
});

module.exports = router;