import React, { useRef, useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Image, 
    ScrollView, 
    Dimensions, 
    Platform, 
    StatusBar,
    TextInput,
    Switch,
    ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { 
    Clock, 
    RotateCcw, 
    User, 
    Cpu, 
    Swords, 
    ChevronLeft 
} from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { COLORS, THEME } from '../../../src/constants/theme';
import { Header } from '../../../src/components/Header';
import { useTheme, BoardTheme, PieceSet } from '../../../src/context/ThemeContext';
import { playMove } from '../../../src/api/engine';
import { getChessboardHtml } from '../../../src/utils/chessboardHtml';

const { width } = Dimensions.get('window');
const BOARD_SIZE = width * 0.95;

const SOUNDS = {
  move: 'https://lichess.org/assets/sound/standard/Move.ogg',
  capture: 'https://lichess.org/assets/sound/standard/Capture.ogg',
  check: 'https://lichess.org/assets/sound/standard/Check.ogg',
  generic: 'https://lichess.org/assets/sound/standard/GenericNotify.ogg',
};

type GameState = 'settings' | 'playing' | 'gameover';

export default function PlayComputerScreen() {
    const webviewRef = useRef<WebView>(null);
    const { colors, isDark, boardTheme, pieceSet, gameOptions } = useTheme();
    
    // Settings state
    const [gameState, setGameState] = useState<GameState>('settings');
    const [userColor, setUserColor] = useState<'w' | 'b' | 'random'>('w');
    const [actualUserColor, setActualUserColor] = useState<'w' | 'b'>('w');
    
    // Difficulty Settings
    const [useElo, setUseElo] = useState(false);
    const [eloRating, setEloRating] = useState(1200);
    const [selectedLevel, setSelectedLevel] = useState(3);
    
    // Time Settings
    const [timeEnabled, setTimeEnabled] = useState(true);
    const [thinkTime, setThinkTime] = useState(3);
    
    const [customPosition, setCustomPosition] = useState('');
    const lastSyncedFen = useRef<string>('');
    const [soundObjects, setSoundObjects] = useState<{ [key: string]: Audio.Sound }>({});
    
    // Game state
    const [fen, setFen] = useState('start');
    const [turn, setTurn] = useState<'w' | 'b'>('w');
    const [history, setHistory] = useState<string[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [boardReady, setBoardReady] = useState(false);
    const [gameOverReason, setGameOverReason] = useState<string | null>(null);

    const boardHtml = React.useMemo(() => {
        return getChessboardHtml({
            orientation: actualUserColor === 'w' ? 'white' : 'black',
            fen: 'start', // Initial placeholder, will be synced via ready handshake
            draggable: true
        }, colors, boardTheme, pieceSet, gameOptions);
    }, [actualUserColor, boardTheme, pieceSet, gameOptions]);

    const difficultyLevels = [
        { level: 1, emoji: '👶', label: 'Level 1', sub: 'Beginner' },
        { level: 2, emoji: '👦', label: 'Level 2', sub: 'Casual' },
        { level: 3, emoji: '🧑', label: 'Level 3', sub: 'Intermediate' },
        { level: 4, emoji: '🧔', label: 'Level 4', sub: 'Advanced' },
        { level: 5, emoji: '👵', label: 'Level 5', sub: 'Strong' },
        { level: 6, emoji: '👴', label: 'Level 6', sub: 'Pro' },
    ];

    const startGame = () => {
        let selectedColor: 'w' | 'b' = userColor === 'random' ? (Math.random() > 0.5 ? 'w' : 'b') : userColor;
        setActualUserColor(selectedColor);
        
        const initialFen = customPosition.trim() || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        
        setGameState('playing');
        setBoardReady(false); // Reset on new game
        setFen(initialFen);
        setTurn(initialFen.includes(' b ') ? 'b' : 'w');
        setHistory([]);
        setGameOverReason(null);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const pasteFromClipboard = async () => {
        const content = await Clipboard.getStringAsync();
        if (content) {
            setCustomPosition(content);
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }
    };

    const handleMessage = async (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'move') {
                // Determine sound and feedback
                if (data.san.includes('+') || data.san.includes('#')) {
                    playSound('check');
                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                } else if (data.san.includes('x')) {
                    playSound('capture');
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } else {
                    playSound('move');
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }

                setFen(data.fen);
                setTurn(data.turn);
                setHistory(prev => [...prev, data.san]);

                if (data.isGameOver) {
                    setGameState('gameover');
                    setGameOverReason(data.gameOverReason);
                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } else if (data.type === 'ready') {
                setBoardReady(true);
            }
        } catch {}
    };

    useEffect(() => {
        if (gameState === 'playing' && turn !== actualUserColor && !isThinking && !gameOverReason && boardReady) {
            const timer = setTimeout(() => {
                makeComputerMove();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [turn, actualUserColor, gameState, gameOverReason, boardReady]);

    useEffect(() => {
        loadSounds();
        return () => {
            Object.values(soundObjects).forEach(s => s.unloadAsync());
        };
    }, []);

    const loadSounds = async () => {
        const loadedSounds: { [key: string]: Audio.Sound } = {};
        for (const [key, url] of Object.entries(SOUNDS)) {
            try {
                const { sound } = await Audio.Sound.createAsync({ uri: url });
                loadedSounds[key] = sound;
            } catch (e) {}
        }
        setSoundObjects(loadedSounds);
    };

    const playSound = async (type: keyof typeof SOUNDS) => {
        if (soundObjects[type]) {
            try { await soundObjects[type].replayAsync(); } catch (e) {}
        }
    };

    // Update WebView theme when colors change
    useEffect(() => {
        if (boardReady) {
            webviewRef.current?.injectJavaScript(`window.postMessage(JSON.stringify({type: 'update_theme', colors: ${JSON.stringify(colors)}}), '*'); true;`);
        }
    }, [colors, boardReady]);

    // Sync FEN changes to WebView without reloading
    useEffect(() => {
        if (boardReady && fen !== lastSyncedFen.current) {
            lastSyncedFen.current = fen;
            webviewRef.current?.injectJavaScript(`window.postMessage(JSON.stringify({type: 'set_fen', fen: '${fen}'}), '*'); true;`);
        }
    }, [fen, boardReady]);

    const makeComputerMove = async () => {
        setIsThinking(true);
        try {
            const result = useElo 
                ? await playMove(fen, 0, eloRating) 
                : await playMove(fen, selectedLevel);
                
            if (result && result.best_move) {
                webviewRef.current?.injectJavaScript(`
                    window.postMessage(JSON.stringify({
                        type: 'engine_move', 
                        move: '${result.best_move}'
                    }), '*');
                    true;
                `);
            }
        } catch (error) {
            console.error('Computer move failed:', error);
        } finally {
            setIsThinking(false);
        }
    };

    const resetGame = () => {
        setGameState('settings');
    };

    if (gameState === 'settings') {
        return (
            <Animated.View entering={FadeIn} style={[styles.settingsLayout, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <Header title="Versus Computer" />
                <View style={styles.engineBadgeContainer}>
                    <Text style={[styles.engineBadgeText, { color: colors.textMuted }]}>POWERED BY </Text>
                    <Text style={[styles.engineNameText, { color: colors.accent }]}>STOCKFISH 18</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Play As Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: colors.text }]}>Play As</Text>
                        <View style={styles.colorSelectionRow}>
                            <TouchableOpacity 
                                style={[styles.colorOption, { backgroundColor: colors.surface, borderColor: colors.border }, userColor === 'w' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]} 
                                onPress={() => setUserColor('w')}
                            >
                                <Image source={{ uri: 'https://chessboardjs.com/img/chesspieces/wikipedia/wN.png' }} style={styles.pieceImage} />
                                <Text style={[styles.colorText, { color: colors.textMuted }, userColor === 'w' && { color: colors.primary }]}>White</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.colorOption, { backgroundColor: colors.surface, borderColor: colors.border }, userColor === 'random' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]} 
                                onPress={() => setUserColor('random')}
                            >
                                <View style={styles.randomPieceContainer}>
                                    <Image source={{ uri: 'https://chessboardjs.com/img/chesspieces/wikipedia/wN.png' }} style={[styles.pieceImage, { marginRight: -20 }]} />
                                    <Image source={{ uri: 'https://chessboardjs.com/img/chesspieces/wikipedia/bN.png' }} style={styles.pieceImage} />
                                </View>
                                <Text style={[styles.colorText, { color: colors.textMuted }, userColor === 'random' && { color: colors.primary }]}>Random</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.colorOption, { backgroundColor: colors.surface, borderColor: colors.border }, userColor === 'b' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]} 
                                onPress={() => setUserColor('b')}
                            >
                                <Image source={{ uri: 'https://chessboardjs.com/img/chesspieces/wikipedia/bN.png' }} style={styles.pieceImage} />
                                <Text style={[styles.colorText, { color: colors.textMuted }, userColor === 'b' && { color: colors.primary }]}>Black</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Play Against Section */}
                    <View style={styles.section}>
                        <View style={styles.rowBetween}>
                            <Text style={[styles.sectionLabel, { color: colors.text }]}>Difficulty</Text>
                            <View style={[styles.toggleGroup, { backgroundColor: colors.surface }]}>
                                <Text style={[styles.toggleLabel, { color: colors.textMuted }]}>ELO Mode</Text>
                                <Switch 
                                    value={useElo} 
                                    onValueChange={setUseElo}
                                    trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                                    thumbColor={colors.white}
                                />
                            </View>
                        </View>

                        {useElo ? (
                            <View style={[styles.eloContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <TextInput 
                                    style={[styles.eloInput, { color: colors.primary }]}
                                    value={eloRating.toString()}
                                    onChangeText={(val) => setEloRating(parseInt(val) || 800)}
                                    keyboardType="numeric"
                                    maxLength={4}
                                />
                                <Text style={[styles.sliderHint, { color: colors.textMuted }]}>Rating: {eloRating} ELO</Text>
                            </View>
                        ) : (
                            <View style={styles.levelGrid}>
                                {difficultyLevels.map((item) => (
                                    <TouchableOpacity 
                                        key={item.level}
                                        style={[styles.levelBox, { backgroundColor: colors.surface, borderColor: colors.border }, selectedLevel === item.level && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}
                                        onPress={() => setSelectedLevel(item.level)}
                                    >
                                        <Text style={styles.levelEmoji}>{item.emoji}</Text>
                                        <Text style={[styles.levelLabel, { color: colors.text }, selectedLevel === item.level && { color: colors.primary }]}>{item.label}</Text>
                                        <Text style={[styles.levelSubText, { color: colors.textMuted }]}>{item.sub}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Time Section */}
                    <View style={styles.section}>
                        <View style={styles.rowBetween}>
                            <Text style={[styles.sectionLabel, { color: colors.text }]}>Time Control</Text>
                            <View style={[styles.toggleGroup, { backgroundColor: colors.surface }]}>
                                <Clock size={18} color={colors.accent} style={{ marginRight: 8 }} />
                                <Switch 
                                    value={timeEnabled} 
                                    onValueChange={setTimeEnabled}
                                    trackColor={{ false: colors.surfaceLight, true: colors.primary }}
                                    thumbColor={colors.white}
                                />
                            </View>
                        </View>
                        {timeEnabled && (
                            <View style={[styles.timeControl, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={styles.thinkTimeButtons}>
                                    {[1, 3, 5, 10].map(val => (
                                        <TouchableOpacity 
                                            key={val} 
                                            style={[styles.timeBtn, { backgroundColor: colors.background }, thinkTime === val && { backgroundColor: colors.primary }]}
                                            onPress={() => setThinkTime(val)}
                                        >
                                            <Text style={[styles.timeBtnText, { color: colors.textMuted }, thinkTime === val && { color: colors.white }]}>{val}s</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Start Position Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: colors.text }]}>Start Position</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <TextInput 
                                style={[styles.fenInput, { color: colors.text }]}
                                placeholder="Paste FEN/PGN here..."
                                placeholderTextColor={colors.textMuted}
                                value={customPosition}
                                onChangeText={setCustomPosition}
                                multiline
                            />
                            <TouchableOpacity style={[styles.pasteBtn, { backgroundColor: colors.primary }]} onPress={pasteFromClipboard}>
                                <Text style={styles.pasteBtnText}>PASTE</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>

                {/* Footer Button */}
                <TouchableOpacity style={[styles.footerStartBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={startGame}>
                    <Text style={styles.footerStartBtnText}>START GAME</Text>
                </TouchableOpacity>
            </Animated.View>
        );
    }
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <Header title="Playing AI" />
            <View style={styles.gameHeader}>
                <View style={[styles.playerInfo, { backgroundColor: colors.surface }, turn === actualUserColor ? { borderColor: colors.primary, borderWidth: 1 } : null]}>
                    <User color={turn === actualUserColor ? colors.accent : colors.textMuted} size={20} />
                    <Text style={[styles.playerName, { color: colors.textMuted }, turn === actualUserColor ? { color: colors.text } : null]}>You</Text>
                </View>
                <View style={styles.vsBadge}>
                    <Text style={[styles.vsText, { color: colors.textMuted }]}>VS</Text>
                </View>
                <View style={[styles.playerInfo, { backgroundColor: colors.surface }, turn !== actualUserColor ? { borderColor: colors.primary, borderWidth: 1 } : null]}>
                    <Cpu color={turn !== actualUserColor ? colors.accent : colors.textMuted} size={20} />
                    <Text style={[styles.playerName, { color: colors.textMuted }, turn !== actualUserColor ? { color: colors.text } : null]}>
                        {useElo ? `ELO ${eloRating}` : difficultyLevels.find(l => l.level === selectedLevel)?.sub || 'Computer'}
                    </Text>
                    {isThinking && (
                        <View style={styles.thinkingDotContainer}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={[styles.thinkingText, { color: colors.primary }]}>Thinking...</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={[styles.boardContainer, { backgroundColor: colors.surface }]}>
                <WebView
                    ref={webviewRef}
                    originWhitelist={['*']}
                    source={{ html: boardHtml }}
                    style={styles.webview}
                    onMessage={handleMessage}
                    scrollEnabled={false}
                    bounces={false}
                />
            </View>

            <View style={styles.footer}>
                <ScrollView horizontal style={styles.historyList} contentContainerStyle={{ alignItems: 'center' }}>
                    {history.map((move, i) => (
                        <View key={i} style={[styles.historyItem, { backgroundColor: colors.surface }]}>
                             <Text style={[styles.historyMoveNum, { color: colors.textMuted }]}>{i % 2 === 0 ? `${Math.floor(i/2) + 1}.` : ''}</Text>
                             <Text style={[styles.historyMove, { color: colors.text }]}>{move}</Text>
                        </View>
                    ))}
                </ScrollView>

                <View style={styles.controls}>
                    <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.surfaceLight }]} onPress={resetGame}>
                        <RotateCcw size={20} color={colors.white} />
                        <Text style={[styles.controlBtnText, { color: colors.white }]}>Quit Game</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {gameState === 'gameover' && (
                <Animated.View entering={FadeIn} style={[styles.overlay, { backgroundColor: isDark ? 'rgba(12, 10, 9, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
                    <View style={[styles.gameOverCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Swords size={48} color={colors.accent} />
                        <Text style={[styles.gameOverTitle, { color: colors.text }]}>Game Over</Text>
                        <Text style={[styles.gameOverReason, { color: colors.accent }]}>{gameOverReason}</Text>
                        <TouchableOpacity style={[styles.newGameBtn, { backgroundColor: colors.primary }]} onPress={resetGame}>
                            <Text style={[styles.newGameBtnText, { color: colors.white }]}>Another Match</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    settingsLayout: {
        flex: 1,
    },
    engineBadgeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        opacity: 0.8,
    },
    engineBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    engineNameText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 32,
    },
    sectionLabel: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 16,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    toggleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: THEME.borderRadius.md,
    },
    toggleLabel: {
        marginRight: 8,
        fontWeight: '700',
        fontSize: 12,
    },
    colorSelectionRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    colorOption: {
        flex: 1,
        paddingVertical: 20,
        borderRadius: THEME.borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
    },
    colorText: {
        marginTop: 12,
        fontWeight: '800',
        fontSize: 12,
    },
    pieceImage: {
        width: 48,
        height: 48,
    },
    randomPieceContainer: {
        width: 48,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    eloContainer: {
        padding: 24,
        borderRadius: THEME.borderRadius.lg,
        marginTop: 8,
        alignItems: 'center',
        borderWidth: 1,
    },
    eloInput: {
        fontSize: 40,
        fontWeight: '900',
        textAlign: 'center',
        width: '100%',
    },
    sliderHint: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 4,
    },
    levelGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        marginTop: 8,
    },
    levelBox: {
        width: (width - 40 - 24) / 3,
        paddingVertical: 16,
        borderRadius: THEME.borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    levelEmoji: {
        fontSize: 28,
        marginBottom: 8,
    },
    levelLabel: {
        fontSize: 12,
        fontWeight: '900',
    },
    levelSubText: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
    },
    timeControl: {
        marginTop: 8,
        padding: 16,
        borderRadius: THEME.borderRadius.lg,
        borderWidth: 1,
    },
    thinkTimeButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    timeBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: THEME.borderRadius.md,
        alignItems: 'center',
    },
    timeBtnText: {
        fontWeight: '800',
    },
    inputContainer: {
        marginTop: 8,
        padding: 16,
        borderRadius: THEME.borderRadius.lg,
        borderWidth: 1,
    },
    fenInput: {
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    pasteBtn: {
        alignSelf: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: THEME.borderRadius.sm,
        marginTop: 10,
    },
    pasteBtnText: {
        fontSize: 10,
        fontWeight: '900',
    },
    footerStartBtn: {
        marginHorizontal: 20,
        marginBottom: 30,
        paddingVertical: 18,
        borderRadius: THEME.borderRadius.lg,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
    },
    footerStartBtnText: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    container: {
        flex: 1,
    },
    gameHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: THEME.borderRadius.md,
        gap: 8,
        flex: 1,
    },
    playerName: {
        fontWeight: '800',
        fontSize: 12,
    },
    vsBadge: {
        width: 32,
        alignItems: 'center',
    },
    vsText: {
        fontSize: 10,
        fontWeight: '900',
    },
    boardContainer: {
        width: BOARD_SIZE,
        height: BOARD_SIZE,
        alignSelf: 'center',
        borderRadius: THEME.borderRadius.md,
        overflow: 'hidden',
        elevation: 10,
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    footer: {
        flex: 1,
        paddingVertical: 20,
    },
    historyList: {
        paddingHorizontal: 20,
        maxHeight: 60,
    },
    historyItem: {
        flexDirection: 'row',
        marginRight: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: THEME.borderRadius.md,
    },
    historyMoveNum: {
        fontSize: 13,
        fontWeight: '700',
        marginRight: 4,
    },
    historyMove: {
        fontSize: 13,
        fontWeight: '800',
    },
    thinkingDotContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
        gap: 4,
    },
    thinkingText: {
        fontSize: 10,
        fontWeight: '700',
    },
    controls: {
        paddingHorizontal: 20,
        marginTop: 20,
    },
    controlBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: THEME.borderRadius.lg,
    },
    controlBtnText: {
        fontWeight: '800',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    gameOverCard: {
        width: '100%',
        padding: 40,
        borderRadius: THEME.borderRadius.xl,
        alignItems: 'center',
        borderWidth: 1,
    },
    gameOverTitle: {
        fontSize: 28,
        fontWeight: '900',
        marginTop: 20,
    },
    gameOverReason: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 8,
    },
    newGameBtn: {
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: THEME.borderRadius.lg,
        marginTop: 32,
    },
    newGameBtnText: {
        fontWeight: '900',
        fontSize: 16,
    },
});
