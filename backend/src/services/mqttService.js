// backend/src/services/mqttService.js

const mqtt = require('mqtt');
const SensorData = require('../models/SensorDataModel');
const SensorNode = require('../models/SensorNodeModel');

// Import Decision Engine để gọi logic xử lý ngay sau khi nhận dữ liệu
// Lưu ý: Lệnh require() này phải được đặt ở đây (không phải top-level) để tránh lỗi Circular Dependency
let decisionEngine;
setTimeout(() => {
    // Tải Decision Engine sau một khoảng thời gian ngắn
    // Việc này giúp đảm bảo tất cả module được khởi tạo trước.
    decisionEngine = require('./decisionEngine');
}, 500); 

// Lấy thông tin cấu hình từ .env
const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_PORT = process.env.MQTT_PORT;
const MQTT_URL = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;
const UPLINK_TOPIC = process.env.MQTT_TOPIC_UPLINK; // Ví dụ: sensor/data/#
const DOWNLINK_TOPIC = process.env.MQTT_TOPIC_DOWNLINK; // Ví dụ: control/valve/

let mqttClient;

/**
 * Hàm giải mã Payload thô (dữ liệu từ LoRa) thành đối tượng JavaScript.
 * Giả sử Payload là JSON.
 */
const decodePayload = (topic, payload) => {
    try {
        const data = JSON.parse(payload.toString());
        
        // Trích xuất Device EUI từ Topic
        const topicParts = topic.split('/');
        const deviceEui = topicParts[topicParts.length - 1]; 

        return {
            deviceEui: deviceEui,
            soil_moisture: parseFloat(data.moisture),
            temperature: parseFloat(data.temp),
            lora_rssi: parseInt(data.rssi) || null,
        };
    } catch (e) {
        console.error('❌ Error decoding MQTT payload:', e.message);
        return null;
    }
};

/**
 * Xử lý dữ liệu nhận được, lưu vào database và gọi Decision Engine.
 */
const handleMqttMessage = async (topic, payload) => {
    const decodedData = decodePayload(topic, payload);
    
    if (!decodedData) return;

    try {
        // 1. Tìm NodeID tương ứng với Device EUI
        const node = await SensorNode.findOne({
            where: { device_eui: decodedData.deviceEui }
        });

        if (!node) {
            console.warn(`⚠️ SensorNode with EUI ${decodedData.deviceEui} not found. Data discarded.`);
            return;
        }

        // 2. Lưu dữ liệu vào bảng sensor_data (SensorDataModel)
        await SensorData.create({
            node_id: node.id,
            soil_moisture: decodedData.soil_moisture,
            temperature: decodedData.temperature,
            lora_rssi: decodedData.lora_rssi,
            timestamp: new Date(),
        });
        
        console.log(`[MQTT] ✅ Data saved for Node ${node.id}: Moisture=${decodedData.soil_moisture}%`);

        // 3. GỌI DECISION ENGINE: Xử lý quyết định tưới tiêu ngay lập tức
        if (decisionEngine && decisionEngine.checkAndDecide) {
            // Thay vì gọi optimization chạy theo cron, ta có thể gọi hàm kiểm tra ngay
            decisionEngine.checkAndDecide(node.id, decodedData.soil_moisture);
        }

    } catch (error) {
        console.error('❌ Error processing or saving sensor data:', error);
    }
};


// --- CHỨC NĂNG PUBLISHER (GỬI LỆNH) ---

/**
 * Gửi lệnh điều khiển đến thiết bị qua MQTT (Downlink)
 * @param {string} deviceEui - ID duy nhất của Node nhận lệnh
 * @param {number} duration - Thời gian tưới (giây)
 */
const sendCommand = (deviceEui, duration) => {
    if (!mqttClient || !mqttClient.connected) {
        console.error('[MQTT] ❌ Cannot send command: Not connected to Broker.');
        return false;
    }
    
    // Topic: control/valve/NodeABC
    const topic = `${DOWNLINK_TOPIC}${deviceEui}`; 
    const payload = JSON.stringify({
        command: 'WATER',
        duration: duration,
        timestamp: Date.now()
    });

    mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
        if (err) {
            console.error(`[MQTT] ❌ Failed to publish command to ${topic}:`, err);
            return false;
        }
        console.log(`[MQTT] ⬆️ Command sent successfully to ${topic}: WATER for ${duration}s.`);
        return true;
    });

    return true;
};

// --- CHỨC NĂNG SUBSCRIBER (KHỞI TẠO) ---

/**
 * Thiết lập kết nối MQTT và Subscriber.
 */
const init = () => {
    mqttClient = mqtt.connect(MQTT_URL);

    mqttClient.on('connect', () => {
        console.log(`[MQTT] ✅ Connected to Broker at ${MQTT_URL}`);
        
        // Đăng ký lắng nghe các topic Uplink
        mqttClient.subscribe(UPLINK_TOPIC, (err) => {
            if (err) {
                console.error(`[MQTT] ❌ Subscription failed for ${UPLINK_TOPIC}:`, err);
            } else {
                console.log(`[MQTT] 👂 Subscribed to topic: ${UPLINK_TOPIC}`);
            }
        });
    });

    mqttClient.on('message', handleMqttMessage);

    mqttClient.on('error', (err) => {
        console.error('[MQTT] ❌ MQTT Client Error:', err);
    });
    
    mqttClient.on('offline', () => {
        console.warn('[MQTT] ⚠️ MQTT Client went offline.');
    });
};

/**
 * Export hàm khởi tạo, client và hàm gửi lệnh.
 */
module.exports = {
    init,
    getClient: () => mqttClient, 
    sendCommand, // Bổ sung hàm gửi lệnh
};