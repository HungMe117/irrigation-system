const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const SensorNode = require('./SensorNodeModel');

const SensorData = sequelize.define('SensorData', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    soil_moisture: {
        type: DataTypes.FLOAT, // Độ ẩm đất
        allowNull: false,
    },
    
    // 👇 --- BỔ SUNG CỘT MỚI Ở ĐÂY ---
    air_humidity: {
        type: DataTypes.FLOAT, // Độ ẩm không khí
        allowNull: true,       // Cho phép null để không lỗi với dữ liệu cũ
        defaultValue: 0
    },
    // --------------------------------
    
    temperature: {
        type: DataTypes.FLOAT, // Nhiệt độ môi trường
        allowNull: false,
    },
    lora_rssi: {
        type: DataTypes.INTEGER, // Cường độ tín hiệu
    },
    timestamp: {
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'sensor_data'
});

// Quan hệ: Một SensorNode có thể tạo ra nhiều SensorData
SensorData.belongsTo(SensorNode, { foreignKey: 'node_id' });
SensorNode.hasMany(SensorData, { foreignKey: 'node_id' });

module.exports = SensorData;