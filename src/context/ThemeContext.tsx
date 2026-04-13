import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, THEME, ColorThemeType } from '../constants/theme';

type ThemeMode = 'light' | 'dark' | 'system';

export type BoardTheme = 'classic' | 'emerald' | 'ocean' | 'charcoal' | 'wood';
export type PieceSet = 'wikipedia' | 'alpha' | 'neo' | 'cburnett';

export interface GameOptions {
    showCoordinates: boolean;
    showLegalMoves: boolean;
    highlightLastMove: boolean;
    kingInCheckIndicator: boolean;
    alwaysPromoteToQueen: boolean;
}

interface ThemeContextType {
    mode: ThemeMode;
    isDark: boolean;
    colors: ColorThemeType;
    theme: typeof THEME;
    setMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
    
    // Board & Game Settings
    boardTheme: BoardTheme;
    setBoardTheme: (theme: BoardTheme) => void;
    pieceSet: PieceSet;
    setPieceSet: (set: PieceSet) => void;
    gameOptions: GameOptions;
    updateGameOptions: (options: Partial<GameOptions>) => void;
}

const DEFAULT_GAME_OPTIONS: GameOptions = {
    showCoordinates: true,
    showLegalMoves: true,
    highlightLastMove: true,
    kingInCheckIndicator: true,
    alwaysPromoteToQueen: false,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('system');
    const [boardTheme, setBoardThemeState] = useState<BoardTheme>('classic');
    const [pieceSet, setPieceSetState] = useState<PieceSet>('wikipedia');
    const [gameOptions, setGameOptionsState] = useState<GameOptions>(DEFAULT_GAME_OPTIONS);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const [savedMode, savedBoard, savedPieces, savedOptions] = await Promise.all([
                AsyncStorage.getItem('user_theme_mode'),
                AsyncStorage.getItem('user_board_theme'),
                AsyncStorage.getItem('user_piece_set'),
                AsyncStorage.getItem('user_game_options'),
            ]);

            if (savedMode) setModeState(savedMode as ThemeMode);
            if (savedBoard) setBoardThemeState(savedBoard as BoardTheme);
            if (savedPieces) setPieceSetState(savedPieces as PieceSet);
            if (savedOptions) setGameOptionsState(JSON.parse(savedOptions));
        } catch (e) {
            console.error('Failed to load settings', e);
        }
    };

    const setMode = async (newMode: ThemeMode) => {
        setModeState(newMode);
        try {
            await AsyncStorage.setItem('user_theme_mode', newMode);
        } catch (e) {
            console.error('Failed to save theme', e);
        }
    };

    const setBoardTheme = async (newTheme: BoardTheme) => {
        setBoardThemeState(newTheme);
        try {
            await AsyncStorage.setItem('user_board_theme', newTheme);
        } catch (e) {
            console.error('Failed to save board theme', e);
        }
    };

    const setPieceSet = async (newSet: PieceSet) => {
        setPieceSetState(newSet);
        try {
            await AsyncStorage.setItem('user_piece_set', newSet);
        } catch (e) {
            console.error('Failed to save piece set', e);
        }
    };

    const updateGameOptions = async (newOptions: Partial<GameOptions>) => {
        const updated = { ...gameOptions, ...newOptions };
        setGameOptionsState(updated);
        try {
            await AsyncStorage.setItem('user_game_options', JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to save game options', e);
        }
    };

    const isDark = useMemo(() => {
        if (mode === 'system') {
            return systemColorScheme === 'dark';
        }
        return mode === 'dark';
    }, [mode, systemColorScheme]);

    const activeTheme = useMemo(() => {
        const colors = isDark ? COLORS.dark : COLORS.light;
        return {
            ...THEME,
            colors,
        };
    }, [isDark]);

    const toggleTheme = () => {
        setMode(isDark ? 'light' : 'dark');
    };

    const value = {
        mode,
        isDark,
        colors: activeTheme.colors,
        theme: activeTheme,
        setMode,
        toggleTheme,
        boardTheme,
        setBoardTheme,
        pieceSet,
        setPieceSet,
        gameOptions,
        updateGameOptions,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
