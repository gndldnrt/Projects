import { useEffect, useState } from 'react';
import { MessageCircle, UserRoundCheck } from 'lucide-react';
import { supabase } from './supabaseClient';
import type { Profile, SwapRequest } from './types';

export type FriendRequest = SwapRequest & {
  friend?: Pick<Profile, 'id' | 'full_name' | 'bio' | 'zip_code'>;
};

interface Props {
  profileId: string;
  activeFriendId?: string;
  onSelect: (friend: FriendRequest) => void;
}

export function FriendsPanel({ profileId, activeFriendId, onSelect }: Props) {
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [error, setError] = useState('');

  async function loadFriends() {
    const { data, error: queryError } = await supabase
      .from('swap_requests')
      .select('id,sender_id,receiver_id,status,created_at,sender:profiles!swap_requests_sender_id_fkey(id,full_name,bio,zip_code),receiver:profiles!swap_requests_receiver_id_fkey(id,full_name,bio,zip_code)')
      .eq('status', 'Accepted')
      .or(`sender_id.eq.${profileId},receiver_id.eq.${profileId}`)
      .order('created_at', { ascending: false });
    if (queryError) {
      setError(queryError.message);
      return;
    }
    setFriends((data ?? []).map((row) => {
      const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;
      const receiver = Array.isArray(row.receiver) ? row.receiver[0] : row.receiver;
      return { ...row, sender, receiver, friend: row.sender_id === profileId ? receiver : sender };
    }) as unknown as FriendRequest[]);
  }

  useEffect(() => {
    void loadFriends();
    const channel = supabase.channel(`accepted-swaps:${profileId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'swap_requests' }, () => void loadFriends())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [profileId]);

  return <section className="flex min-h-0 flex-col">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200"><UserRoundCheck size={16} className="text-emerald-300" /> Friends</h2>
      <span className="text-xs text-slate-500">{friends.length}</span>
    </div>
    {error && <p className="text-xs text-rose-200">{error}</p>}
    {!error && friends.length === 0 && <p className="text-xs leading-5 text-slate-500">Accepted swap partners appear here.</p>}
    <div className="min-h-0 space-y-1 overflow-y-auto pr-1">
      {friends.map((friend) => {
        const friendId = friend.friend?.id;
        const active = friendId === activeFriendId;
        return <button key={friend.id} type="button" onClick={() => onSelect(friend)} className={`group flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${active ? 'bg-emerald-300/10 ring-1 ring-emerald-300/30' : 'hover:bg-white/[0.06]'}`}>
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-violet-400 text-xs font-bold text-slate-950">{friend.friend?.full_name.split(' ').map((name) => name[0]).join('').slice(0, 2)}<span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0b0f12] bg-emerald-400" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm text-slate-200">{friend.friend?.full_name ?? 'Friend'}</span><span className="block truncate text-xs text-slate-500">Active swap</span></span>
          <MessageCircle size={16} className={active ? 'text-emerald-300' : 'text-slate-600 group-hover:text-slate-300'} />
        </button>;
      })}
    </div>
  </section>;
}
