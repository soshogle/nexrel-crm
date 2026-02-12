/**
 * Nexrel EHR Bridge - Schedule DOM sync (real-time)
 * Extracts schedule when on calendar page, syncs to API every 30s
 * Auto-pushes pending appointments when add form is visible
 */

(function () {
  const SYNC_INTERVAL_MS = 30000;
  const PUSH_CHECK_INTERVAL_MS = 5000;
  let syncTimer = null;
  let pushCheckTimer = null;

  function getPageType() {
    const path = (window.location.pathname || '').toLowerCase();
    const href = (window.location.href || '').toLowerCase();
    if (path.includes('calendar') || path.includes('schedule') || path.includes('appointment') || href.includes('agenda')) return 'schedule';
    return null;
  }

  function getEhrType() {
    return (window.__nexrelEHRDetected && window.__nexrelEHRDetected.ehrType) || 'generic';
  }

  function extractAndSync() {
    if (getPageType() !== 'schedule') return;
    chrome.storage.local.get(['token', 'apiBase'], (stored) => {
      if (!stored.token) return;
      const extract = typeof window.__nexrelEHRExtractSchedule === 'function'
        ? window.__nexrelEHRExtractSchedule(getEhrType())
        : null;
      if (!extract || (!extract.slots?.length && !extract.booked?.length)) return;
      const base = stored.apiBase || 'https://www.nexrel.soshogle.com';
      fetch(`${base}/api/ehr-bridge/schedule/pull-dom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stored.token}` },
        body: JSON.stringify({
          ehrType: getEhrType(),
          date: extract.date,
          slots: extract.slots,
          booked: extract.booked,
        }),
      }).catch(() => {});
    });
  }

  function isAddFormVisible() {
    const sel = 'input[type="date"], input[name*="date" i], input[type="time"], input[name*="patient" i]';
    const el = document.querySelector(sel);
    return el && el.offsetParent !== null;
  }

  function tryAutoPush() {
    if (getPageType() !== 'schedule' && !isAddFormVisible()) return;
    chrome.storage.local.get(['token', 'pendingAppointments', 'lastPushedId', 'apiBase'], (stored) => {
      if (!stored.token || !stored.pendingAppointments?.length) return;
      const first = stored.pendingAppointments[0];
      if (first.id === stored.lastPushedId) return;
      if (!isAddFormVisible()) return;
      chrome.runtime.sendMessage({ action: 'requestInjectAppointment', payload: first }, (r) => {
        if (r?.success) {
          const base = stored.apiBase || 'https://www.nexrel.soshogle.com';
          fetch(`${base}/api/ehr-bridge/schedule/pending/${first.id}/sync`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${stored.token}` },
          }).then(() => {
            chrome.storage.local.set({ lastPushedId: first.id });
            chrome.storage.local.get(['pendingAppointments'], (s) => {
              const next = (s.pendingAppointments || []).filter((p) => p.id !== first.id);
              chrome.storage.local.set({ pendingAppointments: next });
            });
          });
        }
      });
    });
  }

  function startSync() {
    if (syncTimer) clearInterval(syncTimer);
    if (getPageType() !== 'schedule') return;
    extractAndSync();
    syncTimer = setInterval(extractAndSync, SYNC_INTERVAL_MS);
  }

  function startPushCheck() {
    if (pushCheckTimer) clearInterval(pushCheckTimer);
    pushCheckTimer = setInterval(tryAutoPush, PUSH_CHECK_INTERVAL_MS);
  }

  function stopAll() {
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = null;
    if (pushCheckTimer) clearInterval(pushCheckTimer);
    pushCheckTimer = null;
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.ehrSessionChanged?.newValue) {
      stopAll();
      chrome.storage.local.remove('ehrSessionChanged');
      setTimeout(() => {
        if (getPageType() === 'schedule') {
          startSync();
          startPushCheck();
        }
      }, 2000);
    }
    if (changes.pendingAppointments && changes.pendingAppointments.newValue?.length) {
      tryAutoPush();
    }
  });

  if (getPageType() === 'schedule') {
    startSync();
    startPushCheck();
  }

  const obs = new MutationObserver(() => {
    if (getPageType() === 'schedule' && !syncTimer) startSync();
  });
  obs.observe(document.body, { childList: true, subtree: true });
})();
