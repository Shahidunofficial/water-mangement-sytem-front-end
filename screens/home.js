import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import React, { useState, useEffect } from 'react';
import axiosInstance from '../services/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { Camera } from 'expo-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function Home({ navigation }) {
    const { signOut, user } = useAuth();
    const [gatewayId, setGatewayId] = useState('');
    const [gateways, setGateways] = useState([]);
    const [gatewayName, setGatewayName] = useState('');
    const [enrolledGateways, setEnrolledGateways] = useState([]);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState(null);
    const [showActions, setShowActions] = useState(false);
    const [hasPermission, setHasPermission] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [showEnrollModal, setShowEnrollModal] = useState(false);

    const handleAuthError = async () => {
        await signOut();
    };

    // Fetch user's enrolled gateways
    const fetchEnrolledGateways = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found');
                navigation.replace('Auth', { screen: 'SignIn' });
                return;
            }

            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                console.error('No userId found');
                navigation.replace('Auth', { screen: 'SignIn' });
                return;
            }

            const { data } = await axiosInstance.get(`/gateway/status/${userId}`);

            if (data.success) {
                setEnrolledGateways(data.gateways);
            }
        } catch (error) {
            console.error('Error fetching gateway status:', error.message);
            if (error.response?.status === 401) {
                handleAuthError();
            }
        }
    };

    // Register gateway function
    const registerGateway = async () => {
        if (!gatewayId.trim()) {
            alert('Please enter a Gateway ID');
            return;
        }

        setLoading(true);
        try {
            const { data } = await axiosInstance.post('/gateway/enroll', {
                gatewayId: gatewayId,
                gatewayName: gatewayName,
                userId: userId
            });

            if (data.success) {
                alert('Gateway registered successfully');
                setGatewayId('');
                fetchEnrolledGateways();
            } else {
                alert('Failed to register gateway: ' + data.message);
            }
        } catch (error) {
            console.error('Error registering gateway:', error.response?.data || error.message);
            alert('Failed to register gateway: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleEnrollGateway = async () => {
        if (!gatewayId.trim()) {
            Alert.alert('Error', 'Please enter a Gateway ID');
            return;
        }
        setLoading(true);
        try {
            const response = await axiosInstance.post('/gateway/enroll', {
                gatewayId,
                userId
            });
            if (response.data.success) {
                Alert.alert('Success', 'Gateway enrolled successfully');
                setGatewayId('');
                setShowEnrollModal(false);
                fetchEnrolledGateways();
            }
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to enroll gateway');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const loadUserData = async () => {
            try {
                const storedUserId = await AsyncStorage.getItem('userId');
                const token = await AsyncStorage.getItem('token');
                const userName = await AsyncStorage.getItem('userName');
                
                if (!storedUserId || !token) {
                    await handleAuthError();
                    return;
                }
                
                setUserId(storedUserId);
                if (userName) {
                    setUser(prevUser => ({ ...prevUser, name: userName }));
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                await handleAuthError();
            }
        };
        loadUserData();
    }, []);

    useEffect(() => {
        if (userId) {
            fetchEnrolledGateways();
            const interval = setInterval(fetchEnrolledGateways, 5000);
            return () => clearInterval(interval);
        }
    }, [userId]);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const handleBarCodeScanned = ({ type, data }) => {
        setShowScanner(false);
        setGatewayId(data);
        setShowEnrollModal(true);
    };

    const handleManualEntry = () => {
        setShowActions(false);
        setShowEnrollModal(true);
    };

    const handleGatewayPress = (gateway) => {
        navigation.navigate('DeviceDetails', {
            gatewayId: gateway.gatewayId,
            ipAddress: gateway.ipAddress,
            port: gateway.port
        });
    };

    const renderGateway = ({ item }) => (
        <TouchableOpacity 
            style={styles.gatewayCard}
            onPress={() => handleGatewayPress(item)}
        >
            <View style={styles.gatewayBox}>
                <View style={styles.gatewayHeader}>
                    <Text style={styles.gatewayId}>{item.gatewayId}</Text>
                    <View style={styles.statusContainer}>
                        <Text style={styles.statusText}>{item.status}</Text>
                        <View style={[styles.statusDot, { 
                            backgroundColor: item.status === 'online' ? '#47d313' : '#EE2835' 
                        }]} />
                    </View>
                </View>
                <Text style={styles.lastUpdated}>
                    last updated {new Date(item.lastUpdated || Date.now()).toLocaleString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.greeting}>Hi, {user?.name || 'User'}</Text>
                </View>

                <View style={styles.searchBox}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Ask LIA"
                        placeholderTextColor="#666"
                    />
                </View>

                {enrolledGateways.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No farms added yet</Text>
                    </View>
                ) : (
                    <FlatList
                        data={enrolledGateways}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.gatewayCard}
                                onPress={() => handleGatewayPress(item)}
                            >
                                <Text style={styles.gatewayId}>{item.gatewayId}</Text>
                                <View style={styles.statusContainer}>
                                    <Text style={styles.statusText}>
                                        {item.status === 'online' ? 'Online' : 'Offline'}
                                    </Text>
                                    <View style={[styles.statusDot, { 
                                        backgroundColor: item.status === 'online' ? '#47d313' : '#EE2835' 
                                    }]} />
                                </View>
                                <Text style={styles.lastUpdated}>
                                    last updated {new Date(item.lastUpdated || Date.now()).toLocaleString()}
                                </Text>
                            </TouchableOpacity>
                        )}
                        keyExtractor={item => item.gatewayId}
                        contentContainerStyle={styles.listContainer}
                    />
                )}
            </View>

            <TouchableOpacity 
                style={[styles.fab, { bottom: 80 }]}
                onPress={() => setShowEnrollModal(true)}
            >
                <Icon name="add" size={24} color="#fff" />
            </TouchableOpacity>

            <Modal
                visible={showActions}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowActions(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowActions(false)}
                >
                    <View style={styles.actionSheet}>
                        <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={() => {
                                setShowActions(false);
                                setShowScanner(true);
                            }}
                        >
                            <Text style={styles.actionText}>📷 Scan QR Code</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={handleManualEntry}
                        >
                            <Text style={styles.actionText}>⌨️ Enter Gateway ID Manually</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={showScanner}
                transparent={true}
                onRequestClose={() => setShowScanner(false)}
            >
                <View style={styles.scannerContainer}>
                    <Camera
                        style={StyleSheet.absoluteFillObject}
                        barCodeScannerSettings={{
                            barCodeTypes: ['qr'],
                        }}
                        onBarCodeScanned={handleBarCodeScanned}
                    />
                    <TouchableOpacity 
                        style={styles.closeButton}
                        onPress={() => setShowScanner(false)}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            <Modal
                visible={showEnrollModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowEnrollModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Enroll Gateway</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Gateway ID"
                            value={gatewayId}
                            onChangeText={setGatewayId}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Gateway Name (optional)"
                            value={gatewayName}
                            onChangeText={setGatewayName}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => {
                                    setShowEnrollModal(false);
                                    setGatewayId('');
                                    setGatewayName('');
                                }}
                            >
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.button, styles.enrollButton]}
                                onPress={handleEnrollGateway}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Enroll</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
    },
    header: {
        marginTop: 20,
        marginBottom: 20,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    searchBox: {
        backgroundColor: '#F5F5F5',
        borderRadius: 25,
        padding: 15,
        marginBottom: 20,
    },
    searchInput: {
        fontSize: 16,
        color: '#333',
    },
    gatewayCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    gatewayId: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 6,
    },
    statusText: {
        fontSize: 14,
        color: '#666',
    },
    lastUpdated: {
        fontSize: 12,
        color: '#999',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#666',
    },
    fab: {
        position: 'absolute',
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1E6D31',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        zIndex: 9999
    },
    listContainer: {
        paddingBottom: 80,
    },
    scannerContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 5,
    },
    closeButtonText: {
        color: 'white',
        fontSize: 16,
    }
});