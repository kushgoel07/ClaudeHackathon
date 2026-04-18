import * as logStore from './logStore.js';

let swReg = null;

export async function init(registration) {
  swReg = registration;
  const granted = await logStore.getSetting('notifications');
  if (granted) {
    document.getElementById('notif-toggle')?.classList.add('on');
    startPolling();
  }
}

export async function toggle() {
  const current = await logStore.getSetting('notifications');
  if (current) {
    await logStore.setSetting('notifications', false);
    document.getElementById('notif-toggle')?.classList.remove('on');
  } else {
    await requestPermission();
  }
}

export async function requestPermission() {
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    await logStore.setSetting('notifications', true);
    document.getElementById('notif-toggle')?.classList.add('on');
    startPolling();
    showNotification('Vita', "You're all set! I'll remind you when it matters.");
  }
}

function startPolling() {
  setInterval(checkTriggers, 15 * 60 * 1000);
  checkTriggers();
}

async function checkTriggers() {
  if (Notification.permission !== 'granted') return;
  const lastFired = (await logStore.getSetting('lastNotifAt')) || 0;
  if (Date.now() - lastFired < 2 * 60 * 60 * 1000) return;

  const profile = await logStore.getProfile();
  const todayLog = await logStore.getTodayLog();
  const waterL = await logStore.getTodayWater();
  const totalKcal = todayLog.reduce((s, e) => s + (e.kcal || 0), 0);
  const hour = new Date().getHours();
  const min = new Date().getMinutes();
  const timeNow = hour * 60 + min;

  let trigger = null;

  if (timeNow >= 12 * 60 + 30 && totalKcal < 200) {
    trigger = { body: `You've only had ${totalKcal} kcal today — quick lunch window before your afternoon.` };
  } else if (timeNow >= 19 * 60 && totalKcal < (profile.calGoal || 2000) * 0.5) {
    const remaining = (profile.calGoal || 2000) - totalKcal;
    trigger = { body: `Evening check-in: you're at ${totalKcal} kcal, ${remaining} remaining. Big dinner planned?` };
  } else if (timeNow >= 15 * 60 && waterL < 1) {
    trigger = { body: `Hydration check: only ${waterL.toFixed(1)}L today. Aim for ${((profile.waterGoal || 2) - waterL).toFixed(1)}L more before bed.` };
  }

  if (trigger) {
    showNotification('Vita', trigger.body);
    await logStore.setSetting('lastNotifAt', Date.now());
  }
}

function showNotification(title, body) {
  if (swReg && Notification.permission === 'granted') {
    swReg.showNotification(title, {
      body,
      icon: '/icons/vita-192.png',
      badge: '/icons/vita-72.png',
      tag: 'vita-health',
      renotify: true,
      data: { url: '/?action=coach' }
    });
  } else if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icons/vita-192.png' });
  }
}
