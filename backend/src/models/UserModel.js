const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },
    password: { // Sẽ lưu trữ mật khẩu đã hash
        type: DataTypes.STRING, 
        allowNull: false,
    },
    role: { // 'admin' hoặc 'user'
        type: DataTypes.ENUM('admin', 'user'),
        defaultValue: 'user',
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(100),
        unique: true,
    }
}, {
    tableName: 'users' // Tên bảng trong MySQL
});

module.exports = User;