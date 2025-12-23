import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../services/authService';

const { Title } = Typography;

const Login = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            console.log("Dữ liệu Form:", values);

            // 1. Gọi API Đăng nhập
            // Lưu ý: Truyền đúng object { username, password }
            const response = await authService.login({
                username: values.username,
                password: values.password
            });

            // 2. LƯU TOKEN VÀO LOCAL STORAGE (Quan trọng!)
            // Nếu không lưu dòng này, bạn sẽ bị lỗi màn hình trắng (authService.isAuthenticated trả về false)
            if (response.data && response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('current_user', JSON.stringify(response.data.user));
                
                message.success('Đăng nhập thành công!');
                
                // 3. Chuyển hướng về Dashboard
                navigate('/');
                
                // (Tùy chọn) Reload trang để cập nhật Header ngay lập tức
                // window.location.reload();
            } else {
                message.error('Không nhận được Token từ server!');
            }

        } catch (error) {
            console.error("Login Error:", error);
            // Lấy thông báo lỗi từ Backend
            const errorMsg = error.response?.data?.message || 'Đăng nhập thất bại!';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Card style={{ width: 400, borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <Title level={3} style={{ color: '#333' }}>Hệ Thống IoT</Title>
                    <p style={{ color: '#666' }}>Đăng nhập để quản lý thiết bị</p>
                </div>

                <Form 
                    name="login_form" 
                    onFinish={onFinish} 
                    layout="vertical" 
                    size="large"
                >
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: 'Vui lòng nhập Tên đăng nhập!' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập (VD: admin)" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block style={{ fontWeight: 'bold' }}>
                            ĐĂNG NHẬP
                        </Button>
                    </Form.Item>
                </Form>
                
                <div style={{ textAlign: 'center', marginTop: 10, fontSize: '14px' }}>
                    Chưa có tài khoản? <Link to="/register" style={{ fontWeight: 'bold' }}>Đăng ký ngay</Link>
                </div>
            </Card>
        </div>
    );
};

export default Login;