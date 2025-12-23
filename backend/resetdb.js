// backend/reset_db.js
require('dotenv').config();
const { sequelize } = require('./src/config/database');

// Import tất cả Models
require('./src/models/GatewayModel');
require('./src/models/SensorNodeModel');
require('./src/models/WateringHistoryModel');
// Import thêm model khác nếu có (User, SensorData...)

const reset = async () => {
    try {
        await sequelize.authenticate();
        console.log('🔌 Đã kết nối DB.');

        // 1. TẮT kiểm tra khóa ngoại (Bắt buộc)
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

        // 2. Xóa sạch và tạo lại bảng (FORCE TRUE)
        await sequelize.sync({ force: true });
        console.log('✅ Đã xóa bảng cũ và tạo bảng mới thành công!');

        // 3. Bật lại khóa ngoại
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error);
        process.exit(1);
    }
};

reset();