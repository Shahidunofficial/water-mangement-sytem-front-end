import mqtt from 'precompiled-mqtt';

class MQTTService {
    constructor() {
        this.client = null;
        this.callbacks = new Map();
    }

    isConnected() {
        return this.client !== null && this.client.connected;
    }

    connect() {
        if (this.client) {
            return;
        }

        const clientId = 'mobile_' + Math.random().toString(16).substr(2, 8);
        const connectUrl = 'ws://192.168.43.231:1885';

        try {
            this.client = mqtt.connect(connectUrl, {
                clientId,
                clean: true,
                connectTimeout: 30 * 1000,
                keepalive: 30,
                reconnectPeriod: 5000,
                protocol: 'ws'
            });

            this.client.on('connect', () => {
                console.log('Connected to MQTT broker successfully');
                // Resubscribe to all topics
                this.callbacks.forEach((callback, topic) => {
                    this.subscribe(topic, callback);
                });
            });

            this.client.on('message', (topic, message) => {
                console.log('Received message on topic:', topic);
                console.log('Message:', message.toString());
                
                const callback = this.callbacks.get(topic);
                if (callback) {
                    callback(message.toString());
                }
            });

            this.client.on('error', (error) => {
                console.error('MQTT Error:', error);
            });

            this.client.on('close', () => {
                console.log('MQTT connection closed');
            });

        } catch (error) {
            console.error('MQTT Setup Error:', error);
        }
    }

    subscribe(topic, callback) {
        if (!this.client) {
            console.warn('MQTT client not initialized, connecting first...');
            this.callbacks.set(topic, callback);
            this.connect();
            return;
        }

        console.log('Subscribing to topic:', topic);
        this.callbacks.set(topic, callback);
        
        this.client.subscribe(topic, (err) => {
            if (err) {
                console.error(`Failed to subscribe to ${topic}:`, err);
            } else {
                console.log(`Successfully subscribed to ${topic}`);
            }
        });

        this.client.on('message', (receivedTopic, message) => {
            if (topic === receivedTopic || topic.endsWith('+')) {
                console.log('Received message on topic:', receivedTopic);
                console.log('Message:', message.toString());
                callback(message.toString(), receivedTopic);
            }
        });
    }

    unsubscribe(topic) {
        if (!this.client) {
            this.callbacks.delete(topic);
            return;
        }

        this.client.unsubscribe(topic, (err) => {
            if (err) {
                console.error(`Failed to unsubscribe from ${topic}:`, err);
            } else {
                console.log(`Successfully unsubscribed from ${topic}`);
                this.callbacks.delete(topic);
            }
        });
    }

    disconnect() {
        if (this.client) {
            this.client.end(true, () => {
                console.log('MQTT client disconnected');
                this.client = null;
                this.callbacks.clear();
            });
        }
    }
}

export default new MQTTService();
