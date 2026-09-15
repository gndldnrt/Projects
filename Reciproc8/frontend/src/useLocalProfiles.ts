import { useCallback, useEffect, useState } from 'react';
import type { ExperienceLevel, SkillType } from './types';

export interface LocalSkill {
  id: number;
  name: string;
  category: string;
}

export interface LocalUserSkill {
  id: string;
  profile_id: string;
  skill_id: number;
  skill_type: SkillType;
  experience_level: ExperienceLevel;
  skill: LocalSkill | null;
}

export interface LocalProfileResponse {
  id: string;
  auth_id: string | null;
  full_name: string;
  email: string;
  bio: string;
  zip_code: string;
  created_at: string;
  user_skills: LocalUserSkill[];
}

interface LocalProfilesResponse {
  profiles: LocalProfileResponse[];
  count: number;
  radius_miles: number;
}

interface UseLocalProfilesResult {
  loading: boolean;
  error: string | null;
  data: LocalProfileResponse[];
  count: number;
  radiusMiles: number;
  refresh: () => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export function useLocalProfiles(zipCode: string, radius = 25): UseLocalProfilesResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LocalProfileResponse[]>([]);
  const [count, setCount] = useState(0);
  const [radiusMiles, setRadiusMiles] = useState(radius);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/profiles/local?zip_code=${encodeURIComponent(zipCode)}&radius=${radius}`);
      if (!response.ok) throw new Error(`Local profile search failed (${response.status})`);
      const result = (await response.json()) as LocalProfilesResponse;
      setData(result.profiles);
      setCount(result.count);
      setRadiusMiles(result.radius_miles);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load local profiles');
    } finally {
      setLoading(false);
    }
  }, [radius, zipCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, error, data, count, radiusMiles, refresh };
}
