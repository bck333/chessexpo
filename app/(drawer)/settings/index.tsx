import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Dimensions } from 'react-native';
import { useTheme, BoardTheme } from '../../../src/context/ThemeContext';
import { Header } from '../../../src/components/Header';
import { THEME } from '../../../src/constants/theme';
import { Sun, Moon, Laptop, Layout, Palette, Settings } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
    const { 
        colors, 
        isDark, 
        mode, 
        setMode, 
        boardTheme, 
        setBoardTheme, 
        gameOptions, 
        updateGameOptions 
    } = useTheme();

    const BOARD_THEMES: { id: BoardTheme; name: string; light: string; dark: string }[] = [
        { id: 'classic', name: 'Classic', light: '#f0d9b5', dark: '#b58863' },
        { id: 'emerald', name: 'Emerald', light: '#ebecd0', dark: '#779556' },
        { id: 'ocean', name: 'Ocean', light: '#dee3e6', dark: '#8ca2ad' },
        { id: 'charcoal', name: 'Charcoal', light: '#d5d5d5', dark: '#888888' },
        { id: 'wood', name: 'Wood', light: '#dcb35c', dark: '#926432' },
    ];

    const SettingRow = ({ label, value, onToggle, isLast = false }: { label: string; value: boolean; onToggle: (val: boolean) => void; isLast?: boolean }) => (
        <View style={[styles.settingRow, !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
            <Switch 
                value={value} 
                onValueChange={onToggle}
                trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                thumbColor={colors.white}
            />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Settings" />
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {/* App Theme Section */}
                <Animated.View entering={FadeInUp.delay(100)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Layout color={colors.primary} size={16} />
                        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ENVIRONMENT</Text>
                    </View>
                    <View style={[styles.themeGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {[
                            { id: 'light', label: 'Light', icon: Sun },
                            { id: 'dark', label: 'Dark', icon: Moon },
                            { id: 'system', label: 'System', icon: Laptop },
                        ].map((t) => (
                            <TouchableOpacity 
                                key={t.id} 
                                style={[
                                    styles.themeOption, 
                                    mode === t.id && { backgroundColor: isDark ? colors.surfaceLight : colors.surfaceLight }
                                ]}
                                onPress={() => setMode(t.id as any)}
                            >
                                <t.icon color={mode === t.id ? colors.primary : colors.textMuted} size={20} />
                                <Text style={[styles.themeText, { color: mode === t.id ? colors.primary : colors.textMuted }]}>{t.label}</Text>
                                {mode === t.id && <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* Board Theme Section */}
                <Animated.View entering={FadeInUp.delay(200)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Palette color={colors.primary} size={16} />
                        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>BOARD THEME</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalGrid}>
                        {BOARD_THEMES.map((t) => (
                            <TouchableOpacity 
                                key={t.id}
                                style={[
                                    styles.boardOption, 
                                    { borderColor: boardTheme === t.id ? colors.primary : colors.border }
                                ]}
                                onPress={() => setBoardTheme(t.id)}
                            >
                                <View style={styles.boardPreview}>
                                    <View style={[styles.square, { backgroundColor: t.light }]} />
                                    <View style={[styles.square, { backgroundColor: t.dark }]} />
                                    <View style={[styles.square, { backgroundColor: t.dark }]} />
                                    <View style={[styles.square, { backgroundColor: t.light }]} />
                                </View>
                                <Text style={[
                                    styles.optionName, 
                                    { color: boardTheme === t.id ? colors.primary : colors.textMuted }
                                ]}>{t.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>

                {/* Game Options Section */}
                <Animated.View entering={FadeInUp.delay(300)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Settings color={colors.primary} size={16} />
                        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>GAMEPLAY OPTIONS</Text>
                    </View>
                    <View style={[styles.optionsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <SettingRow 
                            label="Show Legal Moves" 
                            value={gameOptions.showLegalMoves} 
                            onToggle={(val) => updateGameOptions({ showLegalMoves: val })} 
                        />
                        <SettingRow 
                            label="Highlight Last Move" 
                            value={gameOptions.highlightLastMove} 
                            onToggle={(val) => updateGameOptions({ highlightLastMove: val })} 
                        />
                        <SettingRow 
                            label="Show Board Coordinates" 
                            value={gameOptions.showCoordinates} 
                            onToggle={(val) => updateGameOptions({ showCoordinates: val })} 
                        />
                        <SettingRow 
                            label="King in Check Indicator" 
                            value={gameOptions.kingInCheckIndicator} 
                            onToggle={(val) => updateGameOptions({ kingInCheckIndicator: val })} 
                        />
                        <SettingRow 
                            label="Always Promote to Queen" 
                            value={gameOptions.alwaysPromoteToQueen} 
                            onToggle={(val) => updateGameOptions({ alwaysPromoteToQueen: val })} 
                            isLast
                        />
                    </View>
                </Animated.View>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textMuted }]}>Customizations apply instantly across all boards.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 60,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    themeGrid: {
        flexDirection: 'row',
        padding: 6,
        borderRadius: THEME.borderRadius.lg,
        borderWidth: 1,
    },
    themeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: THEME.borderRadius.md,
        position: 'relative',
    },
    themeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    activeDot: {
        position: 'absolute',
        bottom: 6,
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    horizontalGrid: {
        gap: 14,
    },
    boardOption: {
        width: 100,
        alignItems: 'center',
        gap: 10,
        borderWidth: 2,
        padding: 10,
        borderRadius: THEME.borderRadius.lg,
    },
    boardPreview: {
        width: 70,
        height: 70,
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderRadius: 10,
        overflow: 'hidden',
    },
    square: {
        width: '50%',
        height: '50%',
    },
    optionName: {
        fontSize: 12,
        fontWeight: '800',
    },
    optionsList: {
        borderRadius: THEME.borderRadius.xl,
        borderWidth: 1,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    settingLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        marginTop: 10,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    }
});
