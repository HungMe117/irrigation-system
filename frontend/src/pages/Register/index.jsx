import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../services/authService';

const { Title } = Typography;

const Register = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            // Chuẩn bị dữ liệu gửi lên Backend
            // Backend thường cần: username, email, password, passwordConfirm
            const data = {
                username: values.username,
                email: values.email,
                password: values.password,
                passwordConfirm: values.confirmPassword // Lưu ý key này phải khớp Backend
            };

            await authService.register(data);
            
            message.success('Đăng ký thành công! Vui lòng đăng nhập.');
            navigate('/login'); // Chuyển hướng về trang đăng nhập
        } catch (error) {
            console.error("Register Error:", error);
            const errorMsg = error.response?.data?.message || 'Đăng ký thất bại!';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            display: 'flex', justifyContent: 'center', alignItems: 'center', 
            height: '100vh', 
            backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
        }}>
            <Card style={{ width: 400, borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <Title level={3}>Đăng Ký Tài Khoản</Title>
                    <p>Tạo tài khoản quản lý nông trại mới</p>
                </div>

                <Form name="register_form" onFinish={onFinish} layout="vertical" size="large">
                    {/* 1. Username */}
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị!' }]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Tên người dùng (VD: Admin)" />
                    </Form.Item>

                    {/* 2. Email */}
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập Email!' },
                            { type: 'email', message: 'Email không hợp lệ!' }
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="Email" />
                    </Form.Item>

                    {/* 3. Password */}
                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu!' },
                            { min: 6, message: 'Mật khẩu phải từ 6 ký tự!' }
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
                    </Form.Item>

                    {/* 4. Confirm Password (Có logic check khớp) */}
                    <Form.Item
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Vui lòng nhập lại mật khẩu!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Hai mật khẩu không khớp!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu" />
                    </Form.Item>

                    {/* Button Submit */}
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            ĐĂNG KÝ
                        </Button>
                    </Form.Item>
                </Form>
                
                <div style={{ textAlign: 'center' }}>
                    Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
                </div>
            </Card>
        </div>
    );
};

export default Register;