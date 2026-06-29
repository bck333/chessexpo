import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Check, Star, Zap, Trophy, Crown, CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../../src/context/ThemeContext';
import { Header } from '../../../src/components/Header';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₹99',
    period: '/month',
    color: '#a855f7',
    icon: <Star size={24} color="#a855f7" />,
    features: ['30 Puzzles / day', '5 AI Games / day', '5 Hints / day', 'Intermediate Lessons', 'Depth 16 Engine'],
    bestValue: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹199',
    period: '/month',
    color: '#3b82f6',
    icon: <Zap size={24} color="#3b82f6" />,
    features: ['80 Puzzles / day', 'Unlimited AI Games', '10 Hints / day', 'All Basic Lessons', 'Depth 20 Engine'],
    bestValue: false,
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '₹299',
    period: '/month',
    color: '#f59e0b',
    icon: <Trophy size={24} color="#f59e0b" />,
    features: ['Unlimited Puzzles', 'Unlimited Hints', 'Multi-PV (3 Lines)', 'Weakness Tracking', 'Depth 22 Engine'],
    bestValue: true,
  },
  {
    id: 'coach',
    name: 'Coach',
    price: '₹399',
    period: '/month',
    color: '#ef4444',
    icon: <Crown size={24} color="#ef4444" />,
    features: ['Stockfish 18 (Depth 24)', 'Multi-PV (5 Lines)', 'AI Coaching Insights', 'Personal Training Plan', 'Blunder Analysis'],
    bestValue: false,
  },
];

export default function SubscriptionScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Training Plans" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100)} style={styles.heroSection}>
          <Sparkles color={colors.accent} size={40} style={styles.heroIcon} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>Level Up Your Game</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            Master chess with personalized puzzles and the world's strongest engine.
          </Text>
        </Animated.View>

        <View style={styles.plansContainer}>
          {PLANS.map((plan, index) => (
            <Animated.View 
              key={plan.id} 
              entering={FadeInDown.delay(200 + (index * 100))}
              style={[
                styles.planCard, 
                { backgroundColor: colors.surface, borderColor: plan.bestValue ? plan.color : colors.border }
              ]}
            >
              {plan.bestValue && (
                <View style={[styles.bestValueBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.bestValueText}>MOST POPULAR</Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <View style={[styles.iconContainer, { backgroundColor: plan.color + '20' }]}>
                  {plan.icon}
                </View>
                <View>
                  <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.planPrice, { color: colors.text }]}>{plan.price}</Text>
                    <Text style={[styles.planPeriod, { color: colors.textMuted }]}>{plan.period}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.featuresList}>
                {plan.features.map((feature, fIdx) => (
                  <View key={fIdx} style={styles.featureItem}>
                    <CheckCircle2 size={16} color={plan.color} style={styles.featureIcon} />
                    <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.subscribeBtn, { backgroundColor: plan.color }]}
                onPress={() => console.log('Subscribe to', plan.id)}
              >
                <Text style={styles.subscribeBtnText}>Activate {plan.name}</Text>
                <ArrowRight size={18} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            All plans include a 7-day money-back guarantee. Secure payment via App Store or Google Play.
          </Text>
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
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  heroIcon: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  plansContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  planCard: {
    borderRadius: 24,
    borderWidth: 2,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  bestValueText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    opacity: 0.7,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '900',
  },
  planPeriod: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 20,
  },
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    flexShrink: 0,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.9,
  },
  subscribeBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  subscribeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  footer: {
    marginTop: 32,
    paddingHorizontal: 40,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.6,
  },
});
