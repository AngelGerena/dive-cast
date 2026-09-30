import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && key);

// Created with placeholders when env vars are missing so imports never crash;
// the app shows a setup message instead of making calls in that case.
export const supabase: SupabaseClient = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
