// backend/src/routes/dataRoutes.js

const express = require('express');
const dataController = require('../controllers/dataController');
const authMiddleware = require('../middleware/authMiddleware'); 

const router = express.Router();

// Bảo vệ tất cả route
router.use(authMiddleware.protect); 

// --- ROUTE ĐỌC DỮ LIỆU CẢM BIẾN & THIẾT BỊ ---

// 1. Lấy dữ liệu mới nhất (Dashboard)
router.get('/latest', dataController.getLatestData);

// 2. Lấy danh sách Gateway & Node (Cho trang Quản lý thiết bị)
// 👇 QUAN TRỌNG: Cần thêm lại 2 dòng này để Frontend không bị lỗi 404
router.get('/gateways', dataController.getAllGateways);
router.get('/nodes', dataController.getAllNodes);

// 3. Lấy lịch sử cảm biến (Biểu đồ)
router.get('/history', dataController.getHistoryData); 

// 4. Lấy lịch sử tưới (Báo cáo)
router.get('/watering-logs', dataController.getWateringLogs);

module.exports = router;