// backend/src/routes/controlRoutes.js
const express = require('express');
const controlController = require('../controllers/controlController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Bảo vệ routes bằng Token
router.use(authMiddleware.protect);

// 1. Route Điều khiển Van Gateway (MỚI)
router.post('/gateway/:id/valve', controlController.toggleGatewayValve);

// 2. Route Bật/Tắt Node (MỚI)
router.post('/node/:id/active', controlController.toggleNodeActive);

module.exports = router;