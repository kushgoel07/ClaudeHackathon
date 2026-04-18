import * as logStore from './logStore.js';
import * as claudeClient from './claudeClient.js';
import * as voiceInput from './voiceInput.js';
import * as photoInput from './photoInput.js';
import * as calendarClient from './calendarClient.js';
import * as notificationManager from './notificationManager.js';
import * as ui from './ui.js';
import { suggestCalories, suggestMacros } from './macroEngine.js';

let currentMealPending = null;
let obStep = 0;
const OB_STEPS = 5;
let obData = {};

async function init() {
  ui.updateStatusTime();
  setInterval(ui.updateStatusTime, 30000);

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await notificationManager.init(reg);
    } catch (_) {}
  }

  calendarClient.init();

  voiceInput.init(
    async (transcript) => {
      showScreen('log');
      ui.showProcessing('Analyzing with Aria…');
      try {
        const result = await claudeClient.logMeal(transcript);
        await handleClaudeResult(result, 'voice');
      } catch (e) {
        ui.hideProcessing();
        ui.showToast(e.message || 'Could not log — tap to try again', 'error');
      }
    },
    (err) => ui.showToast(err, 'error')
  );

  photoInput.init(async (base64, mimeType) => {
    showScreen('log');
    ui.showProcessing('Aria is reading your meal…');
    try {
      const result = await claudeClient.logPhoto(base64, mimeType);
      await handleClaudeResult(result, 'photo');
    } catch (e) {
      ui.hideProcessing();
      ui.showToast(e.message || 'Could not read photo — type it instead', 'error');
      console.error('photo log failed:', e);
    }
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'listen') {
    setTimeout(() => voiceInput.start(), 500);
    history.replaceState({}, '', '/');
  } else if (params.get('action') === 'photo') {
    setTimeout(() => photoInput.start(), 500);
    history.replaceState({}, '', '/');
  } else if (params.get('action') === 'coach') {
    showScreen('coach');
  }

  const profile = await logStore.getProfile();
  const onboarded = await logStore.getSetting('onboarded');

  if (!onboarded) {
    const suggestedKcal = suggestCalories(profile);
    obData = { calGoal: suggestedKcal, ...suggestMacros(suggestedKcal) };
    showScreen('onboarding');
    ui.renderOnboarding(obStep, OB_STEPS);
  } else {
    await enterApp(profile);
  }
}

async function enterApp(profile) {
  showScreen('home');
  await refreshDashboard();

  const hasCoachHistory = await logStore.getChatHistory();
  if (hasCoachHistory.length === 0) {
    try {
      const msg = await claudeClient.getWelcomeMessage(profile);
      await logStore.addChatMessage('coach', msg);
      ui.addChatMessage('coach', msg);
    } catch (_) {}
  } else {
    hasCoachHistory.forEach(m => ui.addChatMessage(m.role, m.text));
  }

  ui.updateProfileScreen(profile);
}

async function refreshDashboard() {
  const profile = await logStore.getProfile();
  const todayLog = await logStore.getTodayLog();
  const waterL = await logStore.getTodayWater();
  ui.updateDashboard(profile, todayLog, waterL);
}

async function handleClaudeResult(result, source) {
  if (result.type === 'meal') {
    currentMealPending = { ...result.meal, source };
    ui.showParsedCard(result.meal);
  } else if (result.type === 'water') {
    await logStore.addWater(result.amount_l);
    ui.hideProcessing();
    ui.showToast(`Water logged — ${result.note || ''}`, 'success');
    await refreshDashboard();
  } else if (result.type === 'coach') {
    ui.hideProcessing();
    ui.showToast(result.text.slice(0, 120), '');
    await logStore.addChatMessage('coach', result.text);
    ui.addChatMessage('coach', result.text);
  }
}

export async function confirmLog() {
  if (!currentMealPending) return;
  try {
    await logStore.addMeal(currentMealPending);
    ui.hideParsedCard();
    currentMealPending = null;
    await refreshDashboard();
    showScreen('home');
    ui.showToast('Meal logged!', 'success');
  } catch (e) {
    ui.showToast('Could not save — try again', 'error');
  }
}

export async function deleteMeal(id) {
  await logStore.deleteMeal(id);
  await refreshDashboard();
}

export async function handleTextLog() {
  const input = document.getElementById('text-log-input');
  const text = input?.value?.trim();
  if (!text) return;
  input.value = '';
  showScreen('log');
  ui.showProcessing('Analyzing with Aria…');
  try {
    const result = await claudeClient.logMeal(text);
    await handleClaudeResult(result, 'manual');
  } catch (e) {
    ui.hideProcessing();
    ui.showToast(e.message || 'Could not log — check API key in Profile', 'error');
  }
}

export async function quickLog(text) {
  showScreen('log');
  ui.showProcessing(`Logging ${text}…`);
  try {
    const result = await claudeClient.logMeal(text);
    await handleClaudeResult(result, 'manual');
  } catch (e) {
    ui.hideProcessing();
    ui.showToast(e.message || 'Could not log', 'error');
  }
}

export async function logWater(amount) {
  await logStore.addWater(amount);
  await refreshDashboard();
  ui.showToast(`${amount * 1000}ml water logged`, 'success');
}

