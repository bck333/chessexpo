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
    
    // Navigation & History
    const [history, setHistory] = useState<MoveRecord[]>([]);
    const [fenHistory, setFenHistory] = useState<string[]>(['start']);
    const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
    const [fen, setFen] = useState('start');
    
    const [continuation, setContinuation] = useState<string[]>([]);
    const [multiPVLines, setMultiPVLines] = useState<any[]>([]);
    const [accuracy, setAccuracy] = useState<number | null>(null);
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
                playSound(data.san.includes('x') ? 'capture' : 'move');
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                // Update history and index for navigation
                const newFenHistory = fenHistory.slice(0, currentMoveIndex + 1);
                newFenHistory.push(data.fen);
                setFenHistory(newFenHistory);
                setCurrentMoveIndex(newFenHistory.length - 1);
                setFen(data.fen);

                lastSyncedFen.current = data.fen; 
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

    const calculateAccuracy = (history: MoveRecord[]) => {
        if (history.length === 0) return 100;
        let totalCPL = 0;
        history.forEach(m => {
            const val = parseFloat(m.eval);
            if (!isNaN(val)) totalCPL += Math.abs(val);
        });
        const avgCPL = totalCPL / history.length;
        return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.043876 * (avgCPL * 10))));
    };

    const getEvalSummary = (val: number, isMate: boolean) => {
        if (isMate) return val > 0 ? "White has forced mate" : "Black has forced mate";
        if (val > 2.5) return "White is winning";
        if (val > 1.0) return "White is better";
        if (val > 0.4) return "White has slight advantage";
        if (val < -2.5) return "Black is winning";
        if (val < -1.0) return "Black is better";
        if (val < -0.4) return "Black has slight advantage";
        return "Position is equal";
    };

    const fetchBackendEval = async (fen: string, san: string, turn: 'w' | 'b', isInitial: boolean) => {
        setIsThinking(true);
        try {
            const result = await analyzePosition(fen, 20, 1500);
            const rawEval = result.evaluation;
            
            let evalText = result.is_mate ? `M${result.mate_in}` : (rawEval > 0 ? `+${rawEval.toFixed(2)}` : rawEval.toFixed(2));
            setEngineEval(evalText);
            setEngineDepth(result.depth);
            setMultiPVLines(result.lines || []);
            
            if (result.continuation && result.continuation.length > 0) {
                setContinuation(formatMovesToSAN(fen, result.continuation));
            }

            const evalForWhite = turn === 'w' ? rawEval : -rawEval;
            let percentage = 50 + (evalForWhite * 5);
            evalPercentage.value = Math.max(5, Math.min(95, percentage));

            if (san && !isInitial) {
                const newMove: MoveRecord = { san, eval: evalText, color: turn };
                const newHistory = [...history, newMove];
                setHistory(newHistory);
                setAccuracy(calculateAccuracy(newHistory));
            }
        } catch (error) {
            console.error('Analysis failed:', error);
        } finally {
            setIsThinking(false);
        }
    };

    const navigateMove = (index: number) => {
        if (index >= 0 && index < fenHistory.length) {
            setCurrentMoveIndex(index);
            setFen(fenHistory[index]);
            if (Platform.OS !== 'web') Haptics.selectionAsync();
        }
    };

    const resetBoard = () => {
        setFen('start');
        setFenHistory(['start']);
        setCurrentMoveIndex(0);
        setHistory([]);
        setAccuracy(null);
        setEngineEval('0.00');
        evalPercentage.value = 50;
        setTimeout(() => fetchBackendEval('start', '', 'w', true), 300);
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
            fen: fen,
            draggable: true
        }, colors, boardTheme, pieceSet, gameOptions);
    }, [colors, boardTheme, pieceSet, gameOptions, fen]);

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
                <View style={styles.engineHeader}>
                    <View style={[styles.evalBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.evalBadgeText, { color: colors.primaryLight }]}>{engineEval}</Text>
                    </View>
                    <View style={styles.summaryContainer}>
                        <Text style={[styles.summaryText, { color: colors.text }]}>
                            {getEvalSummary(parseFloat(engineEval) || 0, engineEval.includes('M'))}
                        </Text>
                        <Text style={[styles.betterMoveText, { color: colors.accent }]}>
                            {continuation.length > 0 ? `Best move: ${continuation[0]}` : 'Calculating...'}
                        </Text>
                    </View>
                    {accuracy !== null && (
                        <View style={[styles.accuracyBadge, { backgroundColor: colors.accent + '20' }]}>
                            <Text style={[styles.accuracyValue, { color: colors.accent }]}>{Math.round(accuracy)}%</Text>
                            <Text style={[styles.accuracyLabel, { color: colors.accent }]}>ACC</Text>
                        </View>
                    )}
                </View>

                <View style={styles.multiPVContainer}>
                    {multiPVLines.slice(0, 3).map((line, idx) => (
                        <View key={idx} style={styles.pvLine}>
                            <Text style={[styles.pvRank, { color: colors.textMuted }]}>{idx + 1}</Text>
                            <Text style={[styles.pvMove, { color: colors.text }]}>{line.move}</Text>
                            <Text style={[styles.pvEval, { color: colors.accent }]}>
                                {line.mate_in !== 0 ? `M${Math.abs(line.mate_in)}` : (line.evaluation > 0 ? `+${line.evaluation.toFixed(1)}` : line.evaluation.toFixed(1))}
                            </Text>
                        </View>
                    ))}
                </View>
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
                <View style={styles.navigationControls}>
                    <TouchableOpacity style={styles.navBtn} onPress={() => navigateMove(currentMoveIndex - 1)}>
                        <ChevronLeft color={colors.primary} size={24} />
                    </TouchableOpacity>
                    <Text style={[styles.navText, { color: colors.text }]}>Move {Math.floor(currentMoveIndex / 2) + 1}</Text>
                    <TouchableOpacity style={[styles.navBtn, { transform: [{ rotate: '180deg' }] }]} onPress={() => navigateMove(currentMoveIndex + 1)}>
                        <ChevronLeft color={colors.primary} size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyContent}>
                    <View style={styles.movesGrid}>
                        {history.map((record, index) => (
                            <TouchableOpacity key={index} style={styles.moveRow} onPress={() => navigateMove(index + 1)}>
                                <Text style={[styles.moveNum, { color: colors.textMuted }]}>{index % 2 === 0 ? `${Math.floor(index/2) + 1}.` : ''}</Text>
                                <View style={[
                                    styles.moveItem, 
                                    { backgroundColor: colors.background },
                                    currentMoveIndex === index + 1 && { borderColor: colors.primary, borderWidth: 1 }
                                ]}>
                                    <Text style={[styles.moveSan, { color: colors.text }]}>{record.san}</Text>
                                    <Text style={[styles.moveEval, { color: colors.textMuted }]}>{record.eval}</Text>
                                </View>
                            </TouchableOpacity>
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
        padding: 16,
        borderRadius: THEME.borderRadius.lg,
        marginTop: 4,
        borderWidth: 1,
    },
    engineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    summaryContainer: {
        flex: 1,
        marginHorizontal: 12,
    },
    summaryText: {
        fontSize: 14,
        fontWeight: '800',
    },
    betterMoveText: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
    },
    accuracyBadge: {
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    accuracyValue: {
        fontSize: 16,
        fontWeight: '900',
    },
    accuracyLabel: {
        fontSize: 8,
        fontWeight: '900',
    },
    multiPVContainer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 12,
        gap: 8,
    },
    pvLine: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pvRank: {
        fontSize: 10,
        fontWeight: '900',
        width: 15,
    },
    pvMove: {
        fontSize: 12,
        fontWeight: '800',
        flex: 1,
    },
    pvEval: {
        fontSize: 12,
        fontWeight: '900',
    },
    evalBadge: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        minWidth: 60,
        alignItems: 'center',
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
    navigationControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    navBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navText: {
        fontSize: 14,
        fontWeight: '900',
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
