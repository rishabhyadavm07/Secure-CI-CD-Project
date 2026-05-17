'use strict';

// ── State ────────────────────────────────────────────────────────────────────
const S = {
  allQuestions: [],
  batches: [],
  mode: null,           // 'exam' | 'batch' | 'single'
  queue: [],            // questions for current session
  idx: 0,              // current position in queue
  answers: {},         // idx → { submitted, correct, userAnswer }
  timerInterval: null,
  secondsLeft: 0,
  started: false,
};

// ── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  try {
    const [qs, bs] = await Promise.all([
      fetch('data/questions.json').then(r => r.json()),
      fetch('data/batches.json').then(r => r.json()),
    ]);
    S.allQuestions = qs;
    S.batches = bs;
    showHome();
  } catch (e) {
    document.getElementById('app').innerHTML =
      `<p style="color:#ef4444;padding:40px">Failed to load data: ${e.message}</p>`;
  }
}

// ── Routing ───────────────────────────────────────────────────────────────────
function showHome() {
  stopTimer();
  S.mode = null; S.queue = []; S.idx = 0; S.answers = {};
  render('home');
}

function render(view) {
  const app = document.getElementById('app');
  if (view === 'home') { app.innerHTML = homeHTML(); wireHome(); }
  else if (view === 'exam-config') { app.innerHTML = examConfigHTML(); wireExamConfig(); }
  else if (view === 'batch-config') { app.innerHTML = batchConfigHTML(); wireBatchConfig(); }
  else if (view === 'single-config') { app.innerHTML = singleConfigHTML(); wireSingleConfig(); }
  else if (view === 'quiz') { app.innerHTML = quizHTML(); renderQuestion(); }
  else if (view === 'results') { app.innerHTML = resultsHTML(); wireResults(); }
}

// ── Home ──────────────────────────────────────────────────────────────────────
function homeHTML() {
  return `
<div id="home">
  <div>
    <div class="home-title">AZ-500 <span>Practice</span></div>
    <div class="home-subtitle">${S.allQuestions.length} questions · 6 question types</div>
  </div>
  <div class="mode-cards">
    <button class="mode-card" data-mode="exam">
      <div class="mode-icon">🎓</div>
      <h2>Exam Mode</h2>
      <p>All questions, shuffled. 90-minute timer. See results at the end.</p>
    </button>
    <button class="mode-card" data-mode="batch">
      <div class="mode-icon">📦</div>
      <h2>Batch Mode</h2>
      <p>Pick a batch (1–21). Questions shuffled. Instant answer feedback.</p>
    </button>
    <button class="mode-card" data-mode="single">
      <div class="mode-icon">🎯</div>
      <h2>Single Mode</h2>
      <p>Random questions from all batches. Set count. Instant feedback.</p>
    </button>
  </div>
</div>`;
}

function wireHome() {
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const m = card.dataset.mode;
      if (m === 'exam') render('exam-config');
      else if (m === 'batch') render('batch-config');
      else render('single-config');
    });
  });
}

// ── Config: Exam ──────────────────────────────────────────────────────────────
function examConfigHTML() {
  return `
<div class="config-panel">
  <button class="back-btn" id="back">← Home</button>
  <h2>🎓 Exam Mode</h2>
  <p style="font-size:.85rem;color:var(--muted)">
    ${S.allQuestions.length} questions · 90 minutes · Results shown at end.
    Answers are <strong style="color:var(--text)">not shown</strong> until you finish.
  </p>
  <button class="btn" id="start-exam">Start Exam</button>
</div>`;
}
function wireExamConfig() {
  document.getElementById('back').addEventListener('click', showHome);
  document.getElementById('start-exam').addEventListener('click', () => {
    S.mode = 'exam';
    S.queue = shuffle([...S.allQuestions]);
    S.idx = 0; S.answers = {};
    S.secondsLeft = 90 * 60;
    render('quiz');
    startTimer();
  });
}

