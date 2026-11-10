/**
 * Public client configuration.
 * The publishable key is designed to be shipped in frontend code: every table is protected by
 * per-user Row Level Security, so this key alone cannot read anyone's data.
 * Never put the service-role / secret key here.
 */
export const SUPABASE_URL = 'https://lwcedukkvosjmjzijsrr.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_qeUJAQlCPNmMl7JrQvptdg_povMo7eU';
export const APP_VERSION = '1.0.0';
