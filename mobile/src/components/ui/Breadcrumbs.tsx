import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FONT } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../Icon';

export interface BreadcrumbItem {
  label: string;
  onPress?: () => void;
  isActive?: boolean;
}

/** Breadcrumbs — port of web `components/ui/Breadcrumbs.tsx` with chevron separators. */
export const Breadcrumbs: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const active = item.isActive ?? isLast;
        return (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="ChevronRight" size={14} color={colors.textMuted} style={{ marginHorizontal: 6, opacity: 0.6 }} />}
            <Pressable onPress={!isLast ? item.onPress : undefined} disabled={isLast || !item.onPress}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 13,
                  fontFamily: active ? FONT.inter.semibold : FONT.inter.medium,
                  color: active ? colors.text : colors.textSecondary,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
});
