import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { BRAND, FONT, RADIUS, SchemeColors } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../Icon';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  onRightPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<any>;
  labelStyle?: StyleProp<any>;
}

/**
 * Input — port of web `components/ui/Input.tsx`.
 * Same base style (surface-3 bg, 1.5px border, teal focus ring),
 * same label/error layout; errors render with a shake animation like the web.
 */
export const Input = React.forwardRef<TextInput, InputProps>(
  ({ label, error, icon, rightAdornment, onRightPress, containerStyle, inputStyle, labelStyle, onFocus, onBlur, ...props }, ref) => {
    const { colors } = useTheme();
    const s = styles(colors);
    const [focused, setFocused] = useState(false);
    const shake = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (!error) return;
      // shake like framer-motion x: [0, -6, 6, -4, 4, 0]
      Animated.sequence(
        [0, -6, 6, -4, 4, 0].map((toValue, i) =>
          Animated.timing(shake, { toValue: i === 0 ? 0 : toValue, duration: 40, useNativeDriver: true })
        )
      ).start();
    }, [error]);

    return (
      <View style={containerStyle}>
        {label && (
          <Text style={[s.label, error ? { color: '#EF4444' } : null, labelStyle]}>{label}</Text>
        )}
        <Animated.View
          style={[
            s.wrapper,
            error
              ? {
                  borderColor: 'rgba(239, 68, 68, 0.5)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  shadowColor: '#EF4444',
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 2,
                }
              : focused
              ? {
                  borderColor: colors.borderStrong,
                  shadowColor: BRAND.teal,
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 2,
                }
              : null,
            { transform: [{ translateX: shake }] },
          ]}
        >
          {icon && <View style={s.leadingIcon}>{icon}</View>}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textMuted}
            style={[s.input, { color: colors.text }, inputStyle]}
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
          {rightAdornment && (
            <Pressable style={s.trailing} onPress={onRightPress} hitSlop={8}>
              {rightAdornment}
            </Pressable>
          )}
        </Animated.View>
        {!!error && <Text style={s.errorText}>{error}</Text>}
      </View>
    );
  }
);

Input.displayName = 'Input';

function styles(colors: SchemeColors) {
  return StyleSheet.create({
    label: {
      fontSize: 13,
      fontFamily: FONT.inter.semibold,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface3,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: RADIUS.lg,
      minHeight: 46,
      paddingHorizontal: 14,
    },
    input: {
      flex: 1,
      fontSize: 14,
      fontFamily: FONT.inter.medium,
      paddingVertical: 12,
      padding: 0,
    },
    leadingIcon: {
      marginRight: 10,
    },
    trailing: {
      marginLeft: 10,
      padding: 2,
    },
    errorText: {
      color: '#EF4444',
      fontSize: 12,
      fontFamily: FONT.inter.regular,
      marginTop: 4,
    },
  });
}
