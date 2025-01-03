import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('userId');
            if (token && userId) {
                setUser({ id: userId });
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email, password) => {
        try {
            const response = await authService.login(email, password);
            if (response.success && response.user) {
                await AsyncStorage.setItem('username', response.user.username);
                setUser({
                    id: response.user.id,
                    name: response.user.username
                });
                return { success: true };
            } else {
                return { success: false, error: 'Invalid credentials' };
            }
        } catch (error) {
            console.error('Sign in failed:', error);
            return { 
                success: false, 
                error: error.message || 'Login failed'
            };
        }
    };

    const signOut = async () => {
        try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userId');
            setUser(null);
            return { success: true };
        } catch (error) {
            console.error('Sign out failed:', error);
            return { success: false, error: error.message };
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext); 