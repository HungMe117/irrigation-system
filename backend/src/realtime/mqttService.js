const mqtt = require('mqtt');
const SensorData = require('../models/SensorDataModel');
const SensorNode = require('../models/SensorNodeModel');
const Gateway = require('../models/GatewayModel');

let client = null;
let socketServiceInstance = null; // Biến lưu instance của Socket

// 1. Khởi tạo kết nối MQTT (Nhận socketService từ server.js truyền vào)
exports.initMqttService = (socketService) => {
    // Lưu lại socketService để dùng sau này (Khắc phục lỗi undefined)
    socketServiceInstance = socketService;

    // Lấy cấu hình từ .env (Ưu tiên HiveMQ Cloud)
    const host = process.env.MQTT_HOST || '127.0.0.1';
    const port = process.env.MQTT_PORT || '1883';
    const username = process.env.MQTT_USER || null;
    const password = process.env.MQTT_PASS || null;

    // Nếu port là 8883 thì tự động dùng 'mqtts' (SSL), ngược lại dùng 'mqtt'
    const protocol = (port == 8883) ? 'mqtts' : 'mqtt';
    const connectUrl = `${protocol}://${host}:${port}`;

    console.log(`🔌 MQTT Service: Đang kết nối tới ${connectUrl}...`);

    const options = {
        clientId: 'Backend_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        connectTimeout: 4000,
        username: username,
        password: password,
        // rejectUnauthorized: true là an toàn cho HiveMQ Cloud
        rejectUnauthorized: true, 
    };

    client = mqtt.connect(connectUrl, options);

    client.on('connect', () => {
        console.log('✅ MQTT Connected Successfully!');
        
        // Subscribe các topic quan trọng
        client.subscribe('gateway/+/data');     // Dữ liệu cảm biến
        client.subscribe('gateway/+/response'); // Phản hồi lệnh
        client.subscribe('gateway/+/status');   // Trạng thái mạng
    });

    client.on('message', async (topic, message) => {
        try {
            const payload = JSON.parse(message.toString());
            
            // Chỉ xử lý nếu topic chứa data hoặc status
            if (topic.includes('/data') || topic.includes('/status')) {
                await handleSensorData(topic, payload);
            }
        } catch (error) {
            console.error('❌ Lỗi xử lý tin nhắn MQTT:', error.message);
        }
    });

    client.on('error', (err) => {
        console.error('❌ MQTT Connection Error:', err.message);
    });
};

// 2. Hàm Gửi Lệnh (Publish)
exports.publish = (topic, message) => {
    if (!client || !client.connected) {
        console.warn('⚠️ MQTT chưa kết nối, không thể gửi lệnh.');
        return false;
    }
    
    const payload = typeof message === 'object' ? JSON.stringify(message) : message;
    
    client.publish(topic, payload, (err) => {
        if (err) console.error('❌ Publish thất bại:', err);
        else console.log(`📤 Đã gửi MQTT đến [${topic}]: ${payload}`);
    });
    
    return true;
};

// 3. Hàm Xử lý Dữ liệu nhận được
const handleSensorData = async (topic, payload) => {
    // Định dạng topic: gateway/CLIENT_ID/data
    const topicParts = topic.split('/');
    const gatewayClientId = topicParts[1]; 

    try {
        // A. Tìm Gateway trong DB
        const gateway = await Gateway.findOne({ where: { client_id: gatewayClientId } });
        if (!gateway) {
            // console.warn(`⚠️ Nhận data từ Gateway lạ: ${gatewayClientId}`);
            return;
        }

        // Cập nhật trạng thái Online cho Gateway
        gateway.last_seen = new Date();
        gateway.status = 'ONLINE';
        await gateway.save();

        // B. Xử lý dữ liệu Node (nếu có trong payload)
        if (payload.device_eui) {
            const node = await SensorNode.findOne({ where: { device_eui: payload.device_eui } });
            
            if (node) {
                // Cập nhật Node
                node.is_online = true;
                if (payload.relay_status) {
                    node.last_valve_status = payload.relay_status;
                }
                await node.save();

                // Lưu dữ liệu cảm biến vào bảng History
                await SensorData.create({
                    node_id: node.id,
                    soil_moisture: payload.soil_moisture || 0,
                    air_humidity: payload.air_humidity || 0,
                    temperature: payload.temp || payload.temperature || 0,
                    lora_rssi: payload.rssi || 0
                });

                // C. GỬI SOCKET REALTIME LÊN FRONTEND
                if (socketServiceInstance) {
                    // Emit sự kiện 'new_sensor_data' khớp với Dashboard
                    socketServiceInstance.emit('new_sensor_data', {
                        nodeId: node.id,
                        gatewayId: gateway.id, // Quan trọng để map dữ liệu
                        soil_moisture: payload.soil_moisture,
                        air_humidity: payload.air_humidity,
                        temperature: payload.temp || payload.temperature,
                        valve_status: payload.relay_status, // Thống nhất tên biến
                        timestamp: new Date()
                    });
                }
            }
        }
    } catch (error) {
        console.error("❌ Lỗi trong handleSensorData:", error);
    }
};