import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Zap, Target, Swords, Shield, Search, Flame } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { COLORS, THEME } from '../../../src/constants/theme';
import { Header } from '../../../src/components/Header';
import { useTheme } from '../../../src/context/ThemeContext';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { name: 'Pins', icon: Zap, count: 420 },
    { name: 'Forks', icon: Swords, count: 315 },
    { name: 'Skewers', icon: Target, count: 128 },
    { name: 'Deflection', icon: Shield, count: 85 },
    { name: 'Sacrifices', icon: Flame, count: 210 },
    { name: 'Endgame', icon: Search, count: 540 },
];

export default function CategoriesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Header title="Categories" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.accent }]}>SELECT A MOTIF</Text>
        <View style={styles.grid}>
            {CATEGORIES.map((cat, index) => (
                <Animated.View 
                    key={index} 
                    entering={FadeInUp.delay(index * 100).duration(500)}
                    style={styles.cardWrapper}
                >
                    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.85}>
                        <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
                        <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                             <cat.icon color={colors.accent} size={24} />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={[styles.cardName, { color: colors.text }]}>{cat.name}</Text>
                            <Text style={[styles.cardCount, { color: colors.textMuted }]}>{cat.count} Tasks</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  cardWrapper: {
    width: (width - 40 - 16) / 2,
  },
  card: {
    padding: 16,
    borderRadius: THEME.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardCount: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  }
});
