// db.js — all database operations via Supabase REST API

function getSupabaseHeaders() {
  const key = localStorage.getItem('supa_key') || CONFIG.SUPABASE_ANON_KEY;
  return {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Prefer': 'return=representation'
  };
}

function supabaseUrl(table, query) {
  const base = localStorage.getItem('supa_url') || CONFIG.SUPABASE_URL;
  return base + '/rest/v1/' + table + (query ? '?' + query : '');
}

// ── Config (fields + locations stored in a key/value config table) ──────────

async function dbGetConfig(key) {
  const res = await fetch(supabaseUrl('survey_config', 'key=eq.' + key + '&select=value'), {
    headers: getSupabaseHeaders()
  });
  const data = await res.json();
  return data && data[0] ? JSON.parse(data[0].value) : null;
}

async function dbSetConfig(key, value) {
  const body = JSON.stringify({ key, value: JSON.stringify(value) });
  const res = await fetch(supabaseUrl('survey_config', 'key=eq.' + key), {
    method: 'PATCH',
    headers: getSupabaseHeaders(),
    body
  });
  if (res.status === 404 || (await res.json()).length === 0) {
    await fetch(supabaseUrl('survey_config'), {
      method: 'POST',
      headers: getSupabaseHeaders(),
      body
    });
  }
}

// ── Submissions ──────────────────────────────────────────────────────────────

async function dbSaveSubmission(record) {
  const res = await fetch(supabaseUrl('survey_submissions'), {
    method: 'POST',
    headers: getSupabaseHeaders(),
    body: JSON.stringify(record)
  });
  if (!res.ok) throw new Error('Save failed: ' + res.status);
  return await res.json();
}

async function dbLoadAllSubmissions() {
  const res = await fetch(supabaseUrl('survey_submissions', 'order=submitted_at.desc'), {
    headers: getSupabaseHeaders()
  });
  if (!res.ok) throw new Error('Load failed: ' + res.status);
  return await res.json();
}

async function dbLoadMySubmissions(agentId) {
  const res = await fetch(
    supabaseUrl('survey_submissions', 'agent_id=eq.' + encodeURIComponent(agentId) + '&order=submitted_at.desc'),
    { headers: getSupabaseHeaders() }
  );
  if (!res.ok) throw new Error('Load failed: ' + res.status);
  return await res.json();
}

// ── Photo storage (Supabase Storage bucket: survey-photos) ──────────────────

async function dbUploadPhoto(file, submissionId, fieldId) {
  const base = localStorage.getItem('supa_url') || CONFIG.SUPABASE_URL;
  const key = localStorage.getItem('supa_key') || CONFIG.SUPABASE_ANON_KEY;
  const ext = file.name.split('.').pop();
  const path = submissionId + '/' + fieldId + '_' + Date.now() + '.' + ext;
  const res = await fetch(base + '/storage/v1/object/survey-photos/' + path, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Content-Type': file.type,
      'x-upsert': 'true'
    },
    body: file
  });
  if (!res.ok) throw new Error('Photo upload failed');
  return base + '/storage/v1/object/public/survey-photos/' + path;
}

// ── Test connection ──────────────────────────────────────────────────────────

async function dbTestConnection() {
  try {
    const res = await fetch(supabaseUrl('survey_config', 'limit=1'), {
      headers: getSupabaseHeaders()
    });
    return res.ok;
  } catch {
    return false;
  }
}
