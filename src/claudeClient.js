import { buildContext } from './contextBuilder.js';
import { parseClaudeResponse } from './parseClaudeResponse.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const FOOD_KEYWORDS = ['ate', 'had', 'drank', 'drink', 'eat', 'breakfast', 'lunch', 'dinner',
  'snack', 'coffee', 'protein', 'bar', 'shake', 'pizza', 'salad', 'burger', 'sandwich',
  'bowl', 'soup', 'rice', 'pasta', 'chicken', 'beef', 'fish', 'egg', 'yogurt', 'banana',
  'apple', 'toast', 'cereal', 'milk', 'juice', 'water', 'soda', 'beer', 'wine', 'cookie',
  'cake', 'chips', 'nuts', 'bread', 'cheese', 'latte', 'smoothie', 'wrap'];

export function classifyInput(text) {
  const lower = text.toLowerCase();
  if (FOOD_KEYWORDS.some(k => lower.includes(k))) return 'meal_text';
  return 'coach_question';
}

function getKey() {
  return window._vitaConfig?.anthropicKey || localStorage.getItem('vita_api_key') || '';
}

function mealPrompt(text) {
  return `Log this meal: ${text}

Respond ONLY with this JSON, no other text:
{
  "meal": "[human-readable name]",
  "time": "${new Date().toTimeString().slice(0,5)}",
  "kcal": [number],
  "protein_g": [number],
  "carbs_g": [number],
  "fat_g": [number],
  "fiber_g": [number],
  "coaching_note": "[1 sentence specific to user's goals/context]"
}`;
}

function photoPrompt() {
  return `Identify what's in this photo and log it as a meal.
Respond ONLY with this JSON, no other text:
{
  "meal": "[human-readable name of what you see]",
  "time": "${new Date().toTimeString().slice(0,5)}",
  "kcal": [number],
  "protein_g": [number],
  "carbs_g": [number],
  "fat_g": [number],
  "fiber_g": [number],
  "coaching_note": "[1 sentence specific to user's goals/context]"
}`;
}

async function callClaude(systemPrompt, userContent) {
  const key = getKey();
  if (!key || key === '__ANTHROPIC_KEY__') {
    throw new Error('API key not set. Go to Profile → API Setup to add your Anthropic key.');
  }

  const body = {
    model: MODEL,
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }]
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-calls': 'true'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || '';
}

export async function logMeal(text) {
  const { systemPrompt } = await buildContext();
  const type = classifyInput(text);
  const userMsg = type === 'meal_text' ? mealPrompt(text) : text;
  const responseText = await callClaude(systemPrompt, userMsg);
  return parseClaudeResponse(responseText, type);
}

export async function logPhoto(base64, mimeType = 'image/jpeg') {
  const { systemPrompt } = await buildContext();
  const userContent = [
    { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
    { type: 'text', text: photoPrompt() }
  ];
  const responseText = await callClaude(systemPrompt, userContent);
  return parseClaudeResponse(responseText, 'meal_photo');
}

export async function askCoach(question) {
  const { systemPrompt } = await buildContext();
  const responseText = await callClaude(systemPrompt, question);
  return parseClaudeResponse(responseText, 'coach_question');
}

export async function getWelcomeMessage(profile) {
  const { systemPrompt } = await buildContext();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const question = `Good ${greeting} message for ${profile.name}. Reference their goal (${profile.primaryGoal}) and any calendar context. Be warm and personal. 2-3 sentences max.`;
  const responseText = await callClaude(systemPrompt, question);
  return responseText.trim();
}
