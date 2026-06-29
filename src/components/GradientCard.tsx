import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ArrowRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import THEME from '../constants/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface GradientCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
  gradientColors: string[];
  badge?: string;
  delay?: number;
  index?: number;
}

export const GradientCard: React.FC<GradientCardProps> = ({
  title,
  subtitle,
  icon,
  onPress,
  gradientColors,
  badge,
  delay = 0,
  index = 0,
}) => {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 15, stiffness: 150 }) }],
  }));

  const handlePressIn = () => {
    scale.value = 0.97;
  };

  const handlePressOut = () => {
    scale.value = 1;
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedTouchable
      entering={FadeInUp.delay(delay).duration(500).springify()}
      style={[animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={1}
    >
      <LinearGradient
        colors={isDark
          ? [gradientColors[0] + '18', gradientColors[1] + '08']
          : [gradientColors[0] + '12', gradientColors[1] + '06']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: isDark ? gradientColors[0] + '25' : gradientColors[0] + '18',
          },
        ]}
      >
        {/* Icon container with glow */}
        <View style={[styles.iconContainer, { backgroundColor: gradientColors[0] + '20' }]}>
          {icon}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {badge && (
              <View style={[styles.badge, { backgroundColor: gradientColors[0] + '25' }]}>
                <Text style={[styles.badgeText, { color: gradientColors[0] }]}>{badge}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>

        {/* Arrow */}
        <View style={[styles.arrowContainer, { backgroundColor: gradientColors[0] + '15' }]}>
          <ArrowRight color={gradientColors[0]} size={16} strokeWidth={2.5} />
        </View>
      </LinearGradient>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: THEME.borderRadius.xl,
    borderWidth: 1,
    gap: 14,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    opacity: 0.85,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
