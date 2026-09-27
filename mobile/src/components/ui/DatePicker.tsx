import React, { useMemo, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { FONT, RADIUS } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../Icon';
import { Sheet } from './Sheet';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

interface DatePickerFieldProps {
  label?: string;
  /** ISO date string (yyyy-mm-dd prefix) or null */
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * DatePickerField — input with a calendar sheet (same fr-FR month grid style
 * as the web `CalendarView`), replacing the web's native <input type="date">.
 */
export const DatePickerField: React.FC<DatePickerFieldProps> = ({ label, value, onChange, placeholder = 'jj/mm/aaaa', style }) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const initial = value ? new Date(value + 'T00:00:00') : new Date();
  const [cursor, setCursor] = useState({ y: initial.getFullYear(), m: initial.getMonth() });

  const days = useMemo(() => {
    const { y, m } = cursor;
    const first = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    let lead = (first.getDay() + 6) % 7; // Monday-first grid (same as web fr-FR)
    const cells: (number | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [cursor]);

  const iso = (d: number) => `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const display = value
    ? (() => {
        const d = new Date(value + 'T00:00:00');
        return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
      })()
    : null;

  return (
    <View style={style}>
      {!!label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface3 }]}
      >
        <Icon name="Calendar" size={15} color={colors.textMuted} />
        <Text style={[styles.value, { color: display ? colors.text : colors.textMuted }]}>{display ?? placeholder}</Text>
        {display && (
          <Pressable hitSlop={10} onPress={() => onChange(null)}>
            <Icon name="X" size={14} color={colors.textMuted} />
          </Pressable>
        )}
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? 'Date'} heightFraction={0.62}>
        {/* month nav */}
        <View style={styles.nav}>
          <Pressable
            hitSlop={10}
            onPress={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}
            style={[styles.navBtn, { backgroundColor: colors.surface2 }]}
          >
            <Icon name="ChevronLeft" size={18} color={colors.textSecondary} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.text }]}>
            {MONTHS[cursor.m]} {cursor.y}
          </Text>
          <Pressable
            hitSlop={10}
            onPress={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}
            style={[styles.navBtn, { backgroundColor: colors.surface2 }]}
          >
            <Icon name="ChevronRight" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* weekday header */}
        <View style={styles.row}>
          {WEEKDAYS.map((d) => (
            <Text key={d} style={[styles.cellHeader, { color: colors.textMuted }]}>
              {d}
            </Text>
          ))}
        </View>

        {/* grid */}
        <View style={styles.grid}>
          {days.map((d, i) => {
            if (d == null) return <View key={`x${i}`} style={styles.cell} />;
            const v = iso(d);
            const isSel = value === v;
            return (
              <Pressable
                key={v}
                onPress={() => {
                  onChange(v);
                  setOpen(false);
                }}
                style={[
                  styles.cell,
                  isSel && { backgroundColor: 'rgba(232,83,26,0.15)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(232,83,26,0.4)' },
                ]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: isSel ? '#E8531A' : colors.text,
                    fontFamily: isSel ? FONT.inter.bold : FONT.inter.regular,
                  }}
                >
                  {d}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
    paddingHorizontal: 14,
    minHeight: 46,
    borderRadius: RADIUS.lg,
  },
  value: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONT.inter.medium,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 15,
    fontFamily: FONT.sora.semibold,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  cellHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: FONT.inter.semibold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
