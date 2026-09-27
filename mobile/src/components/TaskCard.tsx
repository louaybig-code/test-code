import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Task } from '../types';
import { PRIORITY_CONFIG, formatDate, getUserInitials } from '../lib/constants';
import { FONT, RADIUS } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';
import { Avatar } from './ui/Avatar';

interface TaskCardProps {
  task: Task;
  onPress?: () => void;
  onLongPress?: () => void;
  compact?: boolean;
  archived?: boolean;
}

const PIcon: React.FC<{ p?: Task['priority']; size?: number }> = ({ p, size = 14 }) => {
  if (!p) return null;
  const cfg = PRIORITY_CONFIG[p] ?? PRIORITY_CONFIG.MEDIUM;
  return <Icon name="Flag" size={size - 1} color={cfg.iconColor} strokeWidth={2.4} />;
};

/**
 * TaskCard — mobile port of the web task card used in Kanban/List/Backlog:
 * title, priority flag, due date, subtask progress, assignee avatar, favorite star.
 */
export const TaskCard: React.FC<TaskCardProps> = ({ task, onPress, onLongPress, compact, archived }) => {
  const { colors, isDark } = useTheme();
  const sub = (task as any).subtasks?.filter((s: any) => s.completed)?.length ?? 0;
  const subTotal = (task as any).subtasks?.length ?? 0;
  const comments = (task as any).comments?.length ?? (task as any)._count?.comments ?? 0;
  const overdue = task.dueDate ? new Date(task.dueDate) < new Date() && !(task as any).completed : false;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: archived ? 0.5 : 1,
        },
        compact && { padding: 10 },
      ]}
    >
      <View style={styles.topRow}>
        <Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>
          {task.title}
        </Text>
        {(task as any).isFavorite && <Icon name="Star" size={12} color="#F59E0B" strokeWidth={2} />}
      </View>

      {!!task.description && !compact && (
        <Text numberOfLines={1} style={[styles.desc, { color: colors.textMuted }]}>
          {task.description}
        </Text>
      )}

      <View style={styles.bottomRow}>
        <PIcon p={task.priority} />
        {!!task.dueDate && (
          <View style={styles.metaItem}>
            <Icon name="Clock" size={10} color={overdue ? '#EF4444' : colors.textMuted} />
            <Text style={{ fontSize: 9.5, fontFamily: FONT.inter.medium, color: overdue ? '#EF4444' : colors.textMuted }}>
              {formatDate(task.dueDate)}
            </Text>
          </View>
        )}
        {subTotal > 0 && (
          <View style={styles.metaItem}>
            <Icon name="CheckSquare" size={10} color={colors.textMuted} />
            <Text style={{ fontSize: 9.5, fontFamily: FONT.inter.medium, color: colors.textMuted }}>
              {sub}/{subTotal}
            </Text>
          </View>
        )}
        {comments > 0 && (
          <View style={styles.metaItem}>
            <Icon name="MessageSquare" size={10} color={colors.textMuted} />
            <Text style={{ fontSize: 9.5, fontFamily: FONT.inter.medium, color: colors.textMuted }}>{comments}</Text>
          </View>
        )}
        {(task as any).attachments?.length > 0 && (
          <View style={styles.metaItem}>
            <Icon name="Paperclip" size={10} color={colors.textMuted} />
            <Text style={{ fontSize: 9.5, fontFamily: FONT.inter.medium, color: colors.textMuted }}>
              {(task as any).attachments.length}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {(task as any).assignee ? (
          <Avatar
            src={(task as any).assignee?.avatarUrl}
            firstName={(task as any).assignee?.firstName ?? undefined}
            lastName={(task as any).assignee?.lastName ?? undefined}
            email={(task as any).assignee?.email}
            size="sm"
          />
        ) : (task as any).assigneeEmail ? (
          <Avatar email={(task as any).assigneeEmail} size="sm" />
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT.inter.semibold,
    lineHeight: 17,
  },
  desc: {
    fontSize: 11.5,
    fontFamily: FONT.inter.regular,
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
});
