import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { getSkills, saveProfile } from './supabaseClient';
import type { ExperienceLevel, Profile, Skill, SkillType } from './types';

interface Props { profile: Profile; onSaved: (profile: Profile) => void; onClose: () => void }
interface Selection { skillId: number; skillType: SkillType; experienceLevel: ExperienceLevel }

export function ProfileEditor({ profile, onSaved, onClose }: Props) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [fullName, setFullName] = useState(profile.full_name);
  const [bio, setBio] = useState(profile.bio);
  const [zipCode, setZipCode] = useState(profile.zip_code);
  const [selections, setSelections] = useState<Selection[]>(() => (profile.user_skills ?? []).map((item) => ({ skillId: item.skill_id, skillType: item.skill_type, experienceLevel: item.experience_level })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { void getSkills().then(setSkills).catch((reason: Error) => setError(reason.message)); }, []);
  function toggle(skillId: number, skillType: SkillType) {
    setSelections((current) => current.some((item) => item.skillId === skillId && item.skillType === skillType)
      ? current.filter((item) => !(item.skillId === skillId && item.skillType === skillType))
      : [...current, { skillId, skillType, experienceLevel: 'beginner' }]);
  }
  async function save() {
    if (!fullName.trim() || !/^\d{4}$/.test(zipCode)) { setError('Enter a name and a valid four-digit Philippine ZIP code.'); return; }
    setSaving(true); setError('');
    try { onSaved(await saveProfile(profile, { fullName: fullName.trim(), bio, zipCode, selections })); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save profile.'); }
    finally { setSaving(false); }
  }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4"><section className="glass mx-auto my-8 max-w-3xl rounded-3xl p-6"><div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-semibold">Edit profile</h2><button onClick={onClose} aria-label="Close"><X /></button></div><div className="grid gap-4 md:grid-cols-2"><label className="text-sm text-slate-300">Full name<input className="input-field mt-2" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label><label className="text-sm text-slate-300">Philippine ZIP code<input className="input-field mt-2" maxLength={4} value={zipCode} onChange={(event) => setZipCode(event.target.value.replace(/\D/g, ''))} /></label></div><label className="mt-4 block text-sm text-slate-300">Bio<textarea className="input-field mt-2 min-h-24" value={bio} onChange={(event) => setBio(event.target.value)} /></label><div className="mt-6 grid gap-6 md:grid-cols-2">{(['teach', 'learn'] as SkillType[]).map((type) => <div key={type}><h3 className="mb-3 text-sm font-medium">{type === 'teach' ? 'Skills I teach' : 'Skills I want to learn'}</h3><div className="flex flex-wrap gap-2">{skills.map((skill) => { const selected = selections.find((item) => item.skillId === skill.id && item.skillType === type); return <button type="button" key={`${type}-${skill.id}`} onClick={() => toggle(skill.id, type)} className={`rounded-full border px-3 py-2 text-xs ${selected ? type === 'teach' ? 'border-emerald-300 bg-emerald-300/15 text-emerald-200' : 'border-violet-300 bg-violet-300/15 text-violet-200' : 'border-white/10 text-slate-400'}`}>{selected && <Check size={12} className="mr-1 inline" />}{skill.name}</button>; })}</div></div>)}</div>{error && <p className="mt-5 rounded-lg bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}<div className="mt-7 flex justify-end gap-3"><button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-400">Cancel</button><button disabled={saving} onClick={() => void save()} className="rounded-xl bg-emerald-300 px-5 py-2 text-sm font-semibold text-emerald-950">{saving ? 'Saving...' : 'Save profile'}</button></div></section></div>;
}