// ── Config: Batch ─────────────────────────────────────────────────────────────
function batchConfigHTML() {
  const opts = S.batches
    .filter(b => b.question_count > 0)
    .map(b => `<option value="${b.batch}">Batch ${b.batch} — ${b.question_count} questions (${b.batch_id})</option>`)
    .join('');
  return `
<div class="config-panel">
  <button class="back-btn" id="back">← Home</button>
  <h2>📦 Batch Mode</h2>
  <div>
    <label>Select batch</label>
    <select id="batch-sel">${opts}</select>
  </div>
  <button class="btn" id="start-batch">Start</button>
</div>`;
}
function wireBatchConfig() {
  document.getElementById('back').addEventListener('click', showHome);
  document.getElementById('start-batch').addEventListener('click', () => {
    const batchNum = parseInt(document.getElementById('batch-sel').value);
    const pool = S.allQuestions.filter(q => q.batch === batchNum);
    S.mode = 'batch';
    S.queue = shuffle([...pool]);
    S.idx = 0; S.answers = {};
    render('quiz');
  });
}

// ── Config: Single ────────────────────────────────────────────────────────────
function singleConfigHTML() {
  return `
<div class="config-panel">
  <button class="back-btn" id="back">← Home</button>
  <h2>🎯 Single Mode</h2>
  <div>
    <label>Number of questions</label>
    <input type="number" id="count" value="20" min="1" max="${S.allQuestions.length}">
  </div>
  <button class="btn" id="start-single">Start</button>
</div>`;
}
function wireSingleConfig() {
  document.getElementById('back').addEventListener('click', showHome);
  document.getElementById('start-single').addEventListener('click', () => {
    const n = Math.min(
      parseInt(document.getElementById('count').value) || 20,
      S.allQuestions.length
    );
    S.mode = 'single';
    S.queue = shuffle([...S.allQuestions]).slice(0, n);
    S.idx = 0; S.answers = {};
    render('quiz');
  });
}

// ── Quiz shell ────────────────────────────────────────────────────────────────
function quizHTML() {
  const timerHtml = S.mode === 'exam'
    ? `<div class="timer" id="timer">90:00</div>`
    : '';
  return `
<div id="quiz-header">
  <button class="back-btn" id="quit-btn">✕</button>
  <div class="progress-bar-wrap">
    <div class="progress-bar-fill" id="prog-fill" style="width:0%"></div>
  </div>
  <div class="quiz-meta" id="quiz-meta">1 / ${S.queue.length}</div>
  ${timerHtml}
</div>
<div id="question-mount"></div>`;
}

function renderQuestion() {
  const q = S.queue[S.idx];
  const total = S.queue.length;
  const pct = (S.idx / total) * 100;

  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('quiz-meta').textContent = `${S.idx + 1} / ${total}`;

  const state = S.answers[S.idx];
  const submitted = state?.submitted || false;
  const showFeedback = submitted && S.mode !== 'exam';

  document.getElementById('question-mount').innerHTML = questionCardHTML(q, submitted, showFeedback, state);
  wireQuestion(q, submitted, showFeedback);

  document.getElementById('quit-btn').addEventListener('click', () => {
    if (confirm('Quit this session?')) {
      stopTimer();
      if (S.mode === 'exam' || Object.keys(S.answers).length > 0) render('results');
      else showHome();
    }
  });
}

// ── Question card HTML ────────────────────────────────────────────────────────
function questionCardHTML(q, submitted, showFeedback, state) {
  const D = buildDiagramMap(q);
  return `
<div class="question-card">
  ${qMetaHTML(q)}
  ${introHTML(q)}
  ${D.before_stem}
  <div class="q-stem">${stemWithTables(q.question_stem)}</div>
  ${D.after_stem}
  ${answerAreaHTML(q, submitted, showFeedback, state, D)}
  ${feedbackHTML(q, submitted, showFeedback, state, D)}
</div>
${navHTML(submitted)}`;
}

function qMetaHTML(q) {
  const typeClass = {
    multiple_choice: 'type-mc',
    multi_select: 'type-ms',
    drag_drop: 'type-dd',
    hotspot_yesno: 'type-hs',
    hotspot_dropdown: 'type-hs',
    simulation: 'type-sim',
  }[q.question_type] || '';
  const typeLabel = {
    multiple_choice: 'Multiple Choice',
    multi_select: 'Multi Select',
    drag_drop: 'Drag & Drop',
    hotspot_yesno: 'Hotspot Yes/No',
    hotspot_dropdown: 'Hotspot Dropdown',
    simulation: 'Simulation',
  }[q.question_type] || q.question_type;
  return `
<div class="q-meta">
  <span class="tag">Q${q.question_number}</span>
  <span class="tag">${q.topic}</span>
  <span class="tag ${typeClass}">${typeLabel}</span>
  ${q.batch ? `<span class="tag">Batch ${q.batch}</span>` : ''}
</div>`;
}

