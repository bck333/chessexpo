import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Dimensions } from 'react-native';
import { useTheme, BoardTheme, PieceSet } from '../../../src/context/ThemeContext';
import { Header } from '../../../src/components/Header';
import { THEME } from '../../../src/constants/theme';
import { Sun, Moon, Laptop, Layout, Palette, Settings } from 'lucide-react-native';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
    const { 
        colors, 
        isDark, 
        mode, 
        setMode, 
        boardTheme, 
        setBoardTheme, 
        pieceSet, 
        setPieceSet, 
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

    const PIECE_SETS: { id: PieceSet; name: string }[] = [
        { id: 'wikipedia', name: 'Wikipedia' },
        { id: 'alpha', name: 'Alpha' },
        { id: 'neo', name: 'Neo' },
        { id: 'cburnett', name: 'Cburnett' },
    ];

    const SettingRow = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: (val: boolean) => void }) => (
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
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
                        <Layout color={colors.primary} size={18} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>ENVIRONMENT</Text>
                    </View>
                    <View style={[styles.themeGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
                        {[
                            { id: 'light', label: 'Light', icon: Sun },
                            { id: 'dark', label: 'Dark', icon: Moon },
                            { id: 'system', label: 'System', icon: Laptop },
                        ].map((t) => (
                            <TouchableOpacity 
                                key={t.id} 
                                style={[
                                    styles.themeOption, 
                                    mode === t.id && { backgroundColor: isDark ? colors.background : colors.white, shadowColor: colors.primary }
                                ]}
                                onPress={() => setMode(t.id as any)}
                            >
                                <t.icon color={mode === t.id ? colors.primary : colors.textMuted} size={20} />
                                <Text style={[styles.themeText, { color: mode === t.id ? colors.text : colors.textMuted }]}>{t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* Board Theme Section */}
                <Animated.View entering={FadeInUp.delay(200)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Palette color={colors.primary} size={18} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>BOARD THEME</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalGrid}>
                        {BOARD_THEMES.map((t) => (
                            <TouchableOpacity 
                                key={t.id}
                                style={[styles.boardOption, { borderColor: boardTheme === t.id ? colors.primary : colors.border }]}
                                onPress={() => setBoardTheme(t.id)}
                            >
                                <View style={styles.boardPreview}>
                                    <View style={[styles.square, { backgroundColor: t.light }]} />
                                    <View style={[styles.square, { backgroundColor: t.dark }]} />
                                    <View style={[styles.square, { backgroundColor: t.dark }]} />
                                    <View style={[styles.square, { backgroundColor: t.light }]} />
                                </View>
                                <Text style={[styles.optionName, { color: boardTheme === t.id ? colors.text : colors.textMuted }]}>{t.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>

                {/* Piece Set Section */}
                <Animated.View entering={FadeInUp.delay(300)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Settings color={colors.primary} size={18} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>PIECE DESIGN</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalGrid}>
                        {PIECE_SETS.map((p) => (
                            <TouchableOpacity 
                                key={p.id}
                                style={[styles.pieceOption, { backgroundColor: colors.surface, borderColor: pieceSet === p.id ? colors.primary : colors.border }]}
                                onPress={() => setPieceSet(p.id)}
                            >
                                <Text style={[styles.optionName, { color: pieceSet === p.id ? colors.text : colors.textMuted }]}>{p.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Animated.View>

                {/* Game Options Section */}
                <Animated.View entering={FadeInUp.delay(400)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Settings color={colors.primary} size={18} />
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>GAMEPLAY OPTIONS</Text>
                    </View>
                    <View style={[styles.optionsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
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
        gap: 12,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 2,
    },
    themeGrid: {
        flexDirection: 'row',
        padding: 6,
        borderRadius: 16,
        borderWidth: 1,
    },
    cardAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
    },
    themeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    horizontalGrid: {
        gap: 12,
    },
    boardOption: {
        width: 100,
        alignItems: 'center',
        gap: 8,
        borderWidth: 2,
        padding: 8,
        borderRadius: 16,
    },
    boardPreview: {
        width: 60,
        height: 60,
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderRadius: 8,
        overflow: 'hidden',
    },
    square: {
        width: '50%',
        height: '50%',
    },
    pieceOption: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 2,
    },
    optionName: {
        fontSize: 12,
        fontWeight: '800',
    },
    optionsList: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
    },
    settingLabel: {
        fontSize: 14,
        fontWeight: '700',
    },
    footer: {
        marginTop: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
    }
});
