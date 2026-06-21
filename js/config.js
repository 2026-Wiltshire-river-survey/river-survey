// config.js — edit SUPABASE_URL and SUPABASE_ANON_KEY after setting up your Supabase project

const CONFIG = {
  // Replace these with your Supabase project values
  // Found in: Supabase Dashboard → Project Settings → API
  SUPABASE_URL: localStorage.getItem('supa_url') || 'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: localStorage.getItem('supa_key') || 'YOUR_SUPABASE_ANON_KEY',

  // Admin password (also configurable via admin Settings tab)
  ADMIN_PASSWORD_KEY: 'river_survey_admin_pw',
  DEFAULT_ADMIN_PASSWORD: 'admin1234',

  // Storage keys for config stored in Supabase
  FIELDS_CONFIG_KEY: 'survey_fields_config',
  LOCATIONS_CONFIG_KEY: 'survey_locations_config',
};

function getAdminPassword() {
  return localStorage.getItem(CONFIG.ADMIN_PASSWORD_KEY) || CONFIG.DEFAULT_ADMIN_PASSWORD;
}

function isSupabaseConfigured() {
  const url = localStorage.getItem('supa_url') || CONFIG.SUPABASE_URL;
  return url && url !== 'YOUR_SUPABASE_URL';
}
