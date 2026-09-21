import { useEffect, useState } from 'react';
import { AuthScreen } from './AuthScreen';
import { Dashboard } from './Dashboard';
import { getProfileForUser, MOCK_AUTH_MODE, supabase } from './supabaseClient';
import type { Profile } from './types';

export function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkingSession, setCheckingSession] = useState(!MOCK_AUTH_MODE);
  const [profileError, setProfileError] = useState('');

  async function loadAuthenticatedProfile(emailHint?: string, nameHint?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const metadataName = typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : undefined;
      setProfile(await getProfileForUser(
        user.id,
        emailHint ?? user.email,
        nameHint ?? metadataName,
      ));
      setProfileError('');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Your account has no linked profile.');
    }
  }

  useEffect(() => {
    if (MOCK_AUTH_MODE) return;
    void loadAuthenticatedProfile().finally(() => setCheckingSession(false));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void loadAuthenticatedProfile();
      else setProfile(null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (checkingSession) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Checking your session...</div>;
  if (profileError) return <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-rose-200">{profileError} Update your profile.auth_id in Supabase before continuing.</div>;
  if (!profile) return <AuthScreen onAuthenticated={loadAuthenticatedProfile} />;
  return <Dashboard profile={profile} />;
}
