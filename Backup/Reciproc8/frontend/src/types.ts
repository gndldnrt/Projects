export type SkillType = 'teach' | 'learn';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type SwapStatus = 'pending' | 'accepted' | 'declined' | 'completed';
export type SwapRequestStatus = 'Pending' | 'Accepted' | 'Declined';

export interface Profile {
  id: string;
  auth_id: string | null;
  full_name: string;
  email: string;
  bio: string;
  zip_code: string;
  created_at: string;
  user_skills?: UserSkill[];
}

export interface Skill {
  id: number;
  name: string;
  category: string;
}

export interface UserSkill {
  id: string;
  profile_id: string;
  skill_id: number;
  skill_type: SkillType;
  experience_level: ExperienceLevel;
  skill?: Skill | null;
}

export interface Swap {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: SwapStatus;
  created_at: string;
}

export interface SwapRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: SwapRequestStatus;
  created_at: string;
  sender?: Pick<Profile, 'id' | 'full_name' | 'bio'>;
  receiver?: Pick<Profile, 'id' | 'full_name' | 'bio'>;
}

export interface ChatMessage {
  id: string;
  swap_request_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
}

export interface LocalProfile extends Profile {
  user_skills: UserSkill[];
  distance_miles?: number;
  match_score?: number;
}

export interface ProfileCreatePayload {
  id: string;
  auth_id: string | null;
  full_name: string;
  email: string;
  bio: string;
  zip_code: string;
  user_skills: Array<Pick<UserSkill, 'id' | 'skill_id' | 'skill_type' | 'experience_level'>>;
}
