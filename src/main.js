import '@fontsource-variable/space-grotesk';
import './style.css';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  sourceDb: 55,
  sourceName: 'Conversa',
  sourceIcon: 'icon-talk',
  frequency: 220,
  distance: 4,
  barrier: 0,
  barrierName: 'Sense barrera',
  audioOn: false,
  missionChecked: false,
  progress: new Set(),
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function estimatedDb() {
  const distanceLoss = 20 * Math.log10(state.distance);
  return Math.round(clamp(state.sourceDb - distanceLoss - state.barrier, 0, 120));
}

function impactFor(db) {
  if (db < 55) return { label: 'Nivell baix · ambient tranquil', color: '#32d6c4' };
  if (db < 70) return { label: 'Nivell moderat · el sentiràs clarament', color: '#6d7500' };
  if (db < 85) return { label: 'Nivell alt · pot costar concentrar-se', color: '#8a5700' };
  return { label: 'Nivell molt alt · allunya’t o protegeix l’oïda', color: '#a13f35' };
}

function updateProgress(key) {
  state.progress.add(key);
  const amount = Math.min(100, state.progress.size * 14);
  $('#progressValue').textContent = amount;
}

function updateSimulation() {
  const db = estimatedDb();
  const impact = impactFor(db);
  $('#distanceValue').textContent = `${state.distance} m`;
  $('#sceneDistance').textContent = `${state.distance} m`;
  $('#sceneSource').textContent = state.sourceName.toUpperCase();
  $('#sceneSourceLabel').textContent = state.sourceName.toLowerCase();
  $('#sceneSourceUse').setAttribute('href', `#${state.sourceIcon}`);
  $('#resultDb').textContent = db;
  $('#impactLabel').textContent = impact.label;
  $('#impactLabel').style.color = impact.color;
  $('#spectrumNeedle').style.left = `${clamp((db / 110) * 100, 1, 98)}%`;

  const listenerLeft = 36 + (state.distance / 20) * 52;
  $('#listenerNode').style.left = `${listenerLeft}%`;
  $('.distance-line').style.width = `${listenerLeft - 16}%`;

  const barrier = $('#barrierNode');
  barrier.className = 'barrier-node';
  if (state.barrier) {
    barrier.classList.add('active');
    if (state.barrier === 5) barrier.classList.add('vegetation');
  }
  if (state.audioOn) updateTone();
  drawSoundScene();
}

const soundCanvas = $('#soundCanvas');
const soundCtx = soundCanvas.getContext('2d');
let scenePhase = 0;

function resizeCanvas(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return rect;
}

function drawSoundScene() {
  const rect = resizeCanvas(soundCanvas, soundCtx);
  soundCtx.clearRect(0, 0, rect.width, rect.height);
  const x = rect.width * .16;
  const y = rect.height * .48;
  const maxRadius = rect.width * (.22 + state.distance / 27);
  const db = estimatedDb();
  const rings = 7;
  for (let i = 0; i < rings; i++) {
    const normalized = ((i / rings) + scenePhase) % 1;
    const radius = 36 + normalized * maxRadius;
    const alpha = (1 - normalized) * (.18 + db / 420);
    soundCtx.beginPath();
    soundCtx.arc(x, y, radius, -Math.PI / 2, Math.PI / 2);
    soundCtx.strokeStyle = `rgba(50,214,196,${alpha})`;
    soundCtx.lineWidth = 1.5;
    soundCtx.stroke();
  }
  if (state.barrier) {
    const barrierX = rect.width * .45;
    const shadow = soundCtx.createLinearGradient(barrierX, 0, rect.width, 0);
    shadow.addColorStop(0, `rgba(7,27,42,${state.barrier === 15 ? .88 : .48})`);
    shadow.addColorStop(1, 'rgba(7,27,42,0)');
    soundCtx.fillStyle = shadow;
    soundCtx.fillRect(barrierX, rect.height * .23, rect.width - barrierX, rect.height * .54);
  }
}

