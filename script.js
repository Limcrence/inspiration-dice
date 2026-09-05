(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const els = {
    dice: $('#dice'),
    hint: $('#dice-hint'),
    topic: $('#in-topic'),
    results: $('#results'),
    reroll: $('#btn-reroll'),
    toast: $('#toast'),
    helpBtn: $('#btn-help'),
    helpModal: $('#help-modal'),
    helpClose: $('#btn-help-close'),
    modeBtns: Array.from(document.querySelectorAll('.mode-btn')),
    topicLabel: $('#topic-label'),
    topicOpt: $('#topic-opt'),
    heroSub: $('#hero-sub')
  };

  const MODE_TEXT = {
    brain: {
      label: '想脑暴什么？',
      opt: '（可留空，随机给话题）',
      ph: '例如：怎么让背单词不痛苦',
      hint: '点一下，摇出 3 个想法',
      sub: '想不出好点子？摇一下——让概率替你做发散。'
    },
    direct: {
      label: '你想要什么答案？',
      opt: '（直答模式请填问题，如取网名、求推荐）',
      ph: '例如：给我取个网名，我想要有个性的',
      hint: '点一下，直接摇出 3 种答题姿势',
      sub: '别绕弯子——让 AI 直接给你能用的答案。'
    }
  };

  let mode = 'brain';
  let rolling = false;

  function setMode(m) {
    mode = m;
    els.modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    const tx = MODE_TEXT[m];
    els.topicLabel.textContent = tx.label;
    els.topicOpt.textContent = tx.opt;
    els.topic.placeholder = tx.ph;
    els.heroSub.textContent = tx.sub;
    if (!rolling) els.hint.textContent = tx.hint;
  }
  els.modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

  els.helpBtn.addEventListener('click', () => els.helpModal.classList.remove('hidden'));
  function closeHelp() { els.helpModal.classList.add('hidden'); }
  els.helpClose.addEventListener('click', closeHelp);
  els.helpModal.addEventListener('click', e => { if (e.target === els.helpModal) closeHelp(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeHelp(); });

  const FACE_ROT = { 1: [0, 0], 2: [0, 180], 3: [0, -90], 4: [0, 90], 5: [-90, 0], 6: [90, 0] };

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove('show'), 2200);
  }

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
    if (c.constraint) chips.appendChild(makeChip('🚧 ' + c.constraint, 'con'));
    head.appendChild(badge);
    if (c.words.length || c.constraint) head.appendChild(chips);
    const topicLine = document.createElement('div');
    topicLine.className = 'topic-line';
    topicLine.textContent = '🎯 ' + c.topic;
    head.appendChild(topicLine);
    card.appendChild(head);

    const promptBox = document.createElement('div');
    promptBox.className = 'prompt';
    promptBox.textContent = c.prompt;
    card.appendChild(promptBox);

    if (c.demo) {
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
    }

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = '📋 复制提示语';
    copyBtn.addEventListener('click', () => copyText(c.prompt, copyBtn));
    actions.appendChild(copyBtn);
    card.appendChild(actions);

    return card;
  }

  function renderCards(cards) {
    els.results.innerHTML = '';
    cards.forEach((c, i) => els.results.appendChild(buildCard(c, i)));
    els.reroll.classList.remove('hidden');
  }

  function doRoll() {
    if (rolling) return;
    const q = els.topic.value.trim();
    if (mode === 'direct' && !q) {
      toast('📝 直答模式：先在上方填你的问题');
      els.topic.focus();
      return;
    }
    const cards = mode === 'direct' ? DiceCore.rollDirect(q) : DiceCore.roll(q);

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
      els.hint.textContent = mode === 'direct' ? '换个角度再摇一次？' : '再来一次？';
    }, 1300);
  }

  els.dice.addEventListener('click', doRoll);
  els.reroll.addEventListener('click', doRoll);

  const qs = new URLSearchParams(location.search);
  if (qs.has('selftest')) {
    if (qs.get('mode') === 'direct') {
      setMode('direct');
      els.topic.value = '给我取个网名';
    }
    setTimeout(() => els.dice.click(), 400);
    setTimeout(() => {
      const n = els.results.querySelectorAll('.card').length;
      const ok = n === 3 && els.results.querySelector('.card .prompt').textContent.length > 0;
      document.title = ok ? 'SELFTEST PASS' : 'SELFTEST FAIL n=' + n;
    }, 2800);
  }
})();
