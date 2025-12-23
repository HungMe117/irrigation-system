// backend/src/routes/authRoutes.js

const express = require('express');
const authController = require('../controllers/authController');
// const { protect } = require('../middleware/authMiddleware'); // Hiện tại chưa cần, nhưng sẽ dùng sau

const router = express.Router();

// --- Public Routes ---
// Route Đăng ký: POST /api/v1/auth/register
router.post('/register', authController.register);

// Route Đăng nhập: POST /api/v1/auth/login
router.post('/login', authController.login);

// --- Protected Routes (Thêm vào khi cần) ---
// Ví dụ: router.get('/me', protect, authController.getMe);

// BẮT BUỘC: Chỉ export instance router
module.exports = router;
