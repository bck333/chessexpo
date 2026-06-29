import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Alert, Image, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import apiClient from '../../../src/api/client';
import { puzzleApi } from '../../../src/api/puzzles';
import { ArrowLeft, RefreshCcw, CheckCircle2, TrendingUp, Users, Info, Trophy, User } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../../src/context/ThemeContext';
import { useIsFocused } from '@react-navigation/native';
import { injectWebViewMessage } from '../../../src/utils/chess';
import THEME from '../../../src/constants/theme';
import { getChessboardHtml } from '../../../src/utils/chessboardHtml';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 20, 500);

const SOUNDS = {
  move: 'https://lichess.org/assets/sound/standard/Move.ogg',
  capture: 'https://lichess.org/assets/sound/standard/Capture.ogg',
  check: 'https://lichess.org/assets/sound/standard/Check.ogg',
  generic: 'https://lichess.org/assets/sound/standard/GenericNotify.ogg',
};

export default function PuzzleSolverScreen() {
  const { id, category_id, difficulty } = useLocalSearchParams();
  const router = useRouter();
  const webviewRef = useRef<WebView>(null);
  const isFocused = useIsFocused();
  const { colors, isDark, boardTheme, pieceSet, gameOptions } = useTheme();
  
  const [puzzle, setPuzzle] = useState<any>(null);
  const [fen, setFen] = useState<string>('start');
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<'playing' | 'solved' | 'failed'>('playing');
  const [soundObjects, setSoundObjects] = useState<{ [key: string]: Audio.Sound }>({});
  const [boardReady, setBoardReady] = useState(false);

  const loadSounds = async () => {
    try {
      const moveSound = new Audio.Sound();
      await moveSound.loadAsync({ uri: SOUNDS.move });
      
      const captureSound = new Audio.Sound();
      await captureSound.loadAsync({ uri: SOUNDS.capture });

      const successSound = new Audio.Sound();
      await successSound.loadAsync({ uri: SOUNDS.generic });

      setSoundObjects({
        move: moveSound,
        capture: captureSound,
        generic: successSound,
      });
    } catch (e) {
      console.error('Failed to load puzzle sounds:', e);
    }
  };

  const playSound = async (type: 'move' | 'capture' | 'generic') => {
    try {
      const sound = soundObjects[type];
      if (sound) {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      }
    } catch (e) {
      console.warn('Sound play error:', e);
    }
  };

  // Series progression tracking
  const [puzzlesInSeries, setPuzzlesInSeries] = useState<any[]>([]);
  const currentIndexInSeries = useMemo(() => {
    return puzzlesInSeries.findIndex((p: any) => p.id === id);
  }, [puzzlesInSeries, id]);

  const boardHtml = React.useMemo(() => {
    const isBlackToPlay = puzzle?.fen?.split(' ')[1] === 'b';
    return getChessboardHtml({
      orientation: isBlackToPlay ? 'black' : 'white',
      fen: 'start', // Will be synced via ready handshake
      draggable: status === 'playing'
    }, colors, boardTheme, pieceSet, { ...gameOptions, showLegalMoves: true });
  }, [puzzle?.fen, boardTheme, pieceSet, gameOptions, status]);

  useEffect(() => {
    fetchPuzzle();
    loadSounds();
    return () => {
      Object.values(soundObjects).forEach(s => s.unloadAsync());
    };
  }, [id]);

  useEffect(() => {
    if (category_id && difficulty) {
      puzzleApi.list({
        category_id: category_id as string,
        difficulty: difficulty as string,
        limit: 50
      }).then(response => {
        setPuzzlesInSeries(response.data || []);
      }).catch(err => {
        console.error('Fetch series error:', err);
      });
    }
  }, [category_id, difficulty]);

  const fetchPuzzle = async () => {
    try {
      setBoardReady(false);
      setStatus('playing');
      setMoveIndex(0);
      
      // OPTIMIZATION: Check if we already have this puzzle in our pre-fetched series
      const localPuzzle = puzzlesInSeries.find(p => p.id === id);
      let data;
      
      if (localPuzzle && localPuzzle.solution) {
        data = localPuzzle;
      } else {
        const response = await apiClient.get(`/puzzles/${id}`);
        data = response.data.puzzle; 
      }
      
      setPuzzle(data);
      
      const chess = new Chess(data.fen);
      if (data.lastMove) {
        try { chess.move(data.lastMove); } catch (e) {}
      }
      setFen(chess.fen());
    } catch (error) {
      console.error('Fetch puzzle error:', error);
      Alert.alert('Error', 'Failed to load puzzle');
    }
  };

  const handleNextChallenge = () => {
    const nextIndex = currentIndexInSeries + 1;
    if (puzzlesInSeries.length > 0 && nextIndex < puzzlesInSeries.length) {
      const nextPuzzle = puzzlesInSeries[nextIndex];
      router.setParams({ id: nextPuzzle.id });
    } else {
      Alert.alert(
        "Category Completed!",
        "Brilliant job! You've solved all available puzzles in this category.",
        [{ text: "Awesome", onPress: () => router.back() }]
      );
    }
  };

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'move') {
        const expectedMove = puzzle.solution[moveIndex];
        // The move message from WebView includes 'san' which we can use or convert to UCI
        // But our universal board already updated the internal chess.js and returned the move
        // We need to verify if the move played matches the solution
        
        // Let's use a temporary chess instance to verify the move
        const tempChess = new Chess(fen);
        const move = tempChess.move(data.san);
        if (!move) return;

        const uciMove = move.from + move.to + (move.promotion || '');
        
        if (uciMove === expectedMove) {
          // Correct move
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (move.captured) playSound('capture'); else playSound('move');

          if (moveIndex + 1 === puzzle.solution.length) {
            setStatus('solved');
            playSound('generic');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            apiClient.post(`/puzzles/${id}/solve`).catch(() => {});

            // Sync dynamic progress tracking to backend for academy reports
            const categoryName = (puzzle && puzzle.themes && puzzle.themes.length > 0) ? puzzle.themes[0] : 'Practice';
            const currentStepNum = currentIndexInSeries >= 0 ? currentIndexInSeries + 1 : 1;
            const totalSteps = puzzlesInSeries.length > 0 ? puzzlesInSeries.length : 1;
            const isCompletedAll = currentStepNum >= totalSteps;

            apiClient.post('/user/progress', {
              category_id: category_id || '',
              category_name: categoryName,
              progress_type: 'practice',
              step_number: currentStepNum,
              status: isCompletedAll ? 'completed' : 'started',
              xp_earned: 10
            }).catch(err => {
              console.warn('Failed to sync dynamic progress to database:', err);
            });

            // AUTO-ADVANCE: Load next puzzle after 2 seconds
            setTimeout(() => {
              handleNextChallenge();
            }, 2000);
          } else {
            // Play computer response
            const nextIndex = moveIndex + 1;
            const responseMoveUci = puzzle.solution[nextIndex];
            
            setTimeout(() => {
              injectWebViewMessage(webviewRef, {
                type: 'engine_move',
                move: responseMoveUci
              });
              
              const afterResponseChess = new Chess(tempChess.fen());
              const responseMove = afterResponseChess.move(responseMoveUci);
              setFen(afterResponseChess.fen());
              setMoveIndex(nextIndex + 1);
              
              if (responseMove && responseMove.captured) playSound('capture'); else playSound('move');
            }, 600);
          }
        } else {
          // Wrong move
          setStatus('failed');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          
          if (move) {
            injectWebViewMessage(webviewRef, {
              type: 'highlight_wrong_move',
              from: move.from,
              to: move.to
            });
          }

          // Give player time to see the wrong move before resetting
          setTimeout(() => {
            resetPuzzle();
          }, 1500);
        }
      } else if (data.type === 'ready') {
        setBoardReady(true);
        // Sync starting FEN for the puzzle
        injectWebViewMessage(webviewRef, { type: 'set_fen', fen });
      }
    } catch {}
  };

  const lastSyncedFen = useRef<string>('');

  // Sync FEN changes to WebView without reloading
  useEffect(() => {
    if (boardReady && fen !== lastSyncedFen.current) {
      lastSyncedFen.current = fen;
      injectWebViewMessage(webviewRef, { type: 'set_fen', fen });
    }
  }, [fen, boardReady]);

  const resetPuzzle = () => {
    if (!puzzle) return;
    const chess = new Chess(puzzle.fen);
    if (puzzle.lastMove) {
       try { chess.move(puzzle.lastMove); } catch (e) {}
    }
    setFen(chess.fen());
    setMoveIndex(0);
    setStatus('playing');
    injectWebViewMessage(webviewRef, { type: 'set_fen', fen: chess.fen() });
  };

  if (!puzzle) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface }]}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.difficultyTag, { color: colors.textMuted }]}>{puzzle.difficulty.toUpperCase()}</Text>
          <View style={styles.ratingSection}>
            <Trophy size={14} color={colors.accent} />
            <Text style={[styles.ratingText, { color: colors.text }]}>{puzzle.rating}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={resetPuzzle} style={[styles.resetButton, { backgroundColor: colors.surface }]}>
          <RefreshCcw color={colors.text} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.successBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
           <TrendingUp size={14} color={colors.success} />
           <Text style={[styles.successRateText, { color: colors.success }]}>94.2% SUCCESS</Text>
        </View>
        <View style={[styles.playsBadge, { backgroundColor: colors.surface }]}>
           <Users size={14} color={colors.textMuted} />
           <Text style={[styles.playsText, { color: colors.textMuted }]}>{puzzle.plays || 0} SOLVED</Text>
        </View>
      </View>

      <View style={styles.boardWrapper}>
        <View style={styles.boardContainer}>
          <View style={[styles.board, { borderColor: colors.surfaceLight, backgroundColor: colors.surface }]}>
            {isFocused && (
              <WebView
                ref={webviewRef}
                originWhitelist={['*']}
                source={{ html: boardHtml }}
                style={styles.webview}
                onMessage={handleMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                scrollEnabled={false}
                bounces={false}
                startInLoadingState={false}
                androidLayerType="software"
              />
            )}
          </View>
        </View>
      </View>

      <View style={styles.infoBox}>
        {/* New Professional Details */}
        <View style={styles.detailsCard}>
           <View style={styles.detailRow}>
              <View style={styles.detailLabelGroup}>
                <Info size={14} color={colors.textMuted} />
                <Text style={styles.detailLabelText}>OPENING / ECO</Text>
              </View>
              <Text style={[styles.detailValueText, { color: colors.text }]}>{puzzle.opening || 'Unknown Opening'} ({puzzle.eco || '---'})</Text>
           </View>
           <View style={styles.playerRow}>
              <View style={styles.playerBlock}>
                 <User size={12} color={colors.textMuted} />
                 <Text style={styles.playerName}>{puzzle.white || 'White Player'}</Text>
              </View>
              <Text style={[styles.vsText, { color: colors.textMuted }]}>VS</Text>
              <View style={styles.playerBlock}>
                 <User size={12} color={colors.textMuted} />
                 <Text style={styles.playerName}>{puzzle.black || 'Black Player'}</Text>
              </View>
           </View>
        </View>

        <View style={[
          styles.statusCard, 
          { 
            backgroundColor: status === 'failed' ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2') : colors.surface, 
            borderColor: status === 'failed' ? '#ef4444' : colors.border 
          }
        ]}>
          <Text style={[
            styles.instruction, 
            { color: status === 'failed' ? '#ef4444' : colors.text }
          ]}>
            {status === 'solved' ? 'Tactics Mastered!' : status === 'failed' ? 'Incorrect Move!' : `Find the Win`}
          </Text>
          <Text style={[
            styles.moveCount, 
            { color: status === 'failed' ? (isDark ? '#fca5a5' : '#b91c1c') : colors.textMuted }
          ]}>
            {status === 'solved' ? 'Puzzle completed perfectly' : status === 'failed' ? 'That is not the correct solution. Try again!' : `Step ${moveIndex + 1} of ${puzzle.solution.length}`}
          </Text>
        </View>
        
        <Text style={styles.description}>{puzzle.description}</Text>
        
        {status === 'solved' && (
          <View style={[styles.successMessage, { backgroundColor: colors.surface, borderColor: colors.success + '40', shadowColor: colors.success }]}>
            <View style={[styles.successIcon, { backgroundColor: colors.success }]}>
              <CheckCircle2 color={colors.white} size={32} />
            </View>
            <Text style={[styles.successText, { color: colors.success }]}>BRILLIANT!</Text>
            <TouchableOpacity 
              style={[styles.nextButton, { backgroundColor: colors.primary }]}
              onPress={handleNextChallenge}
            >
              <Text style={styles.nextButtonText}>NEXT CHALLENGE</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  backButton: {
    padding: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '900',
  },
  difficultyTag: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  resetButton: {
    padding: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  successRateText: {
    fontSize: 10,
    fontWeight: '900',
  },
  playsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  playsText: {
    fontSize: 10,
    fontWeight: '900',
  },
  boardWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  boardContainer: {
    alignItems: 'center',
  },
  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    borderWidth: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    opacity: 0.99,
  },
  infoBox: {
    padding: 20,
    flex: 1,
  },
  detailsCard: {
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailLabelText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  detailValueText: {
    fontSize: 14,
    fontWeight: '800',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  playerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  playerName: {
    fontSize: 12,
    fontWeight: '700',
  },
  vsText: {
    fontSize: 10,
    fontWeight: '900',
    marginHorizontal: 12,
  },
  statusCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
  },
  instruction: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  moveCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    fontStyle: 'italic',
  },
  successMessage: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    padding: 24,
    borderRadius: THEME.borderRadius.xl,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 1.5,
    zIndex: 100,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 24,
  },
  nextButton: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
  }
});
