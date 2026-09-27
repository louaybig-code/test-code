import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONT, RADIUS } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../Icon';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string; // web: Rocket
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** EmptyState — port of web `components/ui/EmptyState.tsx`. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'Rocket',
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconBox, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
        <Icon name={icon as any} size={28} color="#E8531A" />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {!!description && <Text style={[styles.desc, { color: colors.textSecondary }]}>{description}</Text>}
      {actionLabel && onAction && (
        <Button onPress={onAction} icon={<Icon name="Plus" size={16} color="#fff" strokeWidth={2.5} />} style={{ marginTop: 20 }}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    fontSize: 17,
    fontFamily: FONT.inter.bold,
    textAlign: 'center',
  },
  desc: {
    fontSize: 13,
    fontFamily: FONT.inter.regular,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
    lineHeight: 19,
  },
});
