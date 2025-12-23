import React, { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Button, Typography, Tabs, Tag, Space, message } from 'antd';
import { ReloadOutlined, FileExcelOutlined, HistoryOutlined, ThunderboltOutlined } from '@ant-design/icons';
import axiosClient from '../../services/axiosClient';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const Reports = () => {
    const [loading, setLoading] = useState(false);
    const [sensorData, setSensorData] = useState([]);
    const [wateringData, setWateringData] = useState([]);
    
    // State cho bộ lọc thời gian (Mặc định là 7 ngày qua)
    const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'day'), dayjs()]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sensorRes, wateringRes] = await Promise.all([
                axiosClient.get('/data/history?limit=100'),
                axiosClient.get('/data/watering-logs')
            ]);

            setSensorData(sensorRes.data?.data || []);
            setWateringData(wateringRes.data?.data || []);
            
            message.success('Đã cập nhật dữ liệu mới nhất');
        } catch (error) {
            console.error(error);
            message.error('Không thể tải dữ liệu lịch sử');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- CẤU HÌNH CỘT BẢNG CẢM BIẾN ---
    const sensorColumns = [
        {
            title: 'Thời gian',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 180,
            render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Khu vực (Gateway)',
            key: 'location',
            render: (_, record) => <b>{record.SensorNode?.Gateway?.location || 'Chưa định vị'}</b>,
        },
        {
            title: 'Độ ẩm đất (%)',
            dataIndex: 'soil_moisture',
            key: 'soil_moisture',
            align: 'center',
            render: (val) => <Tag color={val < 30 ? 'red' : 'cyan'}>{val}%</Tag>
        },
        {
            title: 'Nhiệt độ (°C)',
            dataIndex: 'temperature',
            key: 'temperature',
            align: 'center',
            render: (val) => <Tag color="orange">{val}°C</Tag>
        },
        {
            title: 'Trạng thái',
            key: 'status',
            align: 'center',
            render: () => <Tag color="success">Ổn định</Tag> 
        }
    ];

    // --- CẤU HÌNH CỘT BẢNG LỊCH SỬ TƯỚI (ĐÃ BỎ NODE) ---
    const wateringColumns = [
        {
            title: 'Thời gian lệnh',
            dataIndex: 'command_time',
            width: 180,
            render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm:ss'),
        },
        {
            title: 'Khu vực tưới',
            // Lấy dữ liệu từ record.Gateway
            render: (_, record) => <b>{record.Gateway?.location || '---'}</b>,
        },
        {
            title: 'Hành động',
            dataIndex: 'action',
            align: 'center',
            render: (action) => (
                <Tag color={action === 'OPEN' ? 'green' : 'red'}>
                    {action === 'OPEN' ? 'MỞ VAN' : 'ĐÓNG VAN'}
                </Tag>
            )
        },
        {
            title: 'Nguồn lệnh',
            dataIndex: 'source',
            render: (src) => {
                if (src === 'MANUAL') return 'Thủ công (App)';
                if (src === 'AUTO_OFF') return 'Tự động ngắt';
                return 'Tự động';
            }
        }
    ];

    const handleExport = () => {
        message.info('Tính năng xuất Excel đang được phát triển!');
    };

    return (
        <div>
            <Card variant="borderless" styles={{ body: { padding: '20px' } }}>
                <div style={{ marginBottom: 20 }}>
                    <Title level={4}>Báo Cáo & Lịch Sử Hoạt Động</Title>
                    
                    <Space wrap>
                        <RangePicker 
                            value={dateRange}
                            onChange={setDateRange}
                            format="DD/MM/YYYY"
                        />
                        
                        <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
                            Làm mới
                        </Button>
                        
                        <Button icon={<FileExcelOutlined />} onClick={handleExport} style={{ color: 'green', borderColor: 'green' }}>
                            Xuất Excel
                        </Button>
                    </Space>
                </div>

                <Tabs defaultActiveKey="1" items={[
                    {
                        key: '1',
                        label: <span><HistoryOutlined /> Nhật Ký Cảm Biến</span>,
                        children: (
                            <Table 
                                dataSource={sensorData} 
                                columns={sensorColumns} 
                                rowKey="id"
                                loading={loading}
                                pagination={{ pageSize: 10 }}
                            />
                        )
                    },
                    {
                        key: '2',
                        label: <span><ThunderboltOutlined /> Lịch Sử Tưới</span>,
                        children: (
                            <Table 
                                dataSource={wateringData} 
                                columns={wateringColumns} 
                                rowKey="id"
                                loading={loading}
                            />
                        )
                    }
                ]} />
            </Card>
        </div>
    );
};

export default Reports;