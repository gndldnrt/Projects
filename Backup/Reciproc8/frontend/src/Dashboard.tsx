import { useState } from 'react';
import { Bell, Check, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import type { LocalProfile, Profile } from './types';
import { useLocalProfiles } from './useLocalProfiles';
import { Phase3MatchesPanel } from './Phase3MatchesPanel';
import { SwapRequestsPanel } from './SwapRequestsPanel';
import { RadiusFilter } from './RadiusFilter';
import { createSwapRequest } from './supabaseClient';
import { ProfileEditor } from './ProfileEditor';
import { FriendsPanel, type FriendRequest } from './FriendsPanel';
import { ChatWindow } from './ChatWindow';

export function Dashboard({ profile }: { profile: Profile }) {
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [activeFriend, setActiveFriend] = useState<FriendRequest | null>(null);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState('');
  const [requested, setRequested] = useState<string[]>([]);
  const localProfiles = useLocalProfiles(currentProfile.zip_code);
  const displayedProfiles = localProfiles.data;

  async function requestSwap(candidate: LocalProfile) {
    try {
      await createSwapRequest(currentProfile.id, candidate.id);
      setRequested((current) => [...current, candidate.id]);
      setToast(`Swap request sent to ${candidate.full_name}`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to send swap request');
    }
    window.setTimeout(() => setToast(''), 3000);
  }

  const userSkills = currentProfile.user_skills ?? [];
  const initials = currentProfile.full_name.split(' ').map((name) => name[0]).join('').slice(0, 2);
  const activeFriendId = activeFriend?.friend?.id;

  return <main className="min-h-screen bg-[#0b0f12] text-slate-100">
    <nav className="mx-auto flex max-w-[1600px] items-center justify-between border-b border-white/[0.06] px-5 py-4">
      <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_#6ee7b7]" /> RECIPROC8</div>
      <div className="flex items-center gap-3"><button className="rounded-full border border-white/10 p-2 text-slate-400"><Bell size={17} /></button><div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-violet-400 text-sm font-bold text-slate-950">{initials}</div></div>
    </nav>

    <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 lg:grid-cols-[250px_minmax(0,1fr)_300px]">
      <aside className="flex min-h-[calc(100vh-105px)] flex-col gap-5 rounded-2xl border border-white/[0.07] bg-[#10161b] p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-105px)]">
        <div>
          <div className="mb-4 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-300 to-cyan-400 font-bold text-slate-950">{initials}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{currentProfile.full_name}</p><p className="flex items-center gap-1 text-xs text-slate-500"><MapPin size={11} /> {currentProfile.zip_code} · Philippines</p></div></div>
          <p className="rounded-xl bg-black/20 p-3 text-xs leading-5 text-slate-400">{currentProfile.bio || 'Add a short bio to help nearby hobbyists get to know you.'}</p>
          <div className="mt-4 space-y-3"><SkillSummary label="Teaching" color="emerald" skills={userSkills.filter((item) => item.skill_type === 'teach').map((item) => item.skill?.name ?? `Skill ${item.skill_id}`)} /><SkillSummary label="Learning" color="violet" skills={userSkills.filter((item) => item.skill_type === 'learn').map((item) => item.skill?.name ?? `Skill ${item.skill_id}`)} /></div>
          <button onClick={() => setEditing(true)} className="mt-5 w-full rounded-xl bg-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-950">Edit profile</button>
        </div>
        <div className="min-h-0 flex-1 border-t border-white/[0.07] pt-4"><FriendsPanel profileId={currentProfile.id} activeFriendId={activeFriendId} onSelect={setActiveFriend} /></div>
      </aside>

      <section className="flex min-w-0 flex-col gap-4">
        <header className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-[#10161b] p-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Community workspace</p><h1 className="mt-1 text-2xl font-semibold">{activeFriend?.friend ? `Chat with ${activeFriend.friend.full_name}` : 'Your local circle'}</h1></div><div className="flex gap-2"><button className="rounded-xl border border-white/10 p-2.5 text-slate-400"><SlidersHorizontal size={16} /></button><button className="rounded-xl border border-white/10 p-2.5 text-slate-400"><Search size={16} /></button></div></header>
        <SwapRequestsPanel profileId={currentProfile.id} />
        {activeFriend?.friend ? <ChatWindow swapRequestId={activeFriend.id} currentProfileId={currentProfile.id} otherProfileId={activeFriend.friend.id} /> : <section className="flex min-h-[430px] flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#10161b] p-8 text-center"><div><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-300"><Check /></div><h2 className="text-lg font-medium">Choose a friend to start chatting</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Accepted swap partners appear in the left column. Select one to open your realtime conversation.</p></div></section>}
        {!activeFriend && <DiscoveryProfiles profiles={displayedProfiles} onRequest={requestSwap} requested={requested} />}
      </section>

      <aside className="space-y-4">
        <RadiusFilter profileId={currentProfile.id} />
        <Phase3MatchesPanel profileId={currentProfile.id} compact />
      </aside>
    </div>
    {localProfiles.error && <div className="fixed bottom-5 right-5 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{localProfiles.error}</div>}
    {toast && <div className="fixed bottom-5 right-5 rounded-xl border border-emerald-300/20 bg-[#10221d] px-4 py-3 text-sm text-emerald-100">{toast}</div>}
    {editing && <ProfileEditor profile={currentProfile} onSaved={setCurrentProfile} onClose={() => setEditing(false)} />}
  </main>;
}

function SkillSummary({ label, color, skills }: { label: string; color: 'emerald' | 'violet'; skills: string[] }) {
  return <div><div className="mb-2 flex justify-between text-xs text-slate-500"><span>{label}</span><span className={color === 'emerald' ? 'text-emerald-300' : 'text-violet-300'}>{skills.length}</span></div><div className="flex flex-wrap gap-1.5">{skills.map((skill) => <span key={skill} className={`rounded-full border px-2 py-1 text-[11px] ${color === 'emerald' ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' : 'border-violet-400/25 bg-violet-400/10 text-violet-200'}`}>{skill}</span>)}</div></div>;
}

function DiscoveryProfiles({ profiles, onRequest, requested }: { profiles: LocalProfile[]; onRequest: (profile: LocalProfile) => void; requested: string[] }) {
  return <section className="rounded-2xl border border-white/[0.07] bg-[#10161b] p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-medium">Discover nearby hobbyists</h2><span className="text-xs text-slate-500">{profiles.length} found</span></div>{profiles.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No users found nearby. Try widening your search.</p> : <div className="grid gap-3 sm:grid-cols-2">{profiles.slice(0, 6).map((person) => <article key={person.id} className="rounded-xl border border-white/[0.07] p-4"><p className="font-medium">{person.full_name}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{person.bio}</p><button onClick={() => onRequest(person)} disabled={requested.includes(person.id)} className="mt-3 w-full rounded-lg bg-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-950">{requested.includes(person.id) ? 'Request sent' : 'Propose a swap'}</button></article>)}</div>}</section>;
}
