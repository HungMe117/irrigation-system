// backend/server.js

require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/config/database');

// Import Services
const socketService = require('./src/realtime/socketService');
const mqttService = require('./src/realtime/mqttService');
const decisionEngine = require('./src/logic/decisionEngine');

// Import Models (Bắt buộc load trước khi sync DB)
require('./src/models/UserModel');
require('./src/models/GatewayModel');
require('./src/models/SensorNodeModel');
require('./src/models/SensorDataModel');
require('./src/models/WateringHistoryModel');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // 1. Kết nối Database
        await sequelize.authenticate();
        console.log('✅ Database connection established.');

        // 2. Đồng bộ Database
        // alter: true -> Tự động cập nhật bảng nếu có thay đổi (thêm cột) mà không mất dữ liệu
        await sequelize.sync({ alter: true }); 
        console.log('✅ Database synced (ALTER mode)!');

        // 3. Khởi chạy HTTP Server
        const server = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            
            // 4. Khởi tạo các Service Realtime (Thứ tự rất quan trọng)
            
            // Bước A: Khởi tạo Socket.io gắn vào Server
            socketService.init(server);

            // Bước B: Khởi tạo MQTT và TRUYỀN Socket Service vào
            // (Đây là bước sửa lỗi undefined 'emitDataUpdate')
            mqttService.initMqttService(socketService); 
            
            // Bước C: Chạy bộ lập lịch tưới tự động
            decisionEngine.startScheduler();
        });

    } catch (error) {
        console.error('❌ Unable to start server:', error);
        if (error.original) console.error('Caused by:', error.original);
    }
};

startServer();