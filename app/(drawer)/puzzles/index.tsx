import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl, 
  StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Trophy, Star, Target, TrendingUp, Users, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInUp, FadeIn, LinearTransition } from 'react-native-reanimated';
import { COLORS, THEME } from '../../../src/constants/theme';
import { Header } from '../../../src/components/Header';
import { useTheme } from '../../../src/context/ThemeContext';
import apiClient from '../../../src/api/client';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function PuzzleListScreen() {
  const [puzzles, setPuzzles] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchPuzzles(), fetchProfile()]);
    setLoading(false);
  };

  const fetchPuzzles = async () => {
    try {
      const response = await apiClient.get('/puzzles');
      setPuzzles(response.data.data || []);
    } catch (error) {
      console.error('Fetch puzzles error:', error);
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
    await Promise.all([fetchPuzzles(), fetchProfile()]);
    setRefreshing(false);
  };

  const getRank = (count: number) => {
    if (count > 500) return 'Grandmaster';
    if (count > 200) return 'Master';
    if (count > 100) return 'Candidate';
    if (count > 50) return 'Expert';
    return 'Novice';
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <AnimatedTouchableOpacity 
      entering={FadeInUp.delay(100 * (index % 5)).duration(500)}
      layout={LinearTransition}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} 
      onPress={() => router.push(`/puzzles/${item.id}`)}
      activeOpacity={0.7}
      onPressIn={() => {
        // Optional: add a tiny haptic on press-in for "tactility"
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
      <View style={styles.cardHeader}>
         <View style={styles.badgeRow}>
            <View style={[styles.difficultyBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.difficultyText, { color: colors.primaryLight }]}>{item.difficulty.toUpperCase()}</Text>
            </View>
            <View style={[styles.ratingBadge, { backgroundColor: colors.background }]}>
               <Trophy size={10} color={colors.accent} />
               <Text style={[styles.ratingText, { color: colors.text }]}>{item.rating || 1500}</Text>
            </View>
         </View>
         <View style={styles.playsBadge}>
            <Users size={10} color={colors.textMuted} />
            <Text style={[styles.playsText, { color: colors.textMuted }]}>{item.plays || 0}</Text>
         </View>
      </View>

      <View style={styles.contentRow}>
         <View style={styles.textGroup}>
            <Text style={[styles.openingText, { color: colors.primary }]} numberOfLines={1}>{item.opening || 'Tactical Pattern'}</Text>
            <Text style={[styles.puzzleTitle, { color: colors.text }]} numberOfLines={1}>{item.title || 'Practical Exercise'}</Text>
         </View>
         <ChevronRight color={colors.primary} size={20} />
      </View>
      
      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
         <View style={styles.metaInfo}>
            <Target size={12} color={colors.textMuted} />
            <Text style={[styles.ecoText, { color: colors.textMuted }]}>{item.eco || '---'}</Text>
         </View>
         <View style={styles.successInfo}>
            <TrendingUp size={12} color={colors.success} />
            <Text style={[styles.successRateText, { color: colors.success }]}>92% Success</Text>
         </View>
      </View>
    </AnimatedTouchableOpacity>
  );

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

      <View style={styles.header}>

        <Animated.View entering={FadeIn.delay(200)} style={[styles.statsPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
           <View style={styles.statBox}>
              <Trophy color={colors.accent} size={20} />
              <View>
                 <Text style={[styles.statVal, { color: colors.text }]}>{user?.solved_count || 0}</Text>
                 <Text style={[styles.statLabel, { color: colors.textMuted }]}>Solved</Text>
              </View>
           </View>
           <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
              <Target color={colors.primary} size={20} />
              <View>
                 <Text style={[styles.statVal, { color: colors.text }]}>{puzzles.length}</Text>
                 <Text style={[styles.statLabel, { color: colors.textMuted }]}>Available</Text>
              </View>
           </View>
        </Animated.View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading Challenges...</Text>
        </View>
      ) : (
        <FlatList
          data={puzzles}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Target size={48} color={isDark ? colors.surfaceLight : colors.border} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No Challenges</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>We're generating new puzzles for you. Check back shortly!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
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
    padding: 20,
    borderWidth: 1,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
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
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    gap: 16,
  },
  card: {
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    paddingLeft: 24,
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
    width: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 9,
    fontWeight: '900',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '900',
  },
  playsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playsText: {
    fontSize: 10,
    fontWeight: '800',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  textGroup: {
    flex: 1,
  },
  openingText: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  puzzleTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ecoText: {
    fontSize: 10,
    fontWeight: '700',
  },
  successInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  successRateText: {
    fontSize: 10,
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '900',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  }
});
