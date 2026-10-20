/**
 * 单片机与微机原理 极速刷题宝 · Core Application Logic
 */

(function () {
  'use strict';

  // --- Global State ---
  const state = {
    allQuestions: window.QUESTIONS_DATA || [],
    currentMode: 'recite', // 'recite' (背题速记) | 'practice' (练习做题) | 'wrong' (错题专攻) | 'starred' (重点收藏)
    currentTypeFilter: 'all', // 'all' | 'choice' | 'blank' | 'judge' | 'qa' | 'code'
    currentTagFilter: 'all',
    isShuffled: false,
    shuffledOrder: [],
    currentIndex: 0,
    filteredList: [],
    
    // Stored in localStorage
    userRecords: {}, // { [qId]: { answered: true, selected: 'A', isCorrect: true, timestamp: 12345 } }
    starredIds: new Set(),
    autoNext: true,
    autoNextDelay: 450, // ms
    theme: 'light',
    
    // UI state
    showAnalysisInPractice: false,
    drawerOpen: false,
    searchModalOpen: false,
    drawerFilter: 'all',
  };

  // --- LocalStorage Keys ---
  const STORAGE_KEYS = {
    RECORDS: 'mcu_quiz_records_v1',
    STARRED: 'mcu_quiz_starred_v1',
    SETTINGS: 'mcu_quiz_settings_v1',
    THEME: 'mcu_quiz_theme_v1'
  };

  // --- Audio Effects (Synthesized Web Audio API, Zero Latency & No External Files) ---
  const AudioEffects = {
    ctx: null,
    init() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      } catch (e) {}
    },
    playCorrect() {
      if (!this.ctx) this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.25);
      
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(15); } catch (e) {}
      }
    },
    playWrong() {
      if (!this.ctx) this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.setValueAtTime(200, now + 0.08);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.25);
      
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([30, 40, 30]); } catch (e) {}
      }
    }
  };

  // --- DOM Elements ---
  const elements = {
    // Top Stats
    progressText: document.getElementById('progressText'),
    accuracyText: document.getElementById('accuracyText'),
    mistakesCount: document.getElementById('mistakesCount'),
    starredCount: document.getElementById('starredCount'),
    progressBarFill: document.getElementById('progressBarFill'),
    
    // Filters & Mode buttons (shadcn Tabs & Pills)
    modeBtns: document.querySelectorAll('.tab-trigger[data-mode], .mode-btn[data-mode]'),
    tabPills: document.querySelectorAll('.pill-btn[data-type], .tab-pill[data-type]'),
    tagSelect: document.getElementById('tagSelect'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    
    // Tools
    themeBtn: document.getElementById('themeBtn'),
    autoNextBtn: document.getElementById('autoNextBtn'),
    drawerToggleBtn: document.getElementById('drawerToggleBtn'),
    searchToggleBtn: document.getElementById('searchToggleBtn'),
    shortcutsHelpBtn: document.getElementById('shortcutsHelpBtn'),
    resetDataBtn: document.getElementById('resetDataBtn'),
    
    // Question Display
    questionCard: document.getElementById('questionCard'),
    qNumber: document.getElementById('qNumber'),
    qTypeBadge: document.getElementById('qTypeBadge'),
    qTagList: document.getElementById('qTagList'),
    starBtn: document.getElementById('starBtn'),
    qStem: document.getElementById('qStem'),
    qInteractiveArea: document.getElementById('qInteractiveArea'),
    analysisArea: document.getElementById('analysisArea'),
    
    // Nav
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    toggleAnalysisBtn: document.getElementById('toggleAnalysisBtn'),
    resetCurrentBtn: document.getElementById('resetCurrentBtn'),
    
    // Mobile Nav
    mobPrevBtn: document.getElementById('mobPrevBtn'),
    mobNextBtn: document.getElementById('mobNextBtn'),
    mobAnalysisBtn: document.getElementById('mobAnalysisBtn'),
    mobStarBtn: document.getElementById('mobStarBtn'),
    mobStarLabel: document.getElementById('mobStarLabel'),
    mobDrawerBtn: document.getElementById('mobDrawerBtn'),
    mainTouchArea: document.getElementById('mainTouchArea'),
    
    // Drawer
    drawerBackdrop: document.getElementById('drawerBackdrop'),
    drawerCloseBtn: document.getElementById('drawerCloseBtn'),
    gridMatrix: document.getElementById('gridMatrix'),
    drawerFilterChips: document.querySelectorAll('.filter-chip'),
    
    // Search
    searchModalBackdrop: document.getElementById('searchModalBackdrop'),
    searchInput: document.getElementById('searchInput'),
    searchCloseBtn: document.getElementById('searchCloseBtn'),
    searchResultsList: document.getElementById('searchResultsList'),
  };

  // --- Initialization ---
  function init() {
    loadSavedData();
    populateTagSelect();
    applyTheme(state.theme);
    updateAutoNextUI();
    
    applyFilters();
    renderCurrentQuestion();
    updateStats();
    
    attachEventListeners();
    
    // Highlight syntax on initial load if Prism is present
    if (window.Prism) {
      window.Prism.highlightAll();
    }
  }

  // --- Persistence Handlers ---
  function loadSavedData() {
    try {
      const records = localStorage.getItem(STORAGE_KEYS.RECORDS);
      if (records) state.userRecords = JSON.parse(records);

      const starred = localStorage.getItem(STORAGE_KEYS.STARRED);
      if (starred) state.starredIds = new Set(JSON.parse(starred));

      const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (settings) {
        const s = JSON.parse(settings);
        if (s.autoNext !== undefined) state.autoNext = s.autoNext;
        if (s.currentMode) state.currentMode = s.currentMode;
      }

      const theme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (theme) state.theme = theme;
    } catch (e) {
      console.error('Error loading saved data', e);
    }
  }

  function saveRecords() {
    try {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(state.userRecords));
    } catch (e) {}
  }

  function saveStarred() {
    try {
      localStorage.setItem(STORAGE_KEYS.STARRED, JSON.stringify(Array.from(state.starredIds)));
    } catch (e) {}
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
        autoNext: state.autoNext,
        currentMode: state.currentMode
      }));
    } catch (e) {}
  }

  // --- Theme Management ---
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    
    if (theme === 'dark') {
      elements.themeBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      elements.themeBtn.title = '当前：shadcn 极客暗黑 (点击切换护眼绿)';
    } else if (theme === 'green') {
      elements.themeBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 0-8 16l8 4 8-4a10 10 0 0 0-8-16z"></path></svg>`;
      elements.themeBtn.title = '当前：护眼豆沙绿 (点击切换浅色)';
    } else {
      elements.themeBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
      elements.themeBtn.title = '当前：shadcn 浅色 (点击切换极客暗黑)';
    }
  }

  function cycleTheme() {
    if (state.theme === 'light') applyTheme('dark');
    else if (state.theme === 'dark') applyTheme('green');
    else applyTheme('light');
  }

  // --- Tag Filter Population ---
  function populateTagSelect() {
    const tagsSet = new Set();
    state.allQuestions.forEach(q => {
      (q.tags || []).forEach(t => tagsSet.add(t));
    });
    
    elements.tagSelect.innerHTML = '<option value="all">全部知识考点</option>';
    Array.from(tagsSet).sort().forEach(tag => {
      const opt = document.createElement('option');
      opt.value = tag;
      opt.textContent = tag;
      elements.tagSelect.appendChild(opt);
    });
  }

  // --- Filtering & Question List ---
  function applyFilters() {
    let list = [...state.allQuestions];

    // 1. Mode filter
    if (state.currentMode === 'wrong') {
      list = list.filter(q => {
        const rec = state.userRecords[q.id];
        return rec && rec.answered && !rec.isCorrect;
      });
    } else if (state.currentMode === 'starred') {
      list = list.filter(q => state.starredIds.has(q.id));
    }

    // 2. Type filter
    if (state.currentTypeFilter !== 'all') {
      list = list.filter(q => q.type === state.currentTypeFilter);
    }

    // 3. Tag filter
    if (state.currentTagFilter !== 'all') {
      list = list.filter(q => (q.tags || []).includes(state.currentTagFilter));
    }

    // 4. Shuffling
    if (state.isShuffled) {
      list = shuffleArray(list);
    }

    state.filteredList = list;
    if (state.currentIndex >= state.filteredList.length) {
      state.currentIndex = Math.max(0, state.filteredList.length - 1);
    }

    // Update Mode button active state
    elements.modeBtns.forEach(btn => {
      const mode = btn.dataset.mode;
      btn.classList.toggle('active', mode === state.currentMode);
    });

    // Update Tab pills active state
    elements.tabPills.forEach(pill => {
      pill.classList.toggle('active', pill.dataset.type === state.currentTypeFilter);
    });
  }

  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // --- Stats Calculation ---
  function updateStats() {
    let totalQuestions = state.allQuestions.length;
    let answeredCount = 0;
    let correctCount = 0;
    let wrongCount = 0;

    state.allQuestions.forEach(q => {
      const rec = state.userRecords[q.id];
      if (rec && rec.answered) {
        answeredCount++;
        if (rec.isCorrect) correctCount++;
        else wrongCount++;
      }
    });

    const accuracy = answeredCount > 0 ? ((correctCount / answeredCount) * 100).toFixed(1) : 0;
    const progressPercent = totalQuestions > 0 ? ((answeredCount / totalQuestions) * 100).toFixed(1) : 0;

    elements.progressText.textContent = `${answeredCount} / ${totalQuestions} (${progressPercent}%)`;
    elements.accuracyText.textContent = `${accuracy}%`;
    elements.mistakesCount.textContent = `${wrongCount}`;
    elements.starredCount.textContent = `${state.starredIds.size}`;
    elements.progressBarFill.style.width = `${progressPercent}%`;

    // Also update mode badges
    const wrongBadge = document.querySelector('.mode-btn[data-mode="wrong"] .mode-badge');
    if (wrongBadge) wrongBadge.textContent = wrongCount;

    const starBadge = document.querySelector('.mode-btn[data-mode="starred"] .mode-badge');
    if (starBadge) starBadge.textContent = state.starredIds.size;
  }

  // --- Question Rendering ---
  function renderCurrentQuestion(direction = 'fade') {
    state.showAnalysisInPractice = false;
    
    if (state.filteredList.length === 0) {
      renderEmptyState();
      return;
    }

    // Apply horizontal transition animation without any vertical jump
    const card = elements.questionCard;
    if (card && direction !== 'none') {
      card.classList.remove('anim-next', 'anim-prev', 'anim-fade');
      void card.offsetWidth; // Force reflow to restart animation smoothly
      if (direction === 'next') {
        card.classList.add('anim-next');
      } else if (direction === 'prev') {
        card.classList.add('anim-prev');
      } else {
        card.classList.add('anim-fade');
      }
    }

    const q = state.filteredList[state.currentIndex];
    const rec = state.userRecords[q.id] || { answered: false };
    const isStarred = state.starredIds.has(q.id);

    // Meta
    elements.qNumber.textContent = `第 ${state.currentIndex + 1} / ${state.filteredList.length} 题 (ID: ${q.id})`;
    elements.qTypeBadge.textContent = q.type_name;
    elements.qTypeBadge.className = `q-type-badge badge-${q.type}`;
    
    // Tags
    elements.qTagList.innerHTML = (q.tags || [])
      .map(t => `<span class="q-tag">${escapeHtml(t)}</span>`)
      .join('');

    // Star button
    elements.starBtn.classList.toggle('starred', isStarred);
    elements.starBtn.querySelector('span').textContent = isStarred ? '已收藏' : '收藏';

    // Stem
    if (q.type === 'blank') {
      elements.qStem.innerHTML = renderBlankStem(q);
    } else {
      elements.qStem.textContent = q.stem;
    }

    // Interactive Area
    elements.qInteractiveArea.innerHTML = '';
    if (q.type === 'choice') {
      renderChoiceOptions(q, rec);
    } else if (q.type === 'judge') {
      renderJudgeOptions(q, rec);
    } else if (q.type === 'blank') {
      renderBlankControls(q, rec);
    } else if (q.type === 'qa' || q.type === 'code') {
      renderQAControls(q, rec);
    }

    // Analysis Area
    renderAnalysis(q, rec);

    // Nav buttons status
    const isFirst = state.currentIndex === 0;
    const isLast = state.currentIndex === state.filteredList.length - 1;
    elements.prevBtn.disabled = isFirst;
    elements.nextBtn.disabled = isLast;
    if (elements.mobPrevBtn) elements.mobPrevBtn.disabled = isFirst;
    if (elements.mobNextBtn) elements.mobNextBtn.disabled = isLast;
    if (elements.mobStarBtn) {
      elements.mobStarBtn.style.color = isStarred ? 'var(--warning)' : '';
      if (elements.mobStarLabel) elements.mobStarLabel.textContent = isStarred ? '已收藏' : '收藏';
    }

    // Trigger syntax highlighting
    if (window.Prism) {
      window.Prism.highlightAllUnder(elements.questionCard);
    }
  }

  function renderEmptyState() {
    elements.qNumber.textContent = '暂无题目';
    elements.qTypeBadge.textContent = '空';
    elements.qTypeBadge.className = 'q-type-badge';
    elements.qTagList.innerHTML = '';
    elements.starBtn.classList.remove('starred');
    elements.starBtn.querySelector('span').textContent = '收藏';
    if (elements.mobStarBtn) {
      elements.mobStarBtn.style.color = '';
      if (elements.mobStarLabel) elements.mobStarLabel.textContent = '收藏';
    }
    
    let tipMsg = '当前筛选条件下没有匹配的题目。';
    if (state.currentMode === 'wrong') {
      tipMsg = '太棒了！🎉 当前错题本为空，说明所有做过的题都正确，或者还没有做错的题目。';
    } else if (state.currentMode === 'starred') {
      tipMsg = '还没有收藏题目哦！遇到重点、难点题随时点击右上角【⭐ 收藏】或按键盘 S 即可加入收藏夹。';
    }

    elements.qStem.innerHTML = `<div style="text-align: center; padding: 3rem 1rem; color: var(--text-secondary); font-size: 1.1rem;">
      <p style="font-size: 2.5rem; margin-bottom: 1rem;">🍃</p>
      <p>${tipMsg}</p>
      <button class="primary-action-btn" id="resetFilterTipBtn" style="margin-top: 1.5rem;">返回全部题目</button>
    </div>`;
    elements.qInteractiveArea.innerHTML = '';
    elements.analysisArea.innerHTML = '';
    elements.prevBtn.disabled = true;
    elements.nextBtn.disabled = true;
    if (elements.mobPrevBtn) elements.mobPrevBtn.disabled = true;
    if (elements.mobNextBtn) elements.mobNextBtn.disabled = true;

    const tipBtn = document.getElementById('resetFilterTipBtn');
    if (tipBtn) {
      tipBtn.addEventListener('click', () => {
        state.currentMode = 'recite';
        state.currentTypeFilter = 'all';
        state.currentTagFilter = 'all';
        elements.tagSelect.value = 'all';
        applyFilters();
        state.currentIndex = 0;
        renderCurrentQuestion();
      });
    }
  }

  // --- Render Question Types ---

  // 1. Choice
  function renderChoiceOptions(q, rec) {
    const list = document.createElement('div');
    list.className = 'options-list';
    const isRecite = state.currentMode === 'recite';
    const hasAnswered = rec.answered;

    ['A', 'B', 'C', 'D'].forEach(letter => {
      const text = q.options[letter];
      if (!text) return;

      const item = document.createElement('div');
      item.className = 'option-item';
      item.dataset.letter = letter;

      const isCorrectLetter = letter === q.answer;

      if (isRecite) {
        // In Recite mode: Highlight correct option directly
        if (isCorrectLetter) {
          item.classList.add('correct');
        }
      } else if (hasAnswered) {
        item.classList.add('disabled');
        if (letter === rec.selected) {
          item.classList.add(rec.isCorrect ? 'correct' : 'wrong');
        } else if (isCorrectLetter) {
          item.classList.add('correct');
        }
      }

      item.innerHTML = `
        <div class="option-badge">${letter}</div>
        <div class="option-text">${escapeHtml(text)}</div>
      `;

      item.addEventListener('click', () => {
        handleChoiceSelect(letter);
      });

      list.appendChild(item);
    });

    elements.qInteractiveArea.appendChild(list);
  }

  function handleChoiceSelect(selectedLetter) {
    const q = state.filteredList[state.currentIndex];
    if (!q) return;

    const isCorrect = selectedLetter === q.answer;

    // Record answer
    state.userRecords[q.id] = {
      answered: true,
      selected: selectedLetter,
      isCorrect: isCorrect,
      timestamp: Date.now()
    };
    saveRecords();
    updateStats();

    // Sound effect
    if (isCorrect) {
      AudioEffects.playCorrect();
    } else {
      AudioEffects.playWrong();
    }

    // Refresh UI without card slide
    renderCurrentQuestion('none');

    // Auto next if correct & practice mode
    if (isCorrect && state.autoNext && state.currentMode === 'practice') {
      setTimeout(() => {
        navigateNext();
      }, state.autoNextDelay);
    }
  }

  // 2. Judge
  function renderJudgeOptions(q, rec) {
    const group = document.createElement('div');
    group.className = 'judge-group';
    const isRecite = state.currentMode === 'recite';
    const hasAnswered = rec.answered;

    const btnTrue = document.createElement('button');
    btnTrue.className = 'judge-btn';
    btnTrue.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> 正确 (T)`;

    const btnFalse = document.createElement('button');
    btnFalse.className = 'judge-btn';
    btnFalse.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> 错误 (F)`;

    const correctIsTrue = q.is_correct;

    if (isRecite) {
      if (correctIsTrue) btnTrue.classList.add('correct');
      else btnFalse.classList.add('wrong');
    } else if (hasAnswered) {
      btnTrue.classList.add('disabled');
      btnFalse.classList.add('disabled');
      if (rec.selected === true) {
        btnTrue.classList.add(rec.isCorrect ? 'correct' : 'wrong');
      } else if (rec.selected === false) {
        btnFalse.classList.add(rec.isCorrect ? 'correct' : 'wrong');
      }
      // Highlight actual answer
      if (correctIsTrue) btnTrue.classList.add('correct');
      else btnFalse.classList.add('wrong');
    }

    btnTrue.addEventListener('click', () => handleJudgeSelect(true));
    btnFalse.addEventListener('click', () => handleJudgeSelect(false));

    group.appendChild(btnTrue);
    group.appendChild(btnFalse);
    elements.qInteractiveArea.appendChild(group);
  }

  function handleJudgeSelect(selectedValue) {
    const q = state.filteredList[state.currentIndex];
    if (!q) return;

    const isCorrect = selectedValue === q.is_correct;

    state.userRecords[q.id] = {
      answered: true,
      selected: selectedValue,
      isCorrect: isCorrect,
      timestamp: Date.now()
    };
    saveRecords();
    updateStats();

    if (isCorrect) AudioEffects.playCorrect();
    else AudioEffects.playWrong();

    renderCurrentQuestion('none');

    if (isCorrect && state.autoNext && state.currentMode === 'practice') {
      setTimeout(() => {
        navigateNext();
      }, state.autoNextDelay);
    }
  }

  // 3. Blank
  function renderBlankStem(q) {
    const isRecite = state.currentMode === 'recite';
    const rec = state.userRecords[q.id] || { answered: false };
    const showCompleted = isRecite || rec.answered || state.showAnalysisInPractice;

    if (showCompleted && q.full_text) {
      // Highlight answers in full text
      let html = escapeHtml(q.full_text);
      (q.blanks || []).forEach(b => {
        const escaped = escapeHtml(b);
        html = html.replace(escaped, `<span class="blank-highlight">${escaped}</span>`);
      });
      return html;
    } else {
      let html = escapeHtml(q.stem);
      return html.replace(/【空\d+：____】/g, '<span class="blank-highlight">____</span>');
    }
  }

  function renderBlankControls(q, rec) {
    const isRecite = state.currentMode === 'recite';
    if (isRecite) return; // In recite mode, blanks are already filled above

    const container = document.createElement('div');
    container.className = 'interactive-prompt-box';

    if (!rec.answered && !state.showAnalysisInPractice) {
      container.innerHTML = `
        <div style="font-size: 0.9rem; color: hsl(var(--muted-foreground)); margin-bottom: 0.75rem;">
          💡 心中默念答案，点击下方按钮查看正确填空与考点解析：
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="shadcn-btn shadcn-btn-primary" id="revealBlankBtn">查看填空答案 (空格)</button>
        </div>
      `;
      elements.qInteractiveArea.appendChild(container);

      const revealBtn = container.querySelector('#revealBlankBtn');
      if (revealBtn) {
        revealBtn.addEventListener('click', () => {
          state.showAnalysisInPractice = true;
          renderCurrentQuestion('none');
        });
      }
    } else {
      // User has revealed the answers, now they can self-mark correct or wrong
      container.innerHTML = `
        <div style="font-size: 0.92rem; font-weight: 600; color: hsl(var(--foreground)); margin-bottom: 0.75rem;">
          正确填空：<span style="color: hsl(var(--primary));">${escapeHtml(q.answer)}</span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="shadcn-btn shadcn-btn-primary" style="background-color: hsl(var(--success)); color: hsl(var(--success-foreground));" id="markCorrectBlankBtn">✓ 我答对了 (跳下题)</button>
          <button class="shadcn-btn shadcn-btn-secondary" style="color: hsl(var(--danger)); border-color: hsl(var(--danger-border));" id="markWrongBlankBtn">✕ 没答对 (加入错题)</button>
        </div>
      `;
      elements.qInteractiveArea.appendChild(container);

      const markCorrect = container.querySelector('#markCorrectBlankBtn');
      const markWrong = container.querySelector('#markWrongBlankBtn');

      if (markCorrect) {
        markCorrect.addEventListener('click', () => {
          state.userRecords[q.id] = { answered: true, isCorrect: true, timestamp: Date.now() };
          saveRecords();
          updateStats();
          AudioEffects.playCorrect();
          navigateNext();
        });
      }

      if (markWrong) {
        markWrong.addEventListener('click', () => {
          state.userRecords[q.id] = { answered: true, isCorrect: false, timestamp: Date.now() };
          saveRecords();
          updateStats();
          AudioEffects.playWrong();
          renderCurrentQuestion('none');
        });
      }
    }
  }

  // 4. QA & Code
  function renderQAControls(q, rec) {
    const isRecite = state.currentMode === 'recite';
    if (isRecite) return; // Answer rendered directly in analysis area

    const container = document.createElement('div');
    container.className = 'interactive-prompt-box';

    if (!rec.answered && !state.showAnalysisInPractice) {
      container.innerHTML = `
        <div style="font-size: 0.9rem; color: hsl(var(--muted-foreground)); margin-bottom: 0.75rem;">
          🧠 思考本题的实现逻辑与关键寄存器/指令配置：
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="shadcn-btn shadcn-btn-primary" id="revealQABtn">查看标准解答与代码 (空格)</button>
        </div>
      `;
      elements.qInteractiveArea.appendChild(container);

      const revealBtn = container.querySelector('#revealQABtn');
      if (revealBtn) {
        revealBtn.addEventListener('click', () => {
          state.showAnalysisInPractice = true;
          renderCurrentQuestion('none');
        });
      }
    } else {
      container.innerHTML = `
        <div style="font-size: 0.92rem; font-weight: 600; color: hsl(var(--foreground)); margin-bottom: 0.75rem;">
          自我评估掌握程度：
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="shadcn-btn shadcn-btn-primary" style="background-color: hsl(var(--success)); color: hsl(var(--success-foreground));" id="markCorrectQABtn">✓ 已完全掌握</button>
          <button class="shadcn-btn shadcn-btn-secondary" style="border-color: hsl(var(--warning-border)); color: hsl(var(--warning-foreground));" id="markReviewQABtn">📌 仍需重背 (标记错题)</button>
        </div>
      `;
      elements.qInteractiveArea.appendChild(container);

      const markCorrect = container.querySelector('#markCorrectQABtn');
      const markReview = container.querySelector('#markReviewQABtn');

      if (markCorrect) {
        markCorrect.addEventListener('click', () => {
          state.userRecords[q.id] = { answered: true, isCorrect: true, timestamp: Date.now() };
          saveRecords();
          updateStats();
          AudioEffects.playCorrect();
          navigateNext();
        });
      }

      if (markReview) {
        markReview.addEventListener('click', () => {
          state.userRecords[q.id] = { answered: true, isCorrect: false, timestamp: Date.now() };
          saveRecords();
          updateStats();
          AudioEffects.playWrong();
          renderCurrentQuestion('none');
        });
      }
    }
  }

  // --- Render Answer & Analysis ---
  function renderAnalysis(q, rec) {
    const isRecite = state.currentMode === 'recite';
    const shouldShow = isRecite || rec.answered || state.showAnalysisInPractice;

    if (!shouldShow) {
      elements.analysisArea.innerHTML = '';
      return;
    }

    const card = document.createElement('div');
    card.className = 'analysis-card';

    // Format header
    let ansDisplay = '';
    if (q.type === 'choice') {
      const optText = q.options[q.answer] || '';
      ansDisplay = `<span class="ans-pill">正确答案：${q.answer}（${escapeHtml(optText)}）</span>`;
    } else if (q.type === 'judge') {
      ansDisplay = `<span class="ans-pill">正确答案：${q.answer} (${q.answer_symbol})</span>`;
    } else if (q.type === 'blank') {
      ansDisplay = `<span class="ans-pill">正确填空：${escapeHtml(q.answer)}</span>`;
    } else {
      ansDisplay = `<span class="ans-pill">参考答案与解析</span>`;
    }

    // Body content: QA & Code need formatted answer
    let bodyHtml = '';
    if (q.type === 'code' || q.type === 'qa') {
      bodyHtml += formatQAAnswerHtml(q.answer);
    }

    if (q.analysis) {
      bodyHtml += `<div style="margin-top: ${bodyHtml ? '1rem' : '0'};">
        <strong style="color: hsl(var(--foreground));">💡 核心考点解析：</strong>
        <div style="margin-top: 4px; line-height: 1.75; color: hsl(var(--muted-foreground));">${formatAnalysisText(q.analysis)}</div>
      </div>`;
    }

    if (q.note) {
      bodyHtml += `<div class="analysis-note">
        <strong>📌 命题要点 / 考场避坑：</strong><br>${escapeHtml(q.note).replace(/\n/g, '<br>')}
      </div>`;
    }

    card.innerHTML = `
      <div class="analysis-header">
        <div class="analysis-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          <span>考点精析</span>
        </div>
        ${ansDisplay}
      </div>
      <div class="analysis-body">
        ${bodyHtml}
      </div>
    `;

    // Attach copy button listeners inside code blocks
    card.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const codeBlock = e.target.closest('.code-container').querySelector('code');
        if (codeBlock) {
          navigator.clipboard.writeText(codeBlock.innerText).then(() => {
            btn.textContent = '已复制!';
            setTimeout(() => { btn.textContent = '复制代码'; }, 1500);
          });
        }
      });
    });

    elements.analysisArea.innerHTML = '';
    elements.analysisArea.appendChild(card);
  }

  function formatQAAnswerHtml(answer) {
    if (!answer) return '';

    // Check if answer contains C code (#include, void, etc.)
    const codeMatch = answer.match(/(#include[\s\S]*|void[\s\S]*)/);
    if (codeMatch && (answer.includes('{') || answer.includes('//'))) {
      const codePart = codeMatch[0];
      const textBefore = answer.substring(0, codeMatch.index).trim();

      let html = '';
      if (textBefore) {
        html += `<div style="margin-bottom: 0.75rem; color: var(--text-primary); font-weight: 500;">
          ${escapeHtml(textBefore).replace(/\n/g, '<br>')}
        </div>`;
      }

      html += `
        <div class="code-container">
          <div class="code-header">
            <span>C51 单片机程序源码</span>
            <button class="copy-btn">复制代码</button>
          </div>
          <pre><code class="language-c">${escapeHtml(codePart)}</code></pre>
        </div>
      `;
      return html;
    }

    // Normal QA text with numbered lines
    return `<div style="line-height: 1.8; color: var(--text-primary); margin-bottom: 0.75rem;">
      <strong style="color: var(--primary);">📝 标准答案：</strong><br>
      ${escapeHtml(answer).replace(/\n/g, '<br>')}
    </div>`;
  }

  function formatAnalysisText(text) {
    // Bold numbers or keywords for better readability
    let escaped = escapeHtml(text);
    return escaped.replace(/(\d+H|\d+KB|0x[0-9A-Fa-f]+|PC|PSW|DPTR|SP|TMOD|TCON|SCON|SBUF|IE|IP|EA|ES|ET0|ET1|EX0|EX1|TR0|TR1|TF0|TF1)/g, '<strong>$1</strong>');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Navigation (No window jumping or full-page scrolling) ---
  function navigatePrev() {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      renderCurrentQuestion('prev');
    }
  }

  function navigateNext() {
    if (state.currentIndex < state.filteredList.length - 1) {
      state.currentIndex++;
      renderCurrentQuestion('next');
    }
  }

  function toggleStarCurrent() {
    const q = state.filteredList[state.currentIndex];
    if (!q) return;

    if (state.starredIds.has(q.id)) {
      state.starredIds.delete(q.id);
    } else {
      state.starredIds.add(q.id);
    }

    saveStarred();
    updateStats();
    renderCurrentQuestion('none');
  }

  function resetCurrentAnswer() {
    const q = state.filteredList[state.currentIndex];
    if (!q) return;

    delete state.userRecords[q.id];
    saveRecords();
    updateStats();
    state.showAnalysisInPractice = false;
    renderCurrentQuestion('none');
  }

  function toggleAnalysis() {
    state.showAnalysisInPractice = !state.showAnalysisInPractice;
    renderCurrentQuestion('none');
  }

  // --- Auto Next UI ---
  function updateAutoNextUI() {
    elements.autoNextBtn.classList.toggle('active', state.autoNext);
    const label = elements.autoNextBtn.querySelector('.auto-next-label');
    if (label) label.textContent = state.autoNext ? '自动跳题: 开启' : '自动跳题: 关闭';
  }

  function toggleAutoNext() {
    state.autoNext = !state.autoNext;
    saveSettings();
    updateAutoNextUI();
  }

  // --- Drawer (答题卡) Handlers ---
  function openDrawer() {
    state.drawerOpen = true;
    elements.drawerBackdrop.classList.add('open');
    renderGridMatrix();
  }

  function closeDrawer() {
    state.drawerOpen = false;
    elements.drawerBackdrop.classList.remove('open');
  }

  function renderGridMatrix() {
    elements.gridMatrix.innerHTML = '';
    const currentQId = state.filteredList[state.currentIndex]?.id;

    state.filteredList.forEach((q, idx) => {
      const rec = state.userRecords[q.id];
      const isStarred = state.starredIds.has(q.id);

      // Check drawer filter
      if (state.drawerFilter === 'correct' && (!rec || !rec.isCorrect)) return;
      if (state.drawerFilter === 'wrong' && (!rec || rec.isCorrect)) return;
      if (state.drawerFilter === 'unanswered' && (rec && rec.answered)) return;
      if (state.drawerFilter === 'starred' && !isStarred) return;

      const item = document.createElement('div');
      item.className = 'matrix-item';
      item.textContent = idx + 1;
      item.title = `第${idx + 1}题 (ID: ${q.id}) - ${q.type_name}`;

      if (q.id === currentQId) item.classList.add('current');
      if (rec && rec.answered) {
        item.classList.add(rec.isCorrect ? 'correct' : 'wrong');
      }
      if (isStarred) item.classList.add('starred');

      item.addEventListener('click', () => {
        state.currentIndex = idx;
        renderCurrentQuestion();
        closeDrawer();
      });

      elements.gridMatrix.appendChild(item);
    });
  }

  // --- Search Engine Modal ---
  function openSearchModal() {
    state.searchModalOpen = true;
    elements.searchModalBackdrop.classList.add('open');
    elements.searchInput.value = '';
    elements.searchResultsList.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">输入关键词（如 "8086"、"SCON"、"波特率" 等）即可即时检索全量题目与答案解析</div>';
    setTimeout(() => elements.searchInput.focus(), 100);
  }

  function closeSearchModal() {
    state.searchModalOpen = false;
    elements.searchModalBackdrop.classList.remove('open');
  }

  function handleSearchInput(keyword) {
    const term = keyword.trim().toLowerCase();
    if (!term) {
      elements.searchResultsList.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">请输入搜索关键词...</div>';
      return;
    }

    const matches = [];
    state.allQuestions.forEach(q => {
      const stemMatch = (q.stem || '').toLowerCase().includes(term);
      const ansMatch = (q.answer || '').toLowerCase().includes(term);
      const analysisMatch = (q.analysis || '').toLowerCase().includes(term);
      const noteMatch = (q.note || '').toLowerCase().includes(term);

      if (stemMatch || ansMatch || analysisMatch || noteMatch) {
        matches.push(q);
      }
    });

    if (matches.length === 0) {
      elements.searchResultsList.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">未找到与 "${escapeHtml(term)}" 相关的题目</div>`;
      return;
    }

    elements.searchResultsList.innerHTML = '';
    matches.slice(0, 40).forEach(q => {
      const item = document.createElement('div');
      item.className = 'command-item search-item';
      
      const highlightedStem = highlightMatch(q.stem || '', term);
      const highlightedAns = highlightMatch(q.answer || '', term);

      item.innerHTML = `
        <div class="command-item-title">[${q.type_name}] ${highlightedStem}</div>
        <div class="command-item-meta">答案: ${highlightedAns} | 考点: ${(q.tags || []).join('、')}</div>
      `;

      item.addEventListener('click', () => {
        // Switch to all questions and jump to this question
        state.currentMode = 'recite';
        state.currentTypeFilter = 'all';
        state.currentTagFilter = 'all';
        elements.tagSelect.value = 'all';
        applyFilters();

        const targetIdx = state.filteredList.findIndex(item => item.id === q.id);
        if (targetIdx !== -1) {
          state.currentIndex = targetIdx;
          renderCurrentQuestion();
        }
        closeSearchModal();
      });

      elements.searchResultsList.appendChild(item);
    });
  }

  function highlightMatch(text, term) {
    if (!text) return '';
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
  }

  // --- Reset All Data ---
  function resetAllData() {
    if (confirm('确定要清空所有刷题记录与统计数据吗？此操作无法撤销。')) {
      state.userRecords = {};
      saveRecords();
      updateStats();
      renderCurrentQuestion();
      alert('刷题记录已重置！');
    }
  }

  // --- Mobile Touch Gestures (Swipe Left / Right to Navigate) ---
  function attachTouchGestures() {
    const area = elements.mainTouchArea || document.body;
    let startX = 0;
    let startY = 0;
    let isSwiping = false;

    area.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwiping = true;
      }
    }, { passive: true });

    area.addEventListener('touchend', (e) => {
      if (!isSwiping || e.changedTouches.length === 0) return;
      isSwiping = false;

      const deltaX = e.changedTouches[0].clientX - startX;
      const deltaY = e.changedTouches[0].clientY - startY;

      // Ensure horizontal swipe is dominant and exceeds threshold (50px)
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < 0) {
          // Swipe Left -> Next
          navigateNext();
        } else {
          // Swipe Right -> Prev
          navigatePrev();
        }
      }
    }, { passive: true });
  }

  // --- Keyboard Shortcuts Listener ---
  function attachKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in search input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') closeSearchModal();
        return;
      }

      // Modal / Drawer escape
      if (e.key === 'Escape') {
        if (state.drawerOpen) closeDrawer();
        if (state.searchModalOpen) closeSearchModal();
        return;
      }

      // Command palette (⌘K or Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearchModal();
        return;
      }

      const q = state.filteredList[state.currentIndex];
      if (!q) return;

      const key = e.key.toUpperCase();

      // Navigation: Left / Right or J / K
      if (e.key === 'ArrowLeft' || key === 'J') {
        e.preventDefault();
        navigatePrev();
        return;
      }

      if (e.key === 'ArrowRight' || key === 'K') {
        e.preventDefault();
        navigateNext();
        return;
      }

      // Space / Enter: In recite mode -> Next question; in practice mode -> Show analysis, or Next question if already shown
      if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (state.currentMode === 'recite') {
          navigateNext();
        } else {
          const rec = state.userRecords[q.id];
          if (state.showAnalysisInPractice || (rec && rec.answered)) {
            navigateNext();
          } else {
            toggleAnalysis();
          }
        }
        return;
      }

      // Star / Bookmark: S or M
      if (key === 'S' || key === 'M' || e.code === 'KeyS' || e.code === 'KeyM') {
        e.preventDefault();
        toggleStarCurrent();
        return;
      }

      // Reset current: R
      if (key === 'R') {
        e.preventDefault();
        resetCurrentAnswer();
        return;
      }

      // Choice Question shortcuts: A, B, C, D or 1, 2, 3, 4
      if (q.type === 'choice') {
        let selected = null;
        if (['A', 'B', 'C', 'D'].includes(key)) selected = key;
        else if (e.key === '1') selected = 'A';
        else if (e.key === '2') selected = 'B';
        else if (e.key === '3') selected = 'C';
        else if (e.key === '4') selected = 'D';

        if (selected && q.options[selected]) {
          e.preventDefault();
          handleChoiceSelect(selected);
          return;
        }
      }

      // Judge Question shortcuts: T / F, Y / N, or 1 / 2
      if (q.type === 'judge') {
        if (key === 'T' || key === 'Y' || e.key === '1') {
          e.preventDefault();
          handleJudgeSelect(true);
          return;
        }
        if (key === 'F' || key === 'N' || e.key === '2') {
          e.preventDefault();
          handleJudgeSelect(false);
          return;
        }
      }
    });
  }

  // --- Event Listeners Attachment ---
  function attachEventListeners() {
    // Mode switcher buttons
    elements.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.currentMode = btn.dataset.mode;
        saveSettings();
        applyFilters();
        state.currentIndex = 0;
        renderCurrentQuestion();
      });
    });

    // Type Filter tabs
    elements.tabPills.forEach(pill => {
      pill.addEventListener('click', () => {
        state.currentTypeFilter = pill.dataset.type;
        applyFilters();
        state.currentIndex = 0;
        renderCurrentQuestion();
      });
    });

    // Tag Select
    elements.tagSelect.addEventListener('change', (e) => {
      state.currentTagFilter = e.target.value;
      applyFilters();
      state.currentIndex = 0;
      renderCurrentQuestion();
    });

    // Shuffle Toggle
    elements.shuffleBtn.addEventListener('click', () => {
      state.isShuffled = !state.isShuffled;
      elements.shuffleBtn.classList.toggle('active', state.isShuffled);
      elements.shuffleBtn.querySelector('span:last-child').textContent = state.isShuffled ? '乱序' : '顺序';
      applyFilters();
      state.currentIndex = 0;
      renderCurrentQuestion();
    });

    // Theme cycle button
    elements.themeBtn.addEventListener('click', cycleTheme);

    // Auto next toggle button
    elements.autoNextBtn.addEventListener('click', toggleAutoNext);

    // Star current question button
    elements.starBtn.addEventListener('click', toggleStarCurrent);

    // Navigation buttons (Desktop)
    elements.prevBtn.addEventListener('click', navigatePrev);
    elements.nextBtn.addEventListener('click', navigateNext);
    elements.toggleAnalysisBtn.addEventListener('click', toggleAnalysis);
    elements.resetCurrentBtn.addEventListener('click', resetCurrentAnswer);

    // Navigation buttons (Mobile Bottom Bar)
    if (elements.mobPrevBtn) elements.mobPrevBtn.addEventListener('click', navigatePrev);
    if (elements.mobNextBtn) elements.mobNextBtn.addEventListener('click', navigateNext);
    if (elements.mobAnalysisBtn) elements.mobAnalysisBtn.addEventListener('click', toggleAnalysis);
    if (elements.mobStarBtn) elements.mobStarBtn.addEventListener('click', toggleStarCurrent);
    if (elements.mobDrawerBtn) elements.mobDrawerBtn.addEventListener('click', openDrawer);

    // Touch Swipe Gestures (Mobile Left/Right Swipe)
    attachTouchGestures();

    // Drawer buttons
    elements.drawerToggleBtn.addEventListener('click', openDrawer);
    elements.drawerCloseBtn.addEventListener('click', closeDrawer);
    elements.drawerBackdrop.addEventListener('click', (e) => {
      if (e.target === elements.drawerBackdrop) closeDrawer();
    });

    // Drawer Filter Chips
    elements.drawerFilterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        elements.drawerFilterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.drawerFilter = chip.dataset.filter;
        renderGridMatrix();
      });
    });

    // Search Modal buttons
    elements.searchToggleBtn.addEventListener('click', openSearchModal);
    elements.searchCloseBtn.addEventListener('click', closeSearchModal);
    elements.searchModalBackdrop.addEventListener('click', (e) => {
      if (e.target === elements.searchModalBackdrop) closeSearchModal();
    });
    elements.searchInput.addEventListener('input', (e) => {
      handleSearchInput(e.target.value);
    });

    // Shortcuts modal help
    elements.shortcutsHelpBtn.addEventListener('click', () => {
      alert(`⚡ 极速刷题键盘快捷键指南：\n\n` +
        `• A / B / C / D 或 1 / 2 / 3 / 4 ：快速选择选项\n` +
        `• T / F 或 1 / 2 ：判断题选正确/错误\n` +
        `• 空格键 (Space) 或 回车 (Enter) ：显示答案解析 / 下一题\n` +
        `• ← (左方向键) 或 J ：上一题\n` +
        `• → (右方向键) 或 K ：下一题\n` +
        `• S 或 M ：收藏本题 (星标)\n` +
        `• R ：重做本题\n` +
        `• Esc ：关闭弹窗/抽屉\n\n` +
        `💡 建议在【背题速记模式】下，一路按空格键或右箭头，几分钟内即可极速过完全套题目！`);
    });

    // Reset Data button
    elements.resetDataBtn.addEventListener('click', resetAllData);

    // Keyboard shortcuts
    attachKeyboardShortcuts();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
