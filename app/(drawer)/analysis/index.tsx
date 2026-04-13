import React, { useRef, useState, useEffect } from 'react';
import { 
    View, 
    StyleSheet, 
    TouchableOpacity, 
    Text, 
    Dimensions, 
    ActivityIndicator, 
    Platform, 
    ScrollView, 
    StatusBar 
} from 'react-native';
import { WebView } from 'react-native-webview';
import { 
    RotateCcw, 
    TrendingUp, 
    CheckCircle, 
    XCircle, 
    AlertCircle, 
    ChevronLeft,
    Share2
} from 'lucide-react-native';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, THEME } from '../../../src/constants/theme';
import { Header } from '../../../src/components/Header';
import { useTheme } from '../../../src/context/ThemeContext';
import { formatMovesToSAN } from '../../../src/utils/chess';
import { analyzePosition } from '../../../src/api/engine';
import { getChessboardHtml } from '../../../src/utils/chessboardHtml';

const { width } = Dimensions.get('window');
const BOARD_SIZE = width * 0.92;

const SOUNDS = {
  move: 'https://lichess.org/assets/sound/standard/Move.ogg',
  capture: 'https://lichess.org/assets/sound/standard/Capture.ogg',
  check: 'https://lichess.org/assets/sound/standard/Check.ogg',
};

interface MoveRecord {
    san: string;
    eval: string;
    quality?: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'brilliant' | 'book';
    color: 'w' | 'b';
}

