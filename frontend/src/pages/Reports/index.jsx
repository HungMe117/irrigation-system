import React, { useState, useEffect, useMemo } from 'react';
import { Card, DatePicker, Button, Typography, Select, Space, message, Row, Col, Empty, Spin, Table, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axiosClient from '../../services/axiosClient';
import dayjs from 'dayjs';
// Cần import thêm plugin này để so sánh ngày giờ chính xác
import isBetween from 'dayjs/plugin/isBetween';
dayjs.extend(isBetween);

const { Title } = Typography;
const { RangePicker } = DatePicker;

const Reports = () => {
    const [loading, setLoading] = useState(false);
    const [gateways, setGateways] = useState([]);
    const [selectedGatewayId, setSelectedGatewayId] = useState(null);
    
    const [rawSensorData, setRawSensorData] = useState([]);
    const [rawWateringData, setRawWateringData] = useState([]);

    // Mặc định chọn 7 ngày gần nhất
    const [dateRange, setDateRange] = useState([dayjs().subtract(7, 'day'), dayjs()]);

    // 1. Lấy danh sách Gateway
    useEffect(() => {
        const fetchGateways = async () => {
            try {
                const res = await axiosClient.get('/data/gateways');
                const list = res.data?.data || [];
                setGateways(list);
                if (list.length > 0) setSelectedGatewayId(list[0].id);
            } catch (error) {
                console.error("Lỗi tải danh sách Gateway:", error);
            }
        };
        fetchGateways();
    }, []);

    // 2. Lấy dữ liệu (Lấy số lượng lớn về rồi lọc Client cho nhanh)
    const fetchData = async () => {
        setLoading(true);
        try {
            const [sensorRes, wateringRes] = await Promise.all([
                axiosClient.get('/data/history?limit=1000'), // Lấy 1000 bản ghi để phủ được nhiều ngày
                axiosClient.get('/data/watering-logs')
            ]);

            setRawSensorData(sensorRes.data?.data || []);
            setRawWateringData(wateringRes.data?.data || []);
            message.success('Đã cập nhật dữ liệu mới nhất');
        } catch (error) {
            console.error(error);
            message.error('Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // 3. Xử lý dữ liệu Biểu đồ (CÓ LỌC NGÀY)
    const chartData = useMemo(() => {
        if (!selectedGatewayId || rawSensorData.length === 0 || !dateRange) return [];

        const [start, end] = dateRange;

        const filtered = rawSensorData.filter(d => {
            // 1. Check Gateway
            const dataGatewayId = d.gateway_id || d.SensorNode?.gateway_id || d.SensorNode?.Gateway?.id;
            const isGatewayMatch = dataGatewayId == selectedGatewayId;

            // 2. 👇 Check Thời gian (Quan trọng)
            const time = dayjs(d.timestamp);
            // So sánh: Lớn hơn đầu ngày Start VÀ Nhỏ hơn cuối ngày End
            const isDateMatch = time.isAfter(start.startOf('day')) && time.isBefore(end.endOf('day'));

            return isGatewayMatch && isDateMatch;
        });

        const sorted = filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return sorted.map(item => ({
            originalTime: new Date(item.timestamp).getTime(),
            displayTime: dayjs(item.timestamp).format('HH:mm DD/MM'),
            soil_moisture: item.soil_moisture,
            temperature: item.temperature,
            air_humidity: item.air_humidity
        }));
    }, [rawSensorData, selectedGatewayId, dateRange]); // Thêm dependency dateRange

    // Tính toán Ticks cho trục X
    const xAxisTicks = useMemo(() => {
        if (chartData.length === 0) return [];
        const minTime = chartData[0].originalTime;
        const maxTime = chartData[chartData.length - 1].originalTime;
        const ticks = [];
        let current = Math.ceil(minTime / (30 * 60 * 1000)) * (30 * 60 * 1000);
        while (current <= maxTime) {
            ticks.push(current);
            current += 30 * 60 * 1000;
        }
        return ticks;
    }, [chartData]);


    // 4. Lọc lịch sử tưới (CÓ LỌC NGÀY)
    const filteredWateringLogs = useMemo(() => {
        if (!selectedGatewayId || !dateRange) return [];
        
        const [start, end] = dateRange;

        return rawWateringData.filter(log => {
            // 1. Check Gateway
            const isGatewayMatch = log.gateway_id == selectedGatewayId;

            // 2. 👇 Check Thời gian cho Bảng
            const logTime = dayjs(log.command_time);
            const isDateMatch = logTime.isAfter(start.startOf('day')) && logTime.isBefore(end.endOf('day'));

            return isGatewayMatch && isDateMatch;
        });
    }, [rawWateringData, selectedGatewayId, dateRange]);

    const wateringColumns = [
        { title: 'Thời gian', dataIndex: 'command_time', width: 150, render: (t) => dayjs(t).format('DD/MM/YYYY HH:mm') },
        { title: 'Hành động', dataIndex: 'action', align: 'center', width: 120, render: (a) => <Tag color={a === 'OPEN' ? 'green' : 'red'}>{a === 'OPEN' ? 'MỞ VAN' : 'ĐÓNG VAN'}</Tag> },
        { title: 'Nguồn lệnh', dataIndex: 'source', width: 120, render: (src) => src === 'MANUAL' ? <Tag color="blue">Thủ công</Tag> : (src === 'AUTO_OFF' ? <Tag color="orange">Tự ngắt</Tag> : <Tag color="purple">Tự động</Tag>) },
        { title: 'Ghi chú', dataIndex: 'reason' }
    ];

    return (
        <div>
            <Card variant="borderless" styles={{ body: { padding: '20px' } }}>
                <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 24 }}>
                    <Col xs={24} md={8}><Title level={4} style={{ margin: 0 }}>Báo Cáo Tổng Hợp</Title></Col>
                    <Col xs={24} md={16} style={{ textAlign: 'right' }}>
                        <Space wrap>
                            <span style={{ fontWeight: 500 }}>Khu vực:</span>
                            <Select 
                                style={{ width: 220, textAlign: 'left' }}
                                value={selectedGatewayId}
                                onChange={setSelectedGatewayId}
                                options={gateways.map(g => ({ value: g.id, label: `${g.location} (ID: ${g.client_id})` }))}
                            />
                            {}
                            <RangePicker 
                                value={dateRange} 
                                onChange={setDateRange} 
                                format="DD/MM/YYYY" 
                                style={{ width: 240 }} 
                                allowClear={false}
                            />
                            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>
                        </Space>
                    </Col>
                </Row>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" tip="Đang tải dữ liệu..." /></div>
                ) : (
                    <>
                        {/* CHART */}
                        {chartData.length > 0 ? (
                            <Card title="📈 Biểu đồ Môi trường" bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <div style={{ width: '100%', height: 450 }}>
                                    <ResponsiveContainer>
                                        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#00b96b" stopOpacity={0.6}/>
                                                    <stop offset="95%" stopColor="#00b96b" stopOpacity={0.1}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis 
                                                dataKey="originalTime" 
                                                type="number" 
                                                domain={['dataMin', 'dataMax']} 
                                                ticks={xAxisTicks} 
                                                tickFormatter={(unix) => dayjs(unix).format('HH:mm DD/MM')}
                                                style={{ fontSize: 12 }} 
                                                scale="time"
                                            />
                                            <YAxis yAxisId="left" label={{ value: 'Nhiệt độ (°C)', angle: -90, position: 'insideLeft' }} domain={[-10, 50]} allowDataOverflow={true} />
                                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Độ ẩm (%)', angle: 90, position: 'insideRight' }} domain={[0, 100]} unit="%" />
                                            <Tooltip labelFormatter={(label) => dayjs(label).format('HH:mm DD/MM/YYYY')} contentStyle={{ borderRadius: 8 }} />
                                            <Legend verticalAlign="top" height={36}/>
                                            <Area yAxisId="right" type="monotone" dataKey="soil_moisture" name="Độ ẩm Đất (%)" stroke="#00b96b" fill="url(#colorMoisture)" fillOpacity={1} />
                                            <Line yAxisId="right" type="monotone" dataKey="air_humidity" name="Độ ẩm KK (%)" stroke="#1890ff" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                                            <Line yAxisId="left" type="monotone" dataKey="temperature" name="Nhiệt độ (°C)" stroke="#ff4d4f" strokeWidth={3} dot={{ r: 3 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        ) : (
                            <Empty description="Không có dữ liệu trong khoảng thời gian này" style={{ margin: '50px 0' }} />
                        )}

                        {/* TABLE */}
                        <div style={{ marginTop: 40 }}>
                            <Title level={5}>💧 Nhật Ký Hoạt Động Tưới (Gateway: {gateways.find(g => g.id == selectedGatewayId)?.location})</Title>
                            <Table 
                                dataSource={filteredWateringLogs} 
                                columns={wateringColumns} 
                                rowKey="id"
                                pagination={{ pageSize: 5 }} 
                                size="middle"
                                bordered
                            />
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
};

export default Reports;