// backend/src/routes/configRoutes.js

const express = require('express');
const configController = require('../controllers/configController');
// 👇 1. IMPORT CONTROLLER GATEWAY (MỚI)
const gatewayController = require('../controllers/gatewayController'); 
const authMiddleware = require('../middleware/authMiddleware'); 

const router = express.Router();

// Tất cả các route dưới đây đều yêu cầu đăng nhập
router.use(authMiddleware.protect);

// --- CÁC ROUTE CẤU HÌNH NODE (CŨ) ---

// 1. Lấy danh sách thiết bị
// GET /api/v1/config/nodes
router.get('/nodes', configController.getAllNodes);

// 2. Thêm thiết bị mới
// POST /api/v1/config/node
router.post('/node', configController.createNode);

// 3. Cập nhật thông tin (Tên, Tọa độ...)
// PUT /api/v1/config/node/:nodeId
router.put('/node/:nodeId', configController.updateNodeConfig);

// 4. Xóa thiết bị
// DELETE /api/v1/config/node/:nodeId
router.delete('/node/:nodeId', configController.deleteNode);


// --- 👇 CÁC ROUTE CẤU HÌNH GATEWAY (MỚI BỔ SUNG) ---

// 5. Lấy danh sách Gateway
// GET /api/v1/config/gateways
router.get('/gateways', gatewayController.getAllGateways);

// 6. Thêm Gateway mới
// POST /api/v1/config/gateway
router.post('/gateway', gatewayController.createGateway);
router.put('/gateway/:id', gatewayController.updateGateway);    // API Sửa
router.delete('/gateway/:id', gatewayController.deleteGateway); // API Xóa
module.exports = router;