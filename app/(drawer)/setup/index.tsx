import React, { useRef, useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Dimensions, 
    Platform,
    StatusBar,
    ScrollView,
    Image,
    BackHandler
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { injectWebViewMessage } from '../../../src/utils/chess';
import { 
    Save, 
    Trash2, 
    RotateCcw, 
    Swords, 
    Activity,
    Copy,
    Check
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Header } from '../../../src/components/Header';
import { GradientButton } from '../../../src/components/GradientButton';
import { THEME } from '../../../src/constants/theme';
import { useTheme } from '../../../src/context/ThemeContext';
import { getChessboardHtml } from '../../../src/utils/chessboardHtml';

const { width, height } = Dimensions.get('window');
const BOARD_SIZE = Math.min(width * 0.92, height * 0.38);
const PIECE_CELL = (width - 48) / 6;

const PIECES_WHITE = [
    { id: 'wK', img: 'https://chessboardjs.com/img/chesspieces/wikipedia/wK.png', val: 'K', label: 'K' },
    { id: 'wQ', img: 'https://chessboardjs.com/img/chesspieces/wikipedia/wQ.png', val: 'Q', label: 'Q' },
    { id: 'wR', img: 'https://chessboardjs.com/img/chesspieces/wikipedia/wR.png', val: 'R', label: 'R' },
    { id: 'wB', img: 'https://chessboardjs.com/img/chesspieces/wikipedia/wB.png', val: 'B', label: 'B' },
    { id: 'wN', img: 'https://chessboardjs.com/img/chesspieces/wikipedia/wN.png', val: 'N', label: 'N' },
    { id: 'wP', img: 'https://chessboardjs.com/img/chesspieces/wikipedia/wP.png', val: 'P', label: 'P' },
];

const PIECES_BLACK = [
    { id: 'bK', img: 'https://chessboardjs.com/img/chesspieces/wikipedia/bK.png', val: 'k', label: 'K' },
    { id: 'bQ', img: 'https://chessboardjs.com/img/chesspieces/wikipedia/bQ.png', val: 'q', label: 'Q' },
    { id: 'bR', img: 'https://chessboardjs.com/img/chesspieces/wikipedia/bR.png', val: 'r', label: 'R' },
    { id: 'bB', img: 'https://chessboardjs.com/img/chesspieces/wikipedia/bB.png', val: 'b', label: 'B' },
    { id: 'bN', img: 'https://chessboardjs.com/img/chesspieces/wikipedia/bN.png', val: 'n', label: 'N' },
    { id: 'bP', img: 'https://chessboardjs.com/img/chesspieces/wikipedia/bP.png', val: 'p', label: 'P' },
];

export default function SetupScreen() {
    const webviewRef = useRef<WebView>(null);
    const router = useRouter();
    const isFocused = useIsFocused();
    const { colors, isDark, boardTheme, pieceSet, gameOptions } = useTheme();
    
    const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const [fen, setFen] = useState(START_FEN);
    const [turnToMove, setTurnToMove] = useState<'w' | 'b'>('w');
    const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
    const [boardReady, setBoardReady] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isDraggingOnBoard, setIsDraggingOnBoard] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const validateFen = (fenToValidate: string) => {
        const positionStr = fenToValidate.split(' ')[0];
        let wKing = 0, bKing = 0, wPawns = 0, bPawns = 0;
        let hasBadPawns = false;
        
        const rows = positionStr.split('/');
        rows.forEach((row, rowIndex) => {
            for (let char of row) {
                if (char === 'K') wKing++;
                if (char === 'k') bKing++;
                if (char === 'P') { wPawns++; if (rowIndex === 0 || rowIndex === 7) hasBadPawns = true; }
                if (char === 'p') { bPawns++; if (rowIndex === 0 || rowIndex === 7) hasBadPawns = true; }
            }
        });
        
        if (wKing !== 1) return "Exactly one White King is required.";
        if (bKing !== 1) return "Exactly one Black King is required.";
        if (wPawns > 8 || bPawns > 8) return "Too many pawns.";
        if (hasBadPawns) return "Pawns cannot be on the 1st or 8th rank.";
        
        return null;
    };

    useEffect(() => {
        setValidationError(validateFen(fen));
    }, [fen]);

    const resetSetupState = () => {
        setFen(START_FEN);
        setTurnToMove('w');
        setSelectedPiece(null);
        if (webviewRef.current) {
            injectWebViewMessage(webviewRef, { type: 'start_position' });
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                resetSetupState();
                return false;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                subscription.remove();
                resetSetupState();
            };
        }, [])
    );

    // Store the initial FEN so the WebView can start with it.
    // We do NOT want to put the state 'fen' here or in the dependencies,
    // otherwise placing a piece triggers a full HTML reload and blanks the board.
    const initialFenRef = useRef(START_FEN);

    const boardHtml = React.useMemo(() => {
        return getChessboardHtml({
            orientation: 'white',
            fen: initialFenRef.current,
            mode: 'setup',
            draggable: true,
            dropOffBoard: 'trash',
            sparePieces: true
        }, colors, boardTheme, pieceSet, gameOptions);
    }, [colors, boardTheme, pieceSet, gameOptions]);

    useEffect(() => {
        if (boardReady) {
            injectWebViewMessage(webviewRef, { type: 'update_theme', colors });
        }
    }, [colors, boardReady]);

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'ready') {
                setBoardReady(true);
            } else if (data.type === 'position_changed') {
                if (data.fen) {
                    updateFen(data.fen);
                }
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } else if (data.type === 'drag_start') {
                setIsDraggingOnBoard(true);
            } else if (data.type === 'drag_end') {
                setIsDraggingOnBoard(false);
            }
        } catch {}
    };

    const updateFen = (baseFen: string) => {
        setFen(`${baseFen} ${turnToMove} - - 0 1`);
    };

    const handleTurnChange = (t: 'w' | 'b') => {
        setTurnToMove(t);
        const parts = fen.split(' ');
        parts[1] = t;
        setFen(parts.join(' '));
        if (Platform.OS !== 'web') Haptics.selectionAsync();
    };

    const clearBoard = () => {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        injectWebViewMessage(webviewRef, { type: 'clear' });
    };

    const resetBoard = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        injectWebViewMessage(webviewRef, { type: 'start_position' });
    };

    const copyFen = async () => {
        await Clipboard.setStringAsync(fen);
        setCopied(true);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setCopied(false), 2000);
    };

    const savePosition = async () => {
        try {
            await AsyncStorage.setItem('saved_setup_fen', fen);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            alert('Position saved!');
        } catch (e) {
            console.error('Save failed', e);
        }
    };

    const playComputer = () => {
        router.push({
            pathname: '/play',
            params: { setupFen: fen }
        });
    };

    const analyzePos = () => {
        router.push({
            pathname: '/analysis',
            params: { setupFen: fen }
        });
    };

    const selectPiece = (pieceId: string) => {
        const newPiece = selectedPiece === pieceId ? null : pieceId;
        setSelectedPiece(newPiece);
        injectWebViewMessage(webviewRef, { type: 'set_piece', piece: newPiece });
        if (Platform.OS !== 'web') Haptics.selectionAsync();
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <Header 
                title="Board Setup" 
                showBackButton={true}
                onBackPress={() => {
                    resetSetupState();
                    router.back();
                }}
            />

            {/* Board — fixed, never scrolls */}
            <View 
                style={[styles.boardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
                collapsable={false}
            >
                {isFocused && (
                    <WebView
                        key="setup-webview"
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

            {/* Everything below the board scrolls */}
            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
                scrollEnabled={!isDraggingOnBoard}
                keyboardShouldPersistTaps="handled"
            >
                {/* Turn Selector — compact inline */}
                <View style={styles.turnRow}>
                    <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TURN</Text>
                    <View style={[styles.turnToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <TouchableOpacity 
                            style={[
                                styles.turnBtn, 
                                turnToMove === 'w' && { backgroundColor: colors.white, ...THEME.shadows.subtle }
                            ]}
                            onPress={() => handleTurnChange('w')}
                        >
                            <View style={[styles.turnDot, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' }]} />
                            <Text style={[styles.turnText, { color: turnToMove === 'w' ? colors.text : colors.textMuted }]}>White</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[
                                styles.turnBtn, 
                                turnToMove === 'b' && { backgroundColor: isDark ? colors.surfaceLight : '#e8e8e8', ...THEME.shadows.subtle }
                            ]}
                            onPress={() => handleTurnChange('b')}
                        >
                            <View style={[styles.turnDot, { backgroundColor: '#333' }]} />
                            <Text style={[styles.turnText, { color: turnToMove === 'b' ? colors.text : colors.textMuted }]}>Black</Text>
                        </TouchableOpacity>
                    </View>
                </View>



                {/* Quick Actions Row */}
                <Animated.View entering={FadeInUp.delay(200).duration(300)} style={styles.quickActions}>
                    <TouchableOpacity 
                        style={[styles.actionChip, { backgroundColor: colors.surface, borderColor: colors.border }]} 
                        onPress={clearBoard}
                    >
                        <Trash2 size={14} color={colors.error} />
                        <Text style={[styles.actionChipText, { color: colors.text }]}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionChip, { backgroundColor: colors.surface, borderColor: colors.border }]} 
                        onPress={resetBoard}
                    >
                        <RotateCcw size={14} color={colors.accent} />
                        <Text style={[styles.actionChipText, { color: colors.text }]}>Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionChip, { backgroundColor: colors.surface, borderColor: colors.border }]} 
                        onPress={savePosition}
                    >
                        <Save size={14} color={colors.primary} />
                        <Text style={[styles.actionChipText, { color: colors.text }]}>Save</Text>
                    </TouchableOpacity>
                </Animated.View>

                {/* FEN display */}
                <Animated.View entering={FadeInUp.delay(300).duration(300)} style={[styles.fenBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.fenText, { color: colors.text }]} numberOfLines={1} ellipsizeMode="middle">
                        {fen}
                    </Text>
                    <TouchableOpacity style={[styles.copyBtn, { backgroundColor: colors.background }]} onPress={copyFen}>
                        {copied ? <Check size={14} color={colors.success} /> : <Copy size={14} color={colors.primary} />}
                    </TouchableOpacity>
                </Animated.View>

                {/* Validation Error */}
                {validationError && (
                    <Animated.View entering={FadeInUp.duration(300)} style={{ paddingHorizontal: 16, marginTop: 8 }}>
                        <Text style={{ color: colors.error, fontSize: 12, textAlign: 'center', fontWeight: '600' }}>
                            {validationError}
                        </Text>
                    </Animated.View>
                )}

                {/* Main Action Buttons */}
                <Animated.View entering={FadeInUp.delay(400).duration(300)} style={[styles.mainActions, validationError ? { opacity: 0.5 } : {}]}>
                    <GradientButton
                        title="Play Computer"
                        onPress={() => !validationError && playComputer()}
                        icon={<Swords color={colors.white} size={18} strokeWidth={2.5} />}
                        gradientColors={colors.gradient.play}
                        style={{ flex: 1 }}
                    />
                    <GradientButton
                        title="Analyze"
                        onPress={() => !validationError && analyzePos()}
                        icon={<Activity color={colors.white} size={18} strokeWidth={2.5} />}
                        gradientColors={colors.gradient.analyze}
                        style={{ flex: 1 }}
                    />
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    boardContainer: {
        width: BOARD_SIZE,
        height: BOARD_SIZE * 1.28,
        alignSelf: 'center',
        borderRadius: THEME.borderRadius.md,
        overflow: 'hidden',
        borderWidth: 1,
        marginTop: 8,
        ...THEME.shadows.elevated,
    },
    webview: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        opacity: 0.99,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 40,
    },
    turnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    turnToggle: {
        flexDirection: 'row',
        padding: 3,
        borderRadius: THEME.borderRadius.lg,
        borderWidth: 1,
    },
    turnBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: THEME.borderRadius.md,
        gap: 6,
    },
    turnDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    turnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    pieceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
    },
    pieceCell: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: THEME.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    pieceImg: {
        width: '75%',
        height: '75%',
        resizeMode: 'contain',
    },
    quickActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
        marginBottom: 12,
    },
    actionChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 10,
        borderRadius: THEME.borderRadius.md,
        borderWidth: 1,
    },
    actionChipText: {
        fontSize: 11,
        fontWeight: '700',
    },
    fenBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: THEME.borderRadius.lg,
        borderWidth: 1,
        marginBottom: 16,
    },
    fenText: {
        flex: 1,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 11,
    },
    copyBtn: {
        padding: 8,
        borderRadius: THEME.borderRadius.md,
        marginLeft: 8,
    },
    mainActions: {
        flexDirection: 'row',
        gap: 12,
    },
});
