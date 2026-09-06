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
    levelBtns: Array.from(document.querySelectorAll('.level-btn')),
    levelRow: $('#level-row'),
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
  let level = 0;
  let rolling = false;

  function setMode(m) {
    mode = m;
    els.modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    const tx = MODE_TEXT[m];
    els.topicLabel.textContent = tx.label;
    els.topicOpt.textContent = tx.opt;
    els.topic.placeholder = tx.ph;
    els.heroSub.textContent = tx.sub;
    els.levelRow.classList.toggle('hidden', m === 'direct');
    if (!rolling) els.hint.textContent = tx.hint;
  }
  els.modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

  function setLevel(l) {
    level = Number(l);
    els.levelBtns.forEach(b => b.classList.toggle('active', Number(b.dataset.level) === level));
  }
  els.levelBtns.forEach(b => b.addEventListener('click', () => setLevel(b.dataset.level)));

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

  function spinTo(rx, ry, done) {
    const setFinal = () => {
      els.dice.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
    };
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !els.dice.animate) {
      setFinal();
      done();
      return;
    }
    const anim = els.dice.animate([
      { transform: 'rotateX(0deg) rotateY(0deg) rotateZ(0deg)', offset: 0 },
      { transform: 'rotateX(180deg) rotateY(130deg) rotateZ(90deg)', offset: .3 },
      { transform: 'rotateX(390deg) rotateY(310deg) rotateZ(180deg)', offset: .6 },
      { transform: 'rotateX(600deg) rotateY(440deg) rotateZ(240deg)', offset: .85 },
      { transform: 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) rotateZ(0deg)', offset: 1 }
    ], {
      duration: 1200,
      easing: 'cubic-bezier(.2, .7, .3, 1)',
      fill: 'forwards'
    });
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setFinal();
      try { anim.cancel(); } catch (e) { }
      done();
    };
    anim.onfinish = finish;
    setTimeout(finish, 1400);
  }

  function doRoll() {
    if (rolling) return;
    const q = els.topic.value.trim();
    if (mode === 'direct' && !q) {
      toast('📝 直答模式：先在上方填你的问题');
      els.topic.focus();
      return;
    }
    const cards = mode === 'direct' ? DiceCore.rollDirect(q) : DiceCore.roll(q, level);

    const face = 1 + Math.floor(Math.random() * 6);
    const turns = 360 * (2 + Math.floor(Math.random() * 2));
    const rx = FACE_ROT[face][0] + turns;
    const ry = FACE_ROT[face][1] + turns;

    rolling = true;
    els.dice.setAttribute('aria-busy', 'true');
    els.hint.textContent = '🎲 骰子飞旋中…';
    spinTo(rx, ry, () => {
      rolling = false;
      els.dice.removeAttribute('aria-busy');
      renderCards(cards);
      els.hint.textContent = mode === 'direct' ? '换个角度再摇一次？' : '再来一次？';
    });
  }

  els.dice.addEventListener('click', doRoll);
  els.reroll.addEventListener('click', doRoll);

  const qs = new URLSearchParams(location.search);
  if (qs.has('selftest')) {
    if (qs.get('mode') === 'direct') {
      setMode('direct');
      els.topic.value = '给我取个网名';
    } else if (qs.get('level')) {
      setLevel(qs.get('level'));
    }
    setTimeout(() => els.dice.click(), 400);
    setTimeout(() => {
      const n = els.results.querySelectorAll('.card').length;
      const ok = n === 3 && els.results.querySelector('.card .prompt').textContent.length > 0;
      document.title = ok ? 'SELFTEST PASS' : 'SELFTEST FAIL n=' + n;
    }, 2800);
  }
})();
