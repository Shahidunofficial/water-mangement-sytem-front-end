import React, { createContext, useContext, useEffect, useState } from 'react';
import mqttService from '../services/mqttService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const MQTTContext = createContext();

export function MQTTProvider({ children }) {
    const [sensorData, setSensorData] = useState({});
    const [enrolledGateways, setEnrolledGateways] = useState([]);
    const [isConnecting, setIsConnecting] = useState(false);

    const updateNodeData = (gatewayId, nodeId, payload) => {
        try {
            const data = JSON.parse(payload);
            const [moisture, temperature] = data.sensor_data.split(',').map(Number);
            
            setSensorData(prev => {
                const newState = {
                    ...prev,
                    [`${data.gateway_id}_${data.node_id}`]: {
                        moisture,
                        temperature,
                        timestamp: data.timestamp,
                        nodeId: data.node_id,
                        gatewayId: data.gateway_id
                    }
                };
                console.log('New sensor data state:', newState); // Debug log
                return newState;
            });
        } catch (error) {
            console.error('Error parsing sensor data:', error);
        }
    };

    const ensureMQTTConnection = () => {
        if (!mqttService.isConnected() && !isConnecting) {
            setIsConnecting(true);
            mqttService.connect();
            setIsConnecting(false);
        }
    };

    const fetchAndSubscribeToNodes = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('userId');
            
            if (!token || !userId) return;

            const response = await axios.get(
                `http://192.168.43.231:5000/api/v1/gateway/status/${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.data.success) {
                setEnrolledGateways(response.data.gateways);
                
                ensureMQTTConnection();

                // Subscribe to topics for all nodes of all gateways
                response.data.gateways.forEach(gateway => {
                    const topic = `sensor_data/${gateway.gatewayId}/+`;
                    console.log('Subscribing to topic:', topic);
                    mqttService.subscribe(topic, (payload, topic) => {
                        try {
                            const data = JSON.parse(payload);
                            const topicParts = topic.split('/');
                            const gatewayId = topicParts[1];
                            const nodeId = topicParts[2];
                            console.log('Processing MQTT message:', { gatewayId, nodeId, data });
                            updateNodeData(gatewayId, nodeId, payload);
                        } catch (error) {
                            console.error('Error processing MQTT message:', error);
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Error fetching gateways:', error);
        }
    };

    // Add useEffect to monitor sensorData changes
    useEffect(() => {
        console.log('SensorData state updated:', sensorData);
    }, [sensorData]);

    useEffect(() => {
        fetchAndSubscribeToNodes();
        const interval = setInterval(fetchAndSubscribeToNodes, 30000);
        return () => {
            clearInterval(interval);
            mqttService.disconnect();
        };
    }, []);

    return (
        <MQTTContext.Provider value={{ sensorData, enrolledGateways }}>
            {children}
        </MQTTContext.Provider>
    );
}

export const useMQTT = () => useContext(MQTTContext); 