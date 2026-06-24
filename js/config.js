// config.js — edit SUPABASE_URL and SUPABASE_ANON_KEY after setting up your Supabase project

const CONFIG = {
  // Replace these with your Supabase project values
  // Found in: Supabase Dashboard → Project Settings → API
  SUPABASE_URL: localStorage.getItem('supa_url') || 'https://hkgihtfumxrigvowixfb.supabase.co',
  SUPABASE_ANON_KEY: localStorage.getItem('supa_key') || 'sb_publishable_ubWF3CZxmqhtBukil_FaKA_vxKJfThF',

  // Admin password (also configurable via admin Settings tab)
  ADMIN_PASSWORD_KEY: 'river_survey_admin_pw',
  DEFAULT_ADMIN_PASSWORD: 'd3v1zE5?',

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
