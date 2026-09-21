import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ExperienceLevel, Profile, Skill, SkillType, SwapRequest, UserSkill } from './types';

export const MOCK_AUTH_MODE = false;
const configuredUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseUrl = configuredUrl.replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export async function getSkills(): Promise<Skill[]> {
  const { data, error } = await supabase.from('skills').select('id,name,category').order('name');
  if (error) throw new Error(`Unable to load skills: ${error.message}`);
  return data as Skill[];
}

export async function createSwapRequest(senderId: string, receiverId: string): Promise<SwapRequest> {
  if (senderId === receiverId) throw new Error('You cannot send a swap request to yourself.');
  const { data, error } = await supabase.from('swap_requests')
    .insert({ sender_id: senderId, receiver_id: receiverId })
    .select('id,sender_id,receiver_id,status,created_at')
    .single();
  if (error) throw new Error(`Unable to send swap request: ${error.message}`);
  return data as SwapRequest;
}

export async function saveProfile(profile: Profile, values: { fullName: string; bio: string; zipCode: string; selections: Array<{ skillId: number; skillType: SkillType; experienceLevel: ExperienceLevel }> }): Promise<Profile> {
  const { error: profileError } = await supabase.from('profiles').update({ full_name: values.fullName, bio: values.bio, zip_code: values.zipCode }).eq('id', profile.id);
  if (profileError) throw new Error(`Unable to update profile: ${profileError.message}`);
  const { error: deleteError } = await supabase.from('user_skills').delete().eq('profile_id', profile.id);
  if (deleteError) throw new Error(`Unable to replace skills: ${deleteError.message}`);
  if (values.selections.length > 0) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rows = values.selections.map((item, index) => ({
      id: `US-${date}-${String(index + 1).padStart(3, '0')}`,
      profile_id: profile.id,
      skill_id: item.skillId,
      skill_type: item.skillType,
      experience_level: item.experienceLevel,
    }));
    const { error: skillError } = await supabase.from('user_skills').insert(rows);
    if (skillError) throw new Error(`Unable to save skills: ${skillError.message}`);
  }
  return getProfileForUser(profile.auth_id ?? '');
}

export async function getProfileForUser(authId: string, email?: string, fullName?: string): Promise<Profile> {
  const select = 'id,auth_id,full_name,email,bio,zip_code,created_at,user_skills(id,profile_id,skill_id,skill_type,experience_level,skills(id,name,category))';
  const { data: linkedProfile, error: linkedError } = await supabase.from('profiles').select(select).eq('auth_id', authId).maybeSingle();
  if (linkedError) throw new Error(`Unable to load your profile: ${linkedError.message}`);
  if (linkedProfile) return normalizeProfile(linkedProfile);
  if (!email) throw new Error('Your account has no linked profile.');

  const { data: emailProfile, error: emailError } = await supabase.from('profiles').select(select).eq('email', email).maybeSingle();
  if (emailError) throw new Error(`Unable to find your profile: ${emailError.message}`);
  if (emailProfile) {
    const { data: linked, error: linkError } = await supabase.from('profiles').update({ auth_id: authId }).eq('id', emailProfile.id).select(select).single();
    if (linkError) throw new Error(`Unable to link your profile: ${linkError.message}`);
    return normalizeProfile(linked);
  }

  const { data: created, error: createError } = await supabase.from('profiles').insert({
    auth_id: authId,
    full_name: fullName?.trim() || email.split('@')[0],
    email,
    bio: '',
    zip_code: '1000',
  }).select(select).single();
  if (createError) throw new Error(`Unable to create your profile: ${createError.message}`);
  return normalizeProfile(created);
}

function normalizeProfile(value: Record<string, unknown>): Profile {
  const rawSkills = Array.isArray(value.user_skills) ? value.user_skills : [];
  const user_skills = rawSkills.map((item) => {
    const mapping = item as Record<string, unknown>;
    return {
      id: String(mapping.id),
      profile_id: String(mapping.profile_id),
      skill_id: Number(mapping.skill_id),
      skill_type: mapping.skill_type,
      experience_level: mapping.experience_level,
      skill: mapping.skills ?? null,
    } as UserSkill;
  });
  return { ...value, user_skills } as Profile;
}
