import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Zap, Target, Swords, Shield, Search, Flame, LayoutGrid } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { COLORS, THEME } from '../../../src/constants/theme';
import { Header } from '../../../src/components/Header';
import { useTheme } from '../../../src/context/ThemeContext';
import { Category, Difficulty, puzzleApi } from '../../../src/api/puzzles';
import { DifficultySelector } from '../../../src/components/DifficultySelector';

const { width } = Dimensions.get('window');

const ICON_MAP: Record<string, any> = {
    'Pin': Zap,
    'Skewer': Target,
    'Fork': Swords,
    'Discovery': Flame,
    'Deflection': Shield,
    'Endgame': Search,
};

export default function CategoriesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cats, diffs] = await Promise.all([
        puzzleApi.getCategories(),
        puzzleApi.getDifficulties()
      ]);
      setCategories(cats);
      setDifficulties(diffs);
    } catch (error) {
      console.error('Fetch categories error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (cat: Category) => {
    setSelectedCategory(cat);
    setShowDifficultySelector(true);
  };

  const handleDifficultySelect = (diff: Difficulty) => {
    setShowDifficultySelector(false);
    if (selectedCategory) {
      router.push({
        pathname: '/(drawer)/puzzles',
        params: { 
          category_id: selectedCategory.id,
          category_name: selectedCategory.name,
          difficulty: diff.name 
        }
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Header title="Categories" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>SELECT A MOTIF</Text>
          <View style={styles.grid}>
              {categories.map((cat, index) => {
                  const Icon = ICON_MAP[cat.name] || LayoutGrid;
                  return (
                    <Animated.View 
                        key={cat.id || index} 
                        entering={FadeInUp.delay(index * 100).duration(500)}
                        style={styles.cardWrapper}
                    >
                        <TouchableOpacity 
                          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} 
                          activeOpacity={0.85}
                          onPress={() => handleCategoryPress(cat)}
                        >
                            <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
                            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                                <Icon color={colors.accent} size={24} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={[styles.cardName, { color: colors.text }]}>{cat.name}</Text>
                                <Text style={[styles.cardCount, { color: colors.textMuted }]}>Training Available</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
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
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
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
