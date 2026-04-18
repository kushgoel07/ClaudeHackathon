const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
let tokenClient = null;

function getClientId() {
  return window._vitaConfig?.googleClientId || '';
}

function getToken() {
  return sessionStorage.getItem('gCalToken');
}

export function isConnected() {
  return !!getToken();
}

export function init() {
  if (!getClientId() || getClientId() === '__GOOGLE_CLIENT_ID__') return;
  if (typeof google === 'undefined') return;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: getClientId(),
    scope: SCOPES,
    callback: (response) => {
      if (response.access_token) {
        sessionStorage.setItem('gCalToken', response.access_token);
        document.getElementById('cal-toggle')?.classList.add('on');
        fetchAndShowEvents();
      }
    }
  });
}

export function connect() {
  if (!tokenClient) {
    alert('Google Calendar integration requires a Google Client ID. Add it to window._vitaConfig.googleClientId.');
    return;
  }
  tokenClient.requestAccessToken();
}

export function toggleConnection() {
  if (isConnected()) {
    sessionStorage.removeItem('gCalToken');
    document.getElementById('cal-toggle')?.classList.remove('on');
  } else {
    connect();
  }
}

export function reconnect() {
  sessionStorage.removeItem('gCalToken');
  connect();
}

async function fetchAndShowEvents() {
  const events = await getTodayEvents();
  if (events.length > 0) {
    renderCalendarEvents(events);
  }
}

export async function getTodayEvents() {
  const token = getToken();
  if (!token) return [];

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59);

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${endOfDay.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=10`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      sessionStorage.removeItem('gCalToken');
      document.getElementById('cal-toggle')?.classList.remove('on');
      showReconnectBanner();
      return [];
    }
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.warn('Calendar fetch failed:', e);
    return [];
  }
}

function showReconnectBanner() {
  const banner = document.createElement('div');
  banner.className = 'toast error';
  banner.textContent = 'Calendar session expired — reconnect in Profile';
  banner.style.cssText = 'position:absolute;bottom:90px;left:20px;right:20px;';
  document.querySelector('.phone').appendChild(banner);
  setTimeout(() => banner.remove(), 4000);
}

function renderCalendarEvents(events) {
  const HIGH = ['flight', 'board', 'gate', 'run', 'gym', 'workout', 'dinner', 'lunch', 'interview', 'race'];
  const relevant = events.filter(e => {
    const title = (e.summary || '').toLowerCase();
    return HIGH.some(k => title.includes(k)) || events.length < 4;
  }).slice(0, 4);

  if (relevant.length === 0) return;

  const strip = document.getElementById('cal-strip');
  const list = document.getElementById('cal-events-list');
  const header = document.getElementById('cal-section-header');

  if (!strip || !list) return;
  strip.style.display = 'block';
  if (header) header.style.display = 'flex';

  list.innerHTML = relevant.map(e => {
    const title = e.summary || 'Event';
    const start = e.start?.dateTime ? new Date(e.start.dateTime) : null;
    const timeStr = start ? start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
    const isHigh = HIGH.some(k => title.toLowerCase().includes(k));
    const tagClass = isHigh ? 'warn' : 'neutral';
    const tagText = isHigh ? 'Plan ahead' : 'On schedule';
    const lineColor = isHigh ? 'var(--warn)' : 'var(--accent)';
    return `<div class="cal-event">
      <div class="cal-time">${timeStr}</div>
      <div class="cal-line" style="background:${lineColor}"></div>
      <div class="cal-info">
        <div class="cal-name">${title}</div>
        <span class="cal-tag ${tagClass}">${tagText}</span>
      </div>
    </div>`;
  }).join('');
}
