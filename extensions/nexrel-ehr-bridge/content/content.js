/**
 * Nexrel EHR Bridge - Content script
 * Handles inject messages and DOM injection
 */

let ehrStatus = null;

function getEhrStatus() {
  if (ehrStatus) return ehrStatus;
  return window.__nexrelEHRDetected || null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getEhrStatus') {
    sendResponse(getEhrStatus());
    return false;
  }
  if (request.action === 'inject' && request.payload) {
    try {
      injectNote(request.payload);
      sendResponse({ success: true });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
    return true;
  }
  if (request.action === 'injectAppointment' && request.payload) {
    try {
      injectAppointment(request.payload);
      sendResponse({ success: true });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
    return true;
  }
  if (request.action === 'extractPageData') {
    try {
      const ehr = getEhrStatus();
      const ehrType = ehr?.ehrType || 'generic';
      const extracted = typeof window.__nexrelEHRExtract === 'function'
        ? window.__nexrelEHRExtract(ehrType)
        : { pageType: 'unknown', data: {}, dataType: 'patient', ehrType };
      sendResponse({ success: true, data: extracted });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
    return true;
  }
  return false;
});

function injectNote(payload) {
  const { note, formattedText, context } = payload;
  const ehr = getEhrStatus();
  const ehrType = ehr?.ehrType || 'generic';

  const mappings = getMappingsForEHR(ehrType);
  const fields = mappings?.fields || {};

  let injected = false;

  if (fields.note?.length) {
    for (const sel of fields.note) {
      const el = document.querySelector(sel);
      if (el && (el.tagName === 'TEXTAREA' || el.isContentEditable)) {
        setFieldValue(el, formattedText);
        injected = true;
        break;
      }
    }
  }

  if (!injected && (fields.subjective || fields.objective || fields.assessment || fields.plan)) {
    const parts = [];
    if (note.subjective) parts.push({ key: 'subjective', selectors: fields.subjective, value: note.subjective });
    if (note.objective) parts.push({ key: 'objective', selectors: fields.objective, value: note.objective });
    if (note.assessment) parts.push({ key: 'assessment', selectors: fields.assessment, value: note.assessment });
    if (note.plan) parts.push({ key: 'plan', selectors: fields.plan, value: note.plan });
    if (note.additionalNotes) parts.push({ key: 'additionalNotes', selectors: fields.additionalNotes, value: note.additionalNotes });

    for (const { selectors, value } of parts) {
      if (!selectors) continue;
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable)) {
          setFieldValue(el, value);
          injected = true;
          break;
        }
      }
    }
  }

  if (!injected) {
    for (const sel of ['textarea.clinical-note', 'textarea.progress-note', '.note-editor textarea', 'textarea']) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        setFieldValue(el, formattedText);
        injected = true;
        break;
      }
    }
  }

  if (!injected) {
    console.warn('[Nexrel EHR Bridge] No suitable field found. Note content:', formattedText.slice(0, 200));
  }
}

function setFieldValue(el, value) {
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (el.isContentEditable) {
    el.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, value);
  }
}

function injectAppointment(appointment) {
  const d = new Date(appointment.appointmentDate);
  const dateStr = d.toISOString().slice(0, 10);
  const timeStr = d.toTimeString().slice(0, 5);
  const selectors = [
    { keys: ['date', 'appointmentDate'], value: dateStr, sels: ['input[type="date"]', 'input[name*="date" i]', '[data-field="date"]'] },
    { keys: ['time', 'startTime'], value: timeStr, sels: ['input[type="time"]', 'input[name*="time" i]', 'input[name*="heure" i]'] },
    { keys: ['patient', 'customerName'], value: appointment.customerName, sels: ['input[name*="patient" i]', 'input[name*="name" i]', 'input[name*="nom" i]', '[data-field="patientName"]'] },
    { keys: ['phone'], value: appointment.customerPhone || '', sels: ['input[name*="phone" i]', 'input[name*="tel" i]', 'input[type="tel"]'] },
    { keys: ['notes'], value: appointment.notes || '', sels: ['textarea[name*="note" i]', 'textarea[name*="memo" i]'] },
  ];
  let filled = 0;
  for (const { value, sels } of selectors) {
    if (!value) continue;
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
        break;
      }
    }
  }
  let saveBtn = document.querySelector('button[type="submit"]') || document.querySelector('[data-action="save"]') || document.querySelector('.btn-save');
  if (!saveBtn) {
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (/save|sauvegarder|add|ajouter/i.test(b.textContent || '')) { saveBtn = b; break; }
    }
  }
  if (saveBtn && filled > 0) {
    saveBtn.click();
  }
}

function getMappingsForEHR(ehrType) {
  const MAP = {
    dentrix: { fields: { subjective: ['#ClinicalNote-Subjective'], objective: ['#ClinicalNote-Objective'], assessment: ['#ClinicalNote-Assessment'], plan: ['#ClinicalNote-Plan'] } },
    dentrix_ascend: { fields: { subjective: ['[data-testid="subjective"]'], objective: ['[data-testid="objective"]'], assessment: ['[data-testid="assessment"]'], plan: ['[data-testid="plan"]'] } },
    eaglesoft: { fields: { subjective: ['#Subjective'], objective: ['#Objective'], assessment: ['#Assessment'], plan: ['#Plan'] } },
    opendental: { fields: { note: ['textarea.progress-note'], subjective: ['[data-field="subjective"]'], objective: ['[data-field="objective"]'], assessment: ['[data-field="assessment"]'], plan: ['[data-field="plan"]'] } },
    dentitek: { fields: { subjective: ['#ClinicalNote-Subjective', '.clinical-note-subjective', '[data-field="subjective"]'], objective: ['#ClinicalNote-Objective', '.clinical-note-objective', '[data-field="objective"]'], assessment: ['#ClinicalNote-Assessment', '.clinical-note-assessment', '[data-field="assessment"]'], plan: ['#ClinicalNote-Plan', '.clinical-note-plan', '[data-field="plan"]'], note: ['textarea.clinical-note', 'textarea.progress-note'] } },
    orthonovo: { fields: { subjective: ['#Subjective', '[data-field="subjective"]'], objective: ['#Objective', '[data-field="objective"]'], assessment: ['#Assessment', '[data-field="assessment"]'], plan: ['#Plan', '[data-field="plan"]'], note: ['textarea.clinical-note', 'textarea.progress-note', '.novolet-editor'] } },
    progident: { fields: { subjective: ['[data-field="subjective"]', '#Subjective'], objective: ['[data-field="objective"]', '#Objective'], assessment: ['[data-field="assessment"]', '#Assessment'], plan: ['[data-field="plan"]', '#Plan'], note: ['textarea.progress-note', '.note-text'] } },
    athena: { fields: { note: ['.am-encounter-note-body', '.encounter-note'] } },
    epic: { fields: { note: ['.clinical-note-editor'] } },
    simplepractice: { fields: { note: ['.note-editor', 'textarea.clinical-note'] } },
    tebra: { fields: { note: ['.clinical-note', 'textarea.note-body'] } },
    generic: { fields: { subjective: ['textarea[name*="subjective" i]', '[id*="subjective" i]'], objective: ['textarea[name*="objective" i]', '[id*="objective" i]'], assessment: ['textarea[name*="assessment" i]', '[id*="assessment" i]'], plan: ['textarea[name*="plan" i]', '[id*="plan" i]'], note: ['textarea.clinical-note', 'textarea.progress-note'] } },
  };
  return MAP[ehrType] || MAP.generic;
}
