import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SubscriptionType = 'guest' | 'free' | 'starter' | 'pro' | 'elite' | 'coach';

interface UserSubscription {
  type: SubscriptionType;
  puzzlesUsedToday: number;
  gamesUsedToday: number;
  hintsUsedToday: number;
  expiry?: string;
}

interface SubscriptionContextType {
  subscription: UserSubscription;
  refreshSubscription: () => Promise<void>;
  isLoading: boolean;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  modalFeature: string;
  triggerUpgrade: (feature: string) => void;
}

const DEFAULT_SUBSCRIPTION: UserSubscription = {
  type: 'free',
  puzzlesUsedToday: 0,
  gamesUsedToday: 0,
  hintsUsedToday: 0,
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscription, setSubscription] = useState<UserSubscription>(DEFAULT_SUBSCRIPTION);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalFeature, setModalFeature] = useState('premium features');

  const refreshSubscription = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        // No session token yet: student is in guest mode, skip fetch
        setIsLoading(false);
        return;
      }

      const response = await apiClient.get('/user/me');
      if (response.data && response.data.user) {
        const user = response.data.user;
        setSubscription({
          type: (user.SubscriptionType || 'free') as SubscriptionType,
          puzzlesUsedToday: user.PuzzlesUsedToday || 0,
          gamesUsedToday: user.GamesUsedToday || 0,
          hintsUsedToday: user.HintsUsedToday || 0,
          expiry: user.SubscriptionExpiry,
        });
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Stale or expired token: clear it and proceed as guest
        await AsyncStorage.removeItem('token');
      } else {
        console.warn('Failed to fetch subscription:', error.message || error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const triggerUpgrade = (feature: string) => {
    setModalFeature(feature);
    setShowModal(true);
  };

  useEffect(() => {
    refreshSubscription();

    // Register global listener for 403 LIMIT_REACHED
    (globalThis as any).onLimitReached = (message: string) => {
      // Determine feature from message if possible
      let feature = 'premium features';
      if (message.includes('puzzle')) feature = 'puzzles';
      else if (message.includes('game')) feature = 'AI games';
      else if (message.includes('hint')) feature = 'hints';
      
      triggerUpgrade(feature);
      refreshSubscription(); // Sync state
    };

    return () => {
      (globalThis as any).onLimitReached = null;
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={{ 
      subscription, 
      refreshSubscription, 
      isLoading,
      showModal,
      setShowModal,
      modalFeature,
      triggerUpgrade
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
