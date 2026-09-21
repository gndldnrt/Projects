import { useEffect, useState } from 'react';
import { Check, Inbox, X } from 'lucide-react';
import { supabase } from './supabaseClient';
import type { SwapRequest } from './types';

interface Props { profileId: string }

export function SwapRequestsPanel({ profileId }: Props) {
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadRequests() {
    setLoading(true);
    const { data, error: requestError } = await supabase
      .from('swap_requests')
      .select('id,sender_id,receiver_id,status,created_at,sender:profiles!swap_requests_sender_id_fkey(id,full_name,bio),receiver:profiles!swap_requests_receiver_id_fkey(id,full_name,bio)')
      .or(`sender_id.eq.${profileId},receiver_id.eq.${profileId}`)
      .order('created_at', { ascending: false });
    if (requestError) setError(requestError.message);
    else setRequests((data ?? []).map((item) => ({
      ...item,
      sender: Array.isArray(item.sender) ? item.sender[0] : item.sender,
      receiver: Array.isArray(item.receiver) ? item.receiver[0] : item.receiver,
    })) as unknown as SwapRequest[]);
    setLoading(false);
  }

  useEffect(() => {
    void loadRequests();
    const channel = supabase.channel(`swap-requests:${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swap_requests' }, () => void loadRequests())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [profileId]);

  async function updateStatus(id: string, status: 'Accepted' | 'Declined') {
    const { error: updateError } = await supabase.from('swap_requests').update({ status }).eq('id', id).eq('status', 'Pending');
    if (updateError) setError(updateError.message);
    else setRequests((current) => current.map((request) => request.id === id ? { ...request, status } : request));
  }

  return <section className="glass rounded-2xl p-5">
    <div className="mb-4 flex items-center gap-2"><Inbox size={17} className="text-emerald-300" /><h2 className="font-medium">Swap requests</h2></div>
    {loading && <p className="text-sm text-slate-500">Loading requests...</p>}
    {error && <p className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
    {!loading && !error && requests.length === 0 && <p className="text-sm text-slate-500">No incoming requests yet. Your new requests will appear here in real time.</p>}
    <div className="space-y-3">{requests.map((request) => {
      const otherName = request.sender_id === profileId
        ? request.receiver?.full_name ?? 'Your swap partner'
        : request.sender?.full_name ?? 'A local hobbyist';
      return <div key={request.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm text-slate-200">{otherName}</p><p className="mt-1 text-xs text-slate-500">{request.status} · {new Date(request.created_at).toLocaleDateString()}</p></div>{request.status === 'Pending' && request.receiver_id === profileId && <div className="flex gap-2"><button onClick={() => void updateStatus(request.id, 'Accepted')} className="rounded-lg bg-emerald-300 p-2 text-emerald-950" aria-label="Accept request"><Check size={15} /></button><button onClick={() => void updateStatus(request.id, 'Declined')} className="rounded-lg border border-white/10 p-2 text-slate-300" aria-label="Decline request"><X size={15} /></button></div>}</div></div>;
    })}</div>
  </section>;
}
