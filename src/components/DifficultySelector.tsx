import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Target, Zap, Shield, Flame, X } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import THEME from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Difficulty } from '../api/puzzles';

interface DifficultySelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (difficulty: Difficulty) => void;
  difficulties: Difficulty[];
  categoryName: string;
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({ 
  visible, 
  onClose, 
  onSelect, 
  difficulties,
  categoryName 
}) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <Animated.View 
          entering={FadeInUp ? FadeInUp.duration(300) : undefined}
          style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>SELECT DIFFICULTY</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Tactic: {categoryName}</Text>
          </View>

          <View style={styles.list}>
            {difficulties.map((diff, index) => (
              <TouchableOpacity 
                key={diff.id} 
                style={[styles.item, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => onSelect(diff)}
              >
                <View style={[styles.levelIndicator, { backgroundColor: getDifficultyColor(diff.name, colors) }]} />
                <View style={styles.itemContent}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{diff.name}</Text>
                  <Text style={[styles.itemDesc, { color: colors.textMuted }]}>{diff.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
             <X color={colors.textMuted} size={20} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const getDifficultyColor = (name: string | undefined, colors: any) => {
  if (!name) return colors.primary;
  switch (name.toLowerCase()) {
    case 'easy': return '#4CAF50';
    case 'medium': return '#FFC107';
    case 'hard': return '#F44336';
    case 'expert': return '#9C27B0';
    default: return colors.primary;
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    padding: 24,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
  },
  levelIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  }
});
