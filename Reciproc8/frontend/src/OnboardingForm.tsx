import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, MapPin, Sparkles } from 'lucide-react';
import { getSkills } from './supabaseClient';
import type { Skill } from './types';
import type { ExperienceLevel, SkillType } from './types';

interface Selection { skillId: number; skillType: SkillType; experienceLevel: ExperienceLevel }
interface Props { onComplete: () => void }

const levels: ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];

export function OnboardingForm({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({ fullName: '', bio: '', zipCode: '' });
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void getSkills().then(setSkills).catch((loadError: Error) => setError(loadError.message));
  }, []);
  const selected = useMemo(() => (id: number, type: SkillType) => selections.find((item) => item.skillId === id && item.skillType === type), [selections]);

  function toggleSkill(skillId: number, skillType: SkillType) {
    setSelections((current) => {
      const existing = current.find((item) => item.skillId === skillId && item.skillType === skillType);
      return existing ? current.filter((item) => item !== existing) : [...current, { skillId, skillType, experienceLevel: 'beginner' }];
    });
  }
  function updateLevel(skillId: number, skillType: SkillType, experienceLevel: ExperienceLevel) {
    setSelections((current) => current.map((item) => item.skillId === skillId && item.skillType === skillType ? { ...item, experienceLevel } : item));
  }
  function next() {
    if (!profile.fullName.trim() || !/^\d{4}$/.test(profile.zipCode)) { setError('Add your name and a valid 4-digit Philippine ZIP code to continue.'); return; }
    setError(''); setStep(2);
  }
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]" />
      <section className="glass relative w-full max-w-4xl rounded-[2rem] p-6 sm:p-10">
        <header className="mb-10 flex items-center justify-between">
          <div><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300"><Sparkles size={16} /> LOCAL / HOBBYIST</div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Find your people.<br /><span className="text-slate-500">Swap what you love.</span></h1></div>
          <div className="hidden text-right sm:block"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Step {step} of 2</div><div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${step * 50}%` }} /></div></div>
        </header>
        {step === 1 ? <div className="grid gap-8 md:grid-cols-[1.1fr_.9fr]">
          <div><p className="mb-7 max-w-md text-slate-400">A few details help us surface kindred hobbyists close to you.</p><div className="space-y-5">
            <label className="block text-sm font-medium text-slate-300">Full name<input className="input-field mt-2" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} placeholder="Alex Mercer" /></label>
            <label className="block text-sm font-medium text-slate-300">Short bio<span className="ml-2 text-xs text-slate-600">optional</span><textarea className="input-field mt-2 min-h-28 resize-none" value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder="What are you curious about?" /></label>
            <label className="block text-sm font-medium text-slate-300">Philippine ZIP code<div className="relative mt-2"><MapPin className="absolute left-4 top-3.5 text-slate-500" size={17} /><input className="input-field pl-11" value={profile.zipCode} maxLength={4} onChange={(event) => setProfile({ ...profile, zipCode: event.target.value.replace(/\D/g, '') })} placeholder="1000" /></div></label>
          </div></div>
          <div className="flex flex-col justify-between rounded-2xl border border-white/[0.07] bg-black/20 p-6"><div><div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300"><MapPin /></div><h2 className="text-lg font-medium">Your local circle</h2><p className="mt-2 text-sm leading-6 text-slate-500">We only use your ZIP to estimate distance. Your exact location is never shown.</p></div><div className="mt-10 border-t border-white/[0.07] pt-5 text-xs text-slate-500">Private by design · Built for real-world connection</div></div>
        </div> : <div><p className="mb-7 max-w-2xl text-slate-400">Choose a few skills to teach or learn. You can fine-tune your experience level after selecting a skill.</p><div className="grid gap-8 md:grid-cols-2">
          {(['teach', 'learn'] as SkillType[]).map((type) => <div key={type}><div className="mb-4 flex items-center justify-between"><h2 className="font-medium">{type === 'teach' ? 'Skills I can teach' : 'Skills I want to learn'}</h2><span className={`text-xs ${type === 'teach' ? 'text-emerald-300' : 'text-violet-300'}`}>{selections.filter((item) => item.skillType === type).length} selected</span></div><div className="grid gap-2 sm:grid-cols-2">{skills.map((skill) => { const item = selected(skill.id, type); return <div key={`${type}-${skill.id}`} className={`rounded-xl border p-3 transition ${item ? type === 'teach' ? 'border-emerald-400/60 bg-emerald-400/[0.08]' : 'border-violet-400/60 bg-violet-400/[0.08]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'}`}><button type="button" onClick={() => toggleSkill(skill.id, type)} className="flex w-full items-center justify-between text-left text-sm"><span>{skill.name}</span><span className={`flex h-5 w-5 items-center justify-center rounded-full border ${item ? type === 'teach' ? 'border-emerald-300 bg-emerald-300 text-black' : 'border-violet-300 bg-violet-300 text-black' : 'border-white/20'}`}>{item && <Check size={13} />}</span></button>{item && <div className="relative mt-3"><select value={item.experienceLevel} onChange={(event) => updateLevel(skill.id, type, event.target.value as ExperienceLevel)} className="w-full appearance-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs capitalize text-slate-300 outline-none"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select><ChevronDown className="pointer-events-none absolute right-2 top-2.5 text-slate-500" size={14} /></div>}</div> })}</div></div>)}
        </div></div>}
        {error && <p className="mt-6 rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
        <footer className="mt-10 flex items-center justify-between border-t border-white/[0.07] pt-6"><span className="text-xs text-slate-600">{step === 1 ? 'Takes less than a minute' : 'You can always edit this later'}</span>{step === 1 ? <button onClick={next} className="flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200">Continue <ArrowRight size={16} /></button> : <div className="flex gap-3"><button onClick={() => setStep(1)} className="rounded-xl px-4 py-3 text-sm text-slate-400 hover:text-white">Back</button><button onClick={onComplete} className="flex items-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200">See my matches <ArrowRight size={16} /></button></div>}</footer>
      </section>
    </main>
  );
}
