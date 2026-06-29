import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiUrl = () => {
    const expoApiUrl = Constants.expoConfig?.extra?.apiUrl;
    
    let devHost = 'localhost';
    if (__DEV__) {
        const hostUri = Constants.expoConfig?.hostUri;
        if (hostUri) {
            const ip = hostUri.split(':')[0];
            if (ip && ip !== '127.0.0.1' && ip !== 'localhost') {
                devHost = ip;
            } else if (Platform.OS === 'android' && !Constants.isDevice) {
                devHost = '10.0.2.2';
            } else if (Platform.OS === 'android' && Constants.isDevice) {
                // For physical devices over USB, fallback to localhost.
                // It requires running `adb reverse tcp:8080 tcp:8080` on the computer.
                devHost = 'localhost';
            }
        } else if (Platform.OS === 'android' && !Constants.isDevice) {
            devHost = '10.0.2.2';
        }
    }

    if (expoApiUrl) {
        if (__DEV__ && expoApiUrl.includes('localhost')) {
            // Use the Metro server's host IP to reach the backend on the same network
            return expoApiUrl.replace('localhost', devHost);
        }
        return expoApiUrl;
    }

    return `http://${devHost}:8080/api/v1`;
};

const API_URL = getApiUrl();

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response interceptor for subscription limit enforcement
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.code === 'LIMIT_REACHED') {
      // For React Native, we can use a simple event emitter or just a global callback
      // Since we want to reach the SubscriptionProvider, let's use a global reference if needed
      // but a CustomEvent is standard if we were in a browser.
      // In RN, we'll just check if there's a registered listener.
      if (typeof (globalThis as any).onLimitReached === 'function') {
        (globalThis as any).onLimitReached(error.response.data.error);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