const heroCanvas = $('#heroScope');
const heroCtx = heroCanvas.getContext('2d');
let heroPhase = 0;
function drawHeroScope() {
  const rect = resizeCanvas(heroCanvas, heroCtx);
  heroCtx.clearRect(0, 0, rect.width, rect.height);
  const mid = rect.height / 2;
  heroCtx.beginPath();
  for (let x = 0; x <= rect.width; x += 3) {
    const envelope = .42 + .58 * Math.sin(x * .013 + heroPhase * .25) ** 2;
    const y = mid + Math.sin(x * .067 + heroPhase) * rect.height * .23 * envelope + Math.sin(x * .018 - heroPhase * .6) * 22;
    if (x === 0) heroCtx.moveTo(x, y); else heroCtx.lineTo(x, y);
  }
  const gradient = heroCtx.createLinearGradient(0, 0, rect.width, 0);
  gradient.addColorStop(0, 'rgba(50,214,196,0)');
  gradient.addColorStop(.25, '#32d6c4');
  gradient.addColorStop(.72, '#d8f34a');
  gradient.addColorStop(1, 'rgba(216,243,74,0)');
  heroCtx.strokeStyle = gradient;
  heroCtx.lineWidth = 3;
  heroCtx.shadowColor = '#32d6c4';
  heroCtx.shadowBlur = 12;
  heroCtx.stroke();
  heroCtx.shadowBlur = 0;
}

function animate() {
  heroPhase += .025;
  scenePhase += .005;
  drawHeroScope();
  drawSoundScene();
  requestAnimationFrame(animate);
}

let audioContext;
let oscillator;
let gain;
function startAudio() {
  audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  oscillator = audioContext.createOscillator();
  gain = audioContext.createGain();
  oscillator.type = state.sourceName === 'Trànsit' ? 'sawtooth' : 'sine';
  oscillator.frequency.value = state.frequency;
  gain.gain.value = .025;
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
}

function stopAudio() {
  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
    oscillator = null;
  }
}

async function playDrumHit() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio is not supported');
  audioContext = audioContext || new AudioContextClass();
  if (audioContext.state === 'suspended') await audioContext.resume();

  const now = audioContext.currentTime;
  const output = audioContext.createGain();
  output.gain.value = .28;
  output.connect(audioContext.destination);

  const thump = audioContext.createOscillator();
  const thumpEnvelope = audioContext.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(145, now);
  thump.frequency.exponentialRampToValueAtTime(55, now + .14);
  thumpEnvelope.gain.setValueAtTime(.0001, now);
  thumpEnvelope.gain.exponentialRampToValueAtTime(.46, now + .006);
  thumpEnvelope.gain.exponentialRampToValueAtTime(.0001, now + .16);
  thump.connect(thumpEnvelope).connect(output);
  thump.addEventListener('ended', () => output.disconnect(), { once: true });
  thump.start(now);
  thump.stop(now + .17);

  const noise = audioContext.createBufferSource();
  const buffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * .12), audioContext.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  noise.buffer = buffer;
  const filter = audioContext.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 450;
  filter.Q.value = .9;
  const snapEnvelope = audioContext.createGain();
  snapEnvelope.gain.setValueAtTime(.0001, now);
  snapEnvelope.gain.exponentialRampToValueAtTime(.25, now + .003);
  snapEnvelope.gain.exponentialRampToValueAtTime(.0001, now + .11);
  noise.connect(filter).connect(snapEnvelope).connect(output);
  noise.start(now);
  noise.stop(now + .12);
}

function updateTone() {
  if (!oscillator || !gain) return;
  oscillator.frequency.setTargetAtTime(state.frequency, audioContext.currentTime, .05);
  const quietLevel = clamp(.008 + estimatedDb() / 5000, .008, .03);
  gain.gain.setTargetAtTime(quietLevel, audioContext.currentTime, .05);
}

$('#audioToggle').addEventListener('click', async () => {
  state.audioOn = !state.audioOn;
  const button = $('#audioToggle');
  button.setAttribute('aria-checked', String(state.audioOn));
  $('b', button).textContent = state.audioOn ? 'Actiu' : 'Silenciat';
  if (state.audioOn) {
    startAudio();
    updateTone();
  } else {
    stopAudio();
  }
  updateProgress('audio');
});

$$('input[name="source"]').forEach(input => input.addEventListener('change', (event) => {
  state.sourceDb = Number(event.target.value);
  state.sourceName = event.target.dataset.name;
  state.frequency = Number(event.target.dataset.frequency);
  state.sourceIcon = event.target.dataset.icon;
  updateSimulation();
  updateProgress('source');
}));

$('#distance').addEventListener('input', (event) => {
  state.distance = Number(event.target.value);
  updateSimulation();
  updateProgress('distance');
});

