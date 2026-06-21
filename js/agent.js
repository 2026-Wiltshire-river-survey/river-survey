// agent.js

let agent = {};
let surveyFields = [];
let surveyLocations = [];
let formValues = {};
let photoFiles = {};

// ── Login ────────────────────────────────────────────────────────────────────

async function doLogin() {
  const name = document.getElementById('login-name').value.trim();
  const id = document.getElementById('login-id').value.trim();
  const region = document.getElementById('login-region').value;
  const err = document.getElementById('login-error');

  if (!name || !id || !region) {
    err.textContent = 'Please complete all fields.';
    err.classList.remove('hidden');
    return;
  }
  if (!isSupabaseConfigured()) {
    err.textContent = 'The system is not yet configured. Please contact your administrator.';
    err.classList.remove('hidden');
    return;
  }
  err.classList.add('hidden');
  agent = { name, id, region };
  document.getElementById('nav-name').textContent = name + ' (' + id + ')';
  document.getElementById('nav-region').textContent = region;
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-main').classList.remove('hidden');
  await loadConfig();
  renderForm();
}

function doLogout() {
  agent = {}; formValues = {}; photoFiles = {};
  document.getElementById('screen-main').classList.add('hidden');
  document.getElementById('screen-login').classList.remove('hidden');
  switchTab('new');
}

// ── Config ───────────────────────────────────────────────────────────────────

async function loadConfig() {
  try {
    surveyFields = (await dbGetConfig(CONFIG.FIELDS_CONFIG_KEY)) || [];
    surveyLocations = (await dbGetConfig(CONFIG.LOCATIONS_CONFIG_KEY)) || [];
  } catch (e) {
    surveyFields = [];
    surveyLocations = [];
  }
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function switchTab(t) {
  ['new', 'mine'].forEach(x => {
    document.getElementById('pane-' + x).classList.add('hidden');
    document.getElementById('tab-' + x).classList.remove('active');
  });
  document.getElementById('pane-' + t).classList.remove('hidden');
  document.getElementById('tab-' + t).classList.add('active');
  if (t === 'mine') loadMine();
}

// ── Form rendering ───────────────────────────────────────────────────────────

function renderForm() {
  formValues = {};
  photoFiles = {};
  const wrap = document.getElementById('survey-form-wrap');
  const noConfig = document.getElementById('no-config');

  if (!surveyFields.length) {
    noConfig.classList.remove('hidden');
    wrap.innerHTML = '';
    return;
  }
  noConfig.classList.add('hidden');

  let html = '<div class="reading-card">';
  html += '<div id="form-alert" class="hidden"></div>';

  // Location section
  html += '<div class="form-section-title">Sampling location</div>';
  html += '<div class="field">';
  html += '<label for="f-location">Named location</label>';
  if (surveyLocations.length) {
    html += '<select id="f-location" onchange="onLocationChange(this.value)">';
    html += '<option value="">— Select or type below —</option>';
    surveyLocations.forEach(loc => {
      html += '<option value="' + esc(loc.name) + '" data-grid="' + esc(loc.gridref) + '">' + esc(loc.name) + '</option>';
    });
    html += '</select>';
  } else {
    html += '<input type="text" id="f-location" placeholder="Location name" oninput="setVal(\'location\',this.value)">';
  }
  html += '</div>';

  html += '<div class="gridref-row">';
  html += '<div class="field"><label for="f-gridref">OS grid reference</label>';
  html += '<input type="text" id="f-gridref" placeholder="e.g. SD 82345 03421" oninput="setVal(\'gridref\',this.value)"></div>';
  html += '<div class="field"><label for="f-datetime">Date &amp; time</label>';
  html += '<input type="datetime-local" id="f-datetime" oninput="setVal(\'datetime\',this.value)"></div>';
  html += '</div>';

  // Auto-set datetime to now
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dtVal = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate()) + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes());
  setTimeout(() => {
    const dtEl = document.getElementById('f-datetime');
    if (dtEl) { dtEl.value = dtVal; formValues['datetime'] = dtVal; }
  }, 0);

  // Measurement fields
  html += '<div class="form-section-title">Measurements</div>';

  surveyFields.forEach((field, i) => {
    html += '<div class="field">';
    html += '<label for="f-field-' + i + '">' + esc(field.name) + (field.units ? ' <span style="font-weight:400;color:var(--gray-400)">(' + esc(field.units) + ')</span>' : '') + '</label>';

    if (field.type === 'number') {
      html += '<input type="number" id="f-field-' + i + '" placeholder="Enter value"';
      if (field.min !== '' && field.min !== undefined) html += ' min="' + field.min + '"';
      if (field.max !== '' && field.max !== undefined) html += ' max="' + field.max + '"';
      html += ' step="any" oninput="setVal(\'field_' + i + '\',this.value)">';
      if (field.min !== '' || field.max !== '') {
        html += '<p class="unit-hint">Range: ' + (field.min !== '' && field.min !== undefined ? field.min : '—') + ' to ' + (field.max !== '' && field.max !== undefined ? field.max : '—') + (field.units ? ' ' + esc(field.units) : '') + '</p>';
      }
    } else if (field.type === 'photo') {
      html += '<div class="photo-input-wrap" onclick="triggerPhoto(' + i + ')">';
      html += '<input type="file" id="f-field-' + i + '" accept="image/*" capture="environment" multiple onchange="onPhotoChange(' + i + ',this)">';
      html += '<span id="photo-hint-' + i + '">&#128247; Tap to take photo or choose file</span>';
      html += '</div>';
      html += '<div class="photo-preview" id="photo-preview-' + i + '"></div>';
    }
    html += '</div>';
  });

  html += '<div class="field"><label for="f-notes">Field notes (optional)</label>';
  html += '<textarea id="f-notes" placeholder="Any additional observations..." oninput="setVal(\'notes\',this.value)"></textarea></div>';

  html += '<div class="reading-actions">';
  html += '<button class="btn" onclick="renderForm()">Clear form</button>';
  html += '<button class="btn btn-primary" id="submit-btn" onclick="submitReading()">Submit reading</button>';
  html += '</div></div>';

  wrap.innerHTML = html;
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function setVal(key, val) { formValues[key] = val; }

