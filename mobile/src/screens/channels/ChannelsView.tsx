import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiService } from '../../services/api';
import { useSocket, useChannelSocket } from '../../hooks/useSocket';
import { useAppState } from '../../state/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { BRAND, FONT, RADIUS } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/ui/Sheet';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { SkeletonLines } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../components/toast';
import { Channel, ChannelMessage } from '../../types';
import { formatRelativeTime } from '../../lib/constants';

type Room = { channelId: string | null };

/**
 * ChannelsView — port of web `features/channels/ChannelsView.tsx`.
 * List of channels (project-linked section + team section), channel creation,
 * chat room with Socket.IO realtime (message.created/updated/deleted),
 * REST fallback, edit/delete own messages, leave channel.
 */
export const ChannelsView: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { activeProject, viewRefreshKey } = useAppState();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room>({ channelId: null });

  // messages state for the open room
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const messagesCache = useRef<Map<string, ChannelMessage[]>>(new Map());
  const flatRef = useRef<FlatList>(null);

  // channel creation
  const [createOpen, setCreateOpen] = useState(false);
  const [chName, setChName] = useState('');
  const [chPrivate, setChPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  // message edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');

  const activeChannel = channels.find((c) => c.id === room.channelId) ?? null;

  // ── load channels ──
  const loadChannels = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const list = await apiService.getChannels(workspaceId);
      setChannels(list ?? []);
    } catch (err: any) {
      toast.error(err.message || 'Erreur de chargement des canaux');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    setLoading(true);
    loadChannels();
  }, [loadChannels, viewRefreshKey]);

  // ── load messages when opening a room (with cache + REST fallback, like web) ──
  const openRoom = useCallback(
    async (channelId: string) => {
      setRoom({ channelId });
      const cached = messagesCache.current.get(channelId);
      if (cached) {
        setMessages(cached);
        return;
      }
      setLoadingMessages(true);
      try {
        const res: any = await apiService.getChannelMessages(channelId);
        const list: ChannelMessage[] = Array.isArray(res) ? res : res?.messages ?? [];
        messagesCache.current.set(channelId, list);
        setMessages(list);
      } catch (err: any) {
        toast.error(err.message || 'Erreur de chargement des messages');
      } finally {
        setLoadingMessages(false);
      }
    },
    []
  );

  // ── realtime ──
  useChannelSocket(room.channelId, {
    'message.created': (msg: ChannelMessage) => {
      if (!room.channelId || (msg as any).channelId !== room.channelId && (msg as any).channel !== room.channelId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        messagesCache.current.set(room.channelId!, next);
        return next;
      });
    },
    'message.updated': (msg: ChannelMessage) => {
      if (!room.channelId) return;
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m));
        messagesCache.current.set(room.channelId!, next);
        return next;
      });
    },
    'message.deleted': (payload: { id: string; channelId?: string }) => {
      if (!room.channelId) return;
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== payload.id);
        messagesCache.current.set(room.channelId!, next);
        return next;
      });
    },
  });

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || !room.channelId) return;
    setSending(true);
    try {
      const msg = await apiService.createChannelMessage(room.channelId, { body });
      // optimistic merge even if the WS echo races it
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const next = [...prev, msg];
        messagesCache.current.set(room.channelId!, next);
        return next;
      });
      setDraft('');
    } catch (err: any) {
      toast.error(err.message || "Échec de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !room.channelId || !editingBody.trim()) return;
    try {
      const updated = await apiService.updateMessage(room.channelId, editingId, { body: editingBody.trim() });
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === editingId ? { ...m, ...updated } : m));
        messagesCache.current.set(room.channelId!, next);
        return next;
      });
      setEditingId(null);
      setEditingBody('');
      toast.success('Message modifié');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!room.channelId) return;
    try {
      await apiService.deleteMessage(room.channelId, id);
      setMessages((prev) => {
        const next = prev.filter((m) => m.id !== id);
        messagesCache.current.set(room.channelId!, next);
        return next;
      });
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    }
  };

  const handleCreate = async () => {
    if (!chName.trim()) return;
    setCreating(true);
    try {
      const ch = await apiService.createChannel(workspaceId, {
        name: chName.trim(),
        type: chPrivate ? 'PRIVATE' : 'PUBLIC',
        projectId: activeProject?.id,
      });
      setChannels((prev) => [...prev, ch]);
      toast.success('Canal créé !');
      setCreateOpen(false);
      setChName('');
      setChPrivate(false);
      openRoom(ch.id);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleLeave = async () => {
    if (!activeChannel) return;
    try {
      await apiService.leaveChannel(activeChannel.id);
      setChannels((prev) => prev.filter((c) => c.id !== activeChannel.id));
      setRoom({ channelId: null });
      toast.success('Vous avez quitté le canal');
    } catch (err: any) {
      toast.error(err.message || 'Impossible de quitter');
    }
  };

  // ── split project-linked vs team channels (like web's two sections) ──
  const projectChannels = channels.filter((c: any) => c.projectId);
  const teamChannels = channels.filter((c: any) => !c.projectId);

  // ══ ROOM VIEW ══
  if (activeChannel) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {/* room header */}
        <View style={[styles.roomHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setRoom({ channelId: null })} hitSlop={10} style={{ padding: 6 }}>
            <Icon name="ChevronLeft" size={18} color={colors.textSecondary} />
          </Pressable>
          <Icon name="Hash" size={16} color={BRAND.teal} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontFamily: FONT.inter.bold, color: colors.text }}>
            {activeChannel.name}
          </Text>
          <Pressable onPress={handleLeave} hitSlop={8} style={{ padding: 6 }}>
            <Icon name="LogOut" size={15} color="#EF4444" />
          </Pressable>
        </View>

        {/* messages */}
        {loadingMessages ? (
          <View style={{ padding: 16 }}>
            <SkeletonLines lines={4} gap={12} />
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 20 }}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Icon name="MessageSquare" size={30} color={colors.textMuted} />
                <Text style={{ marginTop: 10, fontSize: 12.5, fontFamily: FONT.inter.regular, color: colors.textMuted }}>
                  Aucun message — démarrez la conversation !
                </Text>
              </View>
            }
            renderItem={({ item: m }) => {
              const mine = (m as any).userId === user?.id || (m as any).user?.id === user?.id || (m as any).senderId === user?.id;
              const sender = (m as any).user ?? (m as any).sender ?? {};
              return (
                <View style={[styles.bubbleRow, mine && { justifyContent: 'flex-end' }]}>
                  {!mine && (
                    <Avatar
                      src={sender.avatarUrl}
                      firstName={sender.firstName ?? undefined}
                      lastName={sender.lastName ?? undefined}
                      email={sender.email}
                      size="sm"
                    />
                  )}
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: mine ? BRAND.teal : colors.surface,
                        borderColor: mine ? BRAND.teal : colors.border,
                        maxWidth: '78%',
                      },
                    ]}
                  >
                    {!mine && (
                      <Text style={{ fontSize: 10.5, fontFamily: FONT.inter.bold, color: BRAND.teal, marginBottom: 3 }}>
                        {[sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.email || 'Utilisateur'}
                      </Text>
                    )}
                    {editingId === m.id ? (
                      <View>
                        <TextInput
                          value={editingBody}
                          onChangeText={setEditingBody}
                          multiline
                          style={{
                            fontSize: 13,
                            fontFamily: FONT.inter.regular,
                            color: mine ? '#fff' : colors.text,
                            minHeight: 34,
                            paddingVertical: 0,
                          }}
                          autoFocus
                        />
                        <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 6 }}>
                          <Pressable onPress={() => { setEditingId(null); setEditingBody(''); }}>
                            <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.semibold, color: mine ? 'rgba(255,255,255,0.8)' : colors.textMuted }}>Annuler</Text>
                          </Pressable>
                          <Pressable onPress={handleSaveEdit}>
                            <Text style={{ fontSize: 11.5, fontFamily: FONT.inter.bold, color: mine ? '#fff' : BRAND.teal }}>Enregistrer</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Text selectable style={{ fontSize: 13.5, fontFamily: FONT.inter.regular, color: mine ? '#fff' : colors.text, lineHeight: 19 }}>
                        {(m as any).body}
                      </Text>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginTop: 3 }}>
                      {(m as any).updatedAt && (m as any).updatedAt !== (m as any).createdAt && (
                        <Text style={{ fontSize: 9, color: mine ? 'rgba(255,255,255,0.7)' : colors.textMuted, fontFamily: FONT.inter.medium }}>
                          (modifié)
                        </Text>
                      )}
                      <Text style={{ fontSize: 9, color: mine ? 'rgba(255,255,255,0.7)' : colors.textMuted, fontFamily: FONT.inter.medium }}>
                        {(m as any).createdAt ? formatRelativeTime((m as any).createdAt) : ''}
                      </Text>
                      {mine && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Pressable
                            hitSlop={6}
                            onPress={() => {
                              setEditingId(m.id);
                              setEditingBody((m as any).body ?? '');
                            }}
                          >
                            <Icon name="Pencil" size={10} color={'rgba(255,255,255,0.75)'} />
                          </Pressable>
                          <Pressable hitSlop={6} onPress={() => handleDeleteMessage(m.id)}>
                            <Icon name="Trash2" size={10} color={'rgba(255,255,255,0.75)'} />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* composer */}
        <View style={[styles.composer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={`Message dans #${activeChannel.name}`}
            placeholderTextColor={colors.textMuted}
            multiline
            style={[styles.composerInput, { backgroundColor: colors.surface3, color: colors.text, borderColor: colors.border }]}
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !draft.trim()}
            style={[
              styles.sendBtn,
              { backgroundColor: BRAND.teal, opacity: !draft.trim() || sending ? 0.55 : 1 },
            ]}
          >
            <Icon name="Send" size={15} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ══ LIST VIEW ══
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={[]}
        renderItem={() => null}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 60 }}
        refreshControl={undefined}
        ListHeaderComponent={
          <>
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: colors.text }]}>Canaux Discussion</Text>
              <Pressable onPress={() => setCreateOpen(true)} hitSlop={8} style={[styles.newBtn, { backgroundColor: BRAND.orange08 }]}>
                <Icon name="Plus" size={15} color={BRAND.orange} />
              </Pressable>
            </View>
            {loading && <SkeletonLines lines={3} gap={12} />}
            {!loading && channels.length === 0 && (
              <EmptyState
                icon="MessageSquare"
                title="Aucun canal"
                description="Créez un canal pour discuter avec votre équipe."
                actionLabel="Créer un canal"
                onAction={() => setCreateOpen(true)}
              />
            )}
            {!loading && projectChannels.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Canaux du projet</Text>
                {projectChannels.map((c) => (
                  <ChannelRow key={c.id} channel={c} onPress={() => openRoom(c.id)} />
                ))}
              </>
            )}
            {!loading && teamChannels.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Canaux d'équipe</Text>
                {teamChannels.map((c) => (
                  <ChannelRow key={c.id} channel={c} onPress={() => openRoom(c.id)} />
                ))}
              </>
            )}
          </>
        }
      />

      {/* create channel sheet */}
      <Sheet visible={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau canal" autoHeight>
        <Input
          label="Nom du canal"
          placeholder="Ex: equipe-dev"
          icon={<Icon name="Hash" size={15} color={colors.textMuted} />}
          value={chName}
          onChangeText={setChName}
          containerStyle={{ marginTop: 8, marginBottom: 12 }}
        />
        <Pressable onPress={() => setChPrivate((p) => !p)} style={styles.privateRow}>
          <View style={[styles.checkbox, { borderColor: chPrivate ? BRAND.teal : colors.borderStrong, backgroundColor: chPrivate ? BRAND.teal : 'transparent' }]}>
            {chPrivate && <Icon name="Check" size={11} color="#fff" />}
          </View>
          <Icon name="Lock" size={13} color={colors.textSecondary} />
          <Text style={{ flex: 1, fontSize: 12.5, fontFamily: FONT.inter.semibold, color: colors.textSecondary }}>
            Canal privé — uniquement les membres invités
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingBottom: 8 }}>
          <Button variant="ghost" onPress={() => setCreateOpen(false)}>Annuler</Button>
          <Button onPress={handleCreate} isLoading={creating}>Créer</Button>
        </View>
      </Sheet>
    </View>
  );
};

