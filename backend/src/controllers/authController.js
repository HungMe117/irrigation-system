// backend/src/controllers/authController.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel'); 

// Hằng số bảo mật
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-mac-dinh'; // Thêm fallback nếu quên cấu hình env
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '365d'; 

/**
 * Tạo JWT Token
 * @param {number} id - User ID
 */
const createToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
};

// ----------------------------------------
// 1. Đăng Ký Tài Khoản (Register)
// ----------------------------------------
exports.register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // 1. Kiểm tra username đã tồn tại chưa
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại.' });
        }

        // 2. Hash Mật khẩu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Tạo User mới trong DB
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            role: role || 'user', 
        });

        // 4. Tạo Token
        const token = createToken(newUser.id);
        
        // 5. Trả về phản hồi (Bao gồm cả username và email)
        res.status(201).json({
            status: 'success',
            token,
            user: { 
                id: newUser.id, 
                username: newUser.username, // ✅ Đã có username
                email: newUser.email,       // ✅ Thêm email để chắc chắn
                role: newUser.role 
            },
        });

    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: 'Lỗi server trong quá trình đăng ký.' });
    }
};

// ----------------------------------------
// 2. Đăng Nhập (Login)
// ----------------------------------------
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp tên đăng nhập và mật khẩu.' });
        }

        // 1. Tìm User trong DB
        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }

        // 2. So sánh Mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }

        // 3. Tạo Token
        const token = createToken(user.id);

        // 4. Trả về phản hồi
        // 👇 ĐÂY LÀ CHỖ QUAN TRỌNG NHẤT
        res.status(200).json({
            status: 'success',
            token,
            user: { 
                id: user.id, 
                username: user.username, // ✅ Đảm bảo dòng này có
                email: user.email,       // ✅ Thêm dòng này để Frontend có cái hiển thị nếu thiếu username
                role: user.role 
            },
        });

    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: 'Lỗi server trong quá trình đăng nhập.' });
    }
};