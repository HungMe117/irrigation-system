// backend/src/config/database.js

const { Sequelize } = require('sequelize');

// Khởi tạo Sequelize bằng các biến môi trường
const sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USER, 
    process.env.DB_PASSWORD, 
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: false, // Tắt log truy vấn SQL
        
        // Bổ sung cấu hình Pool để quản lý kết nối hiệu quả hơn
        pool: {
            max: 5,         // Số lượng kết nối tối đa
            min: 0,         // Số lượng kết nối tối thiểu
            acquire: 30000, // Thời gian (ms) cố gắng thiết lập kết nối
            idle: 10000     // Thời gian (ms) ngắt kết nối không hoạt động
        },
        
        // Cấu hình timezone, đảm bảo thời gian được lưu trữ chính xác
        timezone: '+07:00' // Ví dụ: Sử dụng múi giờ UTC+7 (cần khớp với cấu hình MySQL)
    }
);

// Chỉ export sequelize instance
// Logic authenticate và sync được xử lý trong server.js
// Giữ nguyên export dạng object { sequelize } để tương thích với file server.js
module.exports = { sequelize };
