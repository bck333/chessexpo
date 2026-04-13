import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

const LOCAL_IP = '10.115.220.158'; // Your machine's current local IP
const EMULATOR_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

// Use LOCAL_IP for real devices, EMULATOR_HOST for simulators/emulators
const API_URL = `http://${__DEV__ ? EMULATOR_HOST : LOCAL_IP}:8080/api/v1`;

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

export default apiClient;
