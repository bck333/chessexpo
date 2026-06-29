import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl, 
  StatusBar,
  Platform,
  Dimensions,
  Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { 
  Trophy, 
  Star, 
  Target, 
  ChevronRight, 
  Zap, 
  Swords, 
  Flame, 
  Shield, 
  Compass, 
  BookOpen, 
  Activity, 
  Award, 
  Crown, 
  ShieldAlert, 
  Shuffle, 
  HelpCircle,
  Sparkles
} from 'lucide-react-native';
import Animated, { FadeInUp, FadeIn, LinearTransition } from 'react-native-reanimated';
import { COLORS, THEME } from '../../../src/constants/theme';
import { Header } from '../../../src/components/Header';
import { useTheme } from '../../../src/context/ThemeContext';
import { useSubscription } from '../../../src/context/SubscriptionContext';
import { Category, Difficulty, puzzleApi } from '../../../src/api/puzzles';
import { DifficultySelector } from '../../../src/components/DifficultySelector';
import apiClient from '../../../src/api/client';

const { width } = Dimensions.get('window');

const ICON_MAP: Record<string, any> = {
  'Pin': Zap,
  'Skewer': Target,
  'Fork': Swords,
  'Discovery': Flame,
  'Deflection': Shield,
  'Endgame': Compass,
  'Opening': BookOpen,
  'Middlegame': Activity,
  'Promotion': Award,
  'Mate': Crown,
  'Mate in 1': Crown,
  'Mate in 2': Crown,
  'Hanging': ShieldAlert,
  'Defense': ShieldAlert,
  'Zugzwang': Shuffle,
};

const FALLBACK_DESCRIPTIONS: Record<string, string> = {
  'Pin': 'Paralyze opposing pieces by pinning them against a more valuable target.',
  'Skewer': 'Force a high-value piece to move, exposing a secondary target behind it.',
  'Fork': 'Strike multiple targets simultaneously with a single double attack.',
  'Discovery': 'Unleash a hidden check or threat by moving a screening piece.',
  'Deflection': 'Lure away key defenders from their guard squares to smash their defenses.',
  'Endgame': 'Refine tactical precision in crucial simplified late-game phases.',
  'Opening': 'Pounce on early opening blunders to secure immediate advantage.',
  'Middlegame': 'Formulate mating attacks and tactical breakthroughs in complex fights.',
  'Promotion': 'Maneuver passed pawns to break lines and promote into a Queen.',
  'Mate': 'Hunt the opposing King down in decisive mating net sequences.',
  'Mate in 1': 'Find the direct killing blow that ends the game in one move.',
  'Mate in 2': 'Coordinate your pieces for a forced mate in two precise steps.',
  'Hanging': 'Sharpen your vision to spot and snatch undefended enemy pieces.',
  'Defense': 'Uncover hidden saving resources to draw or escape a lost position.',
  'Zugzwang': 'Squeeze your opponent into a trap where any legal move leads to defeat.',
};

