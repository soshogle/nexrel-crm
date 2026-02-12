/**
 * Nexrel EHR Bridge - Popup logic
 * Auth, notes list, push handlers
 */

const API_BASE = 'https://www.nexrel.soshogle.com';

function getApiBase() {
  return API_BASE;
}

async function getStored() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['token', 'userEmail', 'apiBase'], resolve);
  });
}

async function setStored(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

async function setStoredToken(token) {
  await setStored({ token: token || null, userEmail: token ? null : null });
}

async function fetchNotes(token) {
  const base = (await getStored()).apiBase || getApiBase();
  const res = await fetch(`${base}/api/ehr-bridge/notes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(res.status === 401 ? 'Invalid token' : 'Failed to fetch notes');
  return res.json();
}

async function extractPageData() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { action: 'extractPageData' }, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(response);
    });
  });
}

async function captureSchedule(token) {
  const base = (await getStored()).apiBase || getApiBase();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  const ehr = await new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { action: 'getEhrStatus' }, (r) => resolve(r || {}));
  }).catch(() => ({}));
  const res = await fetch(`${base}/api/ehr-bridge/schedule/analyze-screenshot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      imageBase64: base64,
      ehrType: ehr?.ehrType || 'generic',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Capture failed: ${res.status}`);
  }
  return res.json();
}

async function fetchPending(token) {
  const base = (await getStored()).apiBase || getApiBase();
  const res = await fetch(`${base}/api/ehr-bridge/schedule/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch pending');
  return res.json();
}

async function pushAppointmentToEhr(appointment, token) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { action: 'injectAppointment', payload: appointment }, (r) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(r);
    });
  });
}

async function pullToNexrel(data, token) {
  const base = (await getStored()).apiBase || getApiBase();
  const res = await fetch(`${base}/api/ehr-bridge/pull`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      source: 'dom',
      ehrType: data.ehrType,
      pageType: data.pageType,
      dataType: data.dataType,
      data: data.data,
      url: data.url,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Pull failed: ${res.status}`);
  }
  return res.json();
}

async function fetchExport(sessionId, token) {
  const base = (await getStored()).apiBase || getApiBase();
  const res = await fetch(`${base}/api/ehr-bridge/export/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(res.status === 401 ? 'Invalid token' : 'Export failed');
  return res.json();
}

async function injectNote(sessionId, token) {
  const data = await fetchExport(sessionId, token);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { action: 'inject', payload: data }, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(response);
    });
  });
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

// UI
function show(el, visible = true) {
  if (el) el.classList.toggle('hidden', !visible);
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span> Connecting...';
  } else if (btn.dataset.originalText) {
    btn.textContent = btn.dataset.originalText;
    delete btn.dataset.originalText;
  }
}

function showError(msg) {
  const el = document.getElementById('error-message');
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
}

function hideError() {
  const el = document.getElementById('error-message');
  if (el) el.classList.add('hidden');
}

