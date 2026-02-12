/**
 * Nexrel EHR Bridge - DOM extraction for patient/calendar data
 * Reads from EHR pages when user clicks "Read from This Page"
 */

(function () {
  const READ_MAP = {
    dentrix: {
      patientName: ['#PatientName', '.patient-name', '[data-field="patientName"]', 'input[name*="patientName" i]'],
      patientEmail: ['#PatientEmail', '.patient-email', '[data-field="email"]', 'input[name*="email" i]', 'input[type="email"]'],
      patientPhone: ['#PatientPhone', '.patient-phone', '[data-field="phone"]', 'input[name*="phone" i]', 'input[name*="Phone"]'],
      patientDob: ['#PatientDob', '.patient-dob', '[data-field="dob"]', 'input[name*="dob" i]', 'input[name*="birth" i]'],
      patientAddress: ['#PatientAddress', '.patient-address', '[data-field="address"]', 'textarea[name*="address" i]'],
      patientId: ['#PatientId', '[data-patient-id]', '.patient-id'],
      priorNotes: ['#PriorNotes', '.prior-notes', '.treatment-history', '.progress-notes'],
      appointmentRows: ['.appointment-row', '.schedule-item', '.appointment-card', '[data-appointment]'],
    },
    opendental: {
      patientName: ['.patient-name', '#PatName', '[data-field="patientName"]', 'input[name*="name" i]'],
      patientEmail: ['#Email', '.patient-email', 'input[name*="email" i]', 'input[type="email"]'],
      patientPhone: ['#Phone', '.patient-phone', 'input[name*="phone" i]', 'input[type="tel"]'],
      patientAddress: ['#Address', '.patient-address', 'textarea[name*="address" i]'],
      appointmentRows: ['.schedule-event', '.appointment', '.schedule-item'],
    },
    dentitek: {
      patientName: ['.patient-name', '#nom', '[data-field="patientName"]', 'input[name*="nom" i]'],
      patientEmail: ['.patient-email', '#courriel', '[data-field="email"]', 'input[name*="email" i]', 'input[type="email"]'],
      patientPhone: ['.patient-phone', '#telephone', '[data-field="phone"]', 'input[name*="phone" i]', 'input[name*="tel" i]'],
      patientDob: ['.patient-dob', '#dateNaissance', '[data-field="dob"]', 'input[name*="naissance" i]'],
      patientAddress: ['.patient-address', '#adresse', '[data-field="address"]', 'textarea[name*="adresse" i]'],
      appointmentRows: ['.rendez-vous', '.appointment', '.schedule-item', '[data-appointment]'],
    },
    generic: {
      patientName: ['input[name*="name" i]', '[id*="name" i]', '[data-field="name"]', '.patient-name'],
      patientEmail: ['input[type="email"]', 'input[name*="email" i]', '[id*="email" i]', '[data-field="email"]'],
      patientPhone: ['input[type="tel"]', 'input[name*="phone" i]', 'input[name*="tel" i]', '[id*="phone" i]', '[data-field="phone"]'],
      patientDob: ['input[name*="dob" i]', 'input[name*="birth" i]', '[data-field="dob"]'],
      patientAddress: ['textarea[name*="address" i]', 'input[name*="address" i]', '[data-field="address"]'],
      appointmentRows: ['.appointment', '.schedule-item', '[data-appointment]', 'tr.appointment'],
    },
  };

  function getValue(el) {
    if (!el) return null;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return (el.value || '').trim();
    return (el.textContent || el.innerText || '').trim();
  }

  function extractField(selectors, doc) {
    for (const sel of selectors) {
      try {
        const el = doc.querySelector(sel);
        const val = getValue(el);
        if (val) return val;
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  function getPageType() {
    const path = (window.location.pathname || '').toLowerCase();
    const href = (window.location.href || '').toLowerCase();
    if (path.includes('calendar') || path.includes('schedule') || path.includes('appointment') || href.includes('agenda')) return 'calendar';
    if (path.includes('patient') || path.includes('chart') || path.includes('demographic') || path.includes('fiche') || path.includes('patient')) return 'patient_chart';
    return 'unknown';
  }

  function extractPatientData(ehrType) {
    const map = READ_MAP[ehrType] || READ_MAP.generic;
    const doc = document;
    const data = {};
    if (map.patientName) data.patientName = extractField(map.patientName, doc);
    if (map.patientEmail) data.email = extractField(map.patientEmail, doc);
    if (map.patientPhone) data.phone = extractField(map.patientPhone, doc);
    if (map.patientDob) data.dob = extractField(map.patientDob, doc);
    if (map.patientAddress) data.address = extractField(map.patientAddress, doc);
    if (map.patientId) data.patientId = extractField(map.patientId, doc);
    if (map.priorNotes) data.priorNotes = extractField(map.priorNotes, doc);
    if (map.lastVisitDate) data.lastVisitDate = extractField(map.lastVisitDate, doc);
    return data;
  }

  function extractCalendarData(ehrType) {
    const map = READ_MAP[ehrType] || READ_MAP.generic;
    const doc = document;
    const appointments = [];
    const rowSelectors = map.appointmentRows || READ_MAP.generic.appointmentRows;
    if (!rowSelectors) return appointments;
    for (const sel of rowSelectors) {
      const rows = doc.querySelectorAll(sel);
      if (rows.length > 0) {
        rows.forEach((row, i) => {
          const text = (row.textContent || '').trim();
          if (text && text.length > 5) {
            appointments.push({ index: i, text: text.slice(0, 200) });
          }
        });
        break;
      }
    }
    return appointments;
  }

  function parseTimeFromText(text) {
    const m = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i) || text.match(/(\d{1,2})\s*(am|pm)/i);
    if (m) {
      let h = parseInt(m[1], 10);
      const min = m[2] ? parseInt(m[2], 10) : 0;
      if (m[3] && m[3].toLowerCase() === 'pm' && h < 12) h += 12;
      if (m[3] && m[3].toLowerCase() === 'am' && h === 12) h = 0;
      return (h < 10 ? '0' : '') + h + ':' + (min < 10 ? '0' : '') + min;
    }
    return null;
  }

  function looksLikePatientName(text) {
    const t = text.replace(/^\d+:?\d*\s*(am|pm)?\s*/i, '').trim();
    if (t.length < 2) return false;
    if (/^\d+$/.test(t)) return false;
    if (/^(open|empty|available|libre|disponible)$/i.test(t)) return false;
    return /^[A-Za-z\s\-\.']+$/.test(t) || t.includes(' ');
  }

  function extractScheduleStructured(ehrType) {
    const appointments = extractCalendarData(ehrType);
    const slots = [];
    const booked = [];
    const timeRegex = /\d{1,2}:?\d{0,2}\s*(am|pm)?/gi;
    const seen = new Set();
    for (const { text } of appointments) {
      const time = parseTimeFromText(text);
      if (time && !seen.has(time)) {
        seen.add(time);
        const patientPart = text.replace(timeRegex, '').replace(/^[\s\-:]+/, '').trim();
        if (looksLikePatientName(patientPart)) {
          booked.push({ time, patient: patientPart.slice(0, 100) });
        } else {
          slots.push(time);
        }
      }
    }
    const today = new Date();
    const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    return { date: dateStr, slots: slots.sort(), booked };
  }

  window.__nexrelEHRExtractSchedule = function (ehrType) {
    return extractScheduleStructured(ehrType || 'generic');
  };

  function extractPageData(ehrType) {
    const pageType = getPageType();
    const result = { pageType, ehrType, url: window.location.href, data: {} };
    if (pageType === 'patient_chart') {
      result.data = extractPatientData(ehrType);
      result.dataType = 'patient';
    } else if (pageType === 'calendar') {
      result.data = { appointments: extractCalendarData(ehrType) };
      result.dataType = 'calendar';
    } else {
      result.data = extractPatientData(ehrType);
      result.dataType = 'patient';
    }
    return result;
  }

  window.__nexrelEHRExtract = function (ehrType) {
    return extractPageData(ehrType);
  };
})();