function introHTML(q) {
  if (!q.has_introductory_info || !q.introductory_info) return '';
  return `
<button class="intro-toggle" id="intro-toggle">▶ Case Study — click to expand</button>
<div class="intro-body" id="intro-body">${esc(q.introductory_info)}</div>`;
}

// Build a map of position → rendered HTML for all diagrams in a question.
// Positions: before_stem | after_stem | after_option_A…Z | after_options |
//            after_correct_answer | in_explanation | after_explanation
function buildDiagramMap(q) {
  const empty = () => '';
  const map = {
    before_stem:          [],
    after_stem:           [],
    after_options:        [],
    after_correct_answer: [],
    in_explanation:       [],
    after_explanation:    [],
  };

  if (!q.has_diagram || !q.diagrams || !q.diagrams.length) {
    return new Proxy(map, { get: (t, k) => t[k] ?? '' });
  }

  for (const d of q.diagrams) {
    const pos = d.diagram_position || (d.diagram_section === 'answer' ? 'after_correct_answer' : 'after_stem');
    const html = diagramSlot(d);
    if (pos.startsWith('after_option_')) {
      const key = pos; // e.g. 'after_option_A'
      if (!map[key]) map[key] = [];
      map[key].push(html);
    } else if (map[pos] !== undefined) {
      map[pos].push(html);
    } else {
      map['after_stem'].push(html); // fallback
    }
  }

  // Collapse each position to a string
  const result = {};
  for (const [k, v] of Object.entries(map)) {
    result[k] = v.length ? `<div class="diagrams">${v.join('')}</div>` : '';
  }
  return result;
}

function diagramSlot(d) {
  if (d.diagram_path) {
    const src = resolveDiagramPath(d.diagram_path);
    return `<div class="diagram-item"><img src="${esc(src)}" alt="Diagram ${d.diagram_index + 1}" loading="lazy"></div>`;
  }
  if (d.diagram_description) {
    return `<div class="diagram-fallback"><strong>Diagram ${d.diagram_index + 1}:</strong> ${esc(d.diagram_description)}</div>`;
  }
  return '';
}

// Rewrite stored relative paths to work whether served via HTTP (/quiz/) or file://
function resolveDiagramPath(p) {
  if (!p) return p;
  // Stored as: ../AZ500sims/cropped-images/<page>/<file>
  // When served at http://localhost:3737/quiz/ → rewrite to /quiz-img/<page>/<file>
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    return p.replace(/^.*cropped-images\//, '/quiz-img/');
  }
  return p; // file:// — relative path works as-is
}

function answerAreaHTML(q, submitted, showFeedback, state, D={}) {
  switch (q.question_type) {
    case 'multiple_choice': return mcHTML(q, submitted, showFeedback, state, D);
    case 'multi_select':    return msHTML(q, submitted, showFeedback, state, D);
    case 'hotspot_yesno':   return hsYNHTML(q, submitted, showFeedback, state) + (D.after_options||'');
    case 'hotspot_dropdown':
    case 'drag_drop':       return slotsHTML(q, submitted, showFeedback, state) + (D.after_options||'');
    case 'simulation':      return simHTML(q, submitted);
    default:                return '';
  }
}

function mcHTML(q, submitted, showFeedback, state, D={}) {
  const correct = normalizeAnswer(q.correct_answer);
  const rows = Object.entries(q.options).map(([k, v]) => {
    let cls = '';
    if (submitted) {
      if (showFeedback) {
        if (correct.includes(k)) cls = 'correct disabled';
        else if (state?.userAnswer === k) cls = 'wrong disabled';
        else cls = 'disabled';
      } else {
        cls = state?.userAnswer === k ? 'selected disabled' : 'disabled';
      }
    }
    const afterOpt = D[`after_option_${k}`] || '';
    return `<div class="option ${cls}" data-key="${k}">
      <span class="option-key">${k}</span>
      <span>${esc(v)}</span>
    </div>${afterOpt}`;
  }).join('');
  return `<div class="options" id="options">${rows}</div>${D.after_options||''}`;
}

