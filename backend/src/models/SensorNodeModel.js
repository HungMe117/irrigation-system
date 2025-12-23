const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Gateway = require('./GatewayModel'); // Import Gateway để liên kết

const SensorNode = sequelize.define('SensorNode', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    device_eui: { type: DataTypes.STRING, allowNull: false, unique: true },
    
    // 👇 BỎ area_name, lấy từ Gateway
    // 👇 BỎ min_moisture_threshold, lấy từ Gateway
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    last_valve_status: { type: DataTypes.STRING, defaultValue: 'OFF' },
    is_auto_mode: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_online: { type: DataTypes.BOOLEAN, defaultValue: false },
    
    gateway_id: {
        type: DataTypes.INTEGER,
        references: { model: Gateway, key: 'id' }
    },
    // Backup tên gateway
    connected_gateway: { type: DataTypes.STRING }
});

// Thiết lập mối quan hệ: 1 Node thuộc về 1 Gateway
SensorNode.belongsTo(Gateway, { foreignKey: 'gateway_id' });
Gateway.hasMany(SensorNode, { foreignKey: 'gateway_id' });

module.exports = SensorNode;