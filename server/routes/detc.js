// server/routes/detc.js
'use strict';

const express = require('express');
const router  = express.Router();
const lawApi  = require('../lawApi');

// GET /api/detc/search
router.get('/search', async (req, res) => {
  try {
    const { query='', page=1, display=20, sort='ddes' } = req.query;
    const data = await lawApi.searchDetc({ query, page: +page, display: +display, sort });

    const root = data?.DetcSearch ?? data;
    if (!root?.detc) return res.json({ total: 0, page: +page, items: [] });

    const arr = Array.isArray(root.detc) ? root.detc : [root.detc];
    res.json({
      total: +root.totalCnt || arr.length,
      page: +page,
      items: arr.map(d => ({
        id:       safe(d.헌재결정례일련번호),
        caseNum:  safe(d.사건번호),
        caseName: safe(d.사건명),
        date:     safe(d.종국일자),
        court:    '헌법재판소',
        type:     'detc'
      }))
    });
  } catch (err) {
    console.error('[헌재 검색]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/detc/detail/:id
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID 필요' });

    const data = await lawApi.getDetcDetail(id);
    const root = data?.DetcService ?? data;
    if (!root) return res.status(404).json({ error: '헌재결정례 없음' });

    res.json({
      id,
      caseNum:   safe(root.사건번호),
      caseName:  safe(root.사건명),
      court:     '헌법재판소',
      date:      safe(root.종국일자),
      type:      'detc',
      summary:   clean(root.판시사항),
      gist:      clean(root.결정요지),
      refLaws:   clean(root.심판대상조문 || '') + '\n' + clean(root.참조조문 || ''),
      refCases:  clean(root.참조판례),
      fullText:  clean(root.전문 || root.헌재결정례내용)
    });
  } catch (err) {
    console.error('[헌재 상세]', err.message);
    res.status(500).json({ error: err.message });
  }
});

function safe(val) {
  if (val == null) return '';
  if (typeof val === 'object') {
    if (val._) return String(val._).trim();
    if (Array.isArray(val)) return safe(val[0]);
    return '';
  }
  return String(val).trim();
}

function clean(text) {
  if (!text) return '';
  return String(text).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').trim();
}

module.exports = router;