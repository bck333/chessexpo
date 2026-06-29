import React, { useRef, useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    Dimensions, 
    Platform,
    StatusBar,
    ActivityIndicator,
    Alert,
    BackHandler
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { injectWebViewMessage } from '../../../src/utils/chess';
import { 
    Activity, 
    ChevronLeft, 
    Settings, 
    Lightbulb, 
    Database, 
    RotateCcw,
    Zap
} from 'lucide-react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Chess } from 'chess.js';
import { Header } from '../../../src/components/Header';
import { THEME } from '../../../src/constants/theme';
import { useTheme } from '../../../src/context/ThemeContext';
import { getChessboardHtml } from '../../../src/utils/chessboardHtml';
import { analyzePosition } from '../../../src/api/engine';
import { GradientButton } from '../../../src/components/GradientButton';

const { width } = Dimensions.get('window');
const BOARD_SIZE = width * 0.95;

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface MoveNode {
    id: string;
    fen: string;
    san: string;
    parentId: string | null;
    childrenIds: string[];
    ply: number;
}

export default function AnalysisScreen() {
    const webviewRef = useRef<WebView>(null);
    const router = useRouter();
    const params = useLocalSearchParams();
    const isFocused = useIsFocused();
    const { colors, isDark, boardTheme, pieceSet, gameOptions } = useTheme();
    
    const [fen, setFen] = useState(START_FEN);
    const lastSyncedFen = useRef(START_FEN);
    const [turn, setTurn] = useState<'w' | 'b'>('w');
    
    // Move Tree State
    const [moveTree, setMoveTree] = useState<MoveTree>({
        'root': { id: 'root', fen: START_FEN, san: '', parentId: null, childrenIds: [], ply: 0 }
    });
    const [currentNodeId, setCurrentNodeId] = useState<string>('root');
    const [boardReady, setBoardReady] = useState(false);
    
    // Engine State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [evalScore, setEvalScore] = useState<number>(0);
    const [bestMoveStr, setBestMoveStr] = useState<string>('');
    const [depthReached, setDepthReached] = useState<number>(0);

    const resetAnalysisState = () => {
        setFen(START_FEN);
        setMoveTree({
            'root': { id: 'root', fen: START_FEN, san: '', parentId: null, childrenIds: [], ply: 0 }
        });
        setCurrentNodeId('root');
        setEvalScore(0);
        setBestMoveStr('');
        setDepthReached(0);
        setIsAnalyzing(false);
        router.setParams({ setupFen: '', reviewMode: '', reviewHistory: '', reviewSAN: '' });
    };

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                if (Object.keys(moveTree).length > 1) {
                    Alert.alert(
                        "Exit Analysis?",
                        "Are you sure you want to exit? Your analysis will be lost.",
                        [
                            { text: "Cancel", style: "cancel" },
                            { text: "Exit", style: "destructive", onPress: () => {
                                resetAnalysisState();
                                router.back();
                            }}
                        ]
                    );
                    return true;
                }
                resetAnalysisState();
                return false;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                subscription.remove();
                resetAnalysisState();
            };
        }, [moveTree])
    );

    const boardHtml = React.useMemo(() => {
        return getChessboardHtml({
            orientation: 'white',
            fen: 'start',
            draggable: true
        }, colors, boardTheme, pieceSet, gameOptions);
    }, [boardTheme, pieceSet, gameOptions]);

    // Pre-load from passed params if available
    useEffect(() => {
        if (params.reviewMode === 'true') {
            if (params.reviewHistory && params.reviewSAN) {
                try {
                    const parsedHistory = JSON.parse(params.reviewHistory as string);
                    const parsedSAN = JSON.parse(params.reviewSAN as string);
                    
                    if (parsedHistory && parsedHistory.length > 0) {
                        const newTree: MoveTree = {};
                        let currentParentId: string | null = null;
                        let lastId = 'root';
                        
                        parsedHistory.forEach((f: string, idx: number) => {
                            const id = idx === 0 ? 'root' : `move_${idx}`;
                            const san = idx === 0 ? '' : (parsedSAN[idx - 1] || '');
                            
                            newTree[id] = {
                                id,
                                fen: f,
                                san,
                                parentId: currentParentId,
                                childrenIds: idx < parsedHistory.length - 1 ? [`move_${idx + 1}`] : [],
                                ply: idx
                            };
                            currentParentId = id;
                            lastId = id;
                        });
                        
                        setMoveTree(newTree);
                        setCurrentNodeId(lastId);
                        setFen(parsedHistory[parsedHistory.length - 1]);
                        setTurn(parsedHistory[parsedHistory.length - 1].includes(' b ') ? 'b' : 'w');
                    }
                } catch(e) {}
            }
            router.setParams({ reviewMode: '', reviewHistory: '', reviewSAN: '' });
        } else if (params.setupFen) {
            const initialFen = params.setupFen as string;
            setFen(initialFen);
            setMoveTree({
                'root': { id: 'root', fen: initialFen, san: '', parentId: null, childrenIds: [], ply: 0 }
            });
            setCurrentNodeId('root');
            setTurn(initialFen.includes(' b ') ? 'b' : 'w');
            router.setParams({ setupFen: '' });
        }
    }, [params.reviewMode, params.setupFen, params.reviewHistory, params.reviewSAN]);

    // Handle incoming messages from WebView
    const handleMessage = async (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'move') {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                
                let nextNodeId = '';
                
                setMoveTree(prevTree => {
                    const currentNode = prevTree[currentNodeId];
                    if (!currentNode) return prevTree;
                    
                    // Check if this move already exists as a child
                    const existingChildId = currentNode.childrenIds.find(childId => prevTree[childId]?.san === data.san);
                    
                    if (existingChildId) {
                        nextNodeId = existingChildId;
                        return prevTree;
                    }
                    
                    // Create new branch/node
                    const newNodeId = `move_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    nextNodeId = newNodeId;
                    const newNode: MoveNode = {
                        id: newNodeId,
                        fen: data.fen,
                        san: data.san,
                        parentId: currentNodeId,
                        childrenIds: [],
                        ply: currentNode.ply + 1
                    };
                    
                    return {
                        ...prevTree,
                        [currentNodeId]: {
                            ...currentNode,
                            childrenIds: [...currentNode.childrenIds, newNodeId]
                        },
                        [newNodeId]: newNode
                    };
                });
                
                // Use setTimeout to ensure state setter runs after setMoveTree has been processed,
                // or just wait for the next render. Actually, setting it directly here is generally safe
                // in React 18 outside of concurrent mode, but to be robust, we'll set it here.
                // Note: nextNodeId is captured synchronously because setMoveTree updater runs synchronously
                // if it's the first time in the queue during an event handler.
                setTimeout(() => {
                    if (nextNodeId) setCurrentNodeId(nextNodeId);
                }, 0);
                
                setFen(data.fen);
                setTurn(data.turn);
            } else if (data.type === 'ready') {
                setBoardReady(true);
            }
        } catch {}
    };

    // Keep WebView in sync with colors via postMessage instead of HTML reload
    useEffect(() => {
        if (boardReady) {
            injectWebViewMessage(webviewRef, { type: 'update_theme', colors });
        }
    }, [colors, boardReady]);

    // Update board position when fen changes externally (e.g. navigation)
    useEffect(() => {
        if (boardReady && fen !== lastSyncedFen.current) {
            lastSyncedFen.current = fen;
            injectWebViewMessage(webviewRef, { type: 'set_fen', fen });
            webviewRef.current?.injectJavaScript(`
                $('#board .square-55d63').removeClass('highlight-move');
                true;
            `);
        }
    }, [fen, boardReady]);

    // Auto-analyze when current node changes
    useEffect(() => {
        const timer = setTimeout(() => {
            runAnalysis();
        }, 500); // Wait for rapid scrubbing to finish
        return () => clearTimeout(timer);
    }, [currentNodeId]);

    const runAnalysis = async () => {
        if (!fen || fen === 'start') return;
        setIsAnalyzing(true);
        setDepthReached(0);
        try {
            const res = await analyzePosition(fen, 14, 2000);
            if (res) {
                setEvalScore(res.evaluation);
                
                let sanMove = res.best_move;
                if (res.best_move) {
                    try {
                        const chess = new Chess(fen);
                        const move = chess.move({
                            from: res.best_move.substring(0, 2),
                            to: res.best_move.substring(2, 4),
                            promotion: res.best_move.length > 4 ? res.best_move[4] : undefined
                        });
                        if (move) {
                            sanMove = move.san;
                        }
                    } catch(e) {}
                }
                setBestMoveStr(sanMove);
                setDepthReached(14);
                
                // Highlight best move on board
                if (res.best_move && boardReady) {
                    const from = res.best_move.substring(0, 2);
                    const to = res.best_move.substring(2, 4);
                    webviewRef.current?.injectJavaScript(`
                        $('#board .square-55d63').removeClass('highlight-move');
                        $('#board .square-' + '${from}').addClass('highlight-move');
                        $('#board .square-' + '${to}').addClass('highlight-move');
                        true;
                    `);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const navigateNode = (nodeId: string) => {
        const node = moveTree[nodeId];
        if (node) {
            if (Platform.OS !== 'web') Haptics.selectionAsync();
            setCurrentNodeId(nodeId);
            setFen(node.fen);
            setTurn(node.fen.includes(' b ') ? 'b' : 'w');
        }
    };

    const handleFlip = () => {
        if (boardReady) {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            injectWebViewMessage(webviewRef, { type: 'flip_board' });
        }
    };

    const getActiveLine = () => {
        const line: MoveNode[] = [];
        let curr: string | null = 'root';
        const pathSet = new Set<string>();
        let temp: string | null = currentNodeId;
        while (temp) {
            pathSet.add(temp);
            temp = moveTree[temp]?.parentId || null;
        }
        
        while (curr) {
            const node = moveTree[curr];
            if (!node) break;
            if (node.id !== 'root') line.push(node);
            if (node.childrenIds.length === 0) break;
            const nextChild = node.childrenIds.find(id => pathSet.has(id)) || node.childrenIds[node.childrenIds.length - 1];
            curr = nextChild;
        }
        return line;
    };

    const activeLine = getActiveLine();

    const navigateBack = () => {
        const node = moveTree[currentNodeId];
        if (node && node.parentId) navigateNode(node.parentId);
    };

    const navigateForward = () => {
        const node = moveTree[currentNodeId];
        if (node && node.childrenIds.length > 0) {
            navigateNode(node.childrenIds[node.childrenIds.length - 1]);
        }
    };

    const navigateStart = () => navigateNode('root');

    // Get variations for current node's parent (siblings)
    const getVariations = () => {
        const node = moveTree[currentNodeId];
        if (!node || !node.parentId) return [];
        const parent = moveTree[node.parentId];
        if (!parent || parent.childrenIds.length <= 1) return [];
        return parent.childrenIds.map(id => moveTree[id]).filter(n => n && n.id !== currentNodeId);
    };

    const variations = getVariations();

    // Eval Bar Calculation
    // Clamped between -5 (Black Winning) and +5 (White Winning)
    const normalizedEval = Math.max(-5, Math.min(5, evalScore)); 
    const whitePercentage = ((normalizedEval + 5) / 10) * 100;
    
    const evalBarStyle = useAnimatedStyle(() => ({
        height: withTiming(`${whitePercentage}%`, { duration: 500 }),
    }));

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <Header 
                title="Deep Analysis" 
                showBackButton={true}
                onBackPress={() => {
                    if (Object.keys(moveTree).length > 1) {
                        Alert.alert(
                            "Exit Analysis?",
                            "Are you sure you want to exit? Your analysis will be lost.",
                            [
                                { text: "Cancel", style: "cancel" },
                                { text: "Exit", style: "destructive", onPress: () => { resetAnalysisState(); router.back(); } }
                            ]
                        );
                    } else {
                        resetAnalysisState();
                        router.back();
                    }
                }}
            />
            
            <View style={styles.mainLayout}>
                {/* WIDER EVAL BAR */}
                <View style={[styles.evalBarContainer, { borderColor: colors.border, backgroundColor: '#000000' }]}>
                    <Animated.View style={[styles.evalBarWhite, evalBarStyle, { backgroundColor: '#FFFFFF' }]} />
                    
                    {/* Eval Number Overlay */}
                    <View style={styles.evalTextContainer}>
                        <Text style={[
                            styles.evalBarText, 
                            { color: evalScore > 0 ? '#000000' : '#FFFFFF' },
                            evalScore > 0 ? { bottom: 10 } : { top: 10 }
                        ]}>
                            {evalScore > 0 ? '+' : ''}{evalScore.toFixed(1)}
                        </Text>
                    </View>
                </View>

                {/* BOARD */}
                <View 
                    style={[styles.boardWrapper, { backgroundColor: colors.surface }]}
                    collapsable={false}
                >
                    {isFocused && (
                        <WebView
                            key="analysis-webview"
                            ref={webviewRef}
                            originWhitelist={['*']}
                            source={{ html: boardHtml }}
                            style={[styles.webview, { opacity: 0.99 }]}
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
            </View>

            <View style={styles.bottomSection}>
                {/* Engine Insight Panel */}
                <Animated.View style={[styles.engineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <LinearGradient
                        colors={isDark ? [colors.surfaceElevated, colors.surface] : [colors.surface, colors.surfaceLight]}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.engineHeader}>
                        <View style={styles.engineBadgeContainer}>
                            <Zap color={colors.accent} size={14} fill={colors.accent} />
                            <Text style={[styles.engineNameText, { color: colors.accent }]}>STOCKFISH 18</Text>
                            {isAnalyzing && <ActivityIndicator size="small" color={colors.accent} style={{ marginLeft: 6 }} />}
                        </View>
                        <Text style={[styles.depthText, { color: colors.textMuted }]}>
                            Depth {depthReached}/14
                        </Text>
                    </View>
                    
                    <View style={styles.evalScoreRow}>
                        <Text style={[styles.mainEvalScore, { color: evalScore > 0 ? colors.success : colors.error }]}>
                            {evalScore > 0 ? '+' : ''}{evalScore.toFixed(2)}
                        </Text>
                        <View style={styles.bestMoveContainer}>
                            <Text style={[styles.bestMoveLabel, { color: colors.textMuted }]}>Best Move</Text>
                            <Text style={[styles.bestMoveVal, { color: colors.text }]}>{bestMoveStr || '...'}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Move Navigation */}
                <View style={styles.controlsRow}>
                    <TouchableOpacity 
                        style={[styles.iconBtn, { backgroundColor: colors.surfaceLight }]}
                        onPress={navigateStart}
                    >
                        <ChevronLeft color={colors.text} size={20} />
                        <ChevronLeft color={colors.text} size={20} style={{ marginLeft: -12 }} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.iconBtn, { backgroundColor: colors.surfaceLight, flex: 1 }]}
                        onPress={navigateBack}
                    >
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.iconBtn, { backgroundColor: colors.surfaceLight, flex: 1 }]}
                        onPress={navigateForward}
                    >
                        <View style={{ transform: [{ rotate: '180deg' }] }}>
                            <ChevronLeft color={colors.text} size={24} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.iconBtn, { backgroundColor: colors.surfaceLight }]}
                        onPress={handleFlip}
                    >
                        <RotateCcw color={colors.text} size={20} />
                    </TouchableOpacity>
                </View>

                {/* Variations */}
                {variations.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                        <Text style={{ color: colors.textMuted, fontSize: 12, marginRight: 8, alignSelf: 'center' }}>Variations:</Text>
                        {variations.map(v => (
                            <TouchableOpacity 
                                key={v.id} 
                                style={[styles.moveChip, { backgroundColor: colors.surfaceLight, marginRight: 8, paddingHorizontal: 12 }]}
                                onPress={() => navigateNode(v.id)}
                            >
                                <Text style={[styles.moveText, { color: colors.text }]}>{v.san}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {/* Move History Log */}
                <View style={[styles.historyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.historyContent}>
                        {activeLine.length === 0 ? (
                            <Text style={[styles.emptyHistory, { color: colors.textMuted }]}>Make a move to start analyzing.</Text>
                        ) : (
                            <View style={styles.movesGrid}>
                                {Array.from({ length: Math.ceil(activeLine.length / 2) }).map((_, rowIndex) => {
                                    const wNode = activeLine[rowIndex * 2];
                                    const bNode = activeLine[rowIndex * 2 + 1];
                                    return (
                                        <View key={rowIndex} style={[styles.moveRow, { borderBottomColor: colors.border }]}>
                                            <Text style={[styles.moveNum, { color: colors.textMuted }]}>{rowIndex + 1}.</Text>
                                            
                                            {/* White Move */}
                                            {wNode && (
                                                <TouchableOpacity 
                                                    style={[
                                                        styles.moveChip,
                                                        { backgroundColor: colors.surfaceLight },
                                                        currentNodeId === wNode.id && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                                                    ]}
                                                    onPress={() => navigateNode(wNode.id)}
                                                >
                                                    <Text style={[styles.moveText, { color: currentNodeId === wNode.id ? colors.primary : colors.text }]}>
                                                        {wNode.san}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}

                                            {/* Black Move */}
                                            {bNode ? (
                                                <TouchableOpacity 
                                                    style={[
                                                        styles.moveChip,
                                                        { backgroundColor: colors.surfaceLight },
                                                        currentNodeId === bNode.id && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                                                    ]}
                                                    onPress={() => navigateNode(bNode.id)}
                                                >
                                                    <Text style={[styles.moveText, { color: currentNodeId === bNode.id ? colors.primary : colors.text }]}>
                                                        {bNode.san}
                                                    </Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={[styles.moveChip, { borderColor: 'transparent' }]} />
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainLayout: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 12,
        alignItems: 'center',
    },
    evalBarContainer: {
        width: 14, // Wider for premium feel
        height: BOARD_SIZE,
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        position: 'relative',
    },
    evalBarWhite: {
        width: '100%',
    },
    evalTextContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
    },
    evalBarText: {
        position: 'absolute',
        fontSize: 8,
        fontWeight: '900',
    },
    boardWrapper: {
        width: BOARD_SIZE - 26, // Account for eval bar and gap
        height: BOARD_SIZE - 26,
        borderRadius: THEME.borderRadius.md,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    webview: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        opacity: 0.99,
    },
    bottomSection: {
        flex: 1,
        padding: 16,
        gap: 16,
    },
    engineCard: {
        borderRadius: THEME.borderRadius.lg,
        borderWidth: 1,
        padding: 16,
        overflow: 'hidden',
        ...THEME.shadows.card,
    },
    engineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    engineBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    engineNameText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    depthText: {
        fontSize: 11,
        fontWeight: '700',
    },
    evalScoreRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    mainEvalScore: {
        fontSize: 36,
        fontWeight: '900',
        letterSpacing: -1,
    },
    bestMoveContainer: {
        alignItems: 'flex-end',
    },
    bestMoveLabel: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },
    bestMoveVal: {
        fontSize: 20,
        fontWeight: '800',
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    iconBtn: {
        height: 52,
        borderRadius: THEME.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    historyContainer: {
        flex: 1,
        borderRadius: THEME.borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
    },
    historyContent: {
        padding: 12,
    },
    emptyHistory: {
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
        fontWeight: '600',
    },
    movesGrid: {
        width: '100%',
    },
    moveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        borderBottomWidth: 1,
    },
    moveNum: {
        width: 32,
        fontSize: 13,
        fontWeight: '700',
    },
    moveChip: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    moveText: {
        fontSize: 14,
        fontWeight: '800',
    },
});
