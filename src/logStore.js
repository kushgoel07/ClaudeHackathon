const DB_NAME = 'vita-db';
const DB_VERSION = 1;

let db = null;

async function openDB() {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('profile')) {
        d.createObjectStore('profile');
      }
      if (!d.objectStoreNames.contains('foodLog')) {
        const s = d.createObjectStore('foodLog', { autoIncrement: true, keyPath: 'id' });
        s.createIndex('date', 'date', { unique: false });
      }
      if (!d.objectStoreNames.contains('waterLog')) {
        const s = d.createObjectStore('waterLog', { autoIncrement: true, keyPath: 'id' });
        s.createIndex('date', 'date', { unique: false });
      }
      if (!d.objectStoreNames.contains('chatHistory')) {
        d.createObjectStore('chatHistory', { autoIncrement: true, keyPath: 'id' });
      }
      if (!d.objectStoreNames.contains('settings')) {
        d.createObjectStore('settings');
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllFromStore(storeName) {
  await openDB();
  return promisify(tx(storeName).getAll());
}

export async function getProfile() {
  await openDB();
  const profile = await promisify(tx('profile').get('profile'));
  return profile || {
    name: 'Friend',
    age: 30,
    sex: 'prefer not to say',
    primaryGoal: 'Maintain weight',
    calGoal: 2000,
    proteinGoal: 120,
    carbGoal: 220,
    fatGoal: 70,
    fiberGoal: 25,
    waterGoal: 2
  };
}

export async function saveProfile(profile) {
  await openDB();
  return promisify(tx('profile', 'readwrite').put(profile, 'profile'));
}

export async function getTodayLog() {
  await openDB();
  const today = new Date().toISOString().slice(0, 10);
  const all = await promisify(tx('foodLog').getAll());
  return all.filter(e => e.date === today);
}

export async function addMeal(meal) {
  await openDB();
  const entry = {
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    ...meal,
    source: meal.source || 'manual'
  };
  const id = await promisify(tx('foodLog', 'readwrite').add(entry));
  return { ...entry, id };
}

export async function deleteMeal(id) {
  await openDB();
  return promisify(tx('foodLog', 'readwrite').delete(id));
}

export async function getTodayWater() {
  await openDB();
  const today = new Date().toISOString().slice(0, 10);
  const all = await promisify(tx('waterLog').getAll());
  const todayEntries = all.filter(e => e.date === today);
  return todayEntries.reduce((sum, e) => sum + (e.amount_l || 0), 0);
}

export async function addWater(amount_l) {
  await openDB();
  const entry = {
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    amount_l
  };
  return promisify(tx('waterLog', 'readwrite').add(entry));
}

export async function getChatHistory() {
  await openDB();
  const all = await promisify(tx('chatHistory').getAll());
  return all.slice(-30);
}

export async function addChatMessage(role, text) {
  await openDB();
  return promisify(tx('chatHistory', 'readwrite').add({
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    role,
    text
  }));
}

export async function getSetting(key) {
  await openDB();
  return promisify(tx('settings').get(key));
}

export async function setSetting(key, value) {
  await openDB();
  return promisify(tx('settings', 'readwrite').put(value, key));
}