const ChannelRow: React.FC<{ channel: Channel; onPress: () => void }> = ({ channel, onPress }) => {
  const { colors } = useTheme();
  const lastMessage: any = (channel as any).lastMessage;
  const updated = (channel as any).updatedAt ?? lastMessage?.createdAt;
  return (
    <Pressable
      onPress={onPress}
      style={[chStyles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[chStyles.hashTile, { backgroundColor: BRAND.teal15 }]}>
        <Icon name="Hash" size={15} color={BRAND.teal} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontSize: 14, fontFamily: FONT.inter.semibold, color: colors.text }}>
          {channel.name}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 11.5, fontFamily: FONT.inter.regular, color: colors.textMuted, marginTop: 1 }}>
          {lastMessage?.body ?? (channel as any).description ?? 'Aucun message pour le moment'}
        </Text>
      </View>
      {!!updated && (
        <Text style={{ fontSize: 10, fontFamily: FONT.inter.medium, color: colors.textMuted }}>
          {formatRelativeTime(updated)}
        </Text>
      )}
      <Icon name="ChevronRight" size={14} color={colors.textMuted} style={{ marginLeft: 2 }} />
    </Pressable>
  );
};

const chStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 8,
  },
  hashTile: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 17,
    fontFamily: FONT.sora.bold,
  },
  newBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FONT.inter.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 6,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bubble: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13.5,
    fontFamily: FONT.inter.regular,
    maxHeight: 110,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
