import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.43.231:5000/api/v1/auth';

class AuthService {
    constructor() {
        this.api = axios.create({
            baseURL: API_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    async login(email, password) {
        try {
            const response = await this.api.post('/login', {
                email,
                password,
            });
            
            if (response.data.token && response.data.user) {
                await AsyncStorage.setItem('token', response.data.token);
                await AsyncStorage.setItem('userId', response.data.user.id);
                return {
                    success: true,
                    user: response.data.user,
                };
            } else {
                throw new Error(response.data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error.response?.data || error);
            throw new Error(error.response?.data?.message || 'Login failed');
        }
    }

    async signUp(userData) {
        try {
            const response = await this.api.post('/register', userData);
            if (response.data.success) {
                const { token, user } = response.data;
                await AsyncStorage.setItem('token', token);
                await AsyncStorage.setItem('userId', user.id);
                return {
                    success: true,
                    user: user,
                };
            } else {
                throw new Error(response.data.message || 'Registration failed');
            }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || error.message,
            };
        }
    }

    async logout() {
        try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userId');
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }
}

export default new AuthService(); 