$$('input[name="barrier"]').forEach(input => input.addEventListener('change', (event) => {
  state.barrier = Number(event.target.value);
  state.barrierName = event.target.dataset.name;
  updateSimulation();
  updateProgress('barrier');
}));

$('#resetLab').addEventListener('click', () => {
  $('input[name="source"][value="55"]').checked = true;
  $('input[name="barrier"][value="0"]').checked = true;
  $('#distance').value = 4;
  Object.assign(state, { sourceDb: 55, sourceName: 'Conversa', sourceIcon: 'icon-talk', frequency: 220, distance: 4, barrier: 0, barrierName: 'Sense barrera' });
  $('#guess5').value = '';
  $('#guess10').value = '';
  $('#distanceGuessFeedback').textContent = '';
  $('#distance').disabled = true;
  $$('input[name="barrier"]').forEach(input => { input.disabled = true; });
  $('#experimentConclusion').innerHTML = '<b>Comprova la teva hipòtesi:</b> mou l’oïda a 5 m i 10 m i compara els dB.';
  updateSimulation();
});

$('#distance').disabled = true;
$$('input[name="barrier"]').forEach(input => { input.disabled = true; });

$('#setDistanceGuess').addEventListener('click', () => {
  const guess5 = $('#guess5').value;
  const guess10 = $('#guess10').value;
  const feedback = $('#distanceGuessFeedback');
  if (!guess5 || !guess10) {
    feedback.textContent = 'Tria una resposta per a 5 m i una altra per a 10 m.';
    feedback.className = 'error-text';
    return;
  }
  feedback.textContent = 'Hipòtesi preparada. Ara ja pots moure la distància i comprovar-la.';
  feedback.className = 'success-text';
  $('#distance').disabled = false;
  $$('input[name="barrier"]').forEach(input => { input.disabled = false; });
  updateProgress('hypothesis');
});

function updateExperimentConclusion() {
  const db = estimatedDb();
  const distance = state.distance;
  if ($('#distance').disabled) return;
  const comparison = distance >= 10 ? 'molt més fluix' : distance >= 5 ? 'més fluix' : 'una mica més fluix';
  $('#experimentConclusion').innerHTML = `<b>Resultat:</b> a ${distance} m arriben uns <b>${db} dB</b>. El so és ${comparison} que a 1 m. Compara-ho amb la teva hipòtesi.`;
}

$('#distance').addEventListener('input', updateExperimentConclusion);
$$('input[name="barrier"]').forEach(input => input.addEventListener('change', updateExperimentConclusion));

function setupGuess(buttonId, name, feedbackId, correctValue, correctText) {
  $(buttonId).addEventListener('click', () => {
    const answer = $(`input[name="${name}"]:checked`);
    const feedback = $(feedbackId);
    if (!answer) {
      feedback.textContent = 'Tria una resposta abans de comprovar-la.';
      feedback.className = 'error-text';
    } else if (answer.value === correctValue) {
      feedback.textContent = `Sí! ${correctText}`;
      feedback.className = 'success-text';
      updateProgress(name);
    } else {
      feedback.textContent = `Resposta incorrecta. ${correctText}`;
      feedback.className = 'error-text';
    }
  });
}

setupGuess('#checkTravelGuess', 'travelGuess', '#travelGuessFeedback', 'b', 'La vibració passa d’una “part” de l’aire a la següent.');
setupGuess('#checkPitchGuess', 'pitchGuess', '#pitchGuessFeedback', 'b', 'Com més vibracions hi ha cada segon, més agut és el so.');
setupGuess('#checkDbGuess', 'dbGuess', '#dbGuessFeedback', 'b', 'Els dB indiquen el nivell amb què ens arriba el so.');

$('#startVibration').addEventListener('click', async () => {
  const lab = $('#vibrationLab');
  lab.classList.remove('is-running');
  requestAnimationFrame(() => lab.classList.add('is-running'));
  try {
    await playDrumHit();
    $('#vibrationResult').textContent = 'Escolta el tambor i mira com la vibració passa de puntet a puntet. L’aire es mou al seu lloc, però no viatja fins a l’orella.';
  } catch {
    $('#vibrationResult').textContent = 'La vibració passa de puntet a puntet. L’aire es mou al seu lloc, però no viatja fins a l’orella.';
  }
  setTimeout(() => lab.classList.remove('is-running'), 1900);
});

