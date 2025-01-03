import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const axiosInstance = axios.create({
    baseURL: 'http://192.168.43.231:5000/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    timeout: 10000,
});

axiosInstance.interceptors.response.use(
    response => response,
    async error => {
        const maxRetries = 3;
        let retries = 0;
        
        while (retries < maxRetries) {
            try {
                if (error.response?.status === 504) {
                    console.log(`Retrying request (${retries + 1}/${maxRetries})`);
                    const response = await axios.request(error.config);
                    return response;
                }
                break;
            } catch (retryError) {
                retries++;
                if (retries === maxRetries) {
                    return Promise.reject(retryError);
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
            }
        }
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axiosInstance; 