(() => {
  if (window.__etypingAutoSolverLoaded) return;
  window.__etypingAutoSolverLoaded = true;

  const root = document.createElement('div');
  root.id = 'etyping-auto-solver-ui';
  root.style.position = 'fixed';
  root.style.right = '16px';
  root.style.bottom = '16px';
  root.style.zIndex = '2147483647';
  root.style.background = '#111827';
  root.style.color = '#f9fafb';
  root.style.border = '1px solid #374151';
  root.style.borderRadius = '12px';
  root.style.padding = '10px 12px';
  root.style.fontFamily = 'sans-serif';
  root.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
  root.style.fontSize = '13px';

  const status = document.createElement('div');
  status.textContent = 'eTyping Auto Solver: running';
  root.appendChild(status);

  const toggle = document.createElement('button');
  toggle.textContent = 'Stop';
  toggle.style.marginTop = '8px';
  toggle.style.background = '#ef4444';
  toggle.style.color = '#fff';
  toggle.style.border = 'none';
  toggle.style.borderRadius = '8px';
  toggle.style.cursor = 'pointer';
  toggle.style.padding = '6px 10px';
  toggle.onclick = () => {
    if (window.__etypingAutoSolverRunning === false) {
      window.__etypingAutoSolverRunning = true;
      toggle.textContent = 'Stop';
      toggle.style.background = '#ef4444';
      status.textContent = 'eTyping Auto Solver: running';
    } else {
      window.__etypingAutoSolverRunning = false;
      toggle.textContent = 'Start';
      toggle.style.background = '#10b981';
      status.textContent = 'eTyping Auto Solver: stopped';
    }
  };
  root.appendChild(toggle);
  document.body.appendChild(root);

  const state = {
    intervalId: null,
    lastSolvedAt: 0,
    running: true,
  };
  window.__etypingAutoSolverRunning = true;

  function normalizeText(value) {
    return String(value || '')
      .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
      .replace(/\s+/g, ' ')
      .replace(/[\u00A0\u3000]+/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .trim();
  }

  function scoreCandidate(text, element) {
    const value = normalizeText(text);
    if (!value || value.length < 2 || value.length > 220) return -1;

    let score = 0;
    if (/[ぁ-んァ-ン一-龠]/.test(value)) score += 30;
    if (/^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han} 0-9A-Za-z\-]+$/u.test(value)) score += 20;
    if (value.includes('　') || value.includes(' ')) score += 4;
    score += Math.min(value.length, 60);

    const tag = (element && element.tagName) ? element.tagName.toLowerCase() : '';
    if (tag === 'textarea' || tag === 'input') score += 25;
    const id = (element && element.id) ? element.id.toLowerCase() : '';
    if (id.includes('typing') || id.includes('answer') || id.includes('input')) score += 15;
    const className = (element && element.className) ? String(element.className).toLowerCase() : '';
    if (className.includes('typing') || className.includes('answer') || className.includes('input')) score += 15;
    if (className.includes('nav') || className.includes('menu') || className.includes('header')) score -= 40;
    if (/^(next|前|次|戻る|メニュー|ランキング|ログイン|新規登録|検索|ヘルプ)$/i.test(value)) score -= 100;
    return score;
  }

  function isInputLike(el) {
    if (!el) return false;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
    return !!(el.getAttribute && (
      el.getAttribute('role') === 'textbox' ||
      el.getAttribute('contenteditable') === 'true' ||
      el.className && String(el.className).match(/(answer|typing|input|text)/i)
    ));
  }

  function gatherTextCandidates() {
    const candidates = [];

    const selectors = [
      '[data-typing-text]',
      '[data-test-id]',
      '.typing-text',
      '.typingSentence',
      '.typing-sentence',
      '.problem-text',
      '.question-text',
      '.phrase',
      '.sentence',
      '.answer',
      '.answer-input',
      'textarea',
      'input[type="text"]',
      'input:not([type])',
      '[role="textbox"]',
      '[contenteditable="true"]'
    ];

    document.querySelectorAll(selectors.join(',')).forEach((el) => {
      const rawValue = el.value ?? el.textContent ?? el.getAttribute('aria-label') ?? '';
      const value = normalizeText(rawValue);
      if (!value) return;
      const score = scoreCandidate(value, el);
      if (score > 0) {
        candidates.push({ value, score, element: el });
      }
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest('script, style, noscript')) return NodeFilter.FILTER_REJECT;
        const text = normalizeText(node.textContent || '');
        if (!text || text.length < 2 || text.length > 220) return NodeFilter.FILTER_REJECT;
        if (/[ぁ-んァ-ン一-龠]/.test(text) || /[A-Za-z0-9]/.test(text)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      }
    });

    while (walker.nextNode()) {
      const n = walker.currentNode;
      const parent = n.parentElement;
      if (!parent || parent.closest('script, style, noscript')) continue;
      const text = normalizeText(n.textContent || '');
      const score = scoreCandidate(text, parent);
      if (score > 0) {
        candidates.push({ value: text, score, element: parent });
      }
    }

    return candidates
      .filter((item) => item.value && item.value.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }

  function resolveInputTarget() {
    const nameSelector = [
      'textarea',
      'input[type="text"]',
      'input:not([type])',
      '[role="textbox"]',
      '[contenteditable="true"]',
      '.typing-input',
      '.answer-input',
      '.type-input'
    ];

    const all = [...document.querySelectorAll(nameSelector.join(','))];
    for (const el of all) {
      if (isInputLike(el)) return el;
    }
    return document.activeElement && isInputLike(document.activeElement) ? document.activeElement : null;
  }

  function chooseQuestion(candidates) {
    if (!candidates || !candidates.length) return '';
    const item = candidates[0];
    const value = normalizeText(item.value)
      .replace(/^(問題|問題文|入力|答え|答えを入力|タイピング|テキスト)\s*[:：]*/i, '')
      .replace(/\s+(?:next|次|次へ|戻る|開始|終了|終了する|Finish|Start)$/i, '')
      .trim();
    return value || '';
  }

  function emitTyping(target, phrase) {
    if (!target) return false;
    if (!phrase) return false;

    target.focus();
    const text = normalizeText(phrase);
    target.value = text;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));

    const chars = [...text];
    for (const ch of chars) {
      target.dispatchEvent(new KeyboardEvent('keydown', {
        key: ch,
        bubbles: true,
        cancelable: true,
        keyCode: ch.charCodeAt(0)
      }));
      target.dispatchEvent(new KeyboardEvent('keypress', {
        key: ch,
        bubbles: true,
        cancelable: true,
        keyCode: ch.charCodeAt(0)
      }));
      target.dispatchEvent(new KeyboardEvent('keyup', {
        key: ch,
        bubbles: true,
        cancelable: true,
        keyCode: ch.charCodeAt(0)
      }));
    }

    const submit = document.querySelector('button, [type="submit"], [class*="submit"], [class*="next"], [class*="ok"], [class*="enter"]');
    if (submit) {
      submit.click();
    }

    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      keyCode: 13,
    });
    document.dispatchEvent(enter);
    target.dispatchEvent(enter);
    return true;
  }

  function runOnce() {
    if (!window.__etypingAutoSolverRunning) return;
    const input = resolveInputTarget();
    if (!input) return;

    const candidates = gatherTextCandidates();
    const phrase = chooseQuestion(candidates);
    if (!phrase) return;

    const maybeRelevant = new Set([
      'typing', 'answer', 'input', '問題', 'sentence', 'phrase', 'text'
    ]);
    const filtered = candidates.filter((item) => {
      const candidateText = String(item.value || '').toLowerCase();
      const targetTag = input.tagName ? input.tagName.toLowerCase() : '';
      const targetClass = input.className ? String(input.className).toLowerCase() : '';
      return candidateText.length > 2 && (
        maybeRelevant.has(targetTag) ||
        targetClass.includes('typing') ||
        targetClass.includes('answer') ||
        targetClass.includes('input') ||
        candidateText.includes('問題') ||
        /[ぁ-んァ-ン一-龠]/.test(item.value)
      );
    });

    if (!filtered.length) return;
    const chosen = chooseQuestion(filtered);
    if (chosen) {
      emitTyping(input, chosen);
      state.lastSolvedAt = Date.now();
    }
  }

  state.intervalId = setInterval(runOnce, 900);

  window.addEventListener('beforeunload', () => {
    if (state.intervalId) clearInterval(state.intervalId);
  });

  status.textContent = 'eTyping Auto Solver: running';
})();
