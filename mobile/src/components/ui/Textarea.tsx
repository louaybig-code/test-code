import React, { useState } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { FONT, RADIUS, SchemeColors } from '../../theme/tokens';
import { BRAND } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

interface TextareaProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<any>;
}

/** Textarea — port of web `components/ui/Textarea.tsx` (multiline TextInput). */
export const Textarea = React.forwardRef<TextInput, TextareaProps>(
  ({ label, error, containerStyle, inputStyle, onFocus, onBlur, ...props }, ref) => {
    const { colors } = useTheme();
    const s = styles(colors);
    const [focused, setFocused] = useState(false);

    return (
      <View style={containerStyle}>
        {label && <Text style={[s.label, error ? { color: '#EF4444' } : null]}>{label}</Text>}
        <TextInput
          ref={ref}
          multiline
          textAlignVertical="top"
          placeholderTextColor={colors.textMuted}
          style={[
            s.input,
            { color: colors.text },
            error
              ? { borderColor: 'rgba(239, 68, 68, 0.5)', backgroundColor: 'rgba(239, 68, 68, 0.08)' }
              : focused
              ? { borderColor: colors.borderStrong }
              : null,
            inputStyle,
          ]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {!!error && <Text style={s.errorText}>{error}</Text>}
      </View>
    );
  }
);

Textarea.displayName = 'Textarea';

function styles(colors: SchemeColors) {
  return StyleSheet.create({
    label: {
      fontSize: 13,
      fontFamily: FONT.inter.semibold,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.surface3,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: RADIUS.lg,
      paddingHorizontal: 14,
      paddingVertical: 10,
      minHeight: 96,
      fontSize: 14,
      fontFamily: FONT.inter.medium,
    },
    errorText: {
      color: '#EF4444',
      fontSize: 12,
      fontFamily: FONT.inter.regular,
      marginTop: 4,
    },
  });
}
