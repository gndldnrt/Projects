import { FormEvent, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from './supabaseClient';
import type { ChatMessage } from './types';

interface Props { swapRequestId: string; currentProfileId: string; otherProfileId: string }

export function ChatWindow({ swapRequestId, currentProfileId, otherProfileId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void supabase.from('messages').select('*').eq('swap_request_id', swapRequestId).order('created_at').then(({ data, error: loadError }) => {
      if (active) { if (loadError) setError(loadError.message); else setMessages((data ?? []) as ChatMessage[]); }
    });
    const channel = supabase.channel(`chat:${swapRequestId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `swap_request_id=eq.${swapRequestId}` }, (payload) => setMessages((current) => [...current, payload.new as ChatMessage]))
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [swapRequestId]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    const { error: sendError } = await supabase.from('messages').insert({ swap_request_id: swapRequestId, sender_id: currentProfileId, receiver_id: otherProfileId, body: trimmed });
    if (sendError) setError(sendError.message);
    else setBody('');
  }

  return <section className="glass rounded-2xl p-5"><h2 className="mb-4 font-medium">Swap chat</h2><div className="mb-4 max-h-64 space-y-2 overflow-y-auto">{messages.map((message) => <div key={message.id} className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${message.sender_id === currentProfileId ? 'ml-auto bg-emerald-300 text-emerald-950' : 'bg-white/[0.07] text-slate-200'}`}>{message.body}</div>)}</div>{error && <p className="mb-3 text-xs text-rose-200">{error}</p>}<form onSubmit={sendMessage} className="flex gap-2"><input value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} className="input-field" placeholder="Write a message..." /><button className="rounded-xl bg-emerald-300 px-4 text-emerald-950" aria-label="Send message"><Send size={16} /></button></form></section>;
}
