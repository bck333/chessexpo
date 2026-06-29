import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator, 
  Alert, 
  ScrollView, 
  Platform,
  StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Chess } from 'chess.js';
import { WebView } from 'react-native-webview';
import { useIsFocused } from '@react-navigation/native';
import { injectWebViewMessage } from '../../../src/utils/chess';
import { 
  ArrowLeft, 
  RefreshCcw, 
  Trophy, 
  User, 
  Crown, 
  BookOpen, 
  Sparkles, 
  Check, 
  ChevronRight,
  Award,
  Lock,
  Play,
  HelpCircle,
  TrendingUp,
  Activity,
  ChevronLeft,
  Castle,
  Book,
  Compass
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../../src/context/ThemeContext';
import { useSubscription } from '../../../src/context/SubscriptionContext';
import { Header } from '../../../src/components/Header';
import { UpgradeModal } from '../../../src/components/UpgradeModal';
import { getChessboardHtml } from '../../../src/utils/chessboardHtml';
import THEME, { COLORS } from '../../../src/constants/theme';
import Animated, { FadeIn, FadeInUp, SlideInUp } from 'react-native-reanimated';
import apiClient from '../../../src/api/client';
import Constants from 'expo-constants';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 20, 500);

const STATUS_BAR_HEIGHT = Constants.statusBarHeight || (Platform.OS === 'ios' ? 44 : 24);
const HEADER_PADDING_TOP = STATUS_BAR_HEIGHT + 10;

const SOUND_URLS = {
  move: 'https://lichess.org/assets/sound/standard/Move.ogg',
  capture: 'https://lichess.org/assets/sound/standard/Capture.ogg',
  generic: 'https://lichess.org/assets/sound/standard/GenericNotify.ogg',
};

interface Lesson {
  id: string;
  category: 'pieces' | 'fundamentals' | 'advanced';
  title: string;
  sub: string;
  emoji: string;
  rewardXp: number;
  fen: string;
  targets: string[];
  instructions: string;
  premium?: boolean;
}

const LESSONS: Lesson[] = [
  {
    id: 'rook',
    category: 'pieces',
    title: 'The Rook',
    sub: 'Moves in straight lines',
    emoji: '🏰',
    rewardXp: 15,
    fen: 'k7/8/4p3/8/4R3/8/2p5/7K w - - 0 1',
    targets: ['e6', 'c2'],
    instructions: 'A Rook moves in straight vertical or horizontal lines. Drag your Rook 🏰 to capture both target pawns!',
  },
  {
    id: 'bishop',
    category: 'pieces',
    title: 'The Bishop',
    sub: 'Moves diagonally',
    emoji: '♝',
    rewardXp: 15,
    fen: 'k7/8/5p2/8/3B4/8/1p6/7K w - - 0 1',
    targets: ['f6', 'b2'],
    instructions: 'A Bishop moves diagonally. Drag your Bishop ♝ to capture both target pawns on the dark squares!',
  },
  {
    id: 'queen',
    category: 'pieces',
    title: 'The Queen',
    sub: 'Diagonal & straight',
    emoji: '♛',
    rewardXp: 20,
    fen: 'k7/8/8/3p4/4Q3/2r5/8/7K w - - 0 1',
    targets: ['d5', 'c3'],
    instructions: 'The Queen is the most powerful piece. She can move straight or diagonally. Capture both black pieces!',
  },
  {
    id: 'king',
    category: 'pieces',
    title: 'The King',
    sub: 'One square any direction',
    emoji: '♚',
    rewardXp: 20,
    fen: '8/8/4p3/4K3/5p2/8/8/k7 w - - 0 1',
    targets: ['e6', 'f4'],
    instructions: 'The King moves exactly one square in any direction. Capture the loose enemy pawns slowly but surely!',
  },
  {
    id: 'knight',
    category: 'pieces',
    title: 'The Knight',
    sub: 'Jumps in L-shape',
    emoji: '♞',
    rewardXp: 25,
    fen: 'k7/8/3p4/8/4N3/8/2p5/7K w - - 0 1',
    targets: ['d6', 'c2'],
    instructions: 'The Knight moves in an "L" shape (two squares one way, one square side) and jumps over pieces. Grab those targets!',
  },
  {
    id: 'pawn',
    category: 'pieces',
    title: 'The Pawn',
    sub: 'Captures diagonally forward',
    emoji: '♟',
    rewardXp: 15,
    fen: 'k7/8/8/8/3p4/4P3/8/7K w - - 0 1',
    targets: ['d4'],
    instructions: 'Pawns move straight ahead, but capture diagonally forward. Advance and capture the target pawn on d4!',
  }
];

