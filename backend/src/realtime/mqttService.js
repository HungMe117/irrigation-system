// backend/src/realtime/mqttService.js

const mqtt = require('mqtt');
const SensorData = require('../models/SensorDataModel');
const SensorNode = require('../models/SensorNodeModel');
const Gateway = require('../models/GatewayModel');

let client = null;
let socketServiceInstance = null; // Store socketService instance here

// 1. Initialize MQTT Connection (accepts socketService)
exports.initMqttService = (socketService) => {
    // Save the socketService instance for later use
    socketServiceInstance = socketService;

    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883'; 
    
    client = mqtt.connect(brokerUrl, {
        clientId: 'Backend_Server_' + Math.random().toString(16).substr(2, 8),
        reconnectPeriod: 5000,
    });

    client.on('connect', () => {
        console.log(`✅ MQTT Connected to ${brokerUrl}`);
        client.subscribe('gateway/+/data');
        client.subscribe('gateway/+/response');
        client.subscribe('gateway/+/status'); // Added status subscription
    });

    client.on('message', async (topic, message) => {
        try {
            const payload = JSON.parse(message.toString());
            // Check if topic is data or response/status
            if (topic.includes('/data') || topic.includes('/status')) {
                await handleSensorData(topic, payload);
            }
        } catch (error) {
            console.error('❌ MQTT Message Error:', error);
        }
    });

    client.on('error', (err) => {
        console.error('❌ MQTT Error:', err);
    });
};

// 2. Publish Function
exports.publish = (topic, message) => {
    if (!client || !client.connected) {
        console.error('⚠️ MQTT Client not connected. Cannot publish.');
        return false;
    }
    const payload = typeof message === 'object' ? JSON.stringify(message) : message;
    client.publish(topic, payload, (err) => {
        if (err) console.error('❌ Publish error:', err);
        else console.log(`📤 MQTT Sent to [${topic}]: ${payload}`);
    });
    return true;
};

// 3. Handle Sensor Data
const handleSensorData = async (topic, payload) => {
    // Topic: gateway/CLIENT_ID/data
    const topicParts = topic.split('/');
    const gatewayClientId = topicParts[1]; 

    try {
        const gateway = await Gateway.findOne({ where: { client_id: gatewayClientId } });
        if (!gateway) return;

        // Update Gateway Last Seen & Status
        gateway.last_seen = new Date();
        gateway.status = 'ONLINE';
        await gateway.save();

        // If payload has node data
        if (payload.device_eui) {
            const node = await SensorNode.findOne({ where: { device_eui: payload.device_eui } });
            if (!node) return;

            // Update Node
            node.is_online = true;
            if (payload.relay_status) {
                node.last_valve_status = payload.relay_status;
            }
            await node.save();

            // Save Sensor Data
            await SensorData.create({
                node_id: node.id,
                soil_moisture: payload.soil_moisture || 0,
                air_humidity: payload.air_humidity || 0,
                temperature: payload.temp || payload.temperature || 0,
                lora_rssi: payload.rssi || 0
            });

            // Use the stored socketServiceInstance to emit data
            if (socketServiceInstance) {
                // Ensure the event name matches what your frontend expects ('new_sensor_data')
                socketServiceInstance.emit('new_sensor_data', {
                    nodeId: node.id,
                    soil_moisture: payload.soil_moisture,
                    air_humidity: payload.air_humidity,
                    temperature: payload.temp || payload.temperature,
                    valve_status: payload.relay_status, // Use consistent naming
                    gatewayId: gateway.id
                });
            } else {
                console.warn('⚠️ Socket Service not ready, skipping realtime emit.');
            }
        }
    } catch (error) {
        console.error("Error handling MQTT data:", error);
    }
};