export async function sendCoachMessage(text) {
  const input = document.getElementById('chat-input');
  const msg = text || input?.value?.trim();
  if (!msg) return;
  if (input) input.value = '';

  ui.addChatMessage('user', msg);
  await logStore.addChatMessage('user', msg);

  const typing = ui.addChatMessage('coach', '', true);
  try {
    const result = await claudeClient.askCoach(msg);
    ui.removeTypingIndicator();
    const reply = result.text || result.meal?.coaching_note || 'Got it!';
    ui.addChatMessage('coach', reply);
    await logStore.addChatMessage('coach', reply);
  } catch (e) {
    ui.removeTypingIndicator();
    const errMsg = e.message?.includes('API key')
      ? 'Please add your Anthropic API key in Profile → API Setup.'
      : 'Aria is unavailable — try again.';
    ui.addChatMessage('coach', errMsg);
  }
}

export function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name)?.classList.add('active');
  ui.setNavActive(name);
  if (name === 'home') refreshDashboard();
}
window.switchScreen = showScreen;

export function selectGoal(el) {
  document.querySelectorAll('.goal-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  obData.primaryGoal = el.dataset.goal;
  const kcal = suggestCalories({ ...obData });
  obData.calGoal = kcal;
  Object.assign(obData, suggestMacros(kcal, obData.primaryGoal));
}

export function obNext() {
  if (obStep === 0) {
    const name = document.getElementById('ob-name')?.value?.trim();
    const key = document.getElementById('ob-apikey')?.value?.trim();
    if (!name) { ui.showToast('Please enter your name', 'error'); return; }
    obData.name = name;
    if (key) {
      localStorage.setItem('vita_api_key', key);
      window._vitaConfig = window._vitaConfig || {};
      window._vitaConfig.anthropicKey = key;
    }
  } else if (obStep === 1) {
    const age = parseInt(document.getElementById('ob-age')?.value);
    const sex = document.getElementById('ob-sex')?.value;
    if (!age || age < 14) { ui.showToast('Please enter your age', 'error'); return; }
    obData.age = age;
    obData.sex = sex;
    const kcal = suggestCalories(obData);
    obData.calGoal = kcal;
    Object.assign(obData, suggestMacros(kcal));
  } else if (obStep === 2) {
    if (!obData.primaryGoal) { ui.showToast('Please select a goal', 'error'); return; }
  } else if (obStep === 3) {
    obData.calGoal    = parseInt(document.getElementById('tgt-kcal')?.value) || 2000;
    obData.proteinGoal= parseInt(document.getElementById('tgt-protein')?.value) || 120;
    obData.waterGoal  = parseFloat(document.getElementById('tgt-water')?.value) || 2;
    Object.assign(obData, suggestMacros(obData.calGoal, obData.primaryGoal));
    obData.proteinGoal = parseInt(document.getElementById('tgt-protein')?.value) || obData.proteinGoal;
  }
  obStep = Math.min(obStep + 1, OB_STEPS - 1);
  ui.renderOnboarding(obStep, OB_STEPS);
  if (obStep === 3) {
    setTimeout(() => {
      const kcalSlider = document.getElementById('tgt-kcal');
      if (kcalSlider) {
        kcalSlider.value = obData.calGoal;
        document.getElementById('tgt-kcal-val').textContent = obData.calGoal + ' kcal';
      }
      const pSlider = document.getElementById('tgt-protein');
      if (pSlider) {
        pSlider.value = obData.proteinGoal;
        document.getElementById('tgt-protein-val').textContent = obData.proteinGoal + 'g';
      }
    }, 50);
  }
}

export function obBack() {
  obStep = Math.max(obStep - 1, 0);
  ui.renderOnboarding(obStep, OB_STEPS);
}

export async function requestNotifications() {
  await notificationManager.requestPermission();
}

export async function finishOnboarding() {
  const profile = {
    name: obData.name || 'Friend',
    age: obData.age || 30,
    sex: obData.sex || 'prefer not to say',
    primaryGoal: obData.primaryGoal || 'Maintain weight',
    calGoal: obData.calGoal || 2000,
    proteinGoal: obData.proteinGoal || 120,
    carbGoal: obData.carbGoal || 220,
    fatGoal: obData.fatGoal || 70,
    fiberGoal: obData.fiberGoal || 25,
    waterGoal: obData.waterGoal || 2
  };
  await logStore.saveProfile(profile);
  await logStore.setSetting('onboarded', true);
  await logStore.setSetting('firstLogDate', new Date().toISOString().slice(0, 10));
  await enterApp(profile);
}

export function resetOnboarding() {
  obStep = 0;
  obData = {};
  showScreen('onboarding');
  ui.renderOnboarding(obStep, OB_STEPS);
}

export function showApiKeyEditor() {
  document.getElementById('api-key-modal').style.display = 'flex';
  const current = localStorage.getItem('vita_api_key') || '';
  document.getElementById('api-key-input').value = current;
}

export async function saveApiKey() {
  const key = document.getElementById('api-key-input')?.value?.trim();
  if (key) {
    localStorage.setItem('vita_api_key', key);
    window._vitaConfig = window._vitaConfig || {};
    window._vitaConfig.anthropicKey = key;
    closeModal('api-key-modal');
    const profile = await logStore.getProfile().catch(() => ({}));
    ui.updateProfileScreen(profile);
    ui.showToast('API key saved', 'success');
  }
}

export function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

window.vitaApp = {
  switchScreen: showScreen,
  confirmLog,
  deleteMeal,
  handleTextLog,
  quickLog,
  logWater,
  sendCoachMessage,
  selectGoal,
  obNext,
  obBack,
  requestNotifications,
  finishOnboarding,
  resetOnboarding,
  showApiKeyEditor,
  saveApiKey,
  closeModal
};

window.voiceInput = voiceInput;
window.photoInput = photoInput;
window.calendarClient = calendarClient;
window.notificationManager = notificationManager;

window.app = { switchScreen: showScreen };

init();
