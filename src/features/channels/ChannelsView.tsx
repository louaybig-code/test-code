import React, { useState, useEffect, useRef } from 'react';
import { Hash, Lock, Plus, Send, MessageSquare, Loader2 } from 'lucide-react';
import { apiService } from '../../services/api';
import { Channel, ChannelMessage } from '../../types';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { formatDateTime } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface ChannelsViewProps {
  workspaceId: string;
}

export const ChannelsView: React.FC<ChannelsViewProps> = ({ workspaceId }) => {
  const { user } = useAuth();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // New Channel modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [isCreating, setIsCreating] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ── Load channels ──────────────────────────────────────────────────────────
  const loadChannels = async () => {
    setIsLoadingChannels(true);
    try {
      const list = await apiService.getChannels(workspaceId);
      const sorted = (list ?? []).sort((a, b) =>
        (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
      );
      setChannels(sorted);
      // Auto-select first channel only on initial load
      setActiveChannel((prev) => prev ?? (sorted.length > 0 ? sorted[0] : null));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load channels');
    } finally {
      setIsLoadingChannels(false);
    }
  };

  useEffect(() => {
    if (workspaceId) loadChannels();
  }, [workspaceId]);

  // ── Load messages ──────────────────────────────────────────────────────────
  const loadMessages = async (channelId: string, silent = false) => {
    if (!silent) setIsLoadingMessages(true);
    try {
      const res: any = await apiService.getChannelMessages(channelId);
      const raw: ChannelMessage[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.messages)
        ? res.messages
        : [];
      // API returns newest-first — reverse so oldest is at top
      setMessages(raw.slice().reverse());
    } catch (err: any) {
      if (!silent) toast.error(err?.message || 'Failed to load messages');
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!activeChannel) return;
    loadMessages(activeChannel.id);

    // Poll every 15 seconds silently — cleared on channel change or unmount
    const interval = setInterval(() => {
      loadMessages(activeChannel.id, true);
    }, 15000);
    return () => clearInterval(interval);
  }, [activeChannel]);

  // ── Create channel ─────────────────────────────────────────────────────────
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    setIsCreating(true);
    try {
      const ch = await apiService.createChannel(workspaceId, {
        name: channelName.trim(),
        type: channelType,
      });
      toast.success(`#${ch.name} created`);
      // Add new channel immediately to list and select it — no reload needed
      setChannels((prev) => [...prev, ch].sort((a, b) =>
        (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
      ));
      setActiveChannel(ch);
      setChannelName('');
      setChannelType('PUBLIC');
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create channel');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim() || !activeChannel) return;
    setIsSending(true);
    const body = messageBody.trim();
    setMessageBody('');

    // Optimistic append using current user info
    const optimisticMsg: ChannelMessage = {
      id: `optimistic-${Date.now()}`,
      channelId: activeChannel.id,
      authorId: user?.id ?? '',
      body,
      createdAt: new Date().toISOString(),
      author: {
        id: user?.id ?? '',
        email: user?.email ?? '',
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        avatarUrl: user?.avatarUrl,
      },
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const msg = await apiService.createChannelMessage(activeChannel.id, { body });
      // Replace the optimistic message with the real one from server
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMsg.id ? msg : m))
      );
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send message');
      // Revert the optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setMessageBody(body); // restore the input
    } finally {
      setIsSending(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getSenderName = (m: ChannelMessage): string => {
    // API returns sender nested as m.sender OR m.author — handle both
    const sender = (m as any).sender ?? m.author;
    if (!sender) return 'Unknown';
    const full = [sender.firstName, sender.lastName].filter(Boolean).join(' ');
    return full || sender.email || 'Unknown';
  };

  const getSenderAvatar = (m: ChannelMessage) => {
    const sender = (m as any).sender ?? m.author;
    return {
      src: sender?.avatarUrl,
      firstName: sender?.firstName,
      lastName: sender?.lastName,
      email: sender?.email,
    };
  };

  const isOwnMessage = (m: ChannelMessage): boolean => {
    const senderId = (m as any).sender?.id ?? m.author?.id ?? m.authorId;
    return senderId === user?.id;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-200px)]">

      {/* ── Channel list sidebar ── */}
      <div className="p-4 rounded-2xl bg-[var(--sp-surface)] border border-[var(--sp-border)] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--sp-text-secondary)] flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-violet-500" />
            Canaux d'Équipe
          </h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-1 rounded-lg text-[var(--sp-text-muted)] hover:text-[var(--sp-text)] hover:bg-[var(--sp-surface-2)] transition cursor-pointer"
            title="New channel"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {isLoadingChannels ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            </div>
          ) : channels.length === 0 ? (
            <p className="text-xs text-[var(--sp-text-disabled)] py-2 text-center">
              No channels yet.
              <br />
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-violet-400 hover:underline mt-1 cursor-pointer"
              >
                Create one
              </button>
            </p>
          ) : (
            channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch)}
                className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                  activeChannel?.id === ch.id
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-[var(--sp-text-muted)] hover:text-[var(--sp-text)] hover:bg-[var(--sp-surface-2)]'
                }`}
              >
                {ch.type === 'PRIVATE'
                  ? <Lock className="w-3.5 h-3.5 shrink-0" />
                  : <Hash className="w-3.5 h-3.5 shrink-0" />
                }
                <span className="truncate">{ch.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Chat feed ── */}
      <div className="md:col-span-3 rounded-2xl bg-[var(--sp-surface)] border border-[var(--sp-border)] flex flex-col p-4 overflow-hidden">
        {!activeChannel ? (
          <div className="flex-1 flex items-center justify-center text-xs text-[var(--sp-text-disabled)]">
            Select a channel to start messaging.
          </div>
        ) : (
          <>
            {/* Channel header */}
            <div className="pb-3 border-b border-[var(--sp-border)] flex items-center gap-2 shrink-0">
              {activeChannel.type === 'PRIVATE'
                ? <Lock className="w-4 h-4 text-amber-400" />
                : <Hash className="w-4 h-4 text-violet-400" />
              }
              <h3 className="font-bold text-sm text-[var(--sp-text)]">{activeChannel.name}</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-xs text-[var(--sp-text-disabled)] text-center py-10">
                  Be the first to send a message in #{activeChannel.name}!
                </p>
              ) : (
                messages.map((m) => {
                  const own = isOwnMessage(m);
                  const senderName = getSenderName(m);
                  const avatar = getSenderAvatar(m);

                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 ${own ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar — hidden on own messages */}
                      {!own && (
                        <Avatar
                          src={avatar.src}
                          firstName={avatar.firstName}
                          lastName={avatar.lastName}
                          email={avatar.email}
                          size="sm"
                        />
                      )}

                      <div className={`flex flex-col gap-0.5 max-w-[70%] ${own ? 'items-end' : 'items-start'}`}>
                        {/* Sender name + timestamp */}
                        <div className={`flex items-center gap-2 ${own ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-xs font-bold text-[var(--sp-text)]">
                            {own ? 'You' : senderName}
                          </span>
                          <span className="text-[10px] text-[var(--sp-text-disabled)]">
                            {formatDateTime(m.createdAt)}
                          </span>
                        </div>

                        {/* Bubble */}
                        <div
                          className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                            own
                              ? 'bg-violet-600 text-white rounded-br-sm'
                              : 'bg-[var(--sp-surface-2)] text-[var(--sp-text)] border border-[var(--sp-border)] rounded-bl-sm'
                          }`}
                        >
                          {m.body}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <form
              onSubmit={handleSendMessage}
              className="flex gap-2 pt-3 border-t border-[var(--sp-border)] shrink-0"
            >
              <input
                type="text"
                placeholder={`Message #${activeChannel.name}...`}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e as any);
                  }
                }}
                className="flex-1 rounded-xl bg-[var(--sp-surface-2)] border border-[var(--sp-border)] text-xs px-3.5 py-2.5 text-[var(--sp-text)] placeholder-[var(--sp-text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isSending}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Envoyer
              </Button>
            </form>
          </>
        )}
      </div>

      {/* ── New Channel Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouveau Canal">
        <form onSubmit={handleCreateChannel} className="space-y-4">
          <Input
            label="Channel name"
            placeholder="e.g. général, dev-frontend, announcements"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isCreating}>
              Create Channel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