function renderNotesList(notes, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  notes.forEach((note) => {
    const item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = `
      <div class="note-info">
        <div class="note-patient">${escapeHtml(note.patientName)}</div>
        <div class="note-date">${formatDate(note.sessionDate)}</div>
      </div>
      <button class="btn btn-push btn-outline btn-sm" data-session-id="${escapeHtml(note.id)}">Push</button>
    `;
    const btn = item.querySelector('.btn-push');
    btn.addEventListener('click', () => handlePush(note.id));
    container.appendChild(item);
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s ?? '';
  return div.innerHTML;
}

async function handlePush(sessionId) {
  hideError();
  const { token } = await getStored();
  if (!token) {
    showError('Connect to Nexrel first');
    return;
  }
  const btn = document.querySelector(`[data-session-id="${sessionId}"]`);
  if (btn) btn.disabled = true;
  try {
    await injectNote(sessionId, token);
    if (btn) btn.textContent = 'Pushed ✓';
  } catch (err) {
    showError(err.message || 'Push failed');
    if (btn) btn.disabled = false;
  }
}

async function init() {
  const stored = await getStored();
  const token = stored.token;
  const apiBase = stored.apiBase || getApiBase();

  // Auth section
  const authConnected = document.getElementById('auth-connected');
  const authDisconnected = document.getElementById('auth-disconnected');
  const userEmail = document.getElementById('user-email');
  const btnConnect = document.getElementById('btn-connect');
  const btnLogout = document.getElementById('btn-logout');

  if (token) {
    show(authConnected, true);
    show(authDisconnected, false);
    userEmail.textContent = stored.userEmail || 'Connected';
    try {
      const data = await fetchNotes(token);
      userEmail.textContent = data.userEmail || 'Connected';
      await setStored({ userEmail: data.userEmail });
      renderNotesList(data.notes, 'notes-list');
      document.getElementById('btn-push-latest').disabled = !(data.notes?.length > 0);
    } catch (err) {
      // Token might be invalid
      if (err.message === 'Invalid token') {
        await setStoredToken(null);
        show(authConnected, false);
        show(authDisconnected, true);
      }
      renderNotesList([], 'notes-list');
    }
  } else {
    show(authConnected, false);
    show(authDisconnected, true);
    renderNotesList([], 'notes-list');
    document.getElementById('btn-push-latest').disabled = true;
  }

  btnConnect.addEventListener('click', () => {
    const tokenInput = prompt('Paste your EHR Bridge token from Nexrel Settings → Integrations → EHR Bridge');
    if (!tokenInput?.trim()) return;
    hideError();
    setLoading(btnConnect, true);
    fetchNotes(tokenInput.trim())
      .then(async (data) => {
        await setStored({ token: tokenInput.trim(), userEmail: data.userEmail, apiBase });
        init();
      })
      .catch((err) => {
        showError(err.message || 'Invalid token');
      })
      .finally(() => setLoading(btnConnect, false));
  });

  btnLogout.addEventListener('click', async () => {
    await setStoredToken(null);
    show(authConnected, false);
    show(authDisconnected, true);
    renderNotesList([], 'notes-list');
    document.getElementById('btn-push-latest').disabled = true;
    userEmail.textContent = '';
  });

  // Read from page
  const btnReadPage = document.getElementById('btn-read-page');
  const syncResult = document.getElementById('sync-result');
  if (btnReadPage) {
    btnReadPage.addEventListener('click', async () => {
      const { token: t } = await getStored();
      if (!t) return showError('Connect to Nexrel first');
      hideError();
      if (syncResult) {
        syncResult.classList.add('hidden');
        syncResult.classList.remove('error');
      }
      btnReadPage.disabled = true;
      try {
        const resp = await extractPageData();
        if (!resp?.success || !resp?.data) throw new Error('No data extracted');
        const pulled = await pullToNexrel(resp.data, t);
        if (syncResult) {
          syncResult.textContent = pulled.created
            ? 'Contact created ✓'
            : pulled.matched
              ? `Updated contact (matched by ${pulled.matched}) ✓`
              : pulled.appointmentsCount !== undefined
                ? pulled.message || `Extracted ${pulled.appointmentsCount} appointments`
                : 'Synced to Nexrel ✓';
          syncResult.classList.remove('hidden');
        }
      } catch (err) {
        showError(err.message || 'Read failed');
        if (syncResult) {
          syncResult.textContent = err.message || 'Read failed';
          syncResult.classList.add('error');
          syncResult.classList.remove('hidden');
        }
      } finally {
        btnReadPage.disabled = false;
      }
    });
  }

  // Capture Schedule
  const btnCaptureSchedule = document.getElementById('btn-capture-schedule');
  const captureResult = document.getElementById('capture-result');
  if (btnCaptureSchedule) {
    btnCaptureSchedule.addEventListener('click', async () => {
      const { token: t } = await getStored();
      if (!t) return showError('Connect to Nexrel first');
      hideError();
      if (captureResult) captureResult.classList.add('hidden');
      btnCaptureSchedule.disabled = true;
      try {
        const result = await captureSchedule(t);
        if (captureResult) {
          captureResult.textContent = result.message || `Captured ${result.slots?.length || 0} slots ✓`;
          captureResult.classList.remove('hidden');
          captureResult.classList.remove('error');
        }
      } catch (err) {
        showError(err.message || 'Capture failed');
        if (captureResult) {
          captureResult.textContent = err.message || 'Capture failed';
          captureResult.classList.add('error');
          captureResult.classList.remove('hidden');
        }
      } finally {
        btnCaptureSchedule.disabled = false;
      }
    });
  }

  // Pending appointments
  const pendingSection = document.getElementById('pending-section');
  const pendingList = document.getElementById('pending-list');
  const btnPushPending = document.getElementById('btn-push-pending');
  if (token && pendingSection && pendingList) {
    try {
      const { appointments } = await fetchPending(token);
      if (appointments?.length > 0) {
        pendingSection.classList.remove('hidden');
        pendingList.innerHTML = appointments.map((a) => {
          const d = new Date(a.appointmentDate);
          const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
          const dateStr = d.toLocaleDateString();
          return `<div class="pending-item" data-id="${a.id}">
            <span class="patient">${escapeHtml(a.customerName)}</span>
            <span class="time">${dateStr} ${timeStr} · ${a.customerPhone || ''}</span>
          </div>`;
        }).join('');
      }
    } catch (e) {
      /* ignore */
    }
  }
  if (btnPushPending) {
    btnPushPending.addEventListener('click', async () => {
      const { token: t } = await getStored();
      if (!t) return showError('Connect to Nexrel first');
      try {
        const { appointments } = await fetchPending(t);
        const first = appointments?.[0];
        if (!first) return showError('No pending appointments');
        await pushAppointmentToEhr(first, t);
        if (captureResult) {
          captureResult.textContent = 'Pushed! Check EHR tab.';
          captureResult.classList.remove('hidden');
          captureResult.classList.remove('error');
        }
      } catch (err) {
        showError(err.message || 'Push failed');
      }
    });
  }

  // Push latest
  const btnPushLatest = document.getElementById('btn-push-latest');
  btnPushLatest.addEventListener('click', async () => {
    const { token: t } = await getStored();
    if (!t) return showError('Connect to Nexrel first');
    try {
      const data = await fetchNotes(t);
      const latest = data.notes?.[0];
      if (!latest) return showError('No notes to push');
      await injectNote(latest.id, t);
      btnPushLatest.textContent = 'Pushed ✓';
      setTimeout(() => { btnPushLatest.textContent = 'Push Latest Note'; }, 2000);
    } catch (err) {
      showError(err.message || 'Push failed');
    }
  });

  // EHR status from active tab
  const ehrStatus = document.getElementById('ehr-status');
  const ehrName = document.getElementById('ehr-name');
  const ehrReady = document.getElementById('ehr-ready');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      const result = await chrome.tabs.sendMessage(tab.id, { action: 'getEhrStatus' });
      if (result?.ehrType) {
        show(ehrStatus, true);
        ehrStatus.classList.add('ready');
        ehrName.textContent = result.displayName || result.ehrType;
        ehrReady.textContent = 'Ready to push';
      } else {
        show(ehrStatus, true);
        ehrStatus.classList.remove('ready');
        ehrName.textContent = 'No EHR detected';
        ehrReady.textContent = 'Open an EHR tab to push';
      }
    } catch {
      show(ehrStatus, true);
      ehrStatus.classList.remove('ready');
      ehrName.textContent = 'No EHR detected';
      ehrReady.textContent = 'Open an EHR tab to push';
    }
  }
  // Quick links
  document.getElementById('link-open-nexrel').href = `${apiBase}/dashboard/docpen`;
  document.getElementById('link-docpen').href = `${apiBase}/dashboard/docpen`;
  document.getElementById('link-crm').href = `${apiBase}/dashboard`;
}

document.addEventListener('DOMContentLoaded', init);
