import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Menu, Sun, Moon } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
    title: string;
    showBackButton?: boolean;
    rightElement?: React.ReactNode;
    showThemeToggle?: boolean;
}

export const Header = ({ title, showBackButton = false, rightElement, showThemeToggle = true }: HeaderProps) => {
    const navigation = useNavigation();
    const router = useRouter();
    const { colors, isDark, toggleTheme } = useTheme();

    const openDrawer = () => {
        navigation.dispatch(DrawerActions.openDrawer());
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <View style={[styles.header, { 
            backgroundColor: isDark ? 'rgba(23, 18, 41, 0.85)' : 'rgba(255, 255, 255, 0.9)',
            borderBottomColor: isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0, 0, 0, 0.05)',
            shadowColor: colors.primary,
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 15,
            elevation: 10,
        }]}>
            <TouchableOpacity 
                style={[styles.headerBtn, { backgroundColor: colors.surface }]} 
                onPress={showBackButton ? handleBack : openDrawer}
            >
                {showBackButton ? (
                    <ChevronLeft color={colors.text} size={28} />
                ) : (
                    <Menu color={colors.text} size={24} />
                )}
            </TouchableOpacity>

            <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            </View>

            <View style={styles.rightContainer}>
                {showThemeToggle ? (
                    <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surface }]} onPress={toggleTheme}>
                        {isDark ? <Sun color={colors.accent} size={20} /> : <Moon color={colors.accent} size={20} />}
                    </TouchableOpacity>
                ) : (
                    rightElement || <View style={styles.placeholder} />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1.5,
        zIndex: 100,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    titleContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: Platform.OS === 'ios' ? 60 : 40,
        bottom: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    rightContainer: {
        minWidth: 44,
        alignItems: 'flex-end',
        zIndex: 1,
    },
    placeholder: {
        width: 44,
        height: 44,
    }
});
