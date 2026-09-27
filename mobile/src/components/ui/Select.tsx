import React, { useState } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { FONT, RADIUS } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../Icon';
import { Sheet } from './Sheet';

export interface SelectOption {
  value: string;
  label: string;
  /** optional color dot / swatch */
  color?: string;
  icon?: string;
  disabled?: boolean;
}

interface FieldSelectProps {
  label?: string;
  value: string | null | undefined;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

/**
 * FieldSelect — mobile port of the web `<select>` used in the task drawer /
 * settings modals. Renders the same input chrome; opens an option sheet on tap.
 */
export const FieldSelect: React.FC<FieldSelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Sélectionner…',
  disabled,
  style,
  compact,
}) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={style}>
      {!!label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface3,
            opacity: disabled ? 0.5 : 1,
            minHeight: compact ? 38 : 46,
            paddingHorizontal: compact ? 10 : 14,
            borderRadius: RADIUS.lg,
          },
        ]}
      >
        {selected?.color && <View style={[styles.dot, { backgroundColor: selected.color }]} />}
        {selected?.icon && !selected?.color && (
          <Icon name={selected.icon as any} size={14} color={colors.textMuted} style={{ marginRight: 2 }} />
        )}
        <Text
          numberOfLines={1}
          style={[
            styles.value,
            { color: selected ? colors.text : colors.textMuted, fontSize: compact ? 12.5 : 14 },
          ]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Icon name="ChevronDown" size={16} color={colors.textMuted} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={label} heightFraction={0.6}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
          {options.map((o) => {
            const isSel = o.value === (value ?? '');
            return (
              <Pressable
                key={o.value}
                disabled={o.disabled}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={[
                  styles.option,
                  {
                    backgroundColor: isSel ? 'rgba(26,140,140,0.10)' : 'transparent',
                    borderColor: isSel ? 'rgba(26,140,140,0.30)' : 'transparent',
                  },
                ]}
              >
                {o.color && <View style={[styles.dot, { backgroundColor: o.color }]} />}
                <Text
                  style={[
                    styles.optionText,
                    { color: isSel ? '#1A8C8C' : colors.text, fontFamily: isSel ? FONT.inter.semibold : FONT.inter.medium },
                  ]}
                >
                  {o.label}
                </Text>
                {isSel && <Icon name="Check" size={16} color="#1A8C8C" />}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontFamily: FONT.inter.semibold,
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    gap: 8,
  },
  value: {
    flex: 1,
    fontFamily: FONT.inter.medium,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 4,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
  },
});
