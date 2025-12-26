const scanBtn = document.getElementById('scanNfcBtn');
const batteryInput = document.getElementById('batteryId');
const batteryTag = document.getElementById('batteryTag');
const batteryIdLabel = document.getElementById('batteryIdLabel');
const form = document.getElementById('flightForm');
const statusBox = document.getElementById('statusBox');

const STATS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwTFmBbJcPu71hAN0Yecb_D4EYBabjWgfYF1iJAsiImCd8CEXkDqlWAaY7U4ZnTW-25IA/exec'; // same script, for doGet

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search); // [web:143][web:144]
  const batteryId = params.get('bid');

  if (batteryId) {
    batteryInput.value = batteryId;
    batteryIdLabel.textContent = batteryId;
    batteryTag.style.display = 'inline-block';
    showStatus(`Scanned battery ${batteryId}`, true);

    // Load stats for this battery
    loadBatteryStats(batteryId);
  } else {
    // No bid in URL – still load generic stats if you want, or skip
    loadBatteryStats('');
  }
});

// NFC scan (simple, text record only)
async function scanNfc() {
  if (!('NDEFReader' in window)) {
    showStatus('NFC not supported on this device. Enter Battery ID manually.', false);
    return;
  }
  try {
    const ndef = new NDEFReader();
    await ndef.scan();
    showStatus('Hold phone near battery tag…', true);

    return new Promise(resolve => {
      ndef.onreading = event => {
        const dec = new TextDecoder();
        for (const record of event.message.records) {
          if (record.recordType === 'text') {
            const id = dec.decode(record.data).trim();
            resolve(id);
            return;
          }
        }
        resolve(null);
      };
      setTimeout(() => resolve(null), 8000);
    });
  } catch (err) {
    showStatus('NFC error: ' + err.message, false);
    return null;
  }
}

scanBtn.addEventListener('click', async () => {
  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning… hold near tag';
  const id = await scanNfc();
  scanBtn.disabled = false;
  scanBtn.textContent = '📲 Tap to scan battery (NFC)';

  if (id) {
    batteryInput.value = id;
    batteryIdLabel.textContent = id;
    batteryTag.style.display = 'inline-block';
    showStatus('Scanned battery ' + id, true);
  } else {
    showStatus('Could not read NFC tag. Try again or type ID.', false);
  }
});

function showStatus(msg, ok) {
  statusBox.style.display = 'block';
  statusBox.textContent = msg;
  statusBox.className = 'status ' + (ok ? 'status-ok' : 'status-err');
}

async function loadBatteryStats(batteryId) {
  const statsLoading = document.getElementById('statsLoading');
  const statsContent = document.getElementById('statsContent');
  const totalEl = document.getElementById('statTotalFlights');
  const avgEl = document.getElementById('statAvgFlight');
  const lastEl = document.getElementById('statLastFlight');
  const recentList = document.getElementById('recentFlights');

  statsLoading.textContent = 'Loading stats…';
  statsContent.style.display = 'none';
  recentList.innerHTML = '';

  if (!batteryId) {
    statsLoading.textContent = 'No battery selected yet.';
    return;
  }

  try {
    const url = `${STATS_ENDPOINT}?batteryId=${encodeURIComponent(batteryId)}`;
    const res = await fetch(url); // GET JSON [web:155][web:161]
    const data = await res.json();

    if (!data.ok) {
      statsLoading.textContent = data.error || 'Failed to load stats.';
      return;
    }

    statsLoading.style.display = 'none';
    statsContent.style.display = 'block';

    totalEl.textContent = data.totalFlights;
    avgEl.textContent = data.avgFlightTime;
    lastEl.textContent = data.lastFlightTime
      ? `${data.lastFlightTime} (${new Date(data.lastFlightDate).toLocaleDateString()})`
      : '—';

    if (data.recent && data.recent.length) {
      data.recent.forEach(f => {
        const li = document.createElement('li');
        const dateStr = new Date(f.timestamp).toLocaleDateString();
        li.textContent = `${dateStr} – ${f.quad} – ${f.flightTime}`;
        recentList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No flights logged yet.';
      recentList.appendChild(li);
    }
  } catch (err) {
    statsLoading.textContent = 'Error loading stats: ' + err.message;
  }
}

const FLIGHT_LOG_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwTFmBbJcPu71hAN0Yecb_D4EYBabjWgfYF1iJAsiImCd8CEXkDqlWAaY7U4ZnTW-25IA/exec';

form.addEventListener('submit', async e => {
  e.preventDefault();

  const batteryId = batteryInput.value.trim();
  const quad = document.getElementById('quad').value;
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  const notes = document.getElementById('notes').value.trim();

  const minutesValue = minutesEl.value.trim();
  const secondsValue = secondsEl.value.trim();

  if (!batteryId || !quad || minutesValue === '' || secondsValue === '') {
    showStatus('Battery ID, quad, minutes, and seconds are required.', false);
    return;
  }

  const mm = String(parseInt(minutesValue, 10) || 0);
  const ss = String(parseInt(secondsValue, 10) || 0).padStart(2, '0');
  const flightTime = `${mm}:${ss}`; // "1:23"

  const payload = {
    timestamp: new Date().toISOString(),
    batteryId,
    quad,
    flightTime,
    notes
  };

  // local backup
  const key = 'jj_flight_' + Date.now();
  localStorage.setItem(key, JSON.stringify(payload));

  try {
    await fetch(FLIGHT_LOG_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    showStatus(
      `Sent ${flightTime} on ${batteryId} (${quad}) to Flight Log endpoint.`,
      true
    );

    form.reset();
    batteryTag.style.display = 'none';
  } catch (err) {
    showStatus('Network error: ' + err.message, false);
  }
});
