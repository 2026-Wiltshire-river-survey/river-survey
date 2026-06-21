// admin.js

let surveyFields = [];
let surveyLocations = [];
let allSubmissions = [];

// ── Login ────────────────────────────────────────────────────────────────────

async function doAdminLogin() {
  const pw = document.getElementById('admin-password').value;
  const err = document.getElementById('login-error');
  if (!pw) { err.textContent = 'Please enter the admin password.'; err.classList.remove('hidden'); return; }
  if (pw !== getAdminPassword()) { err.textContent = 'Incorrect password.'; err.classList.remove('hidden'); return; }
  if (!isSupabaseConfigured()) {
    // Allow login but land on settings tab
    err.classList.add('hidden');
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-main').classList.remove('hidden');
    switchTab('settings');
    showMsg('supa-msg', 'info', 'Please configure your Supabase connection to get started.');
    return;
  }
  err.classList.add('hidden');
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-main').classList.remove('hidden');
  await loadAllConfig();
  switchTab('fields');
}

function doAdminLogout() {
  document.getElementById('screen-main').classList.add('hidden');
  document.getElementById('screen-login').classList.remove('hidden');
  document.getElementById('admin-password').value = '';
}

// ── Config ───────────────────────────────────────────────────────────────────

async function loadAllConfig() {
  try {
    surveyFields = (await dbGetConfig(CONFIG.FIELDS_CONFIG_KEY)) || [];
    surveyLocations = (await dbGetConfig(CONFIG.LOCATIONS_CONFIG_KEY)) || [];
  } catch { surveyFields = []; surveyLocations = []; }
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function switchTab(t) {
  ['fields', 'locations', 'dashboard', 'data', 'settings'].forEach(x => {
    document.getElementById('pane-' + x).classList.add('hidden');
    const tab = document.getElementById('tab-' + x);
    if (tab) tab.classList.remove('active');
  });
  document.getElementById('pane-' + t).classList.remove('hidden');
  const active = document.getElementById('tab-' + t);
  if (active) active.classList.add('active');
  if (t === 'fields') renderFieldsList();
  if (t === 'locations') renderLocationsList();
  if (t === 'dashboard') loadDashboard();
  if (t === 'data') loadAllData();
  if (t === 'settings') loadSettingsValues();
}

// ── Fields editor ────────────────────────────────────────────────────────────

function renderFieldsList() {
  const list = document.getElementById('fields-list');
  const addBtn = document.getElementById('add-field-btn');
  if (!surveyFields.length) {
    list.innerHTML = '<div class="fields-empty">No fields yet. Click &ldquo;Add field&rdquo; to create your first measurement.</div>';
    addBtn.disabled = false;
    return;
  }
  addBtn.disabled = surveyFields.length >= 10;
  list.innerHTML = surveyFields.map((f, i) => `
    <div class="field-editor" id="fe-${i}">
      <div class="field-drag-handle" title="Drag to reorder">&#8942;</div>
      <div>
        <label style="font-size:11px;margin-bottom:3px">Field name</label>
        <input type="text" value="${esc(f.name)}" placeholder="e.g. pH level" oninput="updateField(${i},'name',this.value)">
      </div>
      <div>
        <label style="font-size:11px;margin-bottom:3px">Type</label>
        <select onchange="updateField(${i},'type',this.value)">
          <option value="number" ${f.type === 'number' ? 'selected' : ''}>Numeric reading</option>
          <option value="photo" ${f.type === 'photo' ? 'selected' : ''}>Photo upload</option>
        </select>
      </div>
      <div>
        <label style="font-size:11px;margin-bottom:3px">Units <span style="font-weight:400;color:var(--gray-400)">(numeric only)</span></label>
        <input type="text" value="${esc(f.units || '')}" placeholder="e.g. mg/L, °C, pH" ${f.type !== 'number' ? 'disabled' : ''} oninput="updateField(${i},'units',this.value)">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div>
          <label style="font-size:11px;margin-bottom:3px">Min</label>
          <input type="number" step="any" value="${f.min !== undefined ? f.min : ''}" placeholder="—" ${f.type !== 'number' ? 'disabled' : ''} oninput="updateField(${i},'min',this.value)">
        </div>
        <div>
          <label style="font-size:11px;margin-bottom:3px">Max</label>
          <input type="number" step="any" value="${f.max !== undefined ? f.max : ''}" placeholder="—" ${f.type !== 'number' ? 'disabled' : ''} oninput="updateField(${i},'max',this.value)">
        </div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeField(${i})">Remove</button>
    </div>
  `).join('');
  document.getElementById('fields-save-status').textContent = '';
}

function addField() {
  if (surveyFields.length >= 10) return;
  surveyFields.push({ name: '', type: 'number', units: '', min: '', max: '' });
  renderFieldsList();
  document.getElementById('fields-save-status').textContent = 'Unsaved changes.';
}

function removeField(i) {
  surveyFields.splice(i, 1);
  renderFieldsList();
  document.getElementById('fields-save-status').textContent = 'Unsaved changes.';
}

function updateField(i, key, val) {
  surveyFields[i][key] = val;
  if (key === 'type') renderFieldsList();
  document.getElementById('fields-save-status').textContent = 'Unsaved changes.';
}

async function saveFields() {
  const invalid = surveyFields.filter(f => !f.name.trim());
  if (invalid.length) {
    document.getElementById('fields-save-status').textContent = 'All fields must have a name.';
    return;
  }
  document.getElementById('fields-save-status').innerHTML = '<span class="spinner"></span> Saving...';
  try {
    await dbSetConfig(CONFIG.FIELDS_CONFIG_KEY, surveyFields);
    document.getElementById('fields-save-status').textContent = 'Saved.';
  } catch (e) {
    document.getElementById('fields-save-status').textContent = 'Save failed. Check connection.';
  }
}

// ── Locations editor ─────────────────────────────────────────────────────────

function renderLocationsList() {
  const list = document.getElementById('locations-list');
  if (!surveyLocations.length) {
    list.innerHTML = '<div class="locations-empty">No locations yet. Add named sampling sites for agents to select.</div>';
    return;
  }
  list.innerHTML = surveyLocations.map((loc, i) => `
    <div class="location-editor" id="le-${i}">
      <div>
        <label style="font-size:11px;margin-bottom:3px">Location name</label>
        <input type="text" value="${esc(loc.name)}" placeholder="e.g. River Roch — Sudden" oninput="updateLocation(${i},'name',this.value)">
      </div>
      <div>
        <label style="font-size:11px;margin-bottom:3px">OS grid reference</label>
        <input type="text" value="${esc(loc.gridref)}" placeholder="e.g. SD 89201 11432" style="font-family:monospace" oninput="updateLocation(${i},'gridref',this.value)">
      </div>
      <div>
        <label style="font-size:11px;margin-bottom:3px">Region</label>
        <select onchange="updateLocation(${i},'region',this.value)">
          <option value="">Select...</option>
          ${['North West','North East','Yorkshire','Midlands','East of England','London','South East','South West','Wales','Scotland'].map(r =>
            `<option ${loc.region === r ? 'selected' : ''}>${r}</option>`
          ).join('')}
        </select>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeLocation(${i})">Remove</button>
    </div>
  `).join('');
  document.getElementById('locations-save-status').textContent = '';
}

function addLocation() {
  surveyLocations.push({ name: '', gridref: '', region: '' });
  renderLocationsList();
  document.getElementById('locations-save-status').textContent = 'Unsaved changes.';
}

function removeLocation(i) {
  surveyLocations.splice(i, 1);
  renderLocationsList();
  document.getElementById('locations-save-status').textContent = 'Unsaved changes.';
}

function updateLocation(i, key, val) {
  surveyLocations[i][key] = val;
  document.getElementById('locations-save-status').textContent = 'Unsaved changes.';
}

async function saveLocations() {
  const invalid = surveyLocations.filter(l => !l.name.trim() || !l.gridref.trim());
  if (invalid.length) {
    document.getElementById('locations-save-status').textContent = 'All locations need a name and grid reference.';
    return;
  }
  document.getElementById('locations-save-status').innerHTML = '<span class="spinner"></span> Saving...';
  try {
    await dbSetConfig(CONFIG.LOCATIONS_CONFIG_KEY, surveyLocations);
    document.getElementById('locations-save-status').textContent = 'Saved.';
  } catch {
    document.getElementById('locations-save-status').textContent = 'Save failed. Check connection.';
  }
}

// ── Dashboard ────────────────────────────────────────────────────────────────

async function loadDashboard() {
  const status = document.getElementById('dash-status');
  status.innerHTML = '<span class="spinner"></span> Loading...';
  try {
    allSubmissions = await dbLoadAllSubmissions();
    status.textContent = allSubmissions.length + ' total submission' + (allSubmissions.length !== 1 ? 's' : '') + '.';

    const agents = new Set(allSubmissions.map(r => r.agent_id)).size;
    const regions = new Set(allSubmissions.map(r => r.region)).size;
    const locations = new Set(allSubmissions.map(r => r.location_name).filter(Boolean)).size;

    document.getElementById('stat-grid').innerHTML = [
      ['Total readings', allSubmissions.length],
      ['Active agents', agents],
      ['Regions', regions],
      ['Locations', locations],
    ].map(([l, n]) => `<div class="stat"><div class="stat-num">${n}</div><div class="stat-lbl">${l}</div></div>`).join('');

    renderBarChart('region-chart', groupBy(allSubmissions, 'region'));
    renderBarChart('location-chart', groupBy(allSubmissions, 'location_name'));
  } catch (e) {
    status.textContent = 'Failed to load. Check connection.';
  }
}

function groupBy(rows, key) {
  const map = {};
  rows.forEach(r => { const v = r[key] || 'Unknown'; map[v] = (map[v] || 0) + 1; });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
}

function renderBarChart(id, entries) {
  const el = document.getElementById(id);
  if (!entries.length) { el.innerHTML = '<p style="font-size:13px;color:var(--gray-400)">No data yet.</p>'; return; }
  const max = Math.max(...entries.map(e => e[1]), 1);
  el.innerHTML = entries.map(([label, count]) => `
    <div class="bar-row">
      <span class="bar-label" title="${esc(label)}">${esc(label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(count/max*100)}%"></div></div>
      <span class="bar-count">${count}</span>
    </div>
  `).join('');
}

// ── All data ─────────────────────────────────────────────────────────────────

async function loadAllData() {
  const status = document.getElementById('data-status');
  const wrap = document.getElementById('all-data-wrap');
  status.innerHTML = '<span class="spinner"></span> Loading...';
  try {
    allSubmissions = await dbLoadAllSubmissions();
    const fields = (await dbGetConfig(CONFIG.FIELDS_CONFIG_KEY)) || [];
    const numFields = fields.filter(f => f.type === 'number');
    status.textContent = allSubmissions.length + ' submission' + (allSubmissions.length !== 1 ? 's' : '');

    if (!allSubmissions.length) {
      wrap.innerHTML = '<p style="color:var(--gray-400);font-size:14px;padding:1rem 0">No submissions yet.</p>';
      return;
    }

    let html = '<div class="table-wrap"><table>';
    html += '<thead><tr><th>Date/time</th><th>Agent</th><th>Region</th><th>Location</th><th>Grid ref</th>';
    numFields.forEach(f => html += '<th>' + esc(f.name) + (f.units ? ' (' + esc(f.units) + ')' : '') + '</th>');
    html += '<th>Notes</th></tr></thead><tbody>';

    allSubmissions.forEach(r => {
      const m = r.measurements || {};
      const d = r.reading_datetime ? new Date(r.reading_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
      html += '<tr>';
      html += '<td style="white-space:nowrap">' + d + '</td>';
      html += '<td>' + esc(r.agent_name) + '<br><span style="font-size:11px;color:var(--gray-400)">' + esc(r.agent_id) + '</span></td>';
      html += '<td>' + esc(r.region || '—') + '</td>';
      html += '<td>' + esc(r.location_name || '—') + '</td>';
      html += '<td style="font-family:monospace;font-size:12px">' + esc(r.grid_reference || '—') + '</td>';
      numFields.forEach(f => {
        const v = m[f.name];
        html += '<td>' + (v !== null && v !== undefined ? v : '—') + '</td>';
      });
      html += '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(r.notes) + '">' + esc(r.notes || '—') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    wrap.innerHTML = html;
  } catch (e) {
    status.textContent = 'Failed to load.';
  }
}

async function exportAllCSV() {
  if (!allSubmissions.length) { await loadAllData(); }
  if (!allSubmissions.length) { alert('No data to export.'); return; }
  const fields = (await dbGetConfig(CONFIG.FIELDS_CONFIG_KEY)) || [];
  const numFields = fields.filter(f => f.type === 'number').map(f => f.name);
  const header = ['id', 'submitted_at', 'reading_datetime', 'agent_name', 'agent_id', 'region', 'location_name', 'grid_reference', ...numFields, 'notes'];
  const lines = allSubmissions.map(r => {
    const m = r.measurements || {};
    return header.map(k => numFields.includes(k) ? csvCell(m[k]) : csvCell(r[k])).join(',');
  });
  const csv = [header.join(','), ...lines].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'river_survey_all_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// ── Settings ─────────────────────────────────────────────────────────────────

function loadSettingsValues() {
  const url = localStorage.getItem('supa_url') || '';
  const key = localStorage.getItem('supa_key') || '';
  document.getElementById('supa-url').value = url;
  document.getElementById('supa-key').value = key;
}

function changePassword() {
  const np = document.getElementById('new-password').value;
  const cp = document.getElementById('confirm-password').value;
  const msg = document.getElementById('password-msg');
  if (!np) { showMsg('password-msg', 'error', 'Please enter a new password.'); return; }
  if (np !== cp) { showMsg('password-msg', 'error', 'Passwords do not match.'); return; }
  if (np.length < 6) { showMsg('password-msg', 'error', 'Password must be at least 6 characters.'); return; }
  localStorage.setItem(CONFIG.ADMIN_PASSWORD_KEY, np);
  showMsg('password-msg', 'success', 'Password updated.');
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
}

async function saveSupabaseConfig() {
  const url = document.getElementById('supa-url').value.trim();
  const key = document.getElementById('supa-key').value.trim();
  if (!url || !key) { showMsg('supa-msg', 'error', 'Please enter both the URL and anon key.'); return; }
  localStorage.setItem('supa_url', url);
  localStorage.setItem('supa_key', key);
  showMsg('supa-msg', 'info', 'Testing connection...');
  const ok = await dbTestConnection();
  if (ok) {
    showMsg('supa-msg', 'success', 'Connected successfully. You can now configure your survey fields.');
    await loadAllConfig();
  } else {
    showMsg('supa-msg', 'error', 'Connection failed. Check your URL and key and try again.');
  }
}

function showMsg(id, type, msg) {
  const el = document.getElementById(id);
  el.className = 'alert alert-' + type;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
