// backend/server.js

require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/config/database');

// Import Services
const socketService = require('./src/realtime/socketService');
const mqttService = require('./src/realtime/mqttService');
const decisionEngine = require('./src/logic/decisionEngine');

// Import Models (Must be loaded before sync)
require('./src/models/UserModel');
require('./src/models/GatewayModel');
require('./src/models/SensorNodeModel');
require('./src/models/SensorDataModel');
require('./src/models/WateringHistoryModel');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // 1. Authenticate Database
        await sequelize.authenticate();
        console.log('✅ Database connection established.');

        // 2. Sync Database
        // Use alter: true for safe updates during development
        await sequelize.sync({ alter: true }); 
        console.log('✅ Database synced (ALTER mode)!');

        // 3. Start HTTP Server
        const server = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            
            // 4. Initialize Realtime Services
            
            // First, initialize Socket.io with the HTTP server
            socketService.init(server);

            // Then, initialize MQTT and PASS the socketService instance
            mqttService.initMqttService(socketService);
            
            // Finally, start the decision engine scheduler
            decisionEngine.startScheduler();
        });

    } catch (error) {
        console.error('❌ Unable to start server:', error);
        if (error.original) console.error('Caused by:', error.original);
    }
};

startServer();