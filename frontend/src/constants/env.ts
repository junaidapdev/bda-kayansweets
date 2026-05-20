/**
 * Single source of truth for all environment variables.
 * NO other file should read import.meta.env directly.
 */
export const ENV = {
  SUPABASE_URL: import.meta.env['VITE_SUPABASE_URL'] as string,
  SUPABASE_ANON_KEY: import.meta.env['VITE_SUPABASE_ANON_KEY'] as string,
  ADMIN_USERNAME: import.meta.env['VITE_ADMIN_USERNAME'] ?? 'bdakayan',
  ADMIN_AUTH_EMAIL: import.meta.env['VITE_ADMIN_AUTH_EMAIL'] ?? 'bda@kayan.com',
} as const
