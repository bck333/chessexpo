import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import THEME from '../constants/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  gradientColors?: string[];
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  onPress,
  gradientColors,
  icon,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'lg',
  style,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const finalColors = gradientColors || [colors.primary, colors.primaryLight];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 200 }) }],
  }));

  const handlePressIn = () => {
    if (!disabled) scale.value = 0.96;
  };

  const handlePressOut = () => {
    scale.value = 1;
  };

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const sizeStyles = {
    sm: { paddingVertical: 10, paddingHorizontal: 20 },
    md: { paddingVertical: 14, paddingHorizontal: 24 },
    lg: { paddingVertical: 18, paddingHorizontal: 32 },
  };

  const textSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  if (variant === 'outline') {
    return (
      <AnimatedTouchable
        style={[
          animatedStyle,
          styles.outlineBtn,
          sizeStyles[size],
          { borderColor: finalColors[0] + '40' },
          disabled && styles.disabled,
          style,
        ]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={1}
        disabled={disabled || loading}
      >
        {icon}
        <Text style={[styles.text, { fontSize: textSizes[size], color: colors.text }]}>
          {title}
        </Text>
      </AnimatedTouchable>
    );
  }

  return (
    <AnimatedTouchable
      style={[animatedStyle, disabled && styles.disabled, style]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={1}
      disabled={disabled || loading}
    >
      <LinearGradient
        colors={disabled ? [colors.surfaceLight, colors.surfaceLight] : finalColors as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          sizeStyles[size],
          THEME.shadows.elevated,
          { shadowColor: disabled ? 'transparent' : finalColors[0] },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <>
            {icon}
            <Text style={[styles.text, { fontSize: textSizes[size], color: disabled ? colors.textMuted : colors.white }]}>
              {title}
            </Text>
          </>
        )}
      </LinearGradient>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.borderRadius.lg,
    gap: 10,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1.5,
    gap: 10,
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