export default function LearnIndex() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { colors, isDark, boardTheme, pieceSet, gameOptions } = useTheme();
  const { subscription } = useSubscription();
  const { lesson } = useLocalSearchParams();

  // Active Offline Lesson
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [currentFen, setCurrentFen] = useState('start');
  const [remainingTargets, setRemainingTargets] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [boardReady, setBoardReady] = useState(false);

  // Completed Offline Lessons Tracker
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [userXp, setUserXp] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Tab State: "academy" (LMS from backend) vs "offline" (piece movement challenges)
  const [activeTab, setActiveTab] = useState<'academy' | 'offline'>('academy');

  // LMS Backend Database state variables
  const [academyCats, setAcademyCats] = useState<any[]>([]);
  const [loadingLMS, setLoadingLMS] = useState(false);

  // LMS Sequential steps player state variables
  const [activeLMSLesson, setActiveLMSLesson] = useState<any | null>(null);
  const [lmsSteps, setLmsSteps] = useState<any[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [completedLMSLessons, setCompletedLMSLessons] = useState<string[]>([]);

  const webviewRef = useRef<WebView>(null);
  const soundRefs = useRef<{ [key: string]: Audio.Sound }>({});

  useEffect(() => {
    loadProgress();
    loadSounds();
    loadAcademyLMS();
    return () => {
      Object.values(soundRefs.current).forEach(sound => {
        sound.unloadAsync().catch(() => {});
      });
    };
  }, []);

  const loadProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem('CM_COMPLETED_LESSONS');
      if (saved) {
        setCompletedLessons(JSON.parse(saved));
      }
      const savedLms = await AsyncStorage.getItem('CM_COMPLETED_LMS_LESSONS');
      if (savedLms) {
        setCompletedLMSLessons(JSON.parse(savedLms));
      }

      const response = await apiClient.get('/user/me');
      if (response.data && response.data.user) {
        setUserXp(response.data.user.XP || 0);
      }
    } catch (e) {
      console.error('Failed to load progress:', e);
    }
  };

  const loadSounds = async () => {
    try {
      const moveSound = new Audio.Sound();
      await moveSound.loadAsync({ uri: SOUND_URLS.move });
      soundRefs.current['move'] = moveSound;

      const captureSound = new Audio.Sound();
      await captureSound.loadAsync({ uri: SOUND_URLS.capture });
      soundRefs.current['capture'] = captureSound;

      const successSound = new Audio.Sound();
      await successSound.loadAsync({ uri: SOUND_URLS.generic });
      soundRefs.current['success'] = successSound;
    } catch (e) {
      console.error('Failed to load sound assets:', e);
    }
  };

  const playSound = async (type: 'move' | 'capture' | 'success') => {
    try {
      const sound = soundRefs.current[type];
      if (sound) {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      }
    } catch (e) {
      console.warn('Sound play error:', e);
    }
  };

  // Fetch Academy LMS Categories & Lessons from Go Backend
  const loadAcademyLMS = async () => {
    try {
      setLoadingLMS(true);
      const res = await apiClient.get('/learning/categories');
      if (res && Array.isArray(res.data)) {
        setAcademyCats(res.data);
      }
    } catch (err) {
      console.warn('Failed to load academy course categories:', err);
    } finally {
      setLoadingLMS(false);
    }
  };

  // Start Offline Lesson Flow
  const handleSelectLesson = (les: Lesson) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveLesson(les);
    setCurrentFen(les.fen);
    setRemainingTargets([...les.targets]);
    setIsSuccess(false);
    setBoardReady(false);
  };

  // Complete Offline Lesson Flow
  const handleCompleteLesson = async (les: Lesson) => {
    setIsSuccess(true);
    playSound('success');
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let updated = [...completedLessons];
    if (!updated.includes(les.id)) {
      updated.push(les.id);
      setCompletedLessons(updated);
      await AsyncStorage.setItem('CM_COMPLETED_LESSONS', JSON.stringify(updated));

      try {
        await apiClient.post('/user/progress', {
          category_name: les.title,
          progress_type: 'learn',
          step_number: 1,
          status: 'completed',
          xp_earned: les.rewardXp
        });
        setUserXp(prev => prev + les.rewardXp);
      } catch (err) {
        console.error('Failed to sync offline lesson XP:', err);
      }
    }
  };

  // Offline Lesson Message handler
  const handleMessage = (event: any) => {
    if (!activeLesson || isSuccess) return;
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setBoardReady(true);
        injectWebViewMessage(webviewRef, { type: 'set_fen', fen: currentFen });
      } else if (data.type === 'move') {
        let move: any = null;
        let nextFen = currentFen;
        let updatedTargets = [...remainingTargets];

        try {
          const chess = new Chess(currentFen);
          move = chess.move(data.san);
          if (move) {
            nextFen = chess.fen();
            const targetCapturedIndex = updatedTargets.indexOf(move.to);
            if (targetCapturedIndex !== -1 || move.captured) {
              updatedTargets = updatedTargets.filter(t => t !== move.to);
            }
          }
        } catch (err) {
          move = null;
        }

        if (move) {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setCurrentFen(nextFen);

          const isCapture = remainingTargets.length > updatedTargets.length || move.captured;
          if (isCapture) {
            playSound('capture');
            setRemainingTargets(updatedTargets);
            if (updatedTargets.length === 0) {
              handleCompleteLesson(activeLesson);
            }
          } else {
            playSound('move');
          }
        } else {
          injectWebViewMessage(webviewRef, { type: 'set_fen', fen: currentFen });
        }
      }
    } catch (e) {
      console.error('onMessage error:', e);
    }
  };

  // Reset Offline Board
  const handleResetLesson = () => {
    if (!activeLesson) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentFen(activeLesson.fen);
    setRemainingTargets([...activeLesson.targets]);
    setIsSuccess(false);
    injectWebViewMessage(webviewRef, { type: 'set_fen', fen: activeLesson.fen });
  };

  const offlineHtml = useMemo(() => {
    if (!activeLesson) return '';
    return getChessboardHtml(
      {
        orientation: 'white',
        fen: activeLesson.fen,
        draggable: !isSuccess,
      },
      colors,
      boardTheme,
      pieceSet,
      { ...gameOptions, showLegalMoves: true }
    );
  }, [activeLesson, colors, boardTheme, pieceSet, gameOptions, isSuccess]);

  // ============================================================================
  // ACADEMY LMS COURSE FLOWS (Sequential Steps coaching!)
  // ============================================================================
  
  const handleStartLMSLesson = async (les: any) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setActiveLMSLesson(les);
      setLmsSteps([]);
      setCurrentStepIdx(0);
      
      // Load Steps from backend API
      const res = await apiClient.get(`/learning/lessons/${les.id}/steps`);
      if (res && Array.isArray(res.data)) {
        setLmsSteps(res.data);
      }
    } catch (err) {
      console.warn('Failed to load steps for lesson:', err);
      Alert.alert('Course Empty', 'This educational chapter is being compiled by your coach.');
      setActiveLMSLesson(null);
    }
  };

  const currentStep = useMemo(() => {
    if (lmsSteps.length === 0 || currentStepIdx >= lmsSteps.length) return null;
    return lmsSteps[currentStepIdx];
  }, [lmsSteps, currentStepIdx]);

  const lmsHtml = useMemo(() => {
    if (!currentStep) return '';
    return getChessboardHtml(
      {
        orientation: 'white',
        fen: currentStep.fen || '8/8/8/8/8/8/8/8 w - - 0 1',
        draggable: false, // Instructional LMS steps are static/non-playable
      },
      colors,
      boardTheme,
      pieceSet,
      { ...gameOptions, showLegalMoves: false }
    );
  }, [currentStep, colors, boardTheme, pieceSet, gameOptions]);

  // Trigger highlights injection after webview is ready
  const injectStepHighlights = () => {
    if (!currentStep || !webviewRef.current) return;
    const squares = currentStep.highlighted_squares
      ? currentStep.highlighted_squares.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '')
      : [];

    let script = `
      removeHighlights();
      removeGreyDots();
    `;

    squares.forEach((sq: string) => {
      script += `
        $('#board .square-${sq}').addClass('highlight-select');
      `;
    });

    // Execute square highlight injects
    webviewRef.current.injectJavaScript(script + 'true;');
  };

  const handleNextStep = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStepIdx < lmsSteps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const handleFinishLMSLesson = async () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playSound('success');
    
    const lessonId = activeLMSLesson.id;
    let updated = [...completedLMSLessons];
    if (!updated.includes(lessonId)) {
      updated.push(lessonId);
      setCompletedLMSLessons(updated);
      await AsyncStorage.setItem('CM_COMPLETED_LMS_LESSONS', JSON.stringify(updated));

      // Post completion reports & rewards
      try {
        await apiClient.post('/user/progress', {
          category_name: activeLMSLesson.title,
          progress_type: 'learn',
          step_number: lmsSteps.length,
          status: 'completed',
          xp_earned: 30 // standard LMS reward XP
        });
        setUserXp(prev => prev + 30);
      } catch (err) {
        console.error('Failed to report completion:', err);
      }
    }

    Alert.alert(
      "Lesson Complete! 🎉",
      `Outstanding! You finished "${activeLMSLesson.title}"! You earned +30 XP!`,
      [{ text: "Awesome", onPress: () => setActiveLMSLesson(null) }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* RENDER ACTIVE LESSON PLAYING SCREEN (OFFLINE PRACTICE) */}
      {activeLesson ? (
        <View style={styles.playingLayout}>
          <View style={[styles.playingHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity 
              style={[styles.backBtnCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setActiveLesson(null)}
            >
              <ArrowLeft color={colors.text} size={20} />
            </TouchableOpacity>
            <View style={styles.playingHeaderTitleGroup}>
              <Text style={[styles.playingCategoryText, { color: colors.accent }]}>OFFLINE DRILL</Text>
              <Text style={[styles.playingTitleText, { color: colors.text }]}>{activeLesson.title}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.backBtnCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleResetLesson}
            >
              <RefreshCcw color={colors.text} size={18} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.playingScrollContent}>
            <Animated.View style={[styles.instructionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.instructionIconWrapper, { backgroundColor: colors.primary + '15' }]}>
                <BookOpen color={colors.accent} size={22} />
              </View>
              <View style={styles.instructionTextWrapper}>
                <Text style={[styles.instructionTextTitle, { color: colors.text }]}>Objective</Text>
                <Text style={[styles.instructionBody, { color: colors.text }]}>{activeLesson.instructions}</Text>
              </View>
            </Animated.View>

            <View style={styles.boardWrapper}>
              <View style={[styles.boardContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              {isFocused && (
                <WebView
                  ref={webviewRef}
                  originWhitelist={['*']}
                  source={{ html: offlineHtml }}
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

            {remainingTargets.length > 0 && !isSuccess && (
              <View style={styles.targetChipsRow}>
                <Text style={[styles.targetTitleText, { color: colors.textMuted }]}>REMAINING TARGETS:</Text>
                <View style={styles.chipsContainer}>
                  {remainingTargets.map((sq, idx) => (
                    <View key={idx} style={[styles.targetChip, { backgroundColor: colors.surfaceLight, borderColor: colors.accent }]}>
                      <Text style={[styles.targetChipText, { color: colors.text }]}>⭐ {sq.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {isSuccess && (
              <Animated.View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.success }]}>
                <View style={[styles.successIconCircle, { backgroundColor: colors.success }]}>
                  <Check color="#fff" size={32} strokeWidth={3} />
                </View>
                <Text style={[styles.successTitleText, { color: colors.success }]}>EXCELLENT JOB! 🎉</Text>
                <Text style={[styles.successSubText, { color: colors.text }]}>
                  You earned <Text style={{ color: colors.accent, fontWeight: '900' }}>+{activeLesson.rewardXp} XP</Text>!
                </Text>
                <TouchableOpacity 
                  style={[styles.continueBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setActiveLesson(null)}
                >
                  <Text style={styles.continueBtnText}>FINISH DRILL</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </ScrollView>
        </View>
      ) : activeLMSLesson ? (
        /* RENDER ACTIVE ACADEMY LESSON STEP COACHING SCREEN */
        <View style={styles.playingLayout}>
          <View style={[styles.playingHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <TouchableOpacity 
              style={[styles.backBtnCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setActiveLMSLesson(null)}
            >
              <ArrowLeft color={colors.text} size={20} />
            </TouchableOpacity>
            <View style={styles.playingHeaderTitleGroup}>
              <Text style={[styles.playingCategoryText, { color: colors.accent }]}>ACADEMY LESSON</Text>
              <Text style={[styles.playingTitleText, { color: colors.text }]}>{activeLMSLesson.title}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.playingScrollContent}>
            
            {/* Step fractional progress indicator */}
            <View style={styles.stepsPaginatorBadge}>
              <Text style={[styles.stepsFractionText, { color: colors.accent }]}>
                STEP {currentStepIdx + 1} OF {lmsSteps.length}
              </Text>
            </View>

            {currentStep && (
              <View style={{ width: '100%', alignItems: 'center' }}>
                {/* Step Instructional text explanation */}
                <Animated.View entering={FadeInUp.duration(400)} style={[styles.instructionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.instructionIconWrapper, { backgroundColor: colors.accent + '20' }]}>
                    <Sparkles color={colors.accent} size={22} />
                  </View>
                  <View style={styles.instructionTextWrapper}>
                    <Text style={[styles.instructionTextTitle, { color: colors.text }]}>{currentStep.title}</Text>
                    <Text style={[styles.instructionBody, { color: colors.text, fontSize: 13, lineHeight: 18 }]}>
                      {currentStep.description}
                    </Text>
                  </View>
                </Animated.View>

                {/* Step highlight guide alert info if present */}
                {currentStep.highlighted_squares && (
                  <View style={styles.stepHighlightTip}>
                    <Text style={[styles.tipText, { color: colors.primaryLight }]}>
                      💡 Check the highlighted green squares on the board!
                    </Text>
                  </View>
                )}

                {/* Chessboard view */}
                <View style={styles.boardWrapper}>
                  <View style={[styles.boardContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    {isFocused && (
                      <WebView
                        ref={webviewRef}
                        originWhitelist={['*']}
                        source={{ html: lmsHtml }}
                        style={styles.webview}
                        onMessage={(e) => {
                          try {
                            const data = JSON.parse(e.nativeEvent.data);
                            if (data.type === 'ready') {
                              injectStepHighlights();
                            }
                          } catch (err) {}
                        }}
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
            )}

            {/* Steps slideshow navigation controls */}
            <View style={styles.lmsStepsControls}>
              <TouchableOpacity
                disabled={currentStepIdx === 0}
                onPress={handlePrevStep}
                style={[
                  styles.paginatorBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  currentStepIdx === 0 && { opacity: 0.3 }
                ]}
              >
                <ChevronLeft color={colors.text} size={20} />
                <Text style={[styles.paginatorText, { color: colors.text }]}>PREV</Text>
              </TouchableOpacity>

              {currentStepIdx < lmsSteps.length - 1 ? (
                <TouchableOpacity
                  onPress={handleNextStep}
                  style={[styles.paginatorBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                >
                  <Text style={[styles.paginatorText, { color: '#fff' }]}>NEXT</Text>
                  <ChevronRight color="#fff" size={20} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleFinishLMSLesson}
                  style={[styles.paginatorBtn, { backgroundColor: colors.success, borderColor: colors.success }]}
                >
                  <Text style={[styles.paginatorText, { color: '#fff' }]}>COMPLETE</Text>
                  <Check color="#fff" size={20} />
                </TouchableOpacity>
              )}
            </View>

          </ScrollView>
        </View>
      ) : (
        /* RENDER LEARNING OVERVIEW DASHBOARD */
        <View style={styles.dashboardLayout}>
          <Header title="Academy Learning" rightElement={<BookOpen color={colors.accent} size={24} />} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dashboardScroll}>
            
            {/* PROGRESS STATUS CARD */}
            <Animated.View style={[styles.overallProgressWidget, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.progressRow}>
                <View style={styles.progressTextSection}>
                  <Text style={[styles.widgetLabel, { color: colors.textMuted }]}>STUDENT PERFORMANCE CARD</Text>
                  <Text style={[styles.overallPercentText, { color: colors.text }]}>{userXp} XP Collected</Text>
                  <Text style={[styles.academyStatsText, { color: colors.primaryLight }]}>
                    🏆 Synced real-time with ChessMazes Academy
                  </Text>
                </View>
                <View style={[styles.avatarStatsBox, { backgroundColor: colors.primary + '15', borderColor: colors.accent }]}>
                  <Award size={28} color={colors.accent} />
                </View>
              </View>
              <Text style={[styles.progressSupportingLabel, { color: colors.textMuted, fontSize: 10 }]}>
                Interactive study paths designed to help you think like a grandmaster, completely separated from practice puzzles.
              </Text>
            </Animated.View>

            {/* TAB SELECTOR: ACADEMY VS OFFLINE */}
            <View style={[styles.tabSegmentBg, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab('academy');
                }}
                style={[
                  styles.tabBtn,
                  activeTab === 'academy' && { backgroundColor: colors.primary }
                ]}
              >
                <Compass size={14} color={activeTab === 'academy' ? '#fff' : colors.textMuted} />
                <Text style={[styles.tabBtnText, { color: activeTab === 'academy' ? '#fff' : colors.textMuted }]}>
                  🏫 ACADEMY COURSES
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab('offline');
                }}
                style={[
                  styles.tabBtn,
                  activeTab === 'offline' && { backgroundColor: colors.primary }
                ]}
              >
                <Castle size={14} color={activeTab === 'offline' ? '#fff' : colors.textMuted} />
                <Text style={[styles.tabBtnText, { color: activeTab === 'offline' ? '#fff' : colors.textMuted }]}>
                  🏰 OFFLINE PRACTICE
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB SECTION 1: DYNAMIC ACADEMY COURSES (LMS) */}
            {activeTab === 'academy' && (
              <View style={{ marginTop: 8 }}>
                {loadingLMS ? (
                  <View style={{ paddingVertical: 32 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  academyCats.map((cat: any) => (
                    <View key={cat.id} style={styles.academyCatSection}>
                      <View style={styles.academySectionHead}>
                        <Text style={styles.sectionEmoji}>📚</Text>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.sectionTitleText, { color: colors.text }]}>{cat.title}</Text>
                          <Text style={[styles.sectionDescText, { color: colors.textMuted }]}>{cat.description}</Text>
                        </View>
                      </View>

                      <View style={styles.lessonsGrid}>
                        {cat.lessons && cat.lessons.map((les: any) => {
                          const isFinished = completedLMSLessons.includes(les.id);
                          return (
                            <TouchableOpacity
                              key={les.id}
                              onPress={() => handleStartLMSLesson(les)}
                              style={[styles.lessonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            >
                              <View style={[styles.lessonEmojiBox, { backgroundColor: colors.primary + '10' }]}>
                                <BookOpen size={18} color={colors.primary} />
                              </View>
                              <View style={styles.lessonCardContent}>
                                <Text style={[styles.lessonCardTitle, { color: colors.text }]}>{les.title}</Text>
                                <Text style={[styles.lessonCardSub, { color: colors.textMuted }]}>
                                  Difficulty: {les.difficulty || 'Beginner'}
                                </Text>
                              </View>

                              <View style={styles.lessonStatusIndicator}>
                                {isFinished ? (
                                  <View style={[styles.statusIndicatorCircle, { backgroundColor: colors.success }]}>
                                    <Check color="#fff" size={10} strokeWidth={3} />
                                  </View>
                                ) : (
                                  <View style={[styles.statusIndicatorCircle, { backgroundColor: colors.surfaceLight, borderColor: colors.border, borderWidth: 1 }]}>
                                    <Play color={colors.primaryLight} size={10} />
                                  </View>
                                )}
                                <Text style={[styles.xpRewardText, { color: colors.textMuted }]}>+30 XP</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}

                        {(!cat.lessons || cat.lessons.length === 0) && (
                          <View style={styles.noLessonsAlert}>
                            <Text style={[styles.noLessonsText, { color: colors.textMuted }]}>
                              Empty course section. Lessons are being written!
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                )}

                {academyCats.length === 0 && !loadingLMS && (
                  <View style={styles.noLmsAlert}>
                    <BookOpen size={48} color={colors.border} />
                    <Text style={[styles.noLmsTitle, { color: colors.text }]}>No academy courses yet</Text>
                    <Text style={[styles.noLmsSub, { color: colors.textMuted }]}>
                      Coaches have not uploaded any interactive lectures yet. Click "OFFLINE PRACTICE" for immediate pieces movement lessons.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* TAB SECTION 2: STANDALONE OFFLINE PRACTICE */}
            {activeTab === 'offline' && (
              <View style={{ marginTop: 8 }}>
                <View style={styles.academyCatSection}>
                  <View style={styles.academySectionHead}>
                    <Text style={styles.sectionEmoji}>🏰</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.sectionTitleText, { color: colors.text }]}>Chess Pieces Movement</Text>
                      <Text style={[styles.sectionDescText, { color: colors.textMuted }]}>
                        Master the capture rules for Rook, Bishop, Queen, King, Knight and Pawn!
                      </Text>
                    </View>
                  </View>

                  <View style={styles.lessonsGrid}>
                    {LESSONS.map((les) => {
                      const isFinished = completedLessons.includes(les.id);
                      return (
                        <TouchableOpacity
                          key={les.id}
                          onPress={() => handleSelectLesson(les)}
                          style={[styles.lessonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                          <View style={[styles.lessonEmojiBox, { backgroundColor: colors.primary + '10' }]}>
                            <Text style={styles.lessonCardEmoji}>{les.emoji}</Text>
                          </View>
                          <View style={styles.lessonCardContent}>
                            <Text style={[styles.lessonCardTitle, { color: colors.text }]}>{les.title}</Text>
                            <Text style={[styles.lessonCardSub, { color: colors.textMuted }]}>{les.sub}</Text>
                          </View>

                          <View style={styles.lessonStatusIndicator}>
                            {isFinished ? (
                              <View style={[styles.statusIndicatorCircle, { backgroundColor: colors.success }]}>
                                <Check color="#fff" size={10} strokeWidth={3} />
                              </View>
                            ) : (
                              <View style={[styles.statusIndicatorCircle, { backgroundColor: colors.surfaceLight, borderColor: colors.border, borderWidth: 1 }]}>
                                <Play color={colors.primaryLight} size={10} />
                              </View>
                            )}
                            <Text style={[styles.xpRewardText, { color: colors.textMuted }]}>+{les.rewardXp} XP</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      )}

      {/* LOCK FEATURE MODAL */}
      <UpgradeModal 
        visible={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        feature="Advanced Basics Chess Lessons" 
        limit="Basic Pieces & Fundamentals"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dashboardLayout: {
    flex: 1,
  },
  dashboardScroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  overallProgressWidget: {
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressTextSection: {
    flex: 1,
  },
  widgetLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  overallPercentText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  academyStatsText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  avatarStatsBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSupportingLabel: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  
  // Tab segments
  tabSegmentBg: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 4,
    marginBottom: 16,
    gap: 4
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 12,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Academy categories
  academyCatSection: {
    marginBottom: 28,
  },
  academySectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionEmoji: {
    fontSize: 24,
  },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sectionDescText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    marginTop: 1,
  },

  // Lessons lists
  lessonsGrid: {
    gap: 8,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  lessonEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonCardEmoji: {
    fontSize: 20,
  },
  lessonCardContent: {
    flex: 1,
  },
  lessonCardTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  lessonCardSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  lessonStatusIndicator: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  statusIndicatorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpRewardText: {
    fontSize: 9,
    fontWeight: '900',
  },

  // PLAYING LAYOUT STYLES
  playingLayout: {
    flex: 1,
  },
  playingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: HEADER_PADDING_TOP,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtnCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playingHeaderTitleGroup: {
    alignItems: 'center',
    flex: 1,
  },
  playingCategoryText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  playingTitleText: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  playingScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    width: '100%',
    marginBottom: 16,
  },
  instructionIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionTextWrapper: {
    flex: 1,
  },
  instructionTextTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  instructionBody: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 2,
  },
  boardWrapper: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  boardContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
  },
  webview: {
    flex: 1,
    androidLayerType: 'software',
    opacity: 0.99,
  },
  targetChipsRow: {
    width: '100%',
    marginBottom: 20,
  },
  targetTitleText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  targetChipText: {
    fontSize: 12,
    fontWeight: '900',
  },
  successCard: {
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitleText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  successSubText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  continueBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Steps indicator
  stepsPaginatorBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
  },
  stepsFractionText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stepHighlightTip: {
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  lmsStepsControls: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 4,
  },
  paginatorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
  },
  paginatorText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Alerts
  noLessonsAlert: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    alignItems: 'center',
  },
  noLessonsText: {
    fontSize: 11,
    fontWeight: '600',
  },
  noLmsAlert: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    textAlign: 'center',
  },
  noLmsTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 12,
  },
  noLmsSub: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  }
});
