import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function loadSupabaseEnv() {
  const envPath = path.resolve(__dirname, '../supabase.env');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(
    fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
        return [key, value];
      }),
  );
}

const supabaseEnv = loadSupabaseEnv();

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseEnv.SUPABASE_URL ?? ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseEnv.SUPABASE_ANON_KEY ?? ''),
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(supabaseEnv.VITE_GOOGLE_MAPS_API_KEY ?? ''),
  },
  server: { port: 5173 },
});
