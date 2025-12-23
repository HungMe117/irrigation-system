const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Gateway = sequelize.define('Gateway', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    client_id: { 
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },
    location: {
        type: DataTypes.STRING(100), 
    },
    last_seen: {
        type: DataTypes.DATE, 
    },
    description: { 
        type: DataTypes.STRING, 
        allowNull: true 
    },
    // Trạng thái mạng (Online/Offline)
    status: { 
        type: DataTypes.STRING, 
        defaultValue: 'OFFLINE' 
    },
    
    // 👇 THÊM CỘT NÀY: Trạng thái Van (OPEN/CLOSE) - QUAN TRỌNG ĐỂ ĐỒNG BỘ DASHBOARD
    valve_status: { 
        type: DataTypes.STRING, 
        defaultValue: 'CLOSE' // Mặc định là đóng
    },
    // ------------------------------------------------------------------

    min_moisture_threshold: { 
        type: DataTypes.INTEGER, 
        defaultValue: 30, 
        allowNull: false
    },
    max_watering_duration: { 
        type: DataTypes.INTEGER, 
        defaultValue: 60, 
        allowNull: false
    },
    watering_schedule: {
        type: DataTypes.JSON, 
        defaultValue: [] 
    }
}, {
    tableName: 'gateways'
});

module.exports = Gateway;