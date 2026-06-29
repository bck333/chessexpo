import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import {
  Crown,
  Swords,
  Target,
  Activity,
  User,
  Star,
  Zap,
  TrendingUp,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Award,
  PenSquare
} from 'lucide-react-native';
import Animated, {
  FadeInUp,
  FadeInRight,
  FadeInLeft,
  FadeIn
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import apiClient from '../../src/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, THEME } from '../../src/constants/theme';
import { Header } from '../../src/components/Header';
import { GradientCard } from '../../src/components/GradientCard';
import { useTheme } from '../../src/context/ThemeContext';
import { useSubscription } from '../../src/context/SubscriptionContext';

const { width } = Dimensions.get('window');

const WISDOM_QUOTES = [
  { quote: "Tactics flow from a superior position.", author: "Bobby Fischer" },
  { quote: "Chess is 99% tactics.", author: "Richard Teichmann" },
  { quote: "The most powerful weapon in chess is to have the next move.", author: "David Bronstein" },
  { quote: "When you see a good move, look for a better one.", author: "Emanuel Lasker" },
  { quote: "Play the opening like a book, the middlegame like a magician, the endgame like a machine.", author: "Rudolf Spielmann" }
];

const RANKS = [
  { name: 'Novice', min: 0, max: 50, color: '#94a3b8' },
  { name: 'Expert', min: 50, max: 100, color: '#10b981' },
  { name: 'Candidate', min: 100, max: 200, color: '#06b6d4' },
  { name: 'Master', min: 200, max: 500, color: '#8b5cf6' },
  { name: 'Grandmaster', min: 500, max: 999999, color: '#f59e0b' },
];

export default function HomeDashboard() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { subscription, refreshSubscription } = useSubscription();
  const [user, setUser] = useState<any>(null);
  const [quote, setQuote] = useState(WISDOM_QUOTES[0]);

  useEffect(() => {
    fetchProfile();
    refreshSubscription();
    // Pick a random chess quote for this session
    const randomQuote = WISDOM_QUOTES[Math.floor(Math.random() * WISDOM_QUOTES.length)];
    setQuote(randomQuote);
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        router.replace('/');
        return;
      }
      const response = await apiClient.get('/user/me');
      if (response.data && response.data.user) {
        setUser({ ...response.data.user, rankName: response.data.rank });
      } else {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  };

  const openDrawer = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const getRankDetails = (solvedCount: number) => {
    const current = RANKS.find(r => solvedCount >= r.min && solvedCount < r.max) || RANKS[0];
    const currentIdx = RANKS.indexOf(current);
    const next = currentIdx < RANKS.length - 1 ? RANKS[currentIdx + 1] : null;

    let progress = 1;
    if (next) {
      const totalRequired = next.min - current.min;
      const currentEarned = solvedCount - current.min;
      progress = currentEarned / totalRequired;
    }

    return {
      currentName: current.name,
      currentColor: current.color,
      nextName: next ? next.name : 'Max Level',
      nextColor: next ? next.color : '#e2e8f0',
      progress: Math.min(Math.max(progress, 0), 1),
      remaining: next ? next.min - solvedCount : 0
    };
  };

  const rankInfo = getRankDetails(user?.solved_count || 0);

  const handleQuickPlay = (lvl: number) => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: '/play',
      params: { quickLevel: lvl.toString() }
    });
  };

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <Header
        title="ChessMazes"
        rightElement={
          <TouchableOpacity style={[styles.profileBtn, { borderColor: colors.primary + '60' }]} onPress={openDrawer}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.profilePic} />
            ) : (
              <LinearGradient
                colors={colors.gradient.primary as [string, string]}
                style={styles.profilePlaceholder}
              >
                <Text style={styles.profileInitial}>
                  {(user?.username || 'P')[0].toUpperCase()}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero Greeting */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.heroSection}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>
            {getGreeting()}{user?.username ? `, ${user.username}` : ''} 👋
          </Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            What would you like{'\n'}to explore today?
          </Text>
        </Animated.View>

        {/* Core Feature Cards */}
        <View style={styles.cardsContainer}>
          <GradientCard
            title="Analyze Games"
            subtitle="Deep-dive analysis powered by Stockfish 18 engine."
            icon={<Activity color={colors.gradient.analyze[0]} size={26} strokeWidth={2.5} />}
            onPress={() => router.push('/analysis')}
            gradientColors={colors.gradient.analyze}
            badge="SF18"
            delay={200}
          />

          <GradientCard
            title="Play vs Computer"
            subtitle="Challenge the AI across 6 difficulty levels."
            icon={<Swords color={colors.gradient.play[0]} size={26} strokeWidth={2.5} />}
            onPress={() => router.push('/play')}
            gradientColors={colors.gradient.play}
            badge="AI"
            delay={300}
          />

          <GradientCard
            title="Custom Board Setup"
            subtitle="Create any position to analyze or play from."
            icon={<PenSquare color={colors.gradient.setup[0]} size={26} strokeWidth={2.5} />}
            onPress={() => router.push('/setup')}
            gradientColors={colors.gradient.setup}
            delay={400}
          />
        </View>

        {/* Chess Wisdom Quote */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(500)}
          style={[styles.quoteCard, {
            backgroundColor: isDark ? colors.surface : colors.surfaceLight,
            borderColor: colors.border,
          }]}
        >
          <View style={[styles.quoteIconBg, { backgroundColor: colors.primaryLight + '15' }]}>
            <BookOpen color={colors.primaryLight} size={18} strokeWidth={2} />
          </View>
          <View style={styles.quoteContent}>
            <Text style={[styles.quoteText, { color: colors.text }]}>
              "{quote.quote}"
            </Text>
            <Text style={[styles.quoteAuthor, { color: colors.textMuted }]}>
              — {quote.author}
            </Text>
          </View>
        </Animated.View>



        <View style={styles.footerSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  profilePic: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    paddingTop: 28,
    paddingBottom: 8,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  cardsContainer: {
    gap: 14,
    marginBottom: 24,
    marginTop: 8,
  },
  quoteCard: {
    flexDirection: 'row',
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  quoteIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  quoteContent: {
    flex: 1,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
    fontWeight: '600',
  },
  quoteAuthor: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  footerSpacing: {
    height: 40,
  },
  // Preserved styles for commented-out widgets (V1 release mode)
  levelProgressCard: {
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    padding: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  levelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankTitleGroup: {
    flex: 1,
  },
  levelCardLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rankLevelName: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  xpCountBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  xpText: {
    fontSize: 11,
    fontWeight: '900',
  },
  progressBarWrapper: {
    marginTop: 14,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    padding: 14,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 88,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: 6,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  quickPlayContainer: {
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  quickPlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  quickPlayTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  quickPlayDesc: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 14,
  },
  quickButtonsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickPlayBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
  },
  quickPlayEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  quickPlayBtnText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  quickPlayLevelText: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
  },
});
