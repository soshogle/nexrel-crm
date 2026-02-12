/**
 * Nexrel EHR Bridge - EHR type detection from URL
 * Runs in page context
 */

(function () {
  const MAPPINGS = [
    { ehrType: 'on_prem', displayName: 'On-Premise EHR', patterns: ['localhost', '127.0.0.1', '*.local', '*.internal', '192.168.*', '10.*'] },
    { ehrType: 'dentrix_ascend', displayName: 'Dentrix Ascend', patterns: ['ascend.dentrix.com'] },
    { ehrType: 'dentrix', displayName: 'Dentrix', patterns: ['dentrix.com'] },
    { ehrType: 'eaglesoft', displayName: 'Eaglesoft', patterns: ['eaglesoft.net'] },
    { ehrType: 'opendental', displayName: 'Open Dental', patterns: ['opendental.com'] },
    { ehrType: 'dentitek', displayName: 'Dentitek', patterns: ['dentitek.ca', '*.dentitek.ca', 'dentitek.info', 'dentitek.net', '*.dentitek.net'] },
    { ehrType: 'orthonovo', displayName: 'OrthoNovo', patterns: ['novologik.com', '*.novologik.com'] },
    { ehrType: 'progident', displayName: 'Progident', patterns: ['progident.com', '*.progident.com'] },
    { ehrType: 'athena', displayName: 'Athenahealth', patterns: ['athenahealth.com'] },
    { ehrType: 'epic', displayName: 'Epic', patterns: ['epic.com', 'epic.epic'] },
    { ehrType: 'simplepractice', displayName: 'SimplePractice', patterns: ['simplepractice.com'] },
    { ehrType: 'tebra', displayName: 'Tebra', patterns: ['tebra.com', 'patientfusion.com'] },
  ];

  function detectEHR() {
    try {
      const host = window.location.hostname.toLowerCase();
      for (const m of MAPPINGS) {
        for (const p of m.patterns) {
          const regex = new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
          if (regex.test(host)) {
            return { ehrType: m.ehrType, displayName: m.displayName };
          }
        }
      }
      if (/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return { ehrType: 'on_prem', displayName: 'On-Premise EHR' };
      return null;
    } catch {
      return null;
    }
  }

  window.__nexrelEHRDetected = detectEHR();
})();
