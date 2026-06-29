import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Menu, Sun, Moon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

import Constants from 'expo-constants';

const STATUS_BAR_HEIGHT = Constants.statusBarHeight || (Platform.OS === 'ios' ? 44 : 24);
const HEADER_PADDING_TOP = STATUS_BAR_HEIGHT + 10;

interface HeaderProps {
    title: string;
    showBackButton?: boolean;
    rightElement?: React.ReactNode;
    showThemeToggle?: boolean;
    onBackPress?: () => void;
}

export const Header = ({ title, showBackButton = false, rightElement, showThemeToggle = true, onBackPress }: HeaderProps) => {
    const navigation = useNavigation();
    const router = useRouter();
    const { colors, isDark, toggleTheme } = useTheme();

    const openDrawer = () => {
        navigation.dispatch(DrawerActions.openDrawer());
    };

    const handleBack = () => {
        if (onBackPress) {
            onBackPress();
        } else {
            router.back();
        }
    };

    return (
        <Animated.View
            entering={FadeInDown.duration(400).springify()}
            style={[styles.header, {
                backgroundColor: isDark ? 'rgba(3, 7, 18, 0.92)' : 'rgba(248, 250, 252, 0.95)',
                borderBottomColor: colors.border,
            }]}
        >
            {/* Subtle gradient overlay for depth */}
            <LinearGradient
                colors={isDark
                    ? ['rgba(99, 102, 241, 0.04)', 'transparent']
                    : ['rgba(99, 102, 241, 0.02)', 'transparent']
                }
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <TouchableOpacity
                style={[styles.headerBtn, {
                    backgroundColor: isDark ? colors.surfaceLight : colors.surfaceLight,
                }]}
                onPress={showBackButton ? handleBack : openDrawer}
                activeOpacity={0.7}
            >
                {showBackButton ? (
                    <ChevronLeft color={colors.text} size={22} strokeWidth={2.5} />
                ) : (
                    <Menu color={colors.text} size={20} strokeWidth={2} />
                )}
            </TouchableOpacity>

            <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                    {title}
                </Text>
            </View>

            <View style={styles.rightContainer}>
                {showThemeToggle ? (
                    <TouchableOpacity
                        style={[styles.headerBtn, {
                            backgroundColor: isDark ? colors.surfaceLight : colors.surfaceLight,
                        }]}
                        onPress={toggleTheme}
                        activeOpacity={0.7}
                    >
                        {isDark ? (
                            <Sun color={colors.accent} size={18} strokeWidth={2} />
                        ) : (
                            <Moon color={colors.accent} size={18} strokeWidth={2} />
                        )}
                    </TouchableOpacity>
                ) : (
                    rightElement || <View style={styles.placeholder} />
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: HEADER_PADDING_TOP,
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        zIndex: 100,
        overflow: 'hidden',
    },
    headerBtn: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    titleContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: HEADER_PADDING_TOP,
        bottom: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    rightContainer: {
        minWidth: 42,
        alignItems: 'flex-end',
        zIndex: 1,
    },
    placeholder: {
        width: 42,
        height: 42,
    }
});