function onLocationChange(val) {
  setVal('location', val);
  if (!val) return;
  const sel = document.getElementById('f-location');
  const opt = sel.querySelector('option[value="' + val + '"]');
  if (opt && opt.dataset.grid) {
    const gr = document.getElementById('f-gridref');
    if (gr) { gr.value = opt.dataset.grid; setVal('gridref', opt.dataset.grid); }
  }
}

function triggerPhoto(i) {
  document.getElementById('f-field-' + i).click();
}

async function onPhotoChange(i, input) {
  if (!input.files.length) return;
  photoFiles[i] = photoFiles[i] || [];
  const preview = document.getElementById('photo-preview-' + i);
  const hint = document.getElementById('photo-hint-' + i);

  for (const file of input.files) {
    const compressed = await compressPhoto(file);
    photoFiles[i].push(compressed);
    const img = document.createElement('img');
    img.src = URL.createObjectURL(compressed);
    img.className = 'photo-thumb';
    preview.appendChild(img);
  }
  if (hint) hint.textContent = (photoFiles[i].length) + ' photo' + (photoFiles[i].length > 1 ? 's' : '') + ' selected';
}

async function compressPhoto(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob || file); }, 'image/jpeg', 0.78);
    };
    img.src = url;
  });
}

// ── Submit ───────────────────────────────────────────────────────────────────

