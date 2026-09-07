import React, { useState, useEffect, useRef } from 'react';
import {
  Hash, Lock, Plus, Send, MessageSquare, Loader2,
  MoreVertical, Pencil, Trash2, LogOut, Users, X, Check, UserPlus,
} from 'lucide-react';
import { apiService } from '../../services/api';
import { useSocket, useChannelSocket } from '../../hooks/useSocket';
import { Channel, ChannelMessage } from '../../types';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { formatDateTime } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface ChannelsViewProps {
  workspaceId: string;
}

export const ChannelsView: React.FC<ChannelsViewProps> = ({ workspaceId }) => {
  const { user } = useAuth();

  // ── Channels state ─────────────────────────────────────────────────────────
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  // ── Messages state ─────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // ── Edit message state ─────────────────────────────────────────────────────
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageBody, setEditingMessageBody] = useState('');

  // ── Members state ──────────────────────────────────────────────────────────
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showAddMemberInput, setShowAddMemberInput] = useState(false);

  // ── Channel CRUD modals ────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [isCreating, setIsCreating] = useState(false);

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [openChannelMenu, setOpenChannelMenu] = useState<string | null>(null);
  const [openMessageMenu, setOpenMessageMenu] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Keep a ref to activeChannel so socket handlers always see the latest value
  const activeChannelRef = useRef<Channel | null>(null);
  activeChannelRef.current = activeChannel;
  // Cache messages per channel — avoids re-fetching from REST when switching back
  const messagesCacheRef = useRef<Map<string, ChannelMessage[]>>(new Map());

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Close menus on outside click ───────────────────────────────────────────
  useEffect(() => {
    const close = () => { setOpenChannelMenu(null); setOpenMessageMenu(null); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ── Load channels ──────────────────────────────────────────────────────────
  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const list = await apiService.getChannels(workspaceId);
      const sorted = (list ?? []).sort((a, b) =>
        (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
      );
      setChannels(sorted);
      setActiveChannel(prev => prev ?? (sorted.length > 0 ? sorted[0] : null));
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de charger les canaux');
    } finally {
      setIsLoadingChannels(false);
    }
  };

  useEffect(() => { if (workspaceId) loadChannels(); }, [workspaceId]);

  // ── WebSocket: real-time messages ─────────────────────────────────────────
  // ── WebSocket: real-time messages ─────────────────────────────────────────
  useChannelSocket(activeChannel?.id ?? null, {
    'message.created': (msg: ChannelMessage) => {
      if (msg.channelId !== activeChannelRef.current?.id) return;
      setMessages(prev => {
        // Prevent duplicates - check if message already exists
        if (prev.some(m => m.id === msg.id)) {
          return prev;
        }
        
        // Add new message
        const next = [...prev, msg];
        messagesCacheRef.current.set(msg.channelId, next);
        return next;
      });
    },
    'message.updated': (msg: ChannelMessage) => {
      if (msg.channelId !== activeChannelRef.current?.id) return;
      setMessages(prev => {
        const next = prev.map(m => m.id === msg.id ? msg : m);
        messagesCacheRef.current.set(msg.channelId, next);
        return next;
      });
    },
    'message.deleted': (payload: { id: string; channelId: string }) => {
      if (payload.channelId !== activeChannelRef.current?.id) return;
      setMessages(prev => {
        const next = prev.filter(m => m.id !== payload.id);
        messagesCacheRef.current.set(payload.channelId, next);
        return next;
      });
    },
  });

  // ── Load messages on channel change (no polling needed — socket handles live updates) ──
  const loadMessages = async (channelId: string) => {
    // If we already have cached messages for this channel, use them instantly
    if (messagesCacheRef.current.has(channelId)) {
      setMessages(messagesCacheRef.current.get(channelId)!);
      return; // skip REST call
    }
    setIsLoadingMessages(true);
    try {
      const res: any = await apiService.getChannelMessages(channelId);
      const raw: ChannelMessage[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.messages) ? res.messages : [];
      const sorted = raw.slice().reverse();
      messagesCacheRef.current.set(channelId, sorted); // store in cache
      setMessages(sorted);
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de charger les messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!activeChannel) return;
    loadMessages(activeChannel.id);
    // No polling — socket handles live updates
  }, [activeChannel]);

  // ── Load members ───────────────────────────────────────────────────────────
  const loadMembers = async (channelId: string) => {
    setIsLoadingMembers(true);
    try {
      const list = await apiService.getChannelMembers(channelId);
      setMembers(list ?? []);
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de charger les membres');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleToggleMembers = () => {
    if (!showMembersPanel && activeChannel) loadMembers(activeChannel.id);
    setShowMembersPanel(v => !v);
  };

  // ── Create channel ─────────────────────────────────────────────────────────
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setIsCreating(true);
    try {
      const ch = await apiService.createChannel(workspaceId, {
        name: newChannelName.trim(),
        type: newChannelType,
      });
      toast.success(`#${ch.name} créé`);
      setChannels(prev => [...prev, ch].sort((a, b) =>
        (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
      ));
      setActiveChannel(ch);
      setNewChannelName('');
      setNewChannelType('PUBLIC');
      setShowCreateModal(false);
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de créer le canal');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Rename channel ─────────────────────────────────────────────────────────
  const handleRenameChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameValue.trim() || !activeChannel) return;
    setIsRenaming(true);
    try {
      await apiService.updateChannel(activeChannel.id, { name: renameValue.trim() });
      const updated = { ...activeChannel, name: renameValue.trim() };
      setChannels(prev => prev.map(c => c.id === activeChannel.id ? updated : c));
      setActiveChannel(updated);
      toast.success('Canal renommé');
      setShowRenameModal(false);
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de renommer le canal');
    } finally {
      setIsRenaming(false);
    }
  };

  // ── Delete channel ─────────────────────────────────────────────────────────
  const handleDeleteChannel = async () => {
    if (!activeChannel) return;
    setIsDeleting(true);
    try {
      await apiService.deleteChannel(activeChannel.id);
      messagesCacheRef.current.delete(activeChannel.id); // clear cache
      const remaining = channels.filter(c => c.id !== activeChannel.id);
      setChannels(remaining);
      setActiveChannel(remaining[0] ?? null);
      setMessages([]);
      toast.success('Canal supprimé');
      setShowDeleteConfirm(false);
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de supprimer le canal');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Leave channel ──────────────────────────────────────────────────────────
  const handleLeaveChannel = async () => {
    if (!activeChannel) return;
    try {
      await apiService.leaveChannel(activeChannel.id);
      const remaining = channels.filter(c => c.id !== activeChannel.id);
      setChannels(remaining);
      setActiveChannel(remaining[0] ?? null);
      setMessages([]);
      toast.success('Vous avez quitté le canal');
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de quitter le canal');
    }
  };

  // ── Add member ─────────────────────────────────────────────────────────────
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMemberEmail.trim() || !activeChannel) return;
    setIsAddingMember(true);
    try {
      await apiService.addChannelMember(activeChannel.id, { userId: addMemberEmail.trim() });
      toast.success('Membre ajouté');
      setAddMemberEmail('');
      setShowAddMemberInput(false);
      loadMembers(activeChannel.id);
    } catch (err: any) {
      toast.error(err?.message || 'Impossible d\'ajouter le membre');
    } finally {
      setIsAddingMember(false);
    }
  };

  // ── Remove member ──────────────────────────────────────────────────────────
  const handleRemoveMember = async (userId: string) => {
    if (!activeChannel) return;
    try {
      await apiService.removeChannelMember(activeChannel.id, userId);
      setMembers(prev => prev.filter(m => (m.id ?? m.userId) !== userId));
      toast.success('Membre retiré');
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de retirer le membre');
    }
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim() || !activeChannel) return;
    setIsSending(true);
    const body = messageBody.trim();
    setMessageBody('');
    
    try {
      // Just send to backend - WebSocket will add it when backend broadcasts
      await apiService.createChannelMessage(activeChannel.id, { body });
      // No optimistic update - wait for WebSocket event
    } catch (err: any) {
      toast.error(err?.message || 'Impossible d\'envoyer le message');
      setMessageBody(body); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  // ── Edit message ───────────────────────────────────────────────────────────
  const handleEditMessage = async (msg: ChannelMessage) => {
    if (!editingMessageBody.trim() || !activeChannel) return;
    try {
      const updated = await apiService.updateMessage(activeChannel.id, msg.id, { body: editingMessageBody.trim() });
      setMessages(prev => prev.map(m => m.id === msg.id ? updated : m));
      setEditingMessageId(null);
      toast.success('Message modifié');
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de modifier le message');
    }
  };

  // ── Delete message ─────────────────────────────────────────────────────────
  const handleDeleteMessage = async (msgId: string) => {
    if (!activeChannel) return;
    try {
      await apiService.deleteMessage(activeChannel.id, msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      toast.success('Message supprimé');
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de supprimer le message');
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getSender = (m: ChannelMessage) => (m as any).sender ?? m.author;
  const getSenderName = (m: ChannelMessage) => {
    const s = getSender(m);
    if (!s) return 'Inconnu';
    return [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || 'Inconnu';
  };
  const isOwnMessage = (m: ChannelMessage) => {
    const id = (m as any).sender?.id ?? m.author?.id ?? m.authorId;
    return id === user?.id;
  };

  const isChannelCreator = (ch: Channel) => (ch as any).creatorId === user?.id;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-200px)]">

      {/* ── Channels sidebar ── */}
      <div className="p-4 rounded-2xl bg-[var(--sp-surface)] border border-[var(--sp-border)] flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--sp-text-secondary)] flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-violet-500" />
            Canaux
          </h3>
          <button onClick={() => setShowCreateModal(true)}
            className="p-1 rounded-lg text-[var(--sp-text-muted)] hover:text-[var(--sp-text)] hover:bg-[var(--sp-surface-2)] transition cursor-pointer"
            title="Nouveau canal">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-0.5">
          {isLoadingChannels ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-[var(--sp-text-disabled)] mb-2">Aucun canal</p>
              <button onClick={() => setShowCreateModal(true)}
                className="text-xs text-violet-400 hover:underline cursor-pointer">
                Créer un canal
              </button>
            </div>
          ) : (
            channels.map((ch) => (
              <div key={ch.id} className="relative group">
                <button
                  onClick={() => { setActiveChannel(ch); setShowMembersPanel(false); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                    activeChannel?.id === ch.id
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg'
                      : 'text-[var(--sp-text-muted)] hover:text-[var(--sp-text)] hover:bg-[var(--sp-surface-2)]'
                  }`}
                >
                  {ch.type === 'PRIVATE'
                    ? <Lock className="w-3.5 h-3.5 shrink-0" />
                    : <Hash className="w-3.5 h-3.5 shrink-0" />
                  }
                  <span className="truncate flex-1">{ch.name}</span>
                </button>

                {/* Per-channel context menu */}
                {activeChannel?.id === ch.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenChannelMenu(openChannelMenu === ch.id ? null : ch.id); }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                )}

                {openChannelMenu === ch.id && (
                  <div onClick={e => e.stopPropagation()}
                    className="absolute left-0 top-full mt-1 z-50 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                    <button onClick={() => { setRenameValue(ch.name); setShowRenameModal(true); setOpenChannelMenu(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
                      <Pencil className="w-3.5 h-3.5" /> Renommer
                    </button>
                    <button onClick={() => { setShowMembersPanel(true); setOpenChannelMenu(null); if (activeChannel) loadMembers(activeChannel.id); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition">
                      <Users className="w-3.5 h-3.5" /> Membres
                    </button>
                    <button onClick={() => { handleLeaveChannel(); setOpenChannelMenu(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer transition">
                      <LogOut className="w-3.5 h-3.5" /> Quitter
                    </button>
                    <button onClick={() => { setShowDeleteConfirm(true); setOpenChannelMenu(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 cursor-pointer transition">
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div className={`${showMembersPanel ? 'md:col-span-2' : 'md:col-span-3'} rounded-2xl bg-[var(--sp-surface)] border border-[var(--sp-border)] flex flex-col overflow-hidden transition-all`}>
        {!activeChannel ? (
          <div className="flex-1 flex items-center justify-center text-xs text-[var(--sp-text-disabled)]">
            Sélectionnez un canal pour commencer
          </div>
        ) : (
          <>
            {/* Channel header */}
            <div className="px-4 py-3 border-b border-[var(--sp-border)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {activeChannel.type === 'PRIVATE'
                  ? <Lock className="w-4 h-4 text-amber-400" />
                  : <Hash className="w-4 h-4 text-violet-400" />
                }
                <h3 className="font-bold text-sm text-[var(--sp-text)]">{activeChannel.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handleToggleMembers}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${showMembersPanel ? 'bg-violet-600 text-white' : 'text-[var(--sp-text-muted)] hover:bg-[var(--sp-surface-2)]'}`}>
                  <Users className="w-3.5 h-3.5" />
                  Membres
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-xs text-[var(--sp-text-disabled)] text-center py-10">
                  Soyez le premier à envoyer un message dans #{activeChannel.name} !
                </p>
              ) : (
                messages.map((m) => {
                  const own = isOwnMessage(m);
                  const sender = getSender(m);
                  const isEditing = editingMessageId === m.id;

                  return (
                    <div key={m.id} className={`group flex items-end gap-2 ${own ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!own && (
                        <Avatar src={sender?.avatarUrl} firstName={sender?.firstName}
                          lastName={sender?.lastName} email={sender?.email} size="sm" />
                      )}

                      <div className={`flex flex-col gap-0.5 max-w-[70%] ${own ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-center gap-2 ${own ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-xs font-bold text-[var(--sp-text)]">
                            {own ? 'Vous' : getSenderName(m)}
                          </span>
                          <span className="text-[10px] text-[var(--sp-text-disabled)]">
                            {formatDateTime(m.createdAt)}
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-1 w-full min-w-[200px]">
                            <input
                              autoFocus
                              value={editingMessageBody}
                              onChange={e => setEditingMessageBody(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleEditMessage(m);
                                if (e.key === 'Escape') setEditingMessageId(null);
                              }}
                              className="flex-1 rounded-lg bg-[var(--sp-surface-2)] border border-violet-500/50 text-xs px-2.5 py-1.5 text-[var(--sp-text)] focus:outline-none"
                            />
                            <button onClick={() => handleEditMessage(m)}
                              className="p-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 cursor-pointer">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingMessageId(null)}
                              className="p-1.5 rounded-lg text-[var(--sp-text-muted)] hover:bg-[var(--sp-surface-2)] cursor-pointer">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                              own
                                ? 'bg-violet-600 text-white rounded-br-sm'
                                : 'bg-[var(--sp-surface-2)] text-[var(--sp-text)] border border-[var(--sp-border)] rounded-bl-sm'
                            }`}>
                              {m.body}
                              {(m as any).updatedAt && (m as any).updatedAt !== m.createdAt && (
                                <span className="text-[10px] opacity-60 ml-1">(modifié)</span>
                              )}
                            </div>

                            {/* Message actions */}
                            {own && (
                              <div className={`absolute top-0 -left-16 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition`}>
                                <button onClick={(e) => { e.stopPropagation(); setEditingMessageId(m.id); setEditingMessageBody(m.body); setOpenMessageMenu(null); }}
                                  className="p-1.5 rounded-lg text-[var(--sp-text-muted)] hover:text-violet-400 hover:bg-[var(--sp-surface-2)] cursor-pointer transition">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(m.id); }}
                                  className="p-1.5 rounded-lg text-[var(--sp-text-muted)] hover:text-rose-400 hover:bg-[var(--sp-surface-2)] cursor-pointer transition">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSendMessage}
              className="flex gap-2 px-4 py-3 border-t border-[var(--sp-border)] shrink-0">
              <input
                type="text"
                placeholder={`Message #${activeChannel.name}...`}
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e as any); }
                }}
                className="flex-1 rounded-xl bg-[var(--sp-surface-2)] border border-[var(--sp-border)] text-xs px-3.5 py-2.5 text-[var(--sp-text)] placeholder-[var(--sp-text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
              <Button variant="primary" size="sm" type="submit" isLoading={isSending}
                icon={<Send className="w-3.5 h-3.5" />}>
                Envoyer
              </Button>
            </form>
          </>
        )}
      </div>

      {/* ── Members panel ── */}
      {showMembersPanel && activeChannel && (
        <div className="rounded-2xl bg-[var(--sp-surface)] border border-[var(--sp-border)] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--sp-border)] flex items-center justify-between shrink-0">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--sp-text-secondary)]">
              Membres
            </h4>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowAddMemberInput(v => !v)}
                className="p-1.5 rounded-lg text-[var(--sp-text-muted)] hover:text-violet-400 hover:bg-[var(--sp-surface-2)] cursor-pointer transition"
                title="Ajouter un membre">
                <UserPlus className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setShowMembersPanel(false)}
                className="p-1.5 rounded-lg text-[var(--sp-text-muted)] hover:text-[var(--sp-text)] hover:bg-[var(--sp-surface-2)] cursor-pointer transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {showAddMemberInput && (
            <form onSubmit={handleAddMember} className="px-3 py-2 border-b border-[var(--sp-border)] flex gap-1.5">
              <input
                autoFocus
                type="text"
                placeholder="User ID ou email..."
                value={addMemberEmail}
                onChange={e => setAddMemberEmail(e.target.value)}
                className="flex-1 rounded-lg bg-[var(--sp-surface-2)] border border-[var(--sp-border)] text-xs px-2.5 py-1.5 text-[var(--sp-text)] placeholder-[var(--sp-text-muted)] focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              />
              <button type="submit" disabled={isAddingMember}
                className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 transition">
                {isAddingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
            </form>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-xs text-[var(--sp-text-disabled)] text-center py-4">Aucun membre</p>
            ) : (
              members.map((m: any) => {
                const memberId = m.id ?? m.userId;
                const name = [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email || 'Inconnu';
                const isSelf = memberId === user?.id;
                return (
                  <div key={memberId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--sp-surface-2)] transition group">
                    <Avatar src={m.avatarUrl} firstName={m.firstName} lastName={m.lastName} email={m.email} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--sp-text)] truncate">
                        {name} {isSelf && <span className="text-violet-400">(vous)</span>}
                      </p>
                      {m.email && <p className="text-[10px] text-[var(--sp-text-disabled)] truncate">{m.email}</p>}
                    </div>
                    {!isSelf && (
                      <button onClick={() => handleRemoveMember(memberId)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer transition">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Create channel modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Nouveau Canal</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nom du canal</label>
                <input autoFocus value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                  placeholder="ex: général, dev-frontend..."
                  className="w-full rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm px-3 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Type</label>
                <div className="flex gap-2">
                  {(['PUBLIC', 'PRIVATE'] as const).map(t => (
                    <button type="button" key={t} onClick={() => setNewChannelType(t)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${newChannelType === t ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>
                      {t === 'PUBLIC' ? <Hash className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {t === 'PUBLIC' ? 'Public' : 'Privé'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                  Annuler
                </button>
                <button type="submit" disabled={isCreating}
                  className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold cursor-pointer disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Rename channel modal ── */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Renommer le canal</h3>
              <button onClick={() => setShowRenameModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleRenameChannel} className="space-y-4">
              <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                className="w-full rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm px-3 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                required />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowRenameModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                  Annuler
                </button>
                <button type="submit" disabled={isRenaming}
                  className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold cursor-pointer disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {isRenaming && <Loader2 className="w-4 h-4 animate-spin" />}
                  Renommer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete channel confirm ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Supprimer #{activeChannel?.name}</h3>
                <p className="text-xs text-slate-500">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              Tous les messages de ce canal seront définitivement supprimés.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                Annuler
              </button>
              <button onClick={handleDeleteChannel} disabled={isDeleting}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold cursor-pointer disabled:opacity-50 transition flex items-center justify-center gap-2">
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
