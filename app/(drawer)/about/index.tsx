import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Info, Shield, ShieldCheck, Heart } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS, THEME } from '../../../src/constants/theme';
import { Header } from '../../../src/components/Header';
import { useTheme } from '../../../src/context/ThemeContext';

export default function AboutScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Header title="About" />

      <Animated.View entering={FadeIn.duration(800)} style={styles.content}>
          <View style={styles.logoContainer}>
              <View style={[styles.logoIcon, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
                  <ShieldCheck color={colors.accent} size={48} />
              </View>
              <Text style={[styles.appName, { color: colors.text }]}>Tactics Master</Text>
              <Text style={[styles.appVersion, { color: colors.textMuted }]}>Version 2.5.0 (Cyber Cyan Edition)</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
              <View style={styles.infoRow}>
                  <Info color={colors.primary} size={20} />
                  <Text style={[styles.infoText, { color: colors.text }]}>Powered by Stockfish 18 GM-Grade Engine</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                  <Shield color={colors.primary} size={20} />
                  <Text style={[styles.infoText, { color: colors.text }]}>Privacy Policy & Terms</Text>
              </View>
          </View>

          <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textMuted }]}>MADE WITH</Text>
              <Heart color={colors.error} size={16} fill={colors.error} style={styles.heartIcon} />
              <Text style={[styles.footerText, { color: colors.textMuted }]}>FOR CHESS ENTHUSIASTS</Text>
          </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
      flex: 1,
      padding: 32,
      alignItems: 'center',
  },
  logoContainer: {
      alignItems: 'center',
      marginBottom: 48,
  },
  logoIcon: {
      width: 100,
      height: 100,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 15,
      elevation: 10,
  },
  appName: {
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: -1,
  },
  appVersion: {
      fontSize: 13,
      fontWeight: '700',
      marginTop: 4,
  },
  card: {
      width: '100%',
      padding: 24,
      borderRadius: THEME.borderRadius.lg,
      borderWidth: 1,
  },
  cardAccent: {
      position: 'absolute',
      top: 0,
      left: 0,
      bottom: 0,
      width: 6,
      borderTopLeftRadius: THEME.borderRadius.lg,
      borderBottomLeftRadius: THEME.borderRadius.lg,
  },
  infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingVertical: 12,
  },
  infoText: {
      fontSize: 14,
      fontWeight: '700',
  },
  divider: {
      height: 1,
      marginVertical: 8,
  },
  footer: {
      position: 'absolute',
      bottom: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
  },
  footerText: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 2,
  },
  heartIcon: {
      marginHorizontal: 4,
  }
});
