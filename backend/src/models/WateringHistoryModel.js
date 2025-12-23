// backend/src/models/WateringHistoryModel.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Gateway = require('./GatewayModel'); // 👇 Import Gateway

const WateringHistory = sequelize.define('WateringHistory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    
    // 👇 CỘT BẮT BUỘC PHẢI CÓ
    gateway_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: Gateway, key: 'id' }
    },
    
    action: { type: DataTypes.STRING, allowNull: false },
    source: { type: DataTypes.STRING, defaultValue: 'MANUAL' },
    command_time: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    duration_seconds: { type: DataTypes.INTEGER, defaultValue: 0 },
    reason: { type: DataTypes.STRING }

}, {
    tableName: 'watering_history'
});

// 👇 QUAN TRỌNG: Định nghĩa mối quan hệ để hàm include trong Controller hoạt động
WateringHistory.belongsTo(Gateway, { foreignKey: 'gateway_id' });
Gateway.hasMany(WateringHistory, { foreignKey: 'gateway_id' });

module.exports = WateringHistory;