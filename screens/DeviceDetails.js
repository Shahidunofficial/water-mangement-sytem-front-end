import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
    Switch
} from 'react-native';
import { Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import axios from 'axios';
import axiosInstance from '../services/axiosConfig';
import { useMQTT } from '../context/MQTTContext';
import { useAuth } from '../context/AuthContext';

const DeviceDetails = ({ route, navigation }) => {
    const { gatewayId } = route.params;
    const { sensorData } = useMQTT();
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { signOut } = useAuth();
    const [showScanner, setShowScanner] = useState(false);
    const [showEnrollNodeModal, setShowEnrollNodeModal] = useState(false);
    const [nodeName, setNodeName] = useState('');
    const [scannedNodeId, setScannedNodeId] = useState('');
    const [showActions, setShowActions] = useState(false);
    const [manualNodeId, setManualNodeId] = useState('');

    const handleAuthError = async () => {
        await signOut();
    };

    useEffect(() => {
        if (!gatewayId) {
            console.error('No gatewayId provided');
            navigation.goBack();
            return;
        }
        fetchNodes();
    }, [gatewayId]);

    useEffect(() => {
        if (Object.keys(sensorData).length > 0) {
            console.log('Current sensorData:', sensorData);
            console.log('Current nodes:', nodes);
            
            setNodes(prevNodes => prevNodes.map(node => {
                const key = `${gatewayId}_${node.nodeId}`;
                console.log(`Checking key: ${key}`);
                const currentSensorData = sensorData[key];
                console.log(`Found sensor data for ${node.nodeId}:`, currentSensorData);
                
                if (!currentSensorData) return node;
                
                return {
                    ...node,
                    sensors: {
                        moisture: currentSensorData.moisture,
                        temperature: currentSensorData.temperature
                    },
                    lastUpdated: currentSensorData.timestamp
                };
            }));
        }
    }, [sensorData, gatewayId]);

    const fetchNodes = async () => {
        if (!gatewayId) return;
        
        try {
            const token = await AsyncStorage.getItem('token');
            
            if (!token) {
                console.error('No authentication token found');
                await handleAuthError();
                return;
            }

            const response = await axios.get(
                `http://192.168.43.231:5000/api/v1/gateway/${gatewayId}/nodes`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            
            if (response.data.success) {
                setNodes(response.data.nodes);
            }
        } catch (error) {
            console.error('Error fetching nodes:', error);
            if (error.response?.status === 401) {
                await handleAuthError();
            } else {
                alert('Failed to fetch nodes: ' + error.response?.data?.message || error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const deleteNode = async (nodeId) => {
        Alert.alert(
            "Delete Node",
            "Are you sure you want to delete this node?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const userId = await AsyncStorage.getItem('userId');
                            
                            const response = await axiosInstance.post('/nodes/unenroll', {
                                nodeId,
                                gatewayId,
                                userId
                            });

                            if (response.data.success) {
                                setNodes(prevNodes => prevNodes.filter(node => node.nodeId !== nodeId));
                                Alert.alert('Success', 'Node deleted successfully');
                            } else {
                                Alert.alert('Error', response.data.message || 'Failed to delete node');
                            }
                        } catch (error) {
                            console.error('Error deleting node:', error);
                            if (error.response?.status === 401) {
                                await handleAuthError();
                            } else {
                                Alert.alert(
                                    'Error',
                                    error.response?.data?.message || 'Failed to delete node'
                                );
                            }
                        }
                    }
                }
            ]
        );
    };

    const updateRelay = async (nodeId, relayNumber, relayState) => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('userId');
            const state = relayState ? "1" : "0";
            
            const response = await axios.post(
                'http://192.168.43.231:5000/api/v1/nodes/relayControl',
                {
                    nodeId,
                    gatewayId,
                    userId,
                    relayNumber: relayNumber.toString(),
                    relayState: state
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
    
            if (response.data.success) {
                setNodes(prevNodes => prevNodes.map(node => {
                    if (node.nodeId === nodeId) {
                        return {
                            ...node,
                            [`relay${relayNumber}State`]: state
                        };
                    }
                    return node;
                }));
            } else {
                Alert.alert('Error', response.data.message || 'Failed to update relay state');
            }
        } catch (error) {
            console.error('Error updating relay:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to update relay state');
        }
    };

    const renderItem = ({ item }) => {
        const key = `${gatewayId}_${item.nodeId}`;
        const currentSensorData = sensorData[key];
        
        return (
            <View style={styles.nodeItem}>
                <View style={styles.nodeHeader}>
                    <Text style={styles.nodeId}>Node ID: {item.nodeId}</Text>
                    <TouchableOpacity onPress={() => deleteNode(item.nodeId)}>
                        <MaterialIcons name="delete" size={24} color="#FF0000" />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.sensorContainer}>
                    <View style={styles.sensorBox}>
                        <Text style={styles.sensorIcon}>💧</Text>
                        <Text style={styles.sensorLabel}>Moisture</Text>
                        <Text style={styles.sensorValue}>
                            {currentSensorData?.moisture != null ? 
                                `${(currentSensorData.moisture/10).toFixed(2)}%` : 'N/A'}
                        </Text>
                    </View>
                    
                    <View style={styles.sensorBox}>
                        <Text style={styles.sensorIcon}>🌡️</Text>
                        <Text style={styles.sensorLabel}>Temperature</Text>
                        <Text style={styles.sensorValue}>
                            {currentSensorData?.temperature != null ? 
                                `${currentSensorData.temperature.toFixed(2)}°C` : 'N/A'}
                        </Text>
                    </View>
                </View>

                <View style={styles.relayContainer}>
                    <View style={styles.relayControl}>
                        <Text>Relay 1</Text>
                        <Switch
                            value={item.relay1State === "1"}
                            onValueChange={(value) => updateRelay(item.nodeId, 1, value)}
                        />
                    </View>
                    <View style={styles.relayControl}>
                        <Text>Relay 2</Text>
                        <Switch
                            value={item.relay2State === "1"}
                            onValueChange={(value) => updateRelay(item.nodeId, 2, value)}
                        />
                    </View>
                </View>

                <Text style={styles.timestamp}>
                    Last Updated: {currentSensorData?.timestamp ? 
                        new Date(currentSensorData.timestamp).toLocaleString() : 'Never'}
                </Text>
            </View>
        );
    };

    const handleBarCodeScanned = ({ type, data }) => {
        setScannedNodeId(data);
        setShowScanner(false);
        setShowEnrollNodeModal(true);
    };

    const handleEnrollNode = async () => {
        const nodeIdToEnroll = scannedNodeId || manualNodeId;
        
        if (!nodeIdToEnroll) {
            Alert.alert('Error', 'Please enter or scan a Node ID');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('userId');

            const response = await axiosInstance.post(
                `/nodes/enroll`,
                {    
                    nodeName,
                    nodeId: nodeIdToEnroll,
                    gatewayId,
                    userId,
                   
                }
            );

            if (response.data.success) {
                setNodes(prevNodes => [...prevNodes, response.data.node]);
                Alert.alert('Success', 'Node enrolled successfully');
                setShowEnrollNodeModal(false);
                setNodeName('');
                setScannedNodeId('');
                setManualNodeId('');
            } else {
                Alert.alert('Error', response.data.message || 'Failed to enroll node');
            }
        } catch (error) {
            console.error('Error enrolling node:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to enroll node');
        } finally {
            setLoading(false);
        }
    };

    const handleManualEntry = () => {
        setShowActions(false);
        setShowEnrollNodeModal(true);
    };

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Camera permission is required to scan QR codes');
            }
        })();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Gateway: {gatewayId}</Text>
            
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            ) : nodes.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.noNodes}>No nodes found</Text>
                    <Text style={styles.subText}>Add a node using the + button</Text>
                </View>
            ) : (
                <FlatList
                    data={nodes}
                    renderItem={renderItem}
                    keyExtractor={item => item.nodeId}
                    contentContainerStyle={styles.listContainer}
                    refreshing={loading}
                    onRefresh={fetchNodes}
                />
            )}

            <TouchableOpacity 
                style={[styles.fab, { bottom: 80 }]}
                onPress={() => setShowActions(true)}
            >
                <MaterialIcons name="add" size={24} color="#fff" />
            </TouchableOpacity>

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
                        <Text style={styles.closeButtonText}>close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            <Modal
                visible={showEnrollNodeModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowEnrollNodeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Enroll New Node</Text>
                        
                        {scannedNodeId ? (
                            <Text style={styles.nodeIdText}>Node ID: {scannedNodeId}</Text>
                        ) : (
                            <TextInput
                                style={styles.input}
                                placeholder="Enter Node ID"
                                value={manualNodeId}
                                onChangeText={setManualNodeId}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        )}
                        
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Node Name"
                            value={nodeName}
                            onChangeText={setNodeName}
                        />
                        
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => {
                                    setShowEnrollNodeModal(false);
                                    setNodeName('');
                                    setManualNodeId('');
                                    setScannedNodeId('');
                                }}
                            >
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.button, styles.enrollButton]}
                                onPress={() => handleEnrollNode(scannedNodeId || manualNodeId)}
                                disabled={loading || (!scannedNodeId && !manualNodeId)}
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
                            <Text style={styles.actionText}>⌨️ Enter Node ID Manually</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: {
        fontSize: 20,
        fontFamily: 'Montserrat-Bold',
        marginBottom: 20,
        color: '#333',
    },
    nodeItem: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginVertical: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    nodeId: {
        fontSize: 16,
        fontFamily: 'Montserrat-Bold',
        color: '#333',
        marginBottom: 8,
    },
    relayContainer: {
        marginTop: 8,
        marginBottom: 8,
    },
    relayControl: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        padding: 8,
    },
    relayState: {
        fontSize: 14,
        color: '#666',
    },
    timestamp: {
        fontSize: 12,
        fontFamily: 'Montserrat-Regular',
        color: '#666',
        marginTop: 8,
        textAlign: 'right',
    },
    noNodes: {
        textAlign: 'center',
        marginTop: 20,
        fontFamily: 'Montserrat-Regular',
        color: '#666',
    },
    list: {
        padding: 10,
    },
    enrollContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginRight: 10,
    },
    sensorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 10,
        paddingHorizontal: 10,
    },
    sensorBox: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 5,
    },
    sensorIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    sensorLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    sensorValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        flex: 1,
    },
    scanButton: {
        backgroundColor: '#2196F3',
        padding: 10,
        borderRadius: 8,
        marginLeft: 10,
    },
    scanButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    scannerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    scannerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    scannerText: {
        fontSize: 16,
        color: '#fff',
        marginTop: 40,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 10,
        borderRadius: 5,
    },
    button: {
        flex: 1,
        padding: 10,
        borderRadius: 5,
        marginHorizontal: 5,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
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
        zIndex: 9999,
    },
    fabIcon: {
        fontSize: 24,
        color: '#fff',
        fontWeight: 'bold',
    },
    actionSheet: {
        backgroundColor: 'white',
        padding: 16,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    actionButton: {
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 16,
        marginLeft: 12,
        color: '#2c3e50',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        width: '80%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    cancelButton: {
        backgroundColor: '#ccc',
    },
    enrollButton: {
        backgroundColor: '#1E6D31',
    },
    buttonText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    nodeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    deleteButton: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        backgroundColor: '#ffebee',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
    },
    errorText: {
        color: '#c62828',
        textAlign: 'center',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subText: {
        color: '#666',
        marginTop: 8,
        fontFamily: 'Montserrat-Regular',
    },
    listContainer: {
        paddingBottom: 100,
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 15,
        borderRadius: 25,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    scanner: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    scannerContainer: {
        flex: 1,
        backgroundColor: 'black',
    },
    scannerOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        flexDirection: 'row',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        width: '80%',
        maxWidth: 400,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 10,
        borderRadius: 8,
        marginVertical: 8,
        fontSize: 16,
    },
    nodeIdText: {
        fontSize: 16,
        marginBottom: 10,
        color: '#333',
    }
});

export default DeviceDetails;
