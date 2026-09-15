import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Profile, Skill, UserSkill } from './types';

export const MOCK_AUTH_MODE = true;
export const MOCK_USER_EMAIL = 'alex@example.com';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_VVtP7ffWvziomjJLdCMypQ_IthkgHpm';

export const MOCK_PROFILE: Profile = {
  id: 'P-20260915-001',
  auth_id: null,
  full_name: 'Alex Mercer',
  email: 'alex.mercer@example.com',
  bio: 'Product designer, weekend ceramicist, and curious about anything handmade.',
  zip_code: '10001',
  created_at: '2026-09-15T09:00:00.000Z',
};

export const SKILLS: Skill[] = [
  { id: 1, name: 'Ceramics', category: 'Crafts' },
  { id: 2, name: 'Photography', category: 'Creative' },
  { id: 3, name: 'Sourdough Baking', category: 'Food' },
  { id: 4, name: 'Guitar', category: 'Music' },
  { id: 5, name: 'Watercolor', category: 'Creative' },
  { id: 6, name: 'Woodworking', category: 'Crafts' },
  { id: 7, name: 'Gardening', category: 'Outdoors' },
  { id: 8, name: 'Spanish', category: 'Languages' },
];

export const MOCK_USER_SKILLS: UserSkill[] = [
  { id: 'US-20260915-001', profile_id: MOCK_PROFILE.id, skill_id: 2, skill_type: 'teach', experience_level: 'advanced', skill: SKILLS[1] },
  { id: 'US-20260915-002', profile_id: MOCK_PROFILE.id, skill_id: 1, skill_type: 'learn', experience_level: 'beginner', skill: SKILLS[0] },
];

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export function getCurrentProfile(): Profile {
  return MOCK_AUTH_MODE ? MOCK_PROFILE : MOCK_PROFILE;
}
