import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Crown, X, ArrowRight, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import THEME from '../constants/theme';
import Animated, { FadeIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  feature: string;
  limit?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ visible, onClose, feature, limit }) => {
  const { colors } = useTheme();
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    router.push('/(drawer)/subscription');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeIn ? FadeIn.duration(300) : undefined}
          style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
            <Crown size={40} color={colors.accent} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Limit Reached</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            You've hit your daily limit for <Text style={{ color: colors.accent, fontWeight: '900' }}>{feature}</Text>. 
            {limit ? ` (${limit} available on your current plan)` : ''}
          </Text>

          <View style={[styles.benefitBox, { backgroundColor: colors.background }]}>
            <Sparkles size={16} color={colors.accent} />
            <Text style={[styles.benefitText, { color: colors.text }]}>Unlock unlimited training & deep analysis</Text>
          </View>

          <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: colors.primary }]} onPress={handleUpgrade}>
            <Text style={styles.upgradeText}>Unlock Full Training</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.maybeLater} onPress={onClose}>
            <Text style={[styles.maybeLaterText, { color: colors.textMuted }]}>Maybe Later</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  benefitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 32,
  },
  benefitText: {
    fontSize: 12,
    fontWeight: '700',
  },
  upgradeBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  upgradeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  maybeLater: {
    marginTop: 20,
  },
  maybeLaterText: {
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