function msHTML(q, submitted, showFeedback, state, D={}) {
  const correct = normalizeAnswer(q.correct_answer);
  const selected = state?.userAnswer || [];
  const rows = Object.entries(q.options).map(([k, v]) => {
    let cls = '';
    if (submitted) {
      if (showFeedback) {
        if (correct.includes(k)) cls = 'correct disabled';
        else if (selected.includes(k)) cls = 'wrong disabled';
        else cls = 'disabled';
      } else {
        cls = selected.includes(k) ? 'selected disabled' : 'disabled';
      }
    } else {
      cls = selected.includes(k) ? 'selected' : '';
    }
    const afterOpt = D[`after_option_${k}`] || '';
    return `<div class="option ${cls}" data-key="${k}">
      <span class="option-key">${k}</span>
      <span>${esc(v)}</span>
    </div>${afterOpt}`;
  }).join('');
  return `<div class="options" id="options">${rows}</div>${D.after_options||''}`;
}

function hsYNHTML(q, submitted, showFeedback, state) {
  const rows = q.hotspot_rows || [];
  const userAnswers = state?.userAnswer || {};
  const body = rows.map((row, i) => {
    const ua = userAnswers[i];
    return `<tr data-row="${i}">
      <td>${esc(row.statement)}</td>
      <td class="answer-cell">
        ${['Yes','No'].map(yn => {
          let cls = '';
          if (submitted) {
            if (showFeedback) {
              if (yn === row.correct_answer) cls = 'correct';
              else if (ua === yn) cls = 'wrong';
            } else {
              if (ua === yn) cls = 'selected';
            }
          } else {
            if (ua === yn) cls = 'selected';
          }
          return `<button class="hs-btn ${cls}" data-yn="${yn}" ${submitted ? 'disabled' : ''}>${yn}</button>`;
        }).join('')}
      </td>
    </tr>`;
  }).join('');
  return `<table class="hotspot-table">
    <thead><tr><th>Statement</th><th>Answer</th></tr></thead>
    <tbody id="hs-body">${body}</tbody>
  </table>`;
}

function slotsHTML(q, submitted, showFeedback, state) {
  const slots = q.dragdrop_slots || {};
  const userAnswers = state?.userAnswer || {};
  return `<div class="slots" id="slots">` +
    Object.entries(slots).map(([label, correct]) => {
      const ua = userAnswers[label] || '';
      let cls = '';
      let correctHint = '';
      if (submitted && showFeedback) {
        const isCorrect = ua.trim().toLowerCase() === correct.trim().toLowerCase();
        cls = isCorrect ? 'correct' : 'wrong';
        if (!isCorrect) correctHint = `<span class="slot-correct-val">✓ ${esc(correct)}</span>`;
      }
      return `<div class="slot ${cls}">
        <span class="slot-label">${esc(label)}</span>
        <input class="slot-answer" data-label="${esc(label)}" value="${esc(ua)}"
          placeholder="Type answer…" ${submitted ? 'disabled' : ''}>
        ${correctHint}
      </div>`;
    }).join('') + `</div>`;
}

function simHTML(q, submitted) {
  return `<div class="diagram-fallback" style="border-color:var(--warn);margin-bottom:4px">
    <strong>Simulation task:</strong> This is a hands-on task in the actual exam.
    Read the task above and use the explanation below to understand the steps.
  </div>`;
}

