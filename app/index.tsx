import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import apiClient from '../src/api/client';
import { User, LogIn, Sun, Moon, Laptop, Crown } from 'lucide-react-native';
import { THEME, COLORS } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { GradientButton } from '../src/components/GradientButton';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { mode, setMode, colors, isDark } = useTheme();

  const handleGuestLogin = async () => {
    if (!name) return;
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/guest', { name });
      const { token } = response.data;
      await AsyncStorage.setItem('token', token);
      router.replace('/(drawer)');
    } catch (error: any) {
      console.error('Login error:', error.message);
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    if (mode === 'light') setMode('dark');
    else if (mode === 'dark') setMode('system');
    else setMode('light');
  };

  const ThemeIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Laptop;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Full-screen gradient background */}
      <LinearGradient
        colors={isDark
          ? ['#030712', '#0F172A', '#1E1B4B', '#030712']
          : ['#F8FAFC', '#EEF2FF', '#E0E7FF', '#F8FAFC']
        }
        locations={[0, 0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient decorative circles */}
      <View style={[styles.ambientCircle1, { backgroundColor: colors.primary + '08' }]} />
      <View style={[styles.ambientCircle2, { backgroundColor: colors.accent + '06' }]} />

      {/* Theme Toggle */}
      <Animated.View entering={FadeIn.delay(600)}>
        <TouchableOpacity 
          style={[styles.themeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]} 
          onPress={toggleTheme}
        >
          <ThemeIcon size={18} color={colors.accent} strokeWidth={2} />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.content}>
        {/* Logo Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(600).springify()} style={styles.logoContainer}>
          <LinearGradient
            colors={colors.gradient.primary as [string, string]}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.chessIcon}>♔</Text>
          </LinearGradient>

          <Text style={[styles.title, { color: colors.text }]}>ChessMazes</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Master the game with AI-powered analysis
          </Text>
        </Animated.View>

        {/* Form Section */}
        <Animated.View entering={FadeInUp.delay(300).duration(500).springify()} style={styles.form}>
          <Text style={[styles.label, { color: colors.textMuted }]}>YOUR NAME</Text>
          <View style={[styles.inputContainer, { 
            backgroundColor: isDark ? colors.surface : colors.white, 
            borderColor: name ? colors.primary + '40' : colors.border,
          }]}>
            <User color={colors.textMuted} size={18} strokeWidth={2} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="How should we call you?"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <GradientButton
            title="Start Playing"
            onPress={handleGuestLogin}
            loading={loading}
            disabled={!name}
            gradientColors={[colors.primary, colors.primaryLight]}
            icon={<Crown color={colors.white} size={18} strokeWidth={2.5} />}
          />

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR</Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>

          <GradientButton
            title="Continue with Google"
            onPress={() => {}}
            variant="outline"
            gradientColors={[colors.primary]}
          />
        </Animated.View>

        {/* Version Badge */}
        <Animated.View entering={FadeIn.delay(600)} style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>ChessMazes v1.0 • Powered by Stockfish 18</Text>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientCircle1: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    top: -width * 0.4,
    right: -width * 0.3,
  },
  ambientCircle2: {
    position: 'absolute',
    width: width,
    height: width,
    borderRadius: width * 0.5,
    bottom: -width * 0.3,
    left: -width * 0.3,
  },
  themeToggle: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 10,
  },
  content: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...THEME.shadows.elevated,
  },
  chessIcon: {
    fontSize: 44,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
    maxWidth: 280,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 1.5,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1.5,
    marginBottom: 20,
    paddingHorizontal: 18,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
