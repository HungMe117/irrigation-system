import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme, Button, Avatar, Space, Dropdown, message } from 'antd';
import { 
    DesktopOutlined, PieChartOutlined, FileOutlined, UserOutlined,
    MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
// 👇 SỬA LẠI DÒNG NÀY (Thêm dấu ngoặc nhọn)
import { socketService } from '../services/socketService';

const { Header, Content, Footer, Sider } = Layout;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const { token } = theme.useToken();
    const navigate = useNavigate();
    const location = useLocation();
    
    // State lưu thông tin user
    const [userInfo, setUserInfo] = useState(null);

    // 1. LẤY THÔNG TIN USER TỪ LOCALSTORAGE
    useEffect(() => {
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUserInfo(parsedUser);
            } catch (error) {
                console.error("Lỗi parse user info:", error);
                localStorage.removeItem('current_user');
            }
        }
    }, []);

    // 2. SOCKET REALTIME (Đã sửa để dùng socketService)
    useEffect(() => {
        // socketService đã autoConnect trong file service rồi, không cần gọi connect() ở đây nữa.
        
        // Lắng nghe sự kiện
        socketService.on('valve_status', (data) => {
            const statusText = (data.status === 'ON' || data.status === 'OPEN') ? "ĐANG TƯỚI!" : "ĐÃ TẮT.";
            const msgType = (data.status === 'ON' || data.status === 'OPEN') ? message.success : message.info;
            
            // Hiển thị thông báo góc phải
            msgType({ content: `Node ${data.nodeId}: ${statusText}`, key: 'valve', duration: 3 });
        });

        // Cleanup khi component unmount
        return () => {
            socketService.off('valve_status');
        };
    }, []);

    const handleLogout = () => {
        authService.logout();
        
        // Ngắt kết nối socket khi đăng xuất
        socketService.disconnect();
        
        message.success('Đăng xuất thành công');
        navigate('/login');
    };

    // ... (Phần Menu giữ nguyên)
    const items = [
        { key: '/', icon: <PieChartOutlined />, label: 'Dashboard' },
        { key: '/devices', icon: <DesktopOutlined />, label: 'Quản lý Thiết bị' },
        { key: '/reports', icon: <FileOutlined />, label: 'Báo cáo & Lịch sử' },
    ];
    
    const userMenu = {
        items: [
            { key: '1', label: 'Hồ sơ cá nhân', icon: <UserOutlined /> },
            { type: 'divider' },
            { key: '2', label: 'Đăng xuất', icon: <LogoutOutlined />, danger: true, onClick: handleLogout },
        ],
    };

    const displayName = userInfo?.username || userInfo?.email || 'Admin';

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed}>
                <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', textAlign: 'center', color: '#fff', lineHeight: '32px', fontWeight: 'bold' }}>
                    {collapsed ? 'IoT' : 'SMART AGRI'}
                </div>
                <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={items} onClick={(e) => navigate(e.key)} />
            </Sider>
            <Layout>
                <Header style={{ padding: '0 16px', background: token.colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} style={{ fontSize: '16px', width: 64, height: 64 }} />
                    <Dropdown menu={userMenu} placement="bottomRight">
                        <Space style={{ cursor: 'pointer', marginRight: 10 }}>
                            <span style={{ fontWeight: 500 }}>Xin chào, {displayName}</span>
                            <Avatar style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />
                        </Space>
                    </Dropdown>
                </Header>
                <Content style={{ margin: '16px' }}>
                    <div style={{ padding: 24, minHeight: 360, background: token.colorBgContainer, borderRadius: token.borderRadiusLG }}>
                        <Outlet />
                    </div>
                </Content>
                <Footer style={{ textAlign: 'center' }}>Smart Irrigation System ©2025</Footer>
            </Layout>
        </Layout>
    );
};

export default MainLayout;