export default function AnalysisScreen() {
    const webviewRef = useRef<WebView>(null);
    const { colors, isDark, boardTheme, pieceSet, gameOptions } = useTheme();
    const [engineEval, setEngineEval] = useState('0.00');
    const [engineDepth, setEngineDepth] = useState(0);
    const [isThinking, setIsThinking] = useState(false);
    const [history, setHistory] = useState<MoveRecord[]>([]);
    const [continuation, setContinuation] = useState<string[]>([]);
    const [lastWhiteEval, setLastWhiteEval] = useState(0.3);
    const [boardReady, setBoardReady] = useState(false);
    const lastSyncedFen = useRef<string>('');
    const [soundObjects, setSoundObjects] = useState<{ [key: string]: Audio.Sound }>({});
    
    // Evaluation Bar Shared Value
    const evalPercentage = useSharedValue(50);

    const animatedEvalBar = useAnimatedStyle(() => {
        return {
            height: withSpring(`${100 - evalPercentage.value}%`, { damping: 15, stiffness: 60 })
        };
    });

    useEffect(() => {
        if (boardReady) {
            fetchBackendEval('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', '', 'w', true);
        }
    }, [boardReady]);

    // Update WebView theme when colors change
    useEffect(() => {
        if (boardReady) {
            webviewRef.current?.injectJavaScript(`window.postMessage(JSON.stringify({type: 'update_theme', colors: ${JSON.stringify(colors)}}), '*'); true;`);
        }
    }, [colors, boardReady]);

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

                lastSyncedFen.current = data.fen; // Mark as synced since it came from board
                await fetchBackendEval(data.fen, data.san, data.turn, false);
            } else if (data.type === 'ready') {
                setBoardReady(true);
            }
        } catch {}
    };

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

    const calculateQuality = (evalBeforeMove: number, rawEvalAfterMove: number, turn: 'w' | 'b', moveCount: number) => {
        const evalAfterMove = turn === 'w' ? -rawEvalAfterMove : rawEvalAfterMove;
        const cpLoss = turn === 'w' ? (evalBeforeMove - evalAfterMove) : (evalAfterMove - evalBeforeMove);
        if (moveCount < 8 && Math.abs(rawEvalAfterMove) < 0.8) return 'good';
        if (cpLoss < -0.3) return 'best';
        if (cpLoss < 0.1) return 'good';
        if (cpLoss < 0.5) return 'inaccuracy';
        if (cpLoss < 1.5) return 'mistake';
        return 'blunder';
    };

    const fetchBackendEval = async (fen: string, san: string, turn: 'w' | 'b', isInitial: boolean) => {
        setIsThinking(true);
        try {
            const result = await analyzePosition(fen, 20, 1500);
            const rawEval = result.evaluation;
            
            let evalText = result.is_mate ? `M${result.mate_in}` : (rawEval > 0 ? `+${rawEval.toFixed(2)}` : rawEval.toFixed(2));
            setEngineEval(evalText);
            setEngineDepth(result.depth);
            
            // Convert UCI continuation to SAN
            if (result.continuation && result.continuation.length > 0) {
                const sanMoves = formatMovesToSAN(fen, result.continuation);
                setContinuation(sanMoves);
            } else {
                setContinuation([]);
            }

            // Calculate eval from White's perspective for the visual bar
            // result.evaluation is relative to side-to-move. 
            // If it is black's turn and white is better, eval will be negative.
            const evalForWhite = turn === 'w' ? rawEval : -rawEval;
            let percentage = 50 + (evalForWhite * 5); // 1.0 cp = +5%
            if (percentage > 97) percentage = 97;
            if (percentage < 3) percentage = 3;
            evalPercentage.value = percentage;

            if (san && !isInitial) {
                const quality = calculateQuality(lastWhiteEval, rawEval, turn, history.length);
                setHistory(prev => [...prev, { san, eval: evalText, quality: quality as any, color: turn }]);
            }
            setLastWhiteEval(turn === 'w' ? -rawEval : rawEval);
        } catch (error) {
            console.error('Analysis failed:', error);
        } finally {
            setIsThinking(false);
        }
    };

    const resetBoard = () => {
        webviewRef.current?.injectJavaScript(`window.postMessage(JSON.stringify({type: 'reset'}), '*'); true;`);
        setEngineEval('0.00');
        setEngineDepth(0);
        setHistory([]);
        setContinuation([]);
        setLastWhiteEval(0.3);
        evalPercentage.value = 50;
        setTimeout(() => fetchBackendEval('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', '', 'w', true), 300);
    };

    const renderQualityIcon = (quality?: string) => {
        switch(quality) {
            case 'best': return <CheckCircle size={12} color={colors.success} />;
            case 'good': return <CheckCircle size={12} color={colors.primary} />;
            case 'inaccuracy': return <AlertCircle size={12} color={colors.accent} />;
            case 'mistake': return <XCircle size={12} color="#f97316" />;
            case 'blunder': return <XCircle size={12} color={colors.error} />;
            default: return null;
        }
    };

    const boardHtml = React.useMemo(() => {
        return getChessboardHtml({
            orientation: 'white',
            fen: 'start',
            draggable: true
        }, colors, boardTheme, pieceSet, gameOptions);
    }, [boardTheme, pieceSet, gameOptions]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            <Header 
                title="Analysis" 
                rightElement={
                    <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surface }]} onPress={resetBoard}>
                        <RotateCcw color={colors.accent} size={20} />
                    </TouchableOpacity>
                }
            />

            {/* Engine Overview */}
            <Animated.View entering={FadeIn} style={[styles.enginePanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.evalBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.evalBadgeText, { color: colors.primaryLight }]}>{engineEval}</Text>
                    {engineDepth > 0 && (
                        <Text style={[styles.depthLabel, { color: colors.primaryLight }]}>D{engineDepth}</Text>
                    )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestScroll}>
                    <TrendingUp size={16} color={colors.primary} style={styles.suggestIcon} />
                    {isThinking && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />}
                    {continuation.length > 0 ? (
                        continuation.map((m, i) => (
                            <Text key={i} style={[styles.suggestMove, { color: colors.text }]}>{i === 0 ? '' : '→ '} {m}</Text>
                        ))
                    ) : (
                        <Text style={[styles.suggestPlaceholder, { color: colors.textMuted }]}>{isThinking ? 'Calculating...' : 'Ready'}</Text>
                    )}
                </ScrollView>
                <TouchableOpacity style={styles.shareBtn}>
                    <Share2 size={20} color={colors.textMuted} />
                </TouchableOpacity>
            </Animated.View>

            {/* Board Section */}
            <View style={styles.boardWrapper}>
                <View style={[styles.evalBarContainer, { backgroundColor: colors.white }]}>
                    <Animated.View style={[styles.blackEval, animatedEvalBar, { backgroundColor: colors.primaryDark }]} />
                    <View style={styles.whiteEval} />
                    <View style={[styles.evalMarker, { backgroundColor: colors.accent }]} />
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
            </View>

            {/* Move History */}
            <View style={[styles.notationArea, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.notationHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.notationTitle, { color: colors.text }]}>Notation</Text>
                    <Text style={[styles.moveCount, { color: colors.textMuted }]}>{history.length} moves</Text>
                </View>
                <ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyContent}>
                    <View style={styles.movesGrid}>
                        {history.map((record, index) => (
                            <View key={index} style={styles.moveRow}>
                                <Text style={[styles.moveNum, { color: colors.textMuted }]}>{index % 2 === 0 ? `${Math.floor(index/2) + 1}.` : ''}</Text>
                                <View style={[
                                    styles.moveItem, 
                                    { backgroundColor: colors.background },
                                    record.quality === 'blunder' && { backgroundColor: colors.error + '15' },
                                    record.quality === 'mistake' && { backgroundColor: '#f9731615' },
                                    record.quality === 'best' && { backgroundColor: colors.primary + '15' }
                                ]}>
                                    <Text style={[styles.moveSan, { color: colors.text }]}>{record.san}</Text>
                                    {renderQualityIcon(record.quality)}
                                    <Text style={[styles.moveEval, { color: colors.textMuted }]}>{record.eval}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    enginePanel: {
        marginHorizontal: 16,
        padding: 12,
        borderRadius: THEME.borderRadius.md,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        borderWidth: 1,
    },
    evalBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 12,
    },
    evalBadgeText: {
        fontWeight: '900',
        fontSize: 15,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    depthLabel: {
        fontSize: 10,
        fontWeight: '700',
        opacity: 0.8,
        marginTop: -2,
    },
    suggestScroll: {
        flex: 1,
    },
    suggestIcon: {
        marginRight: 8,
        marginTop: 2,
    },
    suggestMove: {
        fontSize: 13,
        fontWeight: '700',
        marginRight: 8,
    },
    suggestPlaceholder: {
        fontSize: 13,
    },
    shareBtn: {
        marginLeft: 10,
    },
    boardWrapper: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    evalBarContainer: {
        width: 8,
        height: BOARD_SIZE,
        marginRight: 12,
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    blackEval: {
        width: '100%',
        position: 'absolute',
        top: 0,
    },
    whiteEval: {
        flex: 1,
    },
    evalMarker: {
        position: 'absolute',
        width: '100%',
        height: 2,
        top: '50%',
        opacity: 0.6,
    },
    boardContainer: {
        width: BOARD_SIZE,
        height: BOARD_SIZE,
        borderRadius: THEME.borderRadius.md,
        overflow: 'hidden',
        elevation: 10,
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    notationArea: {
        flex: 1,
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: THEME.borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    notationHeader: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    notationTitle: {
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    moveCount: {
        fontSize: 12,
        fontWeight: '700',
    },
    historyScroll: {
        flex: 1,
    },
    historyContent: {
        padding: 12,
    },
    movesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    moveRow: {
        width: '50%',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingRight: 6,
    },
    moveNum: {
        fontSize: 12,
        width: 25,
        fontWeight: '700',
    },
    moveItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    moveSan: {
        fontSize: 13,
        fontWeight: '800',
        flex: 1,
    },
    moveEval: {
        fontSize: 10,
        fontWeight: '700',
    },
});