function feedbackHTML(q, submitted, showFeedback, state, D={}) {
  if (!submitted) return `<div class="feedback" id="feedback"></div>`;
  if (!showFeedback) return `<div class="feedback" id="feedback"></div>`;

  const correct = state?.correct;
  const cls = correct ? '' : 'wrong-fb';
  const label = correct ? '✓ Correct' : '✗ Incorrect';

  let correctAnswerHtml = '';
  if (!correct) {
    const ca = q.correct_answer;
    if (ca && ca !== 'See the explanation below.') {
      const caStr = Array.isArray(ca) ? ca.join(', ') : ca;
      correctAnswerHtml = `<div style="font-size:.82rem;color:var(--correct);margin-top:6px">Correct: <strong>${esc(caStr)}</strong></div>`;
    }
  }

  const afterCorrect = D.after_correct_answer || '';

  const expl = q.explanation
    ? `<div class="explanation-text">${D.in_explanation||''}${esc(q.explanation)}</div>`
    : (D.in_explanation || '');

  const afterExpl = D.after_explanation || '';

  const votes = q.community_votes
    ? `<div class="community-votes">Community votes: <span>${esc(q.community_votes)}</span></div>`
    : '';

  const aiDiscussion = q.ai_discussion ? `
    <div class="ai-discussion">
      <button class="ai-discussion-toggle" onclick="toggleAI(this)">
        <i class="ai-chevron">▶</i> 🤖 AI Analysis — Answer Flagged
      </button>
      <div class="ai-discussion-body">${esc(q.ai_discussion)}</div>
    </div>` : '';

  return `<div class="feedback ${cls} show" id="feedback">
    <div class="feedback-label">${label}</div>
    ${correctAnswerHtml}
    ${afterCorrect}
    ${expl}
    ${afterExpl}
    ${votes}
    ${aiDiscussion}
  </div>`;
}

function toggleAI(btn) {
  btn.classList.toggle('open');
  const body = btn.nextElementSibling;
  body.classList.toggle('open');
}

function navHTML(submitted) {
  const isLast = S.idx === S.queue.length - 1;
  const nextLabel = isLast ? 'Finish' : 'Next →';

  if (S.mode === 'exam') {
    // Exam mode: only Next button, no submit, no skip
    return `<div class="q-actions">
      <button class="btn secondary" id="next-btn">${nextLabel}</button>
    </div>`;
  }

  if (submitted) {
    return `<div class="q-actions">
      <button class="btn secondary" id="next-btn">${nextLabel}</button>
    </div>`;
  }

  return `<div class="q-actions">
    <button class="btn secondary" id="skip-btn">Skip</button>
    <button class="btn" id="submit-btn">Submit</button>
  </div>`;
}

// ── Wire question interactions ────────────────────────────────────────────────
function wireQuestion(q, submitted, showFeedback, state) {
  // Intro toggle
  const introBtn = document.getElementById('intro-toggle');
  if (introBtn) {
    introBtn.addEventListener('click', () => {
      const body = document.getElementById('intro-body');
      body.classList.toggle('open');
      introBtn.textContent = body.classList.contains('open')
        ? '▼ Case Study — click to collapse'
        : '▶ Case Study — click to expand';
    });
  }

  if (submitted) {
    wireNext(q);
    return;
  }

  // Track user input per type
  if (q.question_type === 'multiple_choice') {
    let sel = null;
    document.querySelectorAll('.option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        sel = opt.dataset.key;
      });
    });
    wireSubmit(() => {
      if (!sel) return false;
      const correct = normalizeAnswer(q.correct_answer);
      const isCorrect = correct.includes(sel);
      return { userAnswer: sel, correct: isCorrect };
    }, q);
  }

  else if (q.question_type === 'multi_select') {
    let sel = [];
    document.querySelectorAll('.option').forEach(opt => {
      opt.addEventListener('click', () => {
        const k = opt.dataset.key;
        if (sel.includes(k)) {
          sel = sel.filter(x => x !== k);
          opt.classList.remove('selected');
        } else {
          sel.push(k);
          opt.classList.add('selected');
        }
      });
    });
    wireSubmit(() => {
      if (sel.length === 0) return false;
      const correct = normalizeAnswer(q.correct_answer).sort();
      const isCorrect = JSON.stringify([...sel].sort()) === JSON.stringify(correct);
      return { userAnswer: sel, correct: isCorrect };
    }, q);
  }

  else if (q.question_type === 'hotspot_yesno') {
    const userAnswers = {};
    document.querySelectorAll('.hs-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr').dataset.row;
        userAnswers[row] = btn.dataset.yn;
        btn.closest('tr').querySelectorAll('.hs-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
    wireSubmit(() => {
      const rows = q.hotspot_rows || [];
      if (Object.keys(userAnswers).length === 0) return false;
      const isCorrect = rows.every((row, i) => userAnswers[i] === row.correct_answer);
      return { userAnswer: userAnswers, correct: isCorrect };
    }, q);
  }

  else if (q.question_type === 'drag_drop' || q.question_type === 'hotspot_dropdown') {
    const userAnswers = {};
    document.querySelectorAll('.slot-answer').forEach(inp => {
      inp.addEventListener('input', () => {
        userAnswers[inp.dataset.label] = inp.value;
      });
    });
    wireSubmit(() => {
      const slots = q.dragdrop_slots || {};
      const filled = Object.keys(userAnswers).filter(k => userAnswers[k].trim());
      if (filled.length === 0) return false;
      const isCorrect = Object.entries(slots).every(([label, correct]) =>
        (userAnswers[label] || '').trim().toLowerCase() === correct.trim().toLowerCase()
      );
      return { userAnswer: userAnswers, correct: isCorrect };
    }, q);
  }

  else if (q.question_type === 'simulation') {
    wireSubmit(() => ({ userAnswer: 'viewed', correct: true }), q);
  }

  // Skip
  const skipBtn = document.getElementById('skip-btn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      S.answers[S.idx] = { submitted: true, correct: false, userAnswer: null, skipped: true };
      advance();
    });
  }

  // Exam mode: Next just advances without scoring
  if (S.mode === 'exam') {
    wireNext(q);
  }
}