const waveLabCanvas = $('#waveLabCanvas');
const waveLabCtx = waveLabCanvas.getContext('2d');

function waveSettings() {
  const pitch = Number($('#pitchSlider').value);
  const strength = Number($('#strengthSlider').value);
  return { pitch, strength, frequency: 140 + pitch * 40, db: 20 + strength * 4 };
}

function drawWaveLab() {
  const rect = resizeCanvas(waveLabCanvas, waveLabCtx);
  const { pitch, strength, frequency, db } = waveSettings();
  waveLabCtx.clearRect(0, 0, rect.width, rect.height);
  waveLabCtx.strokeStyle = 'rgba(50,214,196,.15)';
  waveLabCtx.lineWidth = 1;
  for (let y = 28; y < rect.height; y += 28) { waveLabCtx.beginPath(); waveLabCtx.moveTo(0, y); waveLabCtx.lineTo(rect.width, y); waveLabCtx.stroke(); }
  const amplitude = 12 + strength * 5;
  const cycles = 1.2 + pitch * .55;
  waveLabCtx.beginPath();
  for (let x = 0; x <= rect.width; x += 2) {
    const y = rect.height / 2 + Math.sin((x / rect.width) * Math.PI * 2 * cycles) * amplitude;
    if (x === 0) waveLabCtx.moveTo(x, y); else waveLabCtx.lineTo(x, y);
  }
  const gradient = waveLabCtx.createLinearGradient(0, 0, rect.width, 0);
  gradient.addColorStop(0, '#32d6c4'); gradient.addColorStop(1, '#d8f34a');
  waveLabCtx.strokeStyle = gradient; waveLabCtx.lineWidth = 4; waveLabCtx.stroke();
  $('#pitchWord').textContent = pitch <= 3 ? 'greu' : pitch <= 7 ? 'mitjà' : 'agut';
  $('#strengthWord').textContent = strength <= 3 ? 'fluix' : strength <= 7 ? 'moderat' : 'fort';
  $('#frequencyValue').textContent = frequency;
  $('#strengthValue').textContent = db;
}

$('#pitchSlider').addEventListener('input', drawWaveLab);
$('#strengthSlider').addEventListener('input', drawWaveLab);

$('#playWave').addEventListener('click', async () => {
  const { frequency, strength } = waveSettings();
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const tone = context.createOscillator();
  const volume = context.createGain();
  tone.frequency.value = frequency;
  volume.gain.value = .006 + strength * .0018;
  tone.connect(volume).connect(context.destination);
  tone.start(); tone.stop(context.currentTime + .7);
  tone.addEventListener('ended', () => context.close());
});

const situations = [
  { db: 20, icon: '🤫', name: 'Un xiuxiueig', zone: 'MOLT TRANQUIL', advice: 'És un so molt fluix.', color: '#32d6c4' },
  { db: 35, icon: '📚', name: 'Una biblioteca', zone: 'TRANQUIL', advice: 'És fàcil concentrar-s’hi.', color: '#50d0b5' },
  { db: 50, icon: '🍽️', name: 'Un restaurant tranquil', zone: 'MODERAT', advice: 'Podem parlar i escoltar bé.', color: '#9fc64a' },
  { db: 65, icon: '🍽️', name: 'Un restaurant ple de gent', zone: 'SOROLLÓS', advice: 'Pot costar més concentrar-se.', color: '#d6b42f' },
  { db: 80, icon: '🚗', name: 'Trànsit intens', zone: 'FORT', advice: 'Si dura molta estona, pot cansar.', color: '#e88a31' },
  { db: 95, icon: '🚜', name: 'Un tallagespa', zone: 'MOLT FORT', advice: 'Cal limitar el temps i protegir l’oïda.', color: '#df6540' },
  { db: 110, icon: '🎵', name: 'Un concert molt fort', zone: 'MOLT FORT', advice: 'Allunya’t dels altaveus i protegeix l’oïda.', color: '#cc4444' },
  { db: 120, icon: '✈️', name: 'Un avió enlairant-se', zone: 'EXTREM', advice: 'És un nivell altíssim. Ens n’hem d’allunyar.', color: '#a82f50' },
];

