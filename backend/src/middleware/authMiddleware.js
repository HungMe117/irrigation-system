// backend/src/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

// 👇 SỬA DÒNG NÀY: Thêm fallback giống hệt authController để đảm bảo khớp chìa khóa
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-mac-dinh';

/**
 * Middleware để bảo vệ các route (yêu cầu người dùng phải đăng nhập hợp lệ).
 */
exports.protect = async (req, res, next) => {
    let token;

    // 1. Kiểm tra xem token có được gửi trong Header hay không
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Lấy token sau chữ "Bearer "
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ 
            message: 'Bạn chưa đăng nhập! Vui lòng đăng nhập để truy cập.' 
        });
    }

    try {
        // 2. Xác minh Token
        const decoded = jwt.verify(token, JWT_SECRET);

        // 3. Kiểm tra User có tồn tại không
        // (Quan trọng: Nếu bạn vừa reset DB, user cũ bị xóa -> Token cũ sẽ lỗi ở đây)
        const currentUser = await User.findByPk(decoded.id);

        if (!currentUser) {
            return res.status(401).json({ 
                message: 'Người dùng sở hữu token này không còn tồn tại.' 
            });
        }

        // 4. Gán user vào request
        req.user = currentUser;
        next();

    } catch (err) {
        console.error("Auth Error:", err.message); // Log lỗi ra để dễ debug
        return res.status(401).json({ 
            message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' 
        });
    }
};

/**
 * Middleware phân quyền (Role)
 */
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Bạn không có quyền thực hiện hành động này.'
            });
        }
        next();
    };
};