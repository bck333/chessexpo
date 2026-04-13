import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, Platform, StatusBar } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Crown, Swords, Target, Activity, User, Star, Menu, Zap, TrendingUp } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import apiClient from '../../src/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, THEME } from '../../src/constants/theme';
import { Header } from '../../src/components/Header';
import { useTheme } from '../../src/context/ThemeContext';

const { width } = Dimensions.get('window');

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function HomeDashboard() {
  const router = useRouter();
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
          router.replace('/');
          return;
      }
      const response = await apiClient.get('/user/me');
      setUser(response.data);
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const FeatureCard = ({ title, subtitle, icon: Icon, onPress, delay }: any) => (
    <AnimatedTouchableOpacity 
      entering={FadeInUp.delay(delay).duration(600)}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]} 
      onPress={onPress} 
      activeOpacity={0.85}
    >
      <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
      <View style={[styles.cardIconWrapper, { backgroundColor: colors.primary + '15' }]}>
        <Icon color={colors.accent} size={32} strokeWidth={2} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
    </AnimatedTouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <Header 
        title="Dashboard" 
        rightElement={
          <TouchableOpacity style={[styles.profileBtn, { borderColor: colors.primary }]} onPress={openDrawer}>
              {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.profilePic} />
              ) : (
                  <View style={[styles.profilePlaceholder, { backgroundColor: colors.surface }]}>
                      <User color={colors.accent} size={18} />
                  </View>
              )}
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Stats Row */}
        <Animated.View entering={FadeInRight.delay(200)} style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
             <TrendingUp color={colors.accent} size={16} />
             <Text style={[styles.statLabel, { color: colors.textMuted }]}>RANK</Text>
             <Text style={[styles.statValue, { color: colors.text }]}>#{user?.rank || 24}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: isDark ? colors.primary + '20' : colors.primary + '10', borderColor: colors.border }]}>
             <Star color={colors.accent} size={16} fill={colors.accent} />
             <Text style={[styles.statLabel, { color: colors.textMuted }]}>ELO</Text>
             <Text style={[styles.statValue, { color: colors.text }]}>{user?.rating || 1200}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
             <Activity color={colors.success} size={16} />
             <Text style={[styles.statLabel, { color: colors.textMuted }]}>WIN RATE</Text>
             <Text style={[styles.statValue, { color: colors.text }]}>68%</Text>
          </View>
        </Animated.View>

        {/* Action Cards */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Game Modes</Text>
        <View style={styles.cardList}>
          <FeatureCard 
            title="Play vs Computer"
            subtitle="Test your tactics against Stockfish"
            icon={Swords}
            onPress={() => router.push('/play')}
            delay={300}
          />

          <FeatureCard 
            title="Tactics Trainer"
            subtitle="Curated puzzles for your level"
            icon={Target}
            onPress={() => router.push('/puzzles')}
            delay={450}
          />

          <FeatureCard 
            title="Deep Analysis"
            subtitle="Review your games move-by-move"
            icon={Activity}
            onPress={() => router.push('/analysis')}
            delay={600}
          />
        </View>

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
    width: 44,
    height: 44,
    borderRadius: 22,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 8,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  cardList: {
    gap: 16,
  },
  card: {
    borderRadius: THEME.borderRadius.lg,
    padding: 24,
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
    width: 6,
  },
  cardIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  footerSpacing: {
    height: 40,
  }
});
