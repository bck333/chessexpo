import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { 
  Home, 
  Trophy, 
  Star, 
  Zap, 
  Swords, 
  Target, 
  Activity, 
  PenSquare, 
  Settings, 
  Crown, 
  Info,
  User,
  ChevronRight,
  ChevronDown,
  BookOpen
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { THEME } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { useSubscription } from '../../src/context/SubscriptionContext';
import apiClient from '../../src/api/client';
import { puzzleApi, Category } from '../../src/api/puzzles';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

function CustomDrawerContent(props: any) {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, isDark } = useTheme();
  const { subscription } = useSubscription();
  const [user, setUser] = useState<any>(null);
  const insets = useSafeAreaInsets();

  const [learnExpanded, setLearnExpanded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchCategories();
  }, [pathname]);

  const fetchCategories = async () => {
    try {
      setLoadingCats(true);
      const cats = await puzzleApi.getCategories();
      if (Array.isArray(cats)) {
        setCategories(cats);
      }
    } catch (err) {
      console.warn('Drawer fetch categories error:', err);
    } finally {
      setLoadingCats(false);
    }
  };

  const defaultPieces = [
    { id: 'rook', label: 'Rook Lesson 🏰', emoji: '🏰' },
    { id: 'bishop', label: 'Bishop Lesson ♝', emoji: '♝' },
    { id: 'knight', label: 'Knight Lesson ♞', emoji: '♞' },
    { id: 'queen', label: 'Queen Lesson ♛', emoji: '♛' },
    { id: 'king', label: 'King Lesson ♚', emoji: '♚' },
    { id: 'pawn', label: 'Pawn Lesson ♟️', emoji: '♟️' },
  ];

  const handleSelectPiece = async (pieceId: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    props.navigation.closeDrawer();

    const match = categories.find(
      c => c.name.toLowerCase() === pieceId.toLowerCase()
    );

    if (match) {
      try {
        const puzzlesRes = await puzzleApi.list({ category_id: match.id, page: 1, limit: 1 });
        if (puzzlesRes && puzzlesRes.puzzles && puzzlesRes.puzzles.length > 0) {
          const firstPuzzle = puzzlesRes.puzzles[0];
          router.push({
            pathname: '/(drawer)/puzzles/[id]',
            params: {
              id: firstPuzzle.id,
              category_id: match.id,
              difficulty: firstPuzzle.difficulty || 'Easy',
            }
          });
          return;
        }
      } catch (error) {
        console.error('Error fetching dynamic piece puzzles:', error);
      }
    }

    router.push({
      pathname: '/(drawer)/learn',
      params: { lesson: pieceId }
    });
  };

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/user/me');
      if (response.data && response.data.user) {
        setUser({ ...response.data.user, rankName: response.data.rank });
      } else {
        setUser(response.data);
      }
    } catch (e) {
      console.error('Drawer fetch profile error:', e);
    }
  };

  const handleNavigate = (route: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    props.navigation.closeDrawer();
    router.push(route);
  };

  const isActive = (route: string) => {
    if (route === '/' && pathname === '/') return true;
    if (route !== '/' && pathname.startsWith(route)) return true;
    return false;
  };

  const renderMenuItem = (label: string, route: string, Icon: any, isSpecial = false) => {
    const active = isActive(route);
    return (
      <TouchableOpacity
        style={[
          styles.menuItem,
          active && { backgroundColor: colors.primary + '12' },
        ]}
        activeOpacity={0.7}
        onPress={() => handleNavigate(route)}
      >
        <View style={[
          styles.menuIconBox,
          { backgroundColor: active ? colors.primary + '20' : isDark ? colors.surfaceLight : colors.surfaceLight },
        ]}>
          <Icon
            color={active ? colors.primary : colors.textMuted}
            size={18}
            strokeWidth={active ? 2.5 : 2}
          />
        </View>
        <Text style={[
          styles.menuItemText,
          { color: active ? colors.text : colors.textSecondary },
          active && { fontWeight: '800' }
        ]}>
          {label}
        </Text>
        {isSpecial ? (
          <LinearGradient
            colors={[colors.accent, colors.accentLight] as [string, string]}
            style={styles.proBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.proBadgeText}>PRO</Text>
          </LinearGradient>
        ) : (
          <ChevronRight color={active ? colors.primary + '60' : colors.border} size={14} strokeWidth={2} />
        )}
        {active && (
          <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}>
      
      {/* Premium Profile Header */}
      <LinearGradient
        colors={isDark
          ? [colors.primary + '15', colors.surface]
          : [colors.primary + '08', colors.surface]
        }
        style={[styles.profileHeader, { borderBottomColor: colors.border, paddingTop: Math.max(insets.top + 10, 24) }]}
      >
        <View style={styles.profileRow}>
          <View style={[styles.avatarContainer]}>
            <LinearGradient
              colors={colors.gradient.primary as [string, string]}
              style={styles.avatarGradientRing}
            >
              <View style={[styles.avatarInner, { backgroundColor: colors.background }]}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                    {(user?.username || 'P')[0].toUpperCase()}
                  </Text>
                )}
              </View>
            </LinearGradient>
          </View>
          <View style={styles.profileTextContainer}>
            <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
              {user?.username || 'Chess Player'}
            </Text>
            <Text style={[styles.userTagline, { color: colors.textMuted }]}>
              ChessMazes Explorer
            </Text>
            {/* V1 RELEASE MODE: Hide progress rank
            <Text style={[styles.userRank, { color: colors.primaryLight }]}>
              🌱 {user?.rankName || 'Beginner'}
            </Text>
            */}
          </View>
        </View>

        {/* V1 RELEASE MODE: Hide user progress statistics
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={[styles.statValue, { color: colors.text }]}>🏆 {user?.solved_count || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Solved</Text>
          </View>
          <View style={[styles.statChip, { borderLeftWidth: 1, borderLeftColor: colors.border, borderRightWidth: 1, borderRightColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>🔥 {user?.StreakCount || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Streak</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={[styles.statValue, { color: colors.text }]}>⭐ {user?.XP || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>XP</Text>
          </View>
        </View>
        */}
      </LinearGradient>

      {/* Menu List */}
      <View style={styles.menuList}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>MAIN MENU</Text>
        
        {renderMenuItem('Home', '/', Home)}
        
        {/* V1 RELEASE MODE: Hide Learn & Puzzles modules
        <TouchableOpacity
          style={[
            styles.menuItem,
            { backgroundColor: learnExpanded ? colors.primary + '10' : 'transparent' }
          ]}
          activeOpacity={0.7}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.selectionAsync();
            setLearnExpanded(!learnExpanded);
          }}
        >
          <View style={[styles.menuIconBox, { backgroundColor: learnExpanded ? colors.primary + '1a' : colors.surfaceLight }]}>
            <BookOpen color={learnExpanded ? colors.accent : colors.textMuted} size={20} />
          </View>
          <Text style={[styles.menuItemText, { color: colors.text }]}>
            Learn Chess 🎓
          </Text>
          {learnExpanded ? (
            <ChevronDown color={colors.accent} size={16} />
          ) : (
            <ChevronRight color={colors.border} size={16} />
          )}
        </TouchableOpacity>

        {learnExpanded && (
          <Animated.View entering={FadeInDown.duration(200)} style={styles.subItemsList}>
            <TouchableOpacity
              style={[
                styles.drawerSubItem,
                pathname === '/learn' && { backgroundColor: colors.primary + '15', borderLeftWidth: 3, borderLeftColor: colors.accent }
              ]}
              onPress={() => handleNavigate('/learn')}
            >
              <Text style={[styles.drawerSubItemText, { color: colors.text }]}>
                🌟 Basics Course
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.drawerSubItem,
                pathname === '/categories' && { backgroundColor: colors.primary + '15', borderLeftWidth: 3, borderLeftColor: colors.accent }
              ]}
              onPress={() => handleNavigate('/categories')}
            >
              <Text style={[styles.drawerSubItemText, { color: colors.text }]}>
                🎯 Practice Puzzles
              </Text>
            </TouchableOpacity>

            <Text style={[styles.subSectionTitle, { color: colors.textMuted }]}>PIECE TUTORIALS</Text>
            {defaultPieces.map(piece => (
              <TouchableOpacity
                key={piece.id}
                style={styles.drawerSubItem}
                onPress={() => handleSelectPiece(piece.id)}
              >
                <Text style={[styles.drawerSubItemText, { color: colors.text }]}>
                  {piece.emoji} {piece.label}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}
        {renderMenuItem('Tactics Training', '/puzzles', Target)}
        */}

        {renderMenuItem('Play vs AI', '/play', Swords)}
        {renderMenuItem('Analysis Board', '/analysis', Activity)}
        {renderMenuItem('Board Setup', '/setup', PenSquare)}
        
        <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PREFERENCES</Text>
        
        {renderMenuItem('Settings', '/settings', Settings)}
        
        {/* V1 RELEASE MODE: Hide subscription and about
        {renderMenuItem('Upgrade to Premium', '/subscription', Crown, subscription.type === 'free')}
        {renderMenuItem('About ChessMazes', '/about', Info)}
        */}
      </View>

      {/* Footer */}
      <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
        <View style={[styles.footerBrand]}>
          <Text style={styles.footerChessIcon}>♔</Text>
          <View>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>ChessMazes v1.0</Text>
            <Text style={[styles.footerSubText, { color: colors.textMuted }]}>Powered by Stockfish 18</Text>
          </View>
        </View>
      </View>

    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  const { colors } = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.background,
          width: 300,
        },
      }}
    >
      <Drawer.Screen name="index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="play/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="puzzles/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="analysis/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="setup/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="categories/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="settings/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="learn/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="subscription/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="about/index" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="puzzles/[id]" options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingTop: 0,
  },
  // Sub-items (preserved for commented-out Learn section)
  subItemsList: {
    paddingLeft: 20,
    borderLeftWidth: 1.5,
    borderLeftColor: 'rgba(150,150,150,0.15)',
    marginLeft: 28,
    marginVertical: 4,
    gap: 4,
  },
  drawerSubItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 1,
  },
  drawerSubItemText: {
    fontSize: 13,
    fontWeight: '700',
  },
  subSectionTitle: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 4,
    marginLeft: 12,
    textTransform: 'uppercase',
  },
  // Profile Header
  profileHeader: {
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarContainer: {
    // Outer wrapper
  },
  avatarGradientRing: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '900',
  },
  profileTextContainer: {
    flex: 1,
  },
  username: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  userTagline: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  userRank: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  // Stats (preserved for commented-out section)
  statsRow: {
    flexDirection: 'row',
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150,150,150,0.15)',
  },
  statChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Menu
  menuList: {
    padding: 16,
    gap: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginLeft: 14,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionDivider: {
    height: 1,
    marginVertical: 12,
    marginHorizontal: 14,
    opacity: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Footer
  drawerFooter: {
    marginTop: 'auto',
    padding: 24,
    borderTopWidth: 1,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerChessIcon: {
    fontSize: 22,
    opacity: 0.4,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerSubText: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  }
});
