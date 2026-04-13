import { Drawer } from 'expo-router/drawer';
import { Target, Home, Settings, Info, Activity, PenSquare, Swords } from 'lucide-react-native';
import { THEME } from '../../src/constants/theme';

import { useTheme } from '../../src/context/ThemeContext';

export default function DrawerLayout() {
  const { colors } = useTheme();

  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerActiveBackgroundColor: colors.primary + '15',
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textMuted,
        drawerStyle: {
          backgroundColor: colors.background,
          width: 280,
        },
        drawerLabelStyle: {
          fontWeight: '900',
          fontSize: 14,
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
        drawerItemStyle: {
          borderRadius: THEME.borderRadius.md,
          marginHorizontal: 12,
          marginVertical: 4,
        }
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: 'Home',
          title: 'Home',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Home color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="play/index"
        options={{
          drawerLabel: 'Versus Computer',
          title: 'Play AI',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Swords color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="puzzles/index"
        options={{
          drawerLabel: 'Tactics Mode',
          title: 'Tactics',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Target color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="analysis/index"
        options={{
          drawerLabel: 'Analysis Board',
          title: 'Analysis',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Activity color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="setup/index"
        options={{
          drawerLabel: 'Puzzle Builder',
          title: 'Setup',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <PenSquare color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="categories/index"
        options={{
          drawerLabel: 'Modes',
          title: 'Categories',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="settings/index"
        options={{
          drawerLabel: 'Preferences',
          title: 'Settings',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="about/index"
        options={{
          drawerLabel: 'About App',
          title: 'About',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <Info color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="puzzles/[id]"
        options={{
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer>
  );
}