function wireSubmit(getResult, q) {
  const btn = document.getElementById('submit-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const result = getResult();
    if (result === false) {
      btn.textContent = 'Select an answer first';
      setTimeout(() => btn.textContent = 'Submit', 1200);
      return;
    }
    S.answers[S.idx] = { submitted: true, ...result };
    renderQuestion(); // re-render with feedback
  });
}

function wireNext(q) {
  const btn = document.getElementById('next-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    // In exam mode, capture whatever was selected before advancing
    if (S.mode === 'exam' && !S.answers[S.idx]) {
      const result = captureExamAnswer(q);
      if (result) S.answers[S.idx] = { submitted: true, ...result };
    }
    advance();
  });
}

function captureExamAnswer(q) {
  if (q.question_type === 'multiple_choice') {
    const sel = document.querySelector('.option.selected');
    if (!sel) return null;
    const ua = sel.dataset.key;
    return { userAnswer: ua, correct: normalizeAnswer(q.correct_answer).includes(ua) };
  }
  if (q.question_type === 'multi_select') {
    const sels = [...document.querySelectorAll('.option.selected')].map(o => o.dataset.key);
    if (!sels.length) return null;
    const correct = normalizeAnswer(q.correct_answer).sort();
    return { userAnswer: sels, correct: JSON.stringify([...sels].sort()) === JSON.stringify(correct) };
  }
  if (q.question_type === 'hotspot_yesno') {
    const ua = {};
    document.querySelectorAll('#hs-body tr').forEach((tr, i) => {
      const sel = tr.querySelector('.hs-btn.selected');
      if (sel) ua[i] = sel.dataset.yn;
    });
    if (!Object.keys(ua).length) return null;
    const isCorrect = (q.hotspot_rows || []).every((row, i) => ua[i] === row.correct_answer);
    return { userAnswer: ua, correct: isCorrect };
  }
  if (q.question_type === 'drag_drop' || q.question_type === 'hotspot_dropdown') {
    const ua = {};
    document.querySelectorAll('.slot-answer').forEach(inp => { ua[inp.dataset.label] = inp.value; });
    const slots = q.dragdrop_slots || {};
    const isCorrect = Object.entries(slots).every(([label, correct]) =>
      (ua[label] || '').trim().toLowerCase() === correct.trim().toLowerCase()
    );
    return { userAnswer: ua, correct: isCorrect };
  }
  return null;
}

function advance() {
  if (S.idx < S.queue.length - 1) {
    S.idx++;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    stopTimer();
    render('results');
  }
}