function updateSituation() {
  const item = situations[Number($('#situationSlider').value)];
  $('#situationIcon').textContent = item.icon;
  $('#situationName').textContent = item.name;
  $('#situationZone').textContent = item.zone;
  $('#situationAdvice').textContent = item.advice;
  $('#situationDb').textContent = item.db;
  $('#situationStage').style.setProperty('--situation-color', item.color);
  $('#situationSlider').setAttribute('aria-valuetext', `${item.name}, aproximadament ${item.db} decibels`);
}

$('#situationSlider').addEventListener('input', updateSituation);

const activityTabs = $$('.activity-tabs [role="tab"]');
const completedActivities = new Set();

function selectActivity(panelId, scroll = false) {
  const tab = activityTabs.find(item => item.dataset.panel === panelId);
  if (!tab) return;
  activityTabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  $$('.activity-panel').forEach(panel => {
    const active = panel.id === tab.dataset.panel;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  if (panelId === 'activityMixer') requestAnimationFrame(updateLogDemo);
  if (scroll) $('#activitats').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function completeActivity(key, tabId) {
  completedActivities.add(key);
  const tab = $(`#${tabId}`);
  tab.classList.add('completed');
  $('.tab-state', tab).textContent = 'Feta ✓';
  $('#activityDone').textContent = completedActivities.size;
  $('#activityProgressFill').style.width = `${(completedActivities.size / 3) * 100}%`;
}

activityTabs.forEach(tab => tab.addEventListener('click', () => selectActivity(tab.dataset.panel)));
$$('.next-activity').forEach(button => button.addEventListener('click', () => selectActivity(button.dataset.next, true)));

$('#checkClassify').addEventListener('click', () => {
  const rows = $$('#classifyList .classify-row');
  let correct = 0;
  let unanswered = 0;
  rows.forEach(row => {
    const value = $('select', row).value;
    row.classList.remove('correct', 'incorrect');
    if (!value) {
      unanswered += 1;
      return;
    }
    const isCorrect = value === row.dataset.answer;
    row.classList.add(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) correct += 1;
  });
  const feedback = $('#classifyFeedback');
  feedback.className = 'activity-feedback';
  if (unanswered) {
    feedback.textContent = `Encara falten ${unanswered} situacions per classificar.`;
    feedback.classList.add('error');
  } else if (correct === rows.length) {
    feedback.textContent = 'Molt bé: has interpretat correctament els quatre nivells.';
    feedback.classList.add('success');
    completeActivity('classify', 'tabClassify');
    $('.next-activity', $('#activityClassify')).hidden = false;
    updateProgress('classify');
  } else {
    feedback.textContent = `${correct} de ${rows.length} correctes. Revisa els límits de la llegenda.`;
    feedback.classList.add('error');
  }
});

function combinedDb(levels) {
  if (!levels.length) return 0;
  const energy = levels.reduce((sum, level) => sum + (10 ** (level / 10)), 0);
  return Math.round(10 * Math.log10(energy));
}

const logDemoCounts = [1, 2, 4, 8, 16];
const logDemoLevels = [60, 63, 66, 69, 72];
const linearGraph = $('#linearGraph');
const logGraph = $('#logGraph');
const linearGraphCtx = linearGraph.getContext('2d');
const logGraphCtx = logGraph.getContext('2d');

function drawRelationGraph(canvas, ctx, kind, currentCount) {
  const rect = resizeCanvas(canvas, ctx);
  if (!rect.width || !rect.height) return;
  const pad = { left: 46, right: 16, top: 18, bottom: 36 };
  const width = rect.width - pad.left - pad.right;
  const height = rect.height - pad.top - pad.bottom;
  // Els dos gràfics comparteixen deliberadament la mateixa escala vertical.
  // Així es veu que log2(16) només arriba a 4 mentre que la recta arriba a 16.
  const maxY = 16;
  const xAt = value => pad.left + ((value - 1) / 15) * width;
  const yAt = value => pad.top + height - (value / maxY) * height;

  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.strokeStyle = '#d8e1de';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (height / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(rect.width - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#53646c';
    ctx.font = '12px Aptos, Segoe UI, sans-serif';
    ctx.fillText(String(16 - i * 4), pad.left - 25, y + 4);
  }
  ctx.strokeStyle = '#789099';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + height); ctx.lineTo(rect.width - pad.right, pad.top + height); ctx.stroke();

  ctx.fillStyle = '#53646c';
  ctx.font = '12px Aptos, Segoe UI, sans-serif';
  ctx.fillText('Y', 9, 15);
  ctx.fillText('quantitat (X)', rect.width - 82, rect.height - 8);
  [1, 4, 8, 12, 16].forEach(value => ctx.fillText(String(value), xAt(value) - 4, pad.top + height + 18));

  ctx.beginPath();
  for (let value = 1; value <= 16; value += .15) {
    const result = kind === 'linear' ? value : Math.log2(value);
    const x = xAt(value);
    const y = yAt(result);
    if (value === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = kind === 'linear' ? '#08786f' : '#d26235';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();

  const currentResult = kind === 'linear' ? currentCount : Math.log2(currentCount);
  ctx.beginPath();
  ctx.arc(xAt(currentCount), yAt(currentResult), 7, 0, Math.PI * 2);
  ctx.fillStyle = kind === 'linear' ? '#08786f' : '#d26235';
  ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
}

function drawRelationGraphs(count) {
  drawRelationGraph(linearGraph, linearGraphCtx, 'linear', count);
  drawRelationGraph(logGraph, logGraphCtx, 'log', count);
}

function updateLogDemo() {
  const step = Number($('#logSteps').value);
  const count = logDemoCounts[step];
  const level = logDemoLevels[step];
  $('#relationAmount').textContent = count;
  $('#logSpeakerCount').textContent = `${count} altaveu${count === 1 ? '' : 's'}`;
  $('#logDb').textContent = level;
  $$('#speakerGrid i').forEach((speaker, index) => speaker.classList.toggle('active', index < count));
  $('#logSteps').setAttribute('aria-valuetext', `${count} altaveus iguals, ${level} decibels`);
  $('#linearReadout').textContent = `Quantitat ${count} → resultat ${count}`;
  $('#logReadout').textContent = `Quantitat ${count} → resultat ${step}`;
  $('#relationExplanation').textContent = step === 0
    ? 'Comencem amb la quantitat 1. Mou el control per veure com creixen els dos gràfics.'
    : `La quantitat s’ha fet ${count} vegades més gran. A la línia recta, el resultat arriba a ${count}. A la corba logarítmica, només arriba a ${step}. Per fer pujar una mica la corba, hem d’avançar molt cap a la dreta.`;
  $('#logLesson').textContent = step === 0
    ? 'Comencem amb 1 altaveu que fa 60 dB.'
    : `Hem doblat els altaveus ${step} ${step === 1 ? 'vegada' : 'vegades'}. El comptador ha pujat ${step * 3} dB i ara marca ${level} dB.`;
  drawRelationGraphs(count);
}

$('#logSteps').addEventListener('input', updateLogDemo);

$$('#logGuess button').forEach(button => button.addEventListener('click', () => {
  const correct = button.dataset.answer === 'little';
  const feedback = $('#logGuessFeedback');
  $$('#logGuess button').forEach(item => item.classList.toggle('chosen', item === button));
  $('#logSteps').disabled = false;
  feedback.textContent = correct
    ? 'Bona hipòtesi! Mou el control i comprova-ho als dos gràfics.'
    : 'Ara mou el control i comprova què passa als dos gràfics.';
  feedback.className = `guess-feedback ${correct ? 'success-text' : ''}`;
}));

function updateMixer() {
  const inputs = $$('#mixerSources input');
  const active = inputs.filter(input => input.checked);
  const levels = active.map(input => Number(input.dataset.db));
  const result = combinedDb(levels);
  $('#mixedDb').textContent = result || '—';
  $('#mixerBars').innerHTML = inputs.map(input => {
    const level = input.checked ? Number(input.dataset.db) : 2;
    return `<i style="height:${level}%" title="${input.checked ? `${level} dB` : 'inactiu'}"></i>`;
  }).join('');
  const strongest = levels.length ? Math.max(...levels) : 0;
  $('#mixerExplanation').textContent = levels.length
    ? `La font més intensa és de ${strongest} dB i el conjunt arriba a ${result} dB.`
    : 'Activa com a mínim una font per calcular el nivell.';
  $('#mixerFeedback').textContent = '';
  $('#mixerFeedback').className = 'activity-feedback';
}

$$('#mixerSources input').forEach(input => input.addEventListener('change', updateMixer));

$('#checkMixer').addEventListener('click', () => {
  const active = $$('#mixerSources input').filter(input => input.checked);
  const result = combinedDb(active.map(input => Number(input.dataset.db)));
  const feedback = $('#mixerFeedback');
  feedback.className = 'activity-feedback';
  if (active.length !== 3) {
    feedback.textContent = `Has activat ${active.length} fonts. El repte en demana exactament tres.`;
    feedback.classList.add('error');
  } else if (result < 66) {
    feedback.textContent = `Repte superat: les tres fonts produeixen un nivell combinat de ${result} dB.`;
    feedback.classList.add('success');
    completeActivity('mixer', 'tabMixer');
    updateProgress('mixer');
  } else {
    feedback.textContent = `El resultat és ${result} dB. Canvia una de les fonts per baixar de 66 dB.`;
    feedback.classList.add('error');
  }
});

const measuredPoints = new Set();
const mapPoints = $$('.map-point');
mapPoints.forEach(point => { point.disabled = true; });
$('#mapGuess').addEventListener('change', () => {
  mapPoints.forEach(point => { point.disabled = !$('#mapGuess').value; });
  $('#mapFeedback').textContent = $('#mapGuess').value ? 'Hipòtesi feta. Ara mesura els sis punts.' : 'Tria primer el punt que creus que serà més tranquil.';
});

mapPoints.forEach(point => point.addEventListener('click', () => {
  const db = Number(point.dataset.db);
  measuredPoints.add(point.dataset.point);
  $('b', point).textContent = `${db}`;
  point.classList.add('measured');
  point.classList.toggle('medium', db >= 55 && db < 70);
  point.classList.toggle('loud', db >= 70);
  point.setAttribute('aria-label', `Punt ${point.dataset.point}, ${point.dataset.place}: ${db} decibels`);
  $('#mapCount').textContent = measuredPoints.size;
  $('#mapFeedback').textContent = measuredPoints.size === 6
    ? 'Ja tens totes les dades. Ara compara els punts i pren una decisió.'
    : `Punt ${point.dataset.point}, ${point.dataset.place}: ${db} dB. Ja has mesurat ${measuredPoints.size} de 6 punts.`;
}));

$('#checkMap').addEventListener('click', () => {
  const answer = $('input[name="mapAnswer"]:checked');
  const feedback = $('#mapFeedback');
  feedback.className = 'activity-feedback';
  if (measuredPoints.size < 6) {
    feedback.textContent = `Mesura primer els ${6 - measuredPoints.size} punts que falten.`;
    feedback.classList.add('error');
  } else if (!answer) {
    feedback.textContent = 'Selecciona un punt del mapa.';
    feedback.classList.add('error');
  } else if (answer.value === 'B') {
    feedback.textContent = 'Decisió correcta: B és el punt amb el nivell més baix, 49 dB, i queda protegit del carrer.';
    feedback.classList.add('success');
    completeActivity('map', 'tabMap');
    $('.next-activity', $('#activityMap')).hidden = false;
    updateProgress('map');
  } else {
    feedback.textContent = 'Compara els sis valors i busca el punt amb menys dB, lluny del carrer i de la pista.';
    feedback.classList.add('error');
  }
});

updateMixer();

const primer = $('#primerDialog');
$('#openPrimer').addEventListener('click', () => primer.showModal());
$('#closePrimer').addEventListener('click', () => primer.close());
$('#primerContinue').addEventListener('click', () => {
  primer.close();
  $('#explora').scrollIntoView({ behavior: 'smooth' });
});
primer.addEventListener('click', (event) => {
  const bounds = primer.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) primer.close();
});

const measureButtons = $$('#measures button');
const MISSION_START_DB = 84;
const MISSION_TARGET_DB = 69;
const MISSION_BUDGET = 7;
const MISSION_MEASURES = 3;

for (let i = 0; i < MISSION_BUDGET; i++) {
  const dot = document.createElement('i');
  $('#budgetDots').append(dot);
}

function selectedMeasures() {
  return measureButtons.filter(button => button.classList.contains('selected'));
}

function updateMission() {
  const selected = selectedMeasures();
  const reduction = selected.reduce((sum, button) => sum + Number(button.dataset.reduction), 0);
  const cost = selected.reduce((sum, button) => sum + Number(button.dataset.cost), 0);
  const level = MISSION_START_DB - reduction;
  $('#missionDb').textContent = level;
  $('#budgetValue').textContent = cost;
  $('#budgetValueTop').textContent = cost;
  $('#measureCount').textContent = selected.length;
  $('#budgetDots').setAttribute('aria-label', `${cost} de ${MISSION_BUDGET} punts utilitzats`);
  $$('#budgetDots i').forEach((dot, index) => dot.classList.toggle('used', index < cost));
  $('#missionDial').style.setProperty('--level', `${clamp(level, 0, 100)}%`);
  $('#missionMessage').textContent = level <= MISSION_TARGET_DB ? 'Nivell sonor assolit' : level <= MISSION_TARGET_DB + 3 ? 'Gairebé ho tens' : 'Cal intervenir';
  $('#missionHint').textContent = selected.length === 0
    ? 'Tria exactament 3 solucions i intenta arribar a 69 dB sense passar de 7 punts.'
    : selected.length === 1
      ? '1 mesura seleccionada.'
      : `${selected.length} mesures seleccionades.`;
  $('.mission-counters').classList.toggle('over-budget', cost > MISSION_BUDGET);
  measureButtons.forEach(button => {
    button.disabled = !button.classList.contains('selected') && selected.length >= MISSION_MEASURES;
  });
  if (state.missionChecked) $('#missionFeedback').hidden = true;
  if (state.missionChecked) $('#missionSuccessArt').hidden = true;
}

measureButtons.forEach(button => button.addEventListener('click', () => {
  button.classList.toggle('selected');
  state.missionChecked = false;
  updateMission();
}));

$('#resetMission').addEventListener('click', () => {
  measureButtons.forEach(button => {
    button.classList.remove('selected');
    button.disabled = false;
  });
  state.missionChecked = false;
  $('#missionFeedback').hidden = true;
  $('#missionSuccessArt').hidden = true;
  updateMission();
});

$('#checkMission').addEventListener('click', () => {
  const selected = selectedMeasures();
  const reduction = selected.reduce((sum, button) => sum + Number(button.dataset.reduction), 0);
  const cost = selected.reduce((sum, button) => sum + Number(button.dataset.cost), 0);
  const level = MISSION_START_DB - reduction;
  const feedback = $('#missionFeedback');
  const successArt = $('#missionSuccessArt');
  feedback.classList.remove('error');
  successArt.hidden = true;
  if (selected.length !== MISSION_MEASURES) {
    feedback.textContent = `Has de seleccionar exactament ${MISSION_MEASURES} mesures. Ara en tens ${selected.length}.`;
    feedback.classList.add('error');
  } else if (cost > MISSION_BUDGET) {
    feedback.textContent = `Has utilitzat ${cost} punts i el màxim és ${MISSION_BUDGET}. Busca una combinació més eficient.`;
    feedback.classList.add('error');
  } else if (level > MISSION_TARGET_DB) {
    feedback.textContent = `Has arribat a ${level} dB. És una millora, però encara cal reduir ${level - MISSION_TARGET_DB} dB més.`;
    feedback.classList.add('error');
  } else {
    feedback.textContent = `Missió superada: el nivell baixa a ${level} dB. Has fet servir ${cost} de 7 punts i has triat exactament 3 solucions.`;
    successArt.hidden = false;
    updateProgress('mission');
  }
  state.missionChecked = true;
  feedback.hidden = false;
});

$('#quizForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const answer = $('input[name="quiz"]:checked');
  const feedback = $('#quizFeedback');
  if (!answer) {
    feedback.textContent = 'Tria una resposta.';
    feedback.style.color = '#a3453f';
  } else if (answer.value === 'b') {
    feedback.textContent = 'Correcte. Has identificat dues maneres de reduir el so que arriba al receptor.';
    feedback.style.color = '#08786f';
    updateProgress('quiz');
  } else {
    feedback.textContent = 'Torna-ho a pensar: allunyar-se i posar barreres pot fer que ens arribi menys soroll.';
    feedback.style.color = '#a3453f';
  }
});

window.addEventListener('resize', () => {
  drawHeroScope();
  drawSoundScene();
  drawWaveLab();
  updateLogDemo();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.audioOn) {
    state.audioOn = false;
    stopAudio();
    $('#audioToggle').setAttribute('aria-checked', 'false');
    $('b', $('#audioToggle')).textContent = 'Silenciat';
  }
});

updateSimulation();
drawWaveLab();
updateSituation();
updateLogDemo();
updateMission();
animate();
