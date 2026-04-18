import * as logStore from './logStore.js';
import * as calendarClient from './calendarClient.js';

const TEMPLATE = `You are Aria, a personal health coach inside the Vita app. Be warm, specific, and brief.
Never give generic advice — always reference the user's actual data below.

## User Profile
Name: {name} | Age: {age} | Sex: {sex}
Goal: {primaryGoal}
Daily targets: {calGoal} kcal | {proteinGoal}g protein | {carbGoal}g carbs | {fatGoal}g fat | {fiberGoal}g fiber | {waterGoal}L water

## Current Time
{currentTime} on {currentDate} ({dayOfWeek})

## Today's Food Log ({totalKcal} kcal so far)
{foodLogSummary}

## Today's Calendar Events
{calendarEvents}

## Hydration
{waterLoggedL}L of {waterGoal}L consumed today

## Instructions
- For meal logs: respond ONLY with valid JSON in the format specified.
- For coach questions: respond in plain text, 2-4 sentences max.
- Always reference specific numbers from the user's data, never speak in generalities.`;

const HIGH_PRIORITY_KEYWORDS = ['flight', 'board', 'gate', 'run', 'gym', 'workout', 'race', 'marathon', 'dinner', 'lunch', 'interview'];

function formatFoodLog(log) {
  if (!log || log.length === 0) return 'No meals logged yet today.';
  const lines = log.slice(-18).map(e =>
    `${e.time || '?'} — ${e.meal} → ${e.kcal} kcal | P:${e.protein_g}g C:${e.carbs_g}g F:${e.fat_g}g`
  );
  const totals = log.reduce((a, e) => ({
    kcal: a.kcal + (e.kcal || 0),
    p: a.p + (e.protein_g || 0),
    c: a.c + (e.carbs_g || 0),
    f: a.f + (e.fat_g || 0)
  }), { kcal: 0, p: 0, c: 0, f: 0 });
  lines.push(`TOTAL SO FAR: ${totals.kcal} kcal | P:${totals.p}g C:${totals.c}g F:${totals.f}g`);
  return lines.join('\n');
}

function formatCalendar(events) {
  if (!events || events.length === 0) return 'No calendar events (calendar not connected or no events today).';
  const relevant = events.filter(e => {
    const title = (e.summary || '').toLowerCase();
    return HIGH_PRIORITY_KEYWORDS.some(k => title.includes(k)) || events.length < 4;
  });
  if (relevant.length === 0) return 'No nutritionally relevant events today.';
  return relevant.slice(0, 5).map(e => {
    const title = e.summary || 'Untitled';
    const start = e.start?.dateTime ? new Date(e.start.dateTime) : null;
    const timeStr = start ? start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '??:??';
    const isHigh = HIGH_PRIORITY_KEYWORDS.some(k => title.toLowerCase().includes(k));
    return `${timeStr} — ${title}${isHigh ? ' — PRIORITY' : ''}`;
  }).join('\n');
}

export async function buildContext() {
  const profile = await logStore.getProfile();
  const todayLog = await logStore.getTodayLog();
  const waterL = await logStore.getTodayWater();
  let events = [];
  try { events = await calendarClient.getTodayEvents(); } catch (_) {}

  const totalKcal = todayLog.reduce((s, e) => s + (e.kcal || 0), 0);
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const systemPrompt = TEMPLATE
    .replace('{name}', profile.name || 'Friend')
    .replace('{age}', profile.age || '?')
    .replace('{sex}', profile.sex || 'not specified')
    .replace('{primaryGoal}', profile.primaryGoal || 'Maintain weight')
    .replace('{calGoal}', profile.calGoal || 2000)
    .replace('{proteinGoal}', profile.proteinGoal || 120)
    .replace('{carbGoal}', profile.carbGoal || 220)
    .replace('{fatGoal}', profile.fatGoal || 70)
    .replace('{fiberGoal}', profile.fiberGoal || 25)
    .replace(/{waterGoal}/g, profile.waterGoal || 2)
    .replace('{currentTime}', now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
    .replace('{currentDate}', now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
    .replace('{dayOfWeek}', days[now.getDay()])
    .replace('{totalKcal}', totalKcal)
    .replace('{foodLogSummary}', formatFoodLog(todayLog))
    .replace('{calendarEvents}', formatCalendar(events))
    .replace('{waterLoggedL}', waterL.toFixed(1));

  return { systemPrompt, todayLog, profile };
}
