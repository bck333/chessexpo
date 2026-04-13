import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Platform, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { RotateCcw, Play, Trash2, ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useTheme } from '../../../src/context/ThemeContext';
import { getChessboardHtml } from '../../../src/utils/chessboardHtml';
import { Header } from '../../../src/components/Header';
import { THEME } from '../../../src/constants/theme';

const { width } = Dimensions.get('window');
const BOARD_SIZE = width * 0.95;

const PIECES = [
    { id: 'wK', label: '♔' }, { id: 'wQ', label: '♕' }, { id: 'wR', label: '♖' },
    { id: 'wB', label: '♗' }, { id: 'wN', label: '♘' }, { id: 'wP', label: '♙' },
    { id: 'bK', label: '♚' }, { id: 'bQ', label: '♛' }, { id: 'bR', label: '♜' },
    { id: 'bB', label: '♝' }, { id: 'bN', label: '♞' }, { id: 'bP', label: '♟' },
];

export default function SetupScreen() {
    const webviewRef = useRef<WebView>(null);
    const { colors, isDark, boardTheme, pieceSet, gameOptions } = useTheme();
    const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
    const [pieceCount, setPieceCount] = useState(0);
    const [turn, setTurn] = useState<'w' | 'b'>('w');
    const [generatedFen, setGeneratedFen] = useState<string | null>(null);
    const router = useRouter();

    const selectPiece = (pieceId: string) => {
        const newPiece = selectedPiece === pieceId ? null : pieceId;
        setSelectedPiece(newPiece);
        webviewRef.current?.injectJavaScript(`window.postMessage(JSON.stringify({type: 'set_piece', piece: ${newPiece ? `'${newPiece}'` : 'null'}}), '*'); true;`);
    };

    const clearBoard = () => {
        webviewRef.current?.injectJavaScript(`window.postMessage(JSON.stringify({type: 'clear'}), '*'); true;`);
        setSelectedPiece(null);
        setPieceCount(0);
        setGeneratedFen(null);
    };

    const resetToStart = () => {
        webviewRef.current?.injectJavaScript(`window.postMessage(JSON.stringify({type: 'start_position'}), '*'); true;`);
        setSelectedPiece(null);
        setGeneratedFen(null);
    };

    const generateResult = () => {
        webviewRef.current?.injectJavaScript(`window.postMessage(JSON.stringify({type: 'get_fen', turn: '${turn}'}), '*'); true;`);
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'position_update') setPieceCount(data.pieceCount);
            if (data.type === 'fen_ready') setGeneratedFen(data.fen);
            if (data.type === 'ready') {
                // For setup board, we just need to signal ready
                // The board initializes with 'empty' via config
            }
        } catch {}
    };

    const boardHtml = React.useMemo(() => {
        return getChessboardHtml({
            orientation: 'white',
            fen: 'empty',
            draggable: true,
            dropOffBoard: 'trash',
            mode: 'setup'
        }, colors, boardTheme, pieceSet, gameOptions);
    }, [boardTheme, pieceSet, gameOptions]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            <Header 
                title="Position Editor" 
                rightElement={
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={clearBoard}>
                            <Trash2 color={colors.error} size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={resetToStart}>
                            <RotateCcw color={colors.primary} size={20} />
                        </TouchableOpacity>
                    </View>
                }
            />

            {/* Editor Controls */}
            <Animated.View entering={FadeIn} style={styles.controlsBar}>
                <View style={[styles.turnSelector, { backgroundColor: colors.surface }]}>
                    <TouchableOpacity
                        style={[styles.turnBtn, turn === 'w' && { backgroundColor: colors.white }]}
                        onPress={() => setTurn('w')}
                    >
                        <Text style={[styles.turnBtnText, { color: colors.textMuted }, turn === 'w' && { color: colors.background }]}>White to Move</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.turnBtn, turn === 'b' && { backgroundColor: colors.primary }]}
                        onPress={() => setTurn('b')}
                    >
                        <Text style={[styles.turnBtnText, { color: colors.textMuted }, turn === 'b' && { color: colors.background }]}>Black to Move</Text>
                    </TouchableOpacity>
                </View>
                <Text style={[styles.pieceStats, { color: colors.accent }]}>{pieceCount} Pieces On Board</Text>
            </Animated.View>

            {/* Board Section */}
            <View style={styles.boardArea}>
                <View style={[styles.boardWrapper, { backgroundColor: colors.surface }]}>
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

            {/* Palette Section */}
            <View style={styles.paletteArea}>
                <Text style={[styles.paletteInfo, { color: colors.textMuted }]}>SELECT A PIECE THEN TAP THE BOARD</Text>
                <View style={styles.paletteGrid}>
                    {PIECES.map((piece) => (
                        <TouchableOpacity
                            key={piece.id}
                            style={[
                                styles.paletteItem,
                                { backgroundColor: colors.surface, borderColor: colors.border },
                                selectedPiece === piece.id && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                            ]}
                            onPress={() => selectPiece(piece.id)}
                        >
                            <Text style={[styles.pieceLabel, { color: colors.text }]}>{piece.label}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[
                            styles.paletteItem,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                            selectedPiece === 'trash' && { borderColor: colors.error, backgroundColor: colors.error + '10' }
                        ]}
                        onPress={() => selectPiece('trash')}
                    >
                        <Trash2 color={selectedPiece === 'trash' ? colors.error : colors.textMuted} size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Action Section */}
            <View style={styles.actionArea}>
                <TouchableOpacity
                    style={[styles.startBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }, pieceCount < 2 && { opacity: 0.5, backgroundColor: colors.surfaceLight }]}
                    onPress={generateResult}
                    disabled={pieceCount < 2}
                >
                    <Play color={colors.white} size={20} />
                    <Text style={[styles.startBtnText, { color: colors.white }]}>GENERATE FEN</Text>
                </TouchableOpacity>

                {generatedFen && (
                    <Animated.View entering={SlideInDown} style={[styles.fenResult, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.fenLabel, { color: colors.textMuted }]}>Resulting Position (FEN):</Text>
                        <Text style={[styles.fenString, { color: colors.accent }]} numberOfLines={2}>{generatedFen}</Text>
                    </Animated.View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    controlsBar: {
        paddingHorizontal: 20,
        paddingBottom: 15,
        alignItems: 'center',
    },
    turnSelector: {
        flexDirection: 'row',
        padding: 5,
        borderRadius: THEME.borderRadius.md,
        width: '100%',
        marginBottom: 10,
    },
    turnBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: THEME.borderRadius.sm,
    },
    turnBtnText: {
        fontSize: 12,
        fontWeight: '800',
    },
    pieceStats: {
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    boardArea: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    boardWrapper: {
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
    paletteArea: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    paletteInfo: {
        fontSize: 10,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: 1,
    },
    paletteGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    paletteItem: {
        width: (width - 32 - 40) / 6,
        height: 48,
        borderRadius: THEME.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    pieceLabel: {
        fontSize: 28,
    },
    actionArea: {
        padding: 20,
        paddingTop: 15,
        flex: 1,
    },
    startBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: THEME.borderRadius.lg,
        gap: 12,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    startBtnText: {
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    },
    fenResult: {
        marginTop: 20,
        padding: 16,
        borderRadius: THEME.borderRadius.md,
        borderWidth: 1,
    },
    fenLabel: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 4,
    },
    fenString: {
        fontSize: 11,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: '700',
    },
});
