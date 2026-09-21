import { supabase } from './supabaseClient';
import type { Skill } from './types';

export type MatchType = 'mutual' | 'partial';

export interface MapMatch {
  profile_id: string;
  full_name: string;
  bio: string;
  distance_miles: number;
  latitude: number;
  longitude: number;
  match_type: MatchType;
  matched_teach_skill_ids: number[];
  matched_learn_skill_ids: number[];
  matched_teach_skills?: Skill[];
  matched_learn_skills?: Skill[];
}

export async function findProfileMatches(profileId: string, radiusMiles: number): Promise<MapMatch[]> {
  const { data, error } = await supabase.rpc('find_profile_matches', {
    p_profile_id: profileId,
    p_radius_miles: radiusMiles,
  });
  if (error) {
    if (error.code === 'PGRST202' || error.message.includes('find_profile_matches')) {
      throw new Error('Phase 3 is not installed in Supabase yet. Run migrations 003 and 004 in the Supabase SQL Editor.');
    }
    if (error.message.toLowerCase().includes('profile_locations')) {
      throw new Error('No live map locations exist yet. Run migration 004 to seed the Philippines demo locations.');
    }
    if (error.message.toLowerCase().includes('permission') || error.message.toLowerCase().includes('auth')) {
      throw new Error('Sign in with Supabase Auth and link your profile auth_id before loading live matches.');
    }
    throw new Error(`Unable to load profile matches: ${error.message}`);
  }
  return (data ?? []) as MapMatch[];
}
