/**
 * Nexrel EHR Bridge - Background Service Worker
 * API client, message routing, storage, poll pending
 */

const API_BASE = 'https://www.nexrel.soshogle.com';

function getApiBase() {
  return API_BASE;
}

const PENDING_POLL_MS = 60000;

function pollPending() {
  chrome.storage.local.get(['token', 'apiBase'], (stored) => {
    if (!stored.token) return;
    const base = stored.apiBase || API_BASE;
    fetch(`${base}/api/ehr-bridge/schedule/pending`, {
      headers: { Authorization: `Bearer ${stored.token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.appointments?.length) {
          chrome.storage.local.set({ pendingAppointments: data.appointments });
        } else {
          chrome.storage.local.set({ pendingAppointments: [] });
        }
      })
      .catch(() => {});
  });
}

chrome.alarms.create('ehrPendingPoll', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'ehrPendingPoll') pollPending();
});
pollPending();

const EHR_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'dentrix.com',
  'dentitek.ca',
  'dentitek.info',
  'dentitek.net',
  'opendental.com',
  'athenahealth.com',
  'novologik.com',
  'progident.com',
  'eaglesoft.net',
  'simplepractice.com',
  'tebra.com',
  'patientfusion.com',
  'epic.com',
  'curve.dental',
  'nextgen.com',
];
chrome.cookies.onChanged.addListener((change) => {
  try {
    const domain = change.cookie.domain || '';
    if (EHR_DOMAINS.some((d) => domain.includes(d) || domain.endsWith('.' + d))) {
      chrome.storage.local.set({ ehrSessionChanged: true, ehrSessionChangedAt: Date.now() });
    }
  } catch (e) {}
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchNotes') {
    fetchNotes(request.token).then(sendResponse).catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (request.action === 'fetchExport') {
    fetchExport(request.sessionId, request.token).then(sendResponse).catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (request.action === 'requestInjectAppointment' && sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, { action: 'injectAppointment', payload: request.payload }, sendResponse);
    return true;
  }
  return false;
});

async function fetchNotes(token) {
  const base = getApiBase();
  const res = await fetch(`${base}/api/ehr-bridge/notes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(res.status === 401 ? 'Invalid token' : 'Failed to fetch');
  return res.json();
}

async function fetchExport(sessionId, token) {
  const base = getApiBase();
  const res = await fetch(`${base}/api/ehr-bridge/export/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(res.status === 401 ? 'Invalid token' : 'Export failed');
  return res.json();
}
