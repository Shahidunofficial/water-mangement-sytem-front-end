import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';
import { MQTTProvider } from './context/MQTTContext';

export default function App() {
  return (
    <AuthProvider>
      <MQTTProvider>
        <AppNavigator />
      </MQTTProvider>
    </AuthProvider>
  );
}