// ── Results ───────────────────────────────────────────────────────────────────
function resultsHTML() {
  const total = S.queue.length;
  const answered = Object.values(S.answers).filter(a => a.submitted && !a.skipped);
  const correct = answered.filter(a => a.correct).length;
  const skipped = Object.values(S.answers).filter(a => a.skipped).length;
  const wrong = answered.length - correct;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = pct >= 70;

  const reviewItems = S.queue.map((q, i) => {
    const a = S.answers[i];
    const dotCls = !a ? 'skipped' : a.skipped ? 'skipped' : a.correct ? 'correct' : 'wrong';
    const label = !a ? 'Not answered' : a.skipped ? 'Skipped' : a.correct ? 'Correct' : 'Incorrect';
    return `<div class="review-item" data-idx="${i}">
      <div class="review-dot ${dotCls}"></div>
      <span>Q${q.question_number} — ${esc(q.topic)}</span>
      <span style="margin-left:auto;font-size:.75rem;color:var(--muted)">${label}</span>
    </div>`;
  }).join('');

  return `
<div id="results">
  <div class="score-ring">
    <div class="score-number ${passed ? 'pass' : 'fail'}">${pct}%</div>
    <div class="score-label">${passed ? 'Pass (≥70%)' : 'Fail (<70%)'} · ${correct} / ${total} correct</div>
  </div>
  <div class="score-stats">
    <div class="stat-box"><div class="val" style="color:var(--correct)">${correct}</div><div class="lbl">Correct</div></div>
    <div class="stat-box"><div class="val" style="color:var(--wrong)">${wrong}</div><div class="lbl">Wrong</div></div>
    <div class="stat-box"><div class="val" style="color:var(--muted)">${skipped}</div><div class="lbl">Skipped</div></div>
  </div>
  <div class="result-actions">
    <button class="btn secondary" id="home-btn">← Home</button>
    <button class="btn" id="retry-btn">Retry Same Questions</button>
  </div>
  <hr>
  <div style="font-size:.85rem;color:var(--muted);margin-bottom:8px">Review questions</div>
  <div class="review-list">${reviewItems}</div>
</div>`;
}

function wireResults() {
  document.getElementById('home-btn').addEventListener('click', showHome);
  document.getElementById('retry-btn').addEventListener('click', () => {
    S.idx = 0; S.answers = {};
    S.queue = shuffle([...S.queue]);
    if (S.mode === 'exam') { S.secondsLeft = 90 * 60; }
    render('quiz');
    if (S.mode === 'exam') startTimer();
  });
  document.querySelectorAll('.review-item').forEach(item => {
    item.addEventListener('click', () => {
      S.idx = parseInt(item.dataset.idx);
      render('quiz');
    });
  });
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer() {
  const el = document.getElementById('timer');
  if (!el) return;
  updateTimerDisplay();
  S.timerInterval = setInterval(() => {
    S.secondsLeft--;
    updateTimerDisplay();
    if (S.secondsLeft <= 0) {
      stopTimer();
      render('results');
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById('timer');
  if (!el) return;
  const m = Math.floor(S.secondsLeft / 60);
  const s = S.secondsLeft % 60;
  el.textContent = `${m}:${String(s).padStart(2, '0')}`;
  el.className = 'timer';
  if (S.secondsLeft < 600) el.classList.add('warn');
  if (S.secondsLeft < 120) el.classList.add('danger');
}

function stopTimer() {
  if (S.timerInterval) { clearInterval(S.timerInterval); S.timerInterval = null; }
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeAnswer(ca) {
  if (!ca) return [];
  if (Array.isArray(ca)) return ca;
  // 'AC' → ['A','C'], 'A' → ['A']
  return ca.split('').filter(c => /[A-Z]/.test(c));
}

// Convert markdown-style tables in question stems to HTML tables
function stemWithTables(stem) {
  if (!stem) return '';
  const escaped = esc(stem);
  // Replace markdown tables
  const tableRe = /(\|.+\|[\r\n]+\|[-| :]+\|[\r\n]+(?:\|.+\|[\r\n]*)+)/g;
  return escaped.replace(tableRe, block => {
    const lines = block.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return block;
    const header = lines[0].split('|').filter((_, i, a) => i > 0 && i < a.length - 1).map(c => `<th>${c.trim()}</th>`).join('');
    const bodyRows = lines.slice(2).map(line => {
      const cells = line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${header}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
boot();