async function submitReading() {
  const al = document.getElementById('form-alert');
  const btn = document.getElementById('submit-btn');

  if (!formValues.location && !formValues.gridref) {
    showAlert(al, 'error', 'Please enter a location name or OS grid reference.');
    return;
  }

  // Check required numeric fields
  const missing = surveyFields
    .map((f, i) => ({ f, i }))
    .filter(({ f, i }) => f.type === 'number' && (formValues['field_' + i] === undefined || formValues['field_' + i] === ''))
    .map(({ f }) => f.name);

  if (missing.length) {
    showAlert(al, 'error', 'Please enter values for: ' + missing.join(', ') + '.');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Saving...';
  showAlert(al, 'info', 'Saving to cloud...');

  const submissionId = 'RS' + Date.now() + Math.random().toString(36).slice(2, 5).toUpperCase();

  // Upload photos first
  const photoUrls = {};
  for (const [idx, files] of Object.entries(photoFiles)) {
    photoUrls['field_' + idx] = [];
    for (const file of files) {
      try {
        const url = await dbUploadPhoto(file, submissionId, 'field_' + idx);
        photoUrls['field_' + idx].push(url);
      } catch (e) {
        console.warn('Photo upload failed', e);
      }
    }
  }

  // Build measurements object
  const measurements = {};
  surveyFields.forEach((field, i) => {
    if (field.type === 'number') {
      measurements[field.name] = formValues['field_' + i] !== undefined ? parseFloat(formValues['field_' + i]) : null;
    } else if (field.type === 'photo') {
      measurements[field.name + '_photos'] = photoUrls['field_' + i] || [];
    }
  });

  const record = {
    id: submissionId,
    submitted_at: new Date().toISOString(),
    reading_datetime: formValues.datetime || new Date().toISOString(),
    agent_name: agent.name,
    agent_id: agent.id,
    region: agent.region,
    location_name: formValues.location || '',
    grid_reference: formValues.gridref || '',
    measurements: measurements,
    notes: formValues.notes || ''
  };

  try {
    await dbSaveSubmission(record);
    showAlert(al, 'success', 'Reading submitted for ' + (record.location_name || record.grid_reference) + '.');
    setTimeout(() => renderForm(), 2000);
  } catch (e) {
    showAlert(al, 'error', 'Save failed. Please check your connection and try again.');
    btn.disabled = false;
    btn.innerHTML = 'Submit reading';
  }
}

function showAlert(el, type, msg) {
  el.className = 'alert alert-' + type;
  el.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── My submissions ───────────────────────────────────────────────────────────

let mySubmissions = [];

async function loadMine() {
  const status = document.getElementById('mine-status');
  const wrap = document.getElementById('mine-wrap');
  status.innerHTML = '<span class="spinner"></span> Loading...';
  wrap.innerHTML = '';
  try {
    mySubmissions = await dbLoadMySubmissions(agent.id);
    status.textContent = mySubmissions.length + ' submission' + (mySubmissions.length !== 1 ? 's' : '') + ' from you.';
    if (!mySubmissions.length) {
      wrap.innerHTML = '<p style="color:var(--gray-400);font-size:14px;padding:1rem 0">No submissions yet.</p>';
      return;
    }
    wrap.innerHTML = renderSubmissionsTable(mySubmissions);
  } catch (e) {
    status.textContent = 'Failed to load. Check your connection.';
  }
}

function renderSubmissionsTable(rows) {
  const fieldNames = surveyFields.filter(f => f.type === 'number').map(f => f.name);
  let html = '<div class="table-wrap"><table>';
  html += '<thead><tr><th>Date</th><th>Location</th><th>Grid ref</th>';
  fieldNames.forEach(n => html += '<th>' + esc(n) + '</th>');
  html += '<th>Notes</th></tr></thead><tbody>';
  rows.forEach(r => {
    const m = r.measurements || {};
    const d = r.reading_datetime ? new Date(r.reading_datetime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    html += '<tr>';
    html += '<td style="white-space:nowrap">' + d + '</td>';
    html += '<td>' + esc(r.location_name || '—') + '</td>';
    html += '<td style="font-family:monospace;font-size:12px">' + esc(r.grid_reference || '—') + '</td>';
    fieldNames.forEach(n => {
      const val = m[n];
      html += '<td>' + (val !== null && val !== undefined ? val : '—') + '</td>';
    });
    html += '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(r.notes) + '">' + esc(r.notes || '—') + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}

function exportMineCSV() {
  if (!mySubmissions.length) { alert('No submissions to export.'); return; }
  downloadCSV(buildCSV(mySubmissions), 'river_survey_' + agent.id + '_' + today() + '.csv');
}

function buildCSV(rows) {
  const fieldNames = surveyFields.filter(f => f.type === 'number').map(f => f.name);
  const header = ['id', 'submitted_at', 'reading_datetime', 'agent_name', 'agent_id', 'region', 'location_name', 'grid_reference', ...fieldNames, 'notes'];
  const lines = rows.map(r => {
    const m = r.measurements || {};
    return header.map(k => {
      if (fieldNames.includes(k)) return csvCell(m[k]);
      return csvCell(r[k]);
    }).join(',');
  });
  return [header.join(','), ...lines].join('\n');
}

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function downloadCSV(csv, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
