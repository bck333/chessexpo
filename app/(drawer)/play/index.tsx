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
    ActivityIndicator,
    Alert,
    BackHandler
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { injectWebViewMessage } from '../../../src/utils/chess';
import { 
    Clock, 
    RotateCcw, 
    User, 
    Cpu, 
    Swords, 
    ChevronLeft,
    Lightbulb,
    Search,
    ChevronDown,
    ChevronUp,
    Settings,
    Trophy,
    Zap
} from 'lucide-react-native';
import Animated, { FadeIn, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import * as Clipboard from 'expo-clipboard';
import { COLORS, THEME } from '../../../src/constants/theme';
import { Header } from '../../../src/components/Header';
import { GradientButton } from '../../../src/components/GradientButton';
import { UpgradeModal } from '../../../src/components/UpgradeModal';
import { useTheme, BoardTheme, PieceSet } from '../../../src/context/ThemeContext';
import { useSubscription } from '../../../src/context/SubscriptionContext';
import { playMove, analyzePosition } from '../../../src/api/engine';
import apiClient from '../../../src/api/client';
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

const DIFFICULTY_COLORS: { [key: number]: string[] } = {
  1: ['#22C55E', '#16A34A'],
  2: ['#34D399', '#10B981'],
  3: ['#3B82F6', '#2563EB'],
  4: ['#6366F1', '#4F46E5'],
  5: ['#A855F7', '#9333EA'],
  6: ['#EF4444', '#DC2626'],
};

export default function PlayComputerScreen() {
    const webviewRef = useRef<WebView>(null);
    const router = useRouter();
    const isFocused = useIsFocused();
    const { colors, isDark, boardTheme, pieceSet, gameOptions } = useTheme();
    const { subscription, triggerUpgrade } = useSubscription();
    
    // Upgrade modal state
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeLimitFeature, setUpgradeLimitFeature] = useState('games');
    
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
    const hasAutoStarted = useRef(false);
    const [soundObjects, setSoundObjects] = useState<{ [key: string]: Audio.Sound }>({});
    
    const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    // Game state
    const [fen, setFen] = useState(START_FEN);
    const [turn, setTurn] = useState<'w' | 'b'>('w');
    const [history, setHistory] = useState<string[]>([START_FEN]); // Store FENs
    const [moveNames, setMoveNames] = useState<string[]>([]); // Store SANs
    const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
    const [isThinking, setIsThinking] = useState(false);
    const [boardReady, setBoardReady] = useState(false);
    const [gameOverReason, setGameOverReason] = useState<string | null>(null);
    const [hintsAllowed, setHintsAllowed] = useState(3);
    const [isHinting, setIsHinting] = useState(false);
    const [engineEval, setEngineEval] = useState<number | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState<'abort' | 'resign' | null>(null);
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;

    const resetGameState = () => {
        setGameState('settings');
        setFen(START_FEN);
        setHistory([START_FEN]);
        setMoveNames([]);
        setCurrentMoveIndex(0);
        setEngineEval(null);
        setGameOverReason(null);
        hasAutoStarted.current = false;
        router.setParams({ setupFen: '', quickLevel: '' });
    };

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                if (gameStateRef.current === 'playing') {
                    Alert.alert(
                        "Exit Game?",
                        "Are you sure you want to exit? Your progress will be lost.",
                        [
                            { text: "Cancel", style: "cancel" },
                            { 
                                text: "Exit", 
                                style: "destructive", 
                                onPress: () => {
                                    resetGameState();
                                    router.back();
                                }
                            }
                        ]
                    );
                    return true;
                }
                resetGameState();
                return false;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                subscription.remove();
                resetGameState();
            };
        }, [])
    );

    // Shimmer animation for thinking indicator
    const shimmerOffset = useSharedValue(0);
    useEffect(() => {
        if (isThinking) {
            shimmerOffset.value = withRepeat(
                withTiming(1, { duration: 1200 }),
                -1,
                false
            );
        } else {
            shimmerOffset.value = 0;
        }
    }, [isThinking]);

    const shimmerStyle = useAnimatedStyle(() => ({
        opacity: 0.3 + shimmerOffset.value * 0.7,
    }));

    const boardHtml = React.useMemo(() => {
        return getChessboardHtml({
            orientation: 'white',
            fen: 'start', // Initial placeholder, will be synced via ready handshake
            draggable: true
        }, colors, boardTheme, pieceSet, gameOptions);
    }, [boardTheme, pieceSet, gameOptions]);

    useEffect(() => {
        if (boardReady) {
            injectWebViewMessage(webviewRef, { type: 'set_orientation', orientation: actualUserColor === 'w' ? 'white' : 'black' });
        }
    }, [actualUserColor, boardReady]);

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
        setHistory([initialFen]);
        setMoveNames([]);
        setCurrentMoveIndex(0);
        setGameOverReason(null);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const { quickLevel, setupFen } = useLocalSearchParams();

    useEffect(() => {
        if (hasAutoStarted.current) return;
        if (setupFen) {
            hasAutoStarted.current = true;
            const fenStr = setupFen as string;
            setCustomPosition(fenStr);
            setUseElo(false);
            setUserColor('w');
            
            const timer = setTimeout(() => {
                const color: 'w' | 'b' = 'w';
                setActualUserColor(color);
                setGameState('playing');
                setBoardReady(false);
                setFen(fenStr);
                setTurn(fenStr.includes(' b ') ? 'b' : 'w');
                setHistory([fenStr]);
                setMoveNames([]);
                setCurrentMoveIndex(0);
                setGameOverReason(null);
            }, 600);
            return () => clearTimeout(timer);
        } else if (quickLevel) {
            hasAutoStarted.current = true;
            const lvl = parseInt(quickLevel as string);
            if (lvl >= 1 && lvl <= 6) {
                setSelectedLevel(lvl);
                setUserColor('random');
                
                const timer = setTimeout(() => {
                    const color: 'w' | 'b' = Math.random() > 0.5 ? 'w' : 'b';
                    setActualUserColor(color);
                    setGameState('playing');
                    setBoardReady(false);
                    setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
                    setTurn('w');
                    setHistory(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']);
                    setMoveNames([]);
                    setCurrentMoveIndex(0);
                    setGameOverReason(null);
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, []);

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

                // Update history and index
                const newHistory = history.slice(0, currentMoveIndex + 1);
                newHistory.push(data.fen);
                setHistory(newHistory);
                
                const newMoveNames = moveNames.slice(0, currentMoveIndex);
                newMoveNames.push(data.san);
                setMoveNames(newMoveNames);
                
                setCurrentMoveIndex(newHistory.length - 1);
                setFen(data.fen);
                setTurn(data.turn);

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
        if (gameState === 'playing' && turn !== actualUserColor && !isThinking && !gameOverReason && boardReady && currentMoveIndex === history.length - 1) {
            // V1 RELEASE MODE: Natural human-like thinking delay
            const delay = Math.floor(Math.random() * 1000) + 800; // 800ms to 1800ms
            const timer = setTimeout(() => {
                makeComputerMove();
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [turn, actualUserColor, gameState, gameOverReason, boardReady, currentMoveIndex, history.length]);

    useEffect(() => {
        loadSounds();
        checkDailyHints();
        return () => {
            Object.values(soundObjects).forEach(s => s.unloadAsync());
        };
    }, []);

    const checkDailyHints = async () => {
        // Now handled by subscription context automatically on load
    };

    const handleHint = async () => {
        setIsHinting(true);
        try {
            // Call backend to track hint usage
            // The interceptor will trigger the modal if 403
            await apiClient.post('/user/hint');

            const result = await analyzePosition(fen, 15, 1500);
            if (result && result.best_move) {
                if (result.evaluation !== undefined) {
                    setEngineEval(result.evaluation);
                }
                
                webviewRef.current?.injectJavaScript(`
                    var from = '${result.best_move.substring(0, 2)}';
                    var to = '${result.best_move.substring(2, 4)}';
                    $('#board .square-55d63').removeClass('highlight-move');
                    $('#board .square-' + from).addClass('highlight-move');
                    $('#board .square-' + to).addClass('highlight-move');
                    true;
                `);
            }
        } catch (e) {
            console.error('Hint error:', e);
        } finally {
            setIsHinting(false);
        }
    };

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
            injectWebViewMessage(webviewRef, { type: 'update_theme', colors });
        }
    }, [colors, boardReady]);

    // Sync FEN changes to WebView without reloading
    useEffect(() => {
        if (boardReady && fen !== lastSyncedFen.current) {
            lastSyncedFen.current = fen;
            injectWebViewMessage(webviewRef, { type: 'set_fen', fen });
        }
    }, [fen, boardReady]);

    const makeComputerMove = async () => {
        setIsThinking(true);
        try {
            const result = useElo 
                ? await playMove(fen, 0, eloRating) 
                : await playMove(fen, selectedLevel);
                
            if (result && result.best_move) {
                if (result.evaluation !== undefined) {
                    setEngineEval(result.evaluation);
                }

                injectWebViewMessage(webviewRef, {
                    type: 'engine_move',
                    move: result.best_move
                });
            }
        } catch (error) {
            console.error('Computer move failed:', error);
        } finally {
            setIsThinking(false);
        }
    };

    const handleUndo = () => {
        if (currentMoveIndex < 2) return;
        
        const newIndex = currentMoveIndex - 2;
        const newHistory = history.slice(0, newIndex + 1);
        const newMoveNames = moveNames.slice(0, newIndex);
        
        setHistory(newHistory);
        setMoveNames(newMoveNames);
        setCurrentMoveIndex(newIndex);
        setFen(newHistory[newIndex]);
        setEngineEval(null);
        
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    const handleQuitPress = () => {
        if (moveNames.length < 2) {
            setShowConfirmModal('abort');
        } else {
            setShowConfirmModal('resign');
        }
    };

    const confirmQuit = () => {
        if (showConfirmModal === 'resign') {
            setGameState('gameover');
            setGameOverReason('You resigned');
        } else {
            setGameState('settings');
        }
        setShowConfirmModal(null);
    };

    const navigateMove = (index: number) => {
        if (index >= 0 && index < history.length) {
            setCurrentMoveIndex(index);
            setFen(history[index]);
            if (Platform.OS !== 'web') Haptics.selectionAsync();
        }
    };

    const resetGame = () => {
        setGameState('settings');
    };

    if (gameState === 'settings') {
        return (
            <Animated.View entering={FadeIn} style={[styles.settingsLayout, { backgroundColor: colors.background }]}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
                <Header 
                    title="Play AI" 
                    showBackButton={true}
                    onBackPress={() => {
                        resetGameState();
                        router.back();
                    }}
                />
                
                {/* Engine badge */}
                <View style={styles.engineBadgeContainer}>
                    <LinearGradient
                        colors={[colors.primary + '20', 'transparent']}
                        style={styles.engineBadge}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Zap color={colors.accent} size={12} fill={colors.accent} />
                        <Text style={[styles.engineBadgeText, { color: colors.textMuted }]}>POWERED BY </Text>
                        <Text style={[styles.engineNameText, { color: colors.accent }]}>STOCKFISH 18</Text>
                    </LinearGradient>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Play As Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionLabel, { color: colors.text }]}>Play As</Text>
                        <View style={styles.colorSelectionRow}>
                            {[
                                { key: 'w' as const, label: 'White', uri: 'https://chessboardjs.com/img/chesspieces/wikipedia/wN.png' },
                                { key: 'random' as const, label: 'Random', uri: null },
                                { key: 'b' as const, label: 'Black', uri: 'https://chessboardjs.com/img/chesspieces/wikipedia/bN.png' },
                            ].map(opt => (
                                <TouchableOpacity 
                                    key={opt.key}
                                    style={[
                                        styles.colorOption, 
                                        { backgroundColor: colors.surface, borderColor: colors.border }, 
                                        userColor === opt.key && { 
                                            borderColor: colors.primary,
                                            backgroundColor: colors.primary + '10',
                                        }
                                    ]} 
                                    onPress={() => setUserColor(opt.key)}
                                    activeOpacity={0.7}
                                >
                                    {opt.key === 'random' ? (
                                        <View style={styles.randomPieceContainer}>
                                            <Image source={{ uri: 'https://chessboardjs.com/img/chesspieces/wikipedia/wN.png' }} style={[styles.pieceImage, { marginRight: -20 }]} />
                                            <Image source={{ uri: 'https://chessboardjs.com/img/chesspieces/wikipedia/bN.png' }} style={styles.pieceImage} />
                                        </View>
                                    ) : (
                                        <Image source={{ uri: opt.uri! }} style={styles.pieceImage} />
                                    )}
                                    <Text style={[styles.colorText, { color: userColor === opt.key ? colors.primary : colors.textMuted }]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Difficulty Section */}
                    <View style={styles.section}>
                        <View style={styles.rowBetween}>
                            <Text style={[styles.sectionLabel, { color: colors.text }]}>Difficulty</Text>
                            <View style={[styles.toggleGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <Text style={[styles.toggleLabel, { color: colors.textMuted }]}>ELO</Text>
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
                                {difficultyLevels.map((item) => {
                                    // V1 RELEASE MODE: Lock levels commented out for public launch
                                    let isLocked = false;
                                    const gradientColors = DIFFICULTY_COLORS[item.level];

                                    return (
                                        <TouchableOpacity 
                                            key={item.level}
                                            style={[
                                                styles.levelBox, 
                                                { backgroundColor: colors.surface, borderColor: colors.border }, 
                                                selectedLevel === item.level && { 
                                                    borderColor: gradientColors[0],
                                                },
                                                isLocked && { opacity: 0.5 }
                                            ]}
                                            onPress={() => {
                                                if (isLocked) {
                                                    triggerUpgrade(`Level ${item.level} AI`);
                                                } else {
                                                    setSelectedLevel(item.level);
                                                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            {selectedLevel === item.level && (
                                                <LinearGradient
                                                    colors={[gradientColors[0] + '15', gradientColors[1] + '08']}
                                                    style={StyleSheet.absoluteFill}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                />
                                            )}
                                            <Text style={styles.levelEmoji}>{isLocked ? '🔒' : item.emoji}</Text>
                                            <Text style={[
                                                styles.levelLabel, 
                                                { color: selectedLevel === item.level ? gradientColors[0] : colors.text }
                                            ]}>
                                                {item.label}
                                            </Text>
                                            <Text style={[styles.levelSubText, { color: colors.textMuted }]}>{item.sub}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Toggle Advanced Options */}
                    <TouchableOpacity 
                        style={[styles.advancedToggleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setShowAdvancedSettings(!showAdvancedSettings);
                        }}
                        activeOpacity={0.8}
                    >
                        <Settings size={14} color={colors.primaryLight} />
                        <Text style={[styles.advancedToggleText, { color: colors.text }]}>
                            {showAdvancedSettings ? "HIDE ADVANCED" : "ADVANCED OPTIONS"}
                        </Text>
                        {showAdvancedSettings ? <ChevronUp size={14} color={colors.textMuted} /> : <ChevronDown size={14} color={colors.textMuted} />}
                    </TouchableOpacity>

                    {showAdvancedSettings && (
                        <Animated.View entering={FadeIn} style={styles.advancedContainer}>
                            {/* Time Section */}
                            <View style={styles.section}>
                                <View style={styles.rowBetween}>
                                    <Text style={[styles.sectionLabel, { color: colors.text }]}>Time Control</Text>
                                    <View style={[styles.toggleGroup, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <Clock size={16} color={colors.accent} style={{ marginRight: 8 }} />
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
                        </Animated.View>
                    )}
                </ScrollView>

                {/* Footer Button */}
                <View style={styles.footerBtnContainer}>
                    <GradientButton
                        title="START GAME"
                        onPress={startGame}
                        gradientColors={[colors.primary, colors.primaryLight]}
                        icon={<Swords color={colors.white} size={20} strokeWidth={2.5} />}
                    />
                </View>
            </Animated.View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <Header 
                title="Playing AI" 
                showBackButton={true}
                onBackPress={() => {
                    Alert.alert(
                        "Exit Game?",
                        "Are you sure you want to exit? Your progress will be lost.",
                        [
                            { text: "Cancel", style: "cancel" },
                            { text: "Exit", style: "destructive", onPress: () => { resetGameState(); router.back(); } }
                        ]
                    );
                }}
            />
            
            {/* Player bars */}
            <View style={styles.gameHeader}>
                <View style={[
                    styles.playerInfo, 
                    { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                    turn === actualUserColor && { borderColor: colors.primary, borderWidth: 1.5 }
                ]}>
                    <View style={[styles.playerDot, { backgroundColor: turn === actualUserColor ? colors.primary : colors.border }]} />
                    <User color={turn === actualUserColor ? colors.text : colors.textMuted} size={18} strokeWidth={2} />
                    <Text style={[styles.playerName, { color: colors.text, opacity: turn === actualUserColor ? 1 : 0.6 }]}>You</Text>
                </View>
                
                <View style={[styles.vsBadge, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.vsText, { color: colors.textMuted }]}>VS</Text>
                </View>
                
                <View style={[
                    styles.playerInfo, 
                    { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                    turn !== actualUserColor && { borderColor: colors.accent, borderWidth: 1.5 }
                ]}>
                    <View style={[styles.playerDot, { backgroundColor: turn !== actualUserColor ? colors.accent : colors.border }]} />
                    <Cpu color={turn !== actualUserColor ? colors.text : colors.textMuted} size={18} strokeWidth={2} />
                    <Text numberOfLines={1} style={[styles.playerName, { color: colors.text, opacity: turn !== actualUserColor ? 1 : 0.6, flex: 1 }]}>
                        {useElo ? `ELO ${eloRating}` : difficultyLevels.find(l => l.level === selectedLevel)?.sub || 'Computer'}
                    </Text>
                    {engineEval !== null && (
                        <Text style={[styles.evalText, { color: engineEval >= 0 ? colors.success : colors.error }]}>
                            {engineEval > 0 ? '+' : ''}{engineEval.toFixed(1)}
                        </Text>
                    )}
                    {isThinking && (
                        <Animated.View style={[styles.thinkingDotContainer, shimmerStyle]}>
                            <ActivityIndicator size="small" color={colors.accent} />
                        </Animated.View>
                    )}
                </View>
            </View>

            <View 
                style={[styles.boardContainer, { backgroundColor: colors.surface }]}
                collapsable={false}
            >
                {isFocused && (
                    <WebView
                        key="play-webview"
                        ref={webviewRef}
                        originWhitelist={['*']}
                        source={{ html: boardHtml }}
                        style={styles.webview}
                        onMessage={handleMessage}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        scrollEnabled={false}
                        bounces={false}
                        overScrollMode="never"
                        nestedScrollEnabled={false}
                        startInLoadingState={false}
                        androidLayerType="software"
                    />
                )}
            </View>

            <View style={styles.footer}>
                {/* Move Navigation */}
                <View style={styles.navigationRow}>
                    <TouchableOpacity 
                        style={[styles.navBtn, { backgroundColor: colors.surface }]} 
                        onPress={() => navigateMove(currentMoveIndex - 1)}
                        disabled={currentMoveIndex <= 0}
                    >
                        <ChevronLeft color={currentMoveIndex > 0 ? colors.primary : colors.textMuted} size={24} strokeWidth={2.5} />
                    </TouchableOpacity>
                    
                    <View style={styles.moveIndicator}>
                        <Text style={[styles.moveIndicatorText, { color: colors.text }]}>
                            Move {Math.floor(currentMoveIndex / 2) + 1}
                        </Text>
                        <Text style={[styles.turnIndicator, { color: colors.accent }]}>
                            {currentMoveIndex % 2 === 0 ? "White" : "Black"}'s Turn
                        </Text>
                    </View>

                    <TouchableOpacity 
                        style={[styles.navBtn, { backgroundColor: colors.surface }]} 
                        onPress={() => navigateMove(currentMoveIndex + 1)}
                        disabled={currentMoveIndex >= history.length - 1}
                    >
                        <View style={{ transform: [{ rotate: '180deg' }] }}>
                            <ChevronLeft color={currentMoveIndex < history.length - 1 ? colors.primary : colors.textMuted} size={24} strokeWidth={2.5} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Move History */}
                <ScrollView horizontal style={styles.historyList} contentContainerStyle={{ alignItems: 'center' }}>
                    {moveNames.map((move, i) => (
                        <TouchableOpacity 
                            key={i} 
                            style={[
                                styles.historyItem, 
                                { backgroundColor: colors.surface },
                                currentMoveIndex === i + 1 && { borderColor: colors.primary, borderWidth: 1, backgroundColor: colors.primary + '10' }
                            ]}
                            onPress={() => navigateMove(i + 1)}
                        >
                             <Text style={[styles.historyMoveNum, { color: colors.textMuted }]}>
                                {i % 2 === 0 ? `${Math.floor(i/2) + 1}.` : ''}
                             </Text>
                             <Text style={[styles.historyMove, { color: currentMoveIndex === i + 1 ? colors.primary : colors.text }]}>{move}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.controls}>
                    <TouchableOpacity 
                        style={[styles.controlBtn, { backgroundColor: colors.surface }]} 
                        onPress={handleUndo} 
                        disabled={currentMoveIndex < 2 || isThinking}
                        activeOpacity={0.7}
                    >
                        <RotateCcw size={18} color={currentMoveIndex < 2 ? colors.textMuted : colors.text} strokeWidth={2} />
                        <Text style={[styles.controlBtnText, { color: currentMoveIndex < 2 ? colors.textMuted : colors.text }]}>Undo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.controlBtn, { backgroundColor: colors.surface, flex: 1.5 }]} 
                        onPress={handleHint} 
                        disabled={isHinting || isThinking}
                        activeOpacity={0.7}
                    >
                        <Lightbulb size={18} color={isHinting || isThinking ? colors.textMuted : colors.accent} strokeWidth={2} />
                        <Text style={[styles.controlBtnText, { color: isHinting || isThinking ? colors.textMuted : colors.text }]}>Hint</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.controlBtn, { backgroundColor: colors.error + '15' }]} 
                        onPress={handleQuitPress}
                        activeOpacity={0.7}
                    >
                        <Swords size={18} color={colors.error} strokeWidth={2} />
                        <Text style={[styles.controlBtnText, { color: colors.error }]}>{moveNames.length < 2 ? 'Abort' : 'Resign'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Game Over Modal */}
            {gameState === 'gameover' && (
                <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
                    <Animated.View entering={FadeInUp.duration(400).springify()} style={[styles.gameOverCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <LinearGradient
                            colors={colors.gradient.primary as [string, string]}
                            style={styles.gameOverIconBg}
                        >
                            <Trophy size={32} color={colors.white} strokeWidth={2} />
                        </LinearGradient>
                        <Text style={[styles.gameOverTitle, { color: colors.text }]}>Game Over</Text>
                        <Text style={[styles.gameOverReason, { color: colors.accent }]}>{gameOverReason}</Text>
                        
                        <View style={styles.gameOverActions}>
                            <GradientButton
                                title="Review Game"
                                onPress={() => {
                                    setGameState('settings');
                                    router.push({
                                        pathname: '/analysis',
                                        params: { reviewMode: 'true', reviewHistory: JSON.stringify(history), reviewSAN: JSON.stringify(moveNames) }
                                    });
                                }}
                                gradientColors={[colors.accent, colors.accentLight]}
                                icon={<Search size={16} color={colors.white} strokeWidth={2.5} />}
                                size="md"
                            />
                            <GradientButton
                                title="New Match"
                                onPress={resetGame}
                                variant="outline"
                                size="md"
                            />
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* Confirm Modal */}
            {showConfirmModal && (
                <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
                    <Animated.View entering={FadeInUp.duration(300).springify()} style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.confirmTitle, { color: colors.text }]}>
                            {showConfirmModal === 'abort' ? 'Abort Game?' : 'Resign Game?'}
                        </Text>
                        <Text style={[styles.confirmSub, { color: colors.textMuted }]}>
                            {showConfirmModal === 'abort' 
                                ? 'The game session will be canceled.' 
                                : 'You will lose this match.'}
                        </Text>
                        <View style={styles.confirmActions}>
                            <TouchableOpacity 
                                style={[styles.confirmBtn, { backgroundColor: colors.surfaceLight }]} 
                                onPress={() => setShowConfirmModal(null)}
                            >
                                <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.confirmBtn, { backgroundColor: colors.error }]} 
                                onPress={confirmQuit}
                            >
                                <Text style={[styles.confirmBtnText, { color: colors.white }]}>
                                    {showConfirmModal === 'abort' ? 'Abort' : 'Resign'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    settingsLayout: {
        flex: 1,
    },
    engineBadgeContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    engineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    engineBadgeText: {
        fontSize: 10,
        fontWeight: '800',
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
        marginBottom: 28,
    },
    sectionLabel: {
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 14,
        letterSpacing: -0.3,
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
        paddingVertical: 6,
        borderRadius: THEME.borderRadius.md,
        borderWidth: 1,
    },
    toggleLabel: {
        marginRight: 8,
        fontWeight: '700',
        fontSize: 12,
    },
    colorSelectionRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    colorOption: {
        flex: 1,
        paddingVertical: 18,
        borderRadius: THEME.borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1.5,
    },
    colorText: {
        marginTop: 10,
        fontWeight: '700',
        fontSize: 12,
    },
    pieceImage: {
        width: 44,
        height: 44,
    },
    randomPieceContainer: {
        width: 44,
        height: 44,
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
        gap: 10,
        marginTop: 8,
    },
    levelBox: {
        width: (width - 40 - 20) / 3,
        paddingVertical: 16,
        borderRadius: THEME.borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    levelEmoji: {
        fontSize: 26,
        marginBottom: 6,
    },
    levelLabel: {
        fontSize: 12,
        fontWeight: '800',
    },
    levelSubText: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    advancedToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: THEME.borderRadius.md,
        borderWidth: 1,
        marginBottom: 20,
    },
    advancedToggleText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        flex: 1,
        marginLeft: 10,
    },
    advancedContainer: {
        marginTop: 10,
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
        color: '#FFFFFF',
    },
    footerBtnContainer: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    container: {
        flex: 1,
    },
    gameHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        height: 44,
        borderRadius: THEME.borderRadius.md,
        gap: 6,
        flex: 1,
    },
    playerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    playerName: {
        fontWeight: '700',
        fontSize: 12,
    },
    evalText: {
        fontSize: 11,
        fontWeight: '900',
    },
    vsBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    vsText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
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
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        opacity: 0.99,
    },
    footer: {
        flex: 1,
        paddingVertical: 16,
    },
    historyList: {
        paddingHorizontal: 16,
        maxHeight: 50,
    },
    historyItem: {
        flexDirection: 'row',
        marginRight: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: THEME.borderRadius.sm,
    },
    historyMoveNum: {
        fontSize: 12,
        fontWeight: '600',
        marginRight: 3,
    },
    historyMove: {
        fontSize: 13,
        fontWeight: '800',
    },
    thinkingDotContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    navigationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 14,
    },
    navBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moveIndicator: {
        alignItems: 'center',
    },
    moveIndicatorText: {
        fontSize: 15,
        fontWeight: '800',
    },
    turnIndicator: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2,
    },
    controls: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginTop: 14,
        gap: 10,
    },
    controlBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: THEME.borderRadius.md,
    },
    controlBtnText: {
        fontWeight: '700',
        fontSize: 12,
    },
    confirmCard: {
        width: '100%',
        padding: 28,
        borderRadius: THEME.borderRadius.xl,
        alignItems: 'center',
        borderWidth: 1,
        ...THEME.shadows.elevated,
    },
    confirmTitle: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
    },
    confirmSub: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        fontWeight: '500',
    },
    confirmActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: THEME.borderRadius.lg,
        alignItems: 'center',
    },
    confirmBtnText: {
        fontWeight: '800',
        fontSize: 14,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 28,
    },
    gameOverCard: {
        width: '100%',
        padding: 32,
        borderRadius: THEME.borderRadius.xxl,
        alignItems: 'center',
        borderWidth: 1,
        ...THEME.shadows.elevated,
    },
    gameOverIconBg: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gameOverTitle: {
        fontSize: 26,
        fontWeight: '900',
        marginTop: 16,
        letterSpacing: -0.5,
    },
    gameOverReason: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 6,
    },
    gameOverActions: {
        width: '100%',
        marginTop: 28,
        gap: 12,
    },
});
