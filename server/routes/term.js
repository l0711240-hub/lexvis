// server/routes/term.js
'use strict';

const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');

const FILE = path.join(__dirname, '../../data/terms.json');

const read  = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } };
const write = (d) => { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); };

router.get('/', (_req, res) => res.json(read()));

router.post('/', (req, res) => {
  const { word, hanja='', def } = req.body;
  if (!word || !def) return res.status(400).json({ error: 'word, def 필수' });
  const terms = read();
  terms[word] = { hanja, def };
  write(terms);
  res.json({ ok: true });
});

router.delete('/:word', (req, res) => {
  const terms = read();
  const word  = decodeURIComponent(req.params.word);
  if (!terms[word]) return res.status(404).json({ error: '없는 용어' });
  delete terms[word];
  write(terms);
  res.json({ ok: true });
});

module.exports = router;
