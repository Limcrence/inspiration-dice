(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const els = {
    dice: $('#dice'),
    hint: $('#dice-hint'),
    topic: $('#in-topic'),
    tabs: Array.from(document.querySelectorAll('.tab')),
    panelOnline: $('#panel-online'),
    results: $('#results'),
    reroll: $('#btn-reroll'),
    toast: $('#toast'),
    inBase: $('#in-base'),
    inKey: $('#in-key'),
    inModel: $('#in-model'),
    btnSave: $('#btn-save'),
    btnClear: $('#btn-clear')
  };

  const LS_KEY = 'idice.settings';
  const FACE_ROT = { 1: [0, 0], 2: [0, 180], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 6: [90, 0] };

  let mode = 'offline';
  let rolling = false;
  let aiBusy = false;
  let settings = loadSettings();

  function loadSettings() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function persistSettings(s) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) { }
  }

  function fillSettingsForm() {
    if (settings.base) els.inBase.value = settings.base;
    if (settings.key) els.inKey.value = settings.key;
    if (settings.model) els.inModel.value = settings.model;
  }
  fillSettingsForm();

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

  els.tabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));

  function setMode(m) {
    mode = m;
    els.tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === m));
    els.panelOnline.classList.toggle('hidden', m !== 'online');
    els.hint.textContent = m === 'online' ? '点一下，AI 直接给你 3 个点子' : '点一下，摇出 3 个想法';
  }

  els.btnSave.addEventListener('click', () => {
    settings = {
      base: els.inBase.value.trim(),
      key: els.inKey.value.trim(),
      model: els.inModel.value.trim()
    };
    if (!settings.base || !settings.key || !settings.model) { toast('三项都要填哦'); return; }
    persistSettings(settings);
    toast('已保存到本地浏览器 ✓');
  });

  els.btnClear.addEventListener('click', () => {
    settings = {};
    try { localStorage.removeItem(LS_KEY); } catch (e) { }
    els.inBase.value = els.inKey.value = els.inModel.value = '';
    toast('已清除本地配置');
  });

  async function copyText(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e2) { }
      document.body.removeChild(ta);
    }
    btn.classList.add('done');
    const old = btn.textContent;
    btn.textContent = '✓ 已复制';
    setTimeout(() => { btn.classList.remove('done'); btn.textContent = old; }, 1600);
  }

  function makeChip(text, cls) {
    const s = document.createElement('span');
    s.className = 'chip' + (cls ? ' ' + cls : '');
    s.textContent = text;
    return s;
  }

  function buildCard(c, i) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.idx = String(i);

    const head = document.createElement('div');
    head.className = 'card-head';
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = c.tech.i + ' ' + c.tech.name;
    badge.title = c.tech.d;
    const chips = document.createElement('div');
    chips.className = 'chips';
    c.words.forEach(w => chips.appendChild(makeChip(w.i + ' ' + w.t, '')));
    chips.appendChild(makeChip('🚧 ' + c.constraint, 'con'));
    head.appendChild(badge);
    head.appendChild(chips);
    const topicLine = document.createElement('div');
    topicLine.className = 'topic-line';
    topicLine.textContent = '🎯 ' + c.topic;
    head.appendChild(topicLine);
    card.appendChild(head);

    const promptBox = document.createElement('div');
    promptBox.className = 'prompt';
    promptBox.textContent = c.prompt;

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    if (mode === 'offline') {
      card.appendChild(promptBox);

      const demo = document.createElement('div');
      demo.className = 'demo';
      const dt = document.createElement('div');
      dt.className = 'demo-title';
      dt.textContent = '💡 用词 → 三步跳跃 · 以「' + c.demo.t + '」为例';
      demo.appendChild(dt);
      const mk = (pre, txt) => {
        const p = document.createElement('div');
        const b = document.createElement('b');
        b.textContent = pre;
        p.appendChild(b);
        p.appendChild(document.createTextNode(txt));
        return p;
      };
      demo.appendChild(mk('① 属性　', c.demo.a));
      demo.appendChild(mk('② 模式　', c.demo.p));
      demo.appendChild(mk('③ 映射　', c.demo.m));
      card.appendChild(demo);

      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = '📋 复制提示语';
      copyBtn.addEventListener('click', () => copyText(c.prompt, copyBtn));
      actions.appendChild(copyBtn);
    } else {
      const ai = document.createElement('div');
      ai.className = 'ai-box busy';
      ai.textContent = 'AI 思考中…';
      ai.dataset.role = 'ai';
      const det = document.createElement('details');
      const sum = document.createElement('summary');
      sum.textContent = '查看原始提示语';
      det.appendChild(sum);
      det.appendChild(promptBox);
      card.appendChild(ai);
      card.appendChild(det);

      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = '📋 复制';
      copyBtn.addEventListener('click', () => {
        const aiEl = card.querySelector('[data-role=ai]');
        const done = aiEl && !aiEl.classList.contains('busy');
        copyText(done ? aiEl.textContent : c.prompt, copyBtn);
      });
      actions.appendChild(copyBtn);
    }

    card.appendChild(actions);
    return card;
  }

  function renderCards(cards) {
    els.results.innerHTML = '';
    cards.forEach((c, i) => els.results.appendChild(buildCard(c, i)));
    els.reroll.classList.remove('hidden');
  }

  function doRoll() {
    if (rolling || aiBusy) return;
    const cards = DiceCore.roll(els.topic.value);

    const face = 1 + Math.floor(Math.random() * 6);
    const turns = 360 * (2 + Math.floor(Math.random() * 2));
    const rx0 = FACE_ROT[face][0];
    const ry0 = FACE_ROT[face][1];
    els.dice.style.setProperty('--rx', (rx0 + turns) + 'deg');
    els.dice.style.setProperty('--ry', (ry0 + turns) + 'deg');

    rolling = true;
    els.dice.classList.add('rolling');
    els.dice.setAttribute('aria-busy', 'true');
    els.hint.textContent = '🎲 骰子飞旋中…';

    setTimeout(() => {
      els.dice.classList.remove('rolling');
      els.dice.style.transform = 'rotateX(var(--rx)) rotateY(var(--ry))';
      els.dice.removeAttribute('aria-busy');
      rolling = false;
      renderCards(cards);
      els.hint.textContent = mode === 'online' ? '再点一次，AI 重新出点子' : '再来一次？';
      if (mode === 'online') aiGenerate(cards);
    }, 1300);
  }

  els.dice.addEventListener('click', doRoll);
  els.reroll.addEventListener('click', doRoll);

  async function aiGenerate(cards) {
    if (!settings.base || !settings.key || !settings.model) {
      toast('还没配好 AI（记得点保存）——先给你提示语了，去上方填一下吧');
      els.panelOnline.classList.remove('hidden');
      els.panelOnline.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    aiBusy = true;
    els.dice.disabled = true;
    els.reroll.disabled = true;
    try {
      const text = await callAI(cards.map(c => c.prompt));
      const blocks = parseAI(text);
      els.results.querySelectorAll('[data-role=ai]').forEach((el, i) => {
        const got = blocks[i];
        el.textContent = got ? got : '（AI 没给出这一条，复制提示语去问别的 AI 吧）';
        el.classList.remove('busy');
      });
      toast('✨ 3 个点子到手，拿去折腾吧');
    } catch (err) {
      toast('AI 调用失败：' + err.message);
      els.results.querySelectorAll('[data-role=ai]').forEach(el => {
        el.textContent = '（AI 调用失败，下面的原始提示语仍然可以用）';
        el.classList.remove('busy');
      });
    } finally {
      aiBusy = false;
      els.dice.disabled = false;
      els.reroll.disabled = false;
    }
  }

  async function callAI(prompts) {
    let base = settings.base.trim().replace(/\/+$/, '');
    const url = /\/chat\/completions$/.test(base) ? base : base + '/chat/completions';

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    let res;
    try {
      res = await fetch(url, {
        signal: ctrl.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + settings.key.trim()
        },
        body: JSON.stringify({
          model: settings.model.trim(),
          stream: false,
          messages: [
            {
              role: 'system',
              content: '你是发散思维提示引擎。点子要有"诶？这也能想到"的意外感，但必须具体、能落地、普通人看得懂，禁止只有比喻没有操作的黑话；先读懂话题里的情绪诉求（如"不痛苦""没动力"），方案要正面解决它，禁止只给通用方法论；轻快短句，中文为主；先发散后收敛。'
            },
            {
              role: 'user',
              content: '针对下面 3 条提示，各给 1 个不寻常的想法，共 3 条。输出格式为：\n【1】…\n【2】…\n【3】…\n\n'
                + prompts.map((p, i) => '【提示' + (i + 1) + '】' + p).join('\n\n')
            }
          ]
        })
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error('HTTP ' + res.status + (detail ? ' ' + detail.slice(0, 120) : ''));
    }
    const data = await res.json();
    const msg = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
      || (data.error && data.error.message) || '';
    if (!msg) throw new Error('接口返回格式看不懂，请检查地址和模型名');
    return msg;
  }

  function parseAI(text) {
    let t = String(text).replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
    let items = t.split(/\n(?=【\d】)/).map(b => b.replace(/^【\d】\s*/, '').trim());
    if (items.length < 2) {
      items = t.split(/\n(?=\d+[\.、）])/).map(b => b.replace(/^\d+[\.、）]\s*/, '').trim());
    }
    if (!items.length || (items.length === 1 && !items[0])) items = [t];
    return items;
  }

  const qs = new URLSearchParams(location.search);
  if (qs.has('selftest')) {
    setTimeout(() => els.dice.click(), 400);
    setTimeout(() => {
      const n = els.results.querySelectorAll('.card').length;
      document.title = n === 3 ? 'SELFTEST PASS' : 'SELFTEST FAIL n=' + n;
    }, 2800);
  }
})();