export default function PuzzleListScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { subscription, refreshSubscription } = useSubscription();

  const [categories, setCategories] = useState<Category[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [user, setUser] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchCategories(), fetchProfile(), refreshSubscription()]);
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const [cats, diffs] = await Promise.all([
        puzzleApi.getCategories(),
        puzzleApi.getDifficulties()
      ]);
      setCategories(cats);
      setDifficulties(diffs);
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/user/me');
      setUser(response.data);
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchCategories(), fetchProfile(), refreshSubscription()]);
    setRefreshing(false);
  };

  const getRank = (count: number) => {
    if (count > 500) return 'Grandmaster';
    if (count > 200) return 'Master';
    if (count > 100) return 'Candidate';
    if (count > 50) return 'Expert';
    return 'Novice';
  };

  const handleCategoryPress = (cat: Category) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCategory(cat);
    setShowDifficultySelector(true);
  };

  const handleDifficultySelect = async (diff: Difficulty) => {
    setShowDifficultySelector(false);
    if (!selectedCategory) return;
    
    setLoading(true);
    try {
      const response = await puzzleApi.list({
        category_id: selectedCategory.id,
        difficulty: diff.name,
        limit: 1
      });
      
      const list = response.data || [];
      if (list.length > 0) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigate straight to the chessboard details solver!
        router.push({
          pathname: `/(drawer)/puzzles/${list[0].id}`,
          params: {
            category_id: selectedCategory.id,
            category_name: selectedCategory.name,
            difficulty: diff.name
          }
        });
      } else {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Generating Challenges",
          `We are currently compiling and generating new ${diff.name.toLowerCase()} tactical puzzles for the "${selectedCategory.name}" motif. Please try another difficulty or category while our engine prepares them!`,
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Fetch puzzles error:', error);
      Alert.alert("Connection Error", "Failed to fetch puzzles. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <Header 
        title="Tactics" 
        rightElement={
          <View style={[styles.rankBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Star size={12} color={colors.accent} fill={colors.accent} />
            <Text style={[styles.rankName, { color: colors.text }]}>{getRank(user?.solved_count || 0)}</Text>
          </View>
        }
      />

      {loading && categories.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading Tactical Themes...</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={colors.primary}
            />
          }
        >
          {/* Stats Summary Panel */}
          <Animated.View 
            entering={FadeIn.delay(100)} 
            style={[styles.statsPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
             <View style={styles.statBox}>
                <Trophy color={colors.accent} size={20} />
                <View style={styles.statTextGroup}>
                   <Text style={[styles.statVal, { color: colors.text }]}>{user?.solved_count || 0}</Text>
                   <Text style={[styles.statLabel, { color: colors.textMuted }]}>SOLVED</Text>
                </View>
             </View>
             <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
                <Target color={colors.primary} size={20} />
                <View style={styles.statTextGroup}>
                   <Text style={[styles.statVal, { color: colors.text }]}>
                      {subscription.puzzlesUsedToday}
                      <Text style={[styles.limitText, { color: colors.textMuted }]}>
                          /{subscription.type === 'free' ? '10' : subscription.type === 'starter' ? '30' : subscription.type === 'pro' ? '80' : '∞'}
                      </Text>
                   </Text>
                   <Text style={[styles.statLabel, { color: colors.textMuted }]}>TODAY</Text>
                </View>
             </View>
          </Animated.View>

          {/* Section Divider & Title */}
          <View style={styles.sectionHeader}>
             <Sparkles size={14} color={colors.accent} />
             <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SELECT A TRAINING MOTIF</Text>
          </View>

          {/* Categories / Themes List */}
          <View style={styles.list}>
            {categories.map((cat, index) => {
              const IconComponent = ICON_MAP[cat.name] || HelpCircle;
              const descriptionText = cat.description || FALLBACK_DESCRIPTIONS[cat.name] || 'Master chess tactical patterns to outplay opponents.';
              
              return (
                <TouchableOpacity
                  key={cat.id || index}
                  style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  activeOpacity={0.75}
                  onPress={() => handleCategoryPress(cat)}
                >
                  <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
                  
                  <View style={[styles.iconBox, { backgroundColor: colors.primary + '12' }]}>
                    <IconComponent color={colors.accent} size={22} />
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{cat.name}</Text>
                    <Text style={[styles.cardDescription, { color: colors.textMuted }]} numberOfLines={2}>
                      {descriptionText}
                    </Text>
                  </View>

                  <ChevronRight color={colors.border} size={20} />
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      <DifficultySelector 
        visible={showDifficultySelector}
        onClose={() => setShowDifficultySelector(false)}
        onSelect={handleDifficultySelect}
        difficulties={difficulties}
        categoryName={selectedCategory?.name || ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.md,
    gap: 6,
    borderWidth: 1,
  },
  rankName: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsPanel: {
    flexDirection: 'row',
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  statTextGroup: {
    marginLeft: 2,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 1,
  },
  limitText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  list: {
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: THEME.borderRadius.lg,
    padding: 16,
    paddingLeft: 22,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  cardDescription: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  }
});
