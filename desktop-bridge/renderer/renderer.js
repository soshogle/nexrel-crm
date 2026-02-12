let selectedSourceId = null;

function log(msg, type = '') {
  const el = document.getElementById('log');
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.textContent = `[${time}] ${msg}`;
  if (type) line.className = type;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

async function refreshSources() {
  const container = document.getElementById('sources');
  container.innerHTML = '';
  try {
    const sources = await window.nexrelBridge.getSources();
    sources.forEach((s) => {
      const div = document.createElement('div');
      div.className = 'source';
      div.dataset.id = s.id;
      div.innerHTML = `
        <img src="data:image/png;base64,${s.thumbnailBase64 || ''}" alt="" />
        <span>${s.name}</span>
      `;
      div.onclick = () => {
        document.querySelectorAll('.source').forEach((el) => el.classList.remove('selected'));
        div.classList.add('selected');
        selectedSourceId = s.id;
        document.getElementById('captureBtn').disabled = false;
      };
      container.appendChild(div);
    });
    log(`Found ${sources.length} sources`);
  } catch (e) {
    log('Failed to get sources: ' + e.message, 'error');
  }
}

async function captureAndSend() {
  const token = document.getElementById('token').value.trim();
  const ehrType = document.getElementById('ehrType').value;
  const statusEl = document.getElementById('captureStatus');
  if (!token || !selectedSourceId) {
    statusEl.textContent = 'Set token and select a window';
    statusEl.className = 'status error';
    return;
  }
  statusEl.textContent = 'Capturing...';
  statusEl.className = 'status';
  try {
    const result = await window.nexrelBridge.captureAndSend({
      sourceId: selectedSourceId,
      token,
      ehrType,
    });
    statusEl.textContent = `OK: ${result.message || 'Sent'}`;
    statusEl.className = 'status success';
    log('Screenshot sent: ' + (result.message || 'success'));
  } catch (e) {
    statusEl.textContent = 'Error: ' + e.message;
    statusEl.className = 'status error';
    log('Error: ' + e.message, 'error');
  }
}

async function exportRpa() {
  const token = document.getElementById('token').value.trim();
  const statusEl = document.getElementById('exportStatus');
  if (!token) {
    statusEl.textContent = 'Set token first';
    statusEl.className = 'status error';
    return;
  }
  statusEl.textContent = 'Fetching actions...';
  statusEl.className = 'status';
  try {
    const actions = await window.nexrelBridge.pollPendingActions({ token });
    const filepath = await window.nexrelBridge.getExportPath();
    await window.nexrelBridge.writeRpaExport({ filepath, actions });
    statusEl.textContent = `Exported ${actions.length} actions to ${filepath}`;
    statusEl.className = 'status success';
    log('RPA export: ' + filepath);
  } catch (e) {
    statusEl.textContent = 'Error: ' + e.message;
    statusEl.className = 'status error';
    log('Export error: ' + e.message, 'error');
  }
}

document.getElementById('refreshBtn').onclick = refreshSources;
document.getElementById('captureBtn').onclick = captureAndSend;
document.getElementById('exportBtn').onclick = exportRpa;

refreshSources();
