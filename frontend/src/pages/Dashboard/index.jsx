import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Switch, Typography, Spin, message, Empty } from 'antd';
import { CloudOutlined, ThunderboltOutlined, EnvironmentOutlined } from '@ant-design/icons';
import axiosClient from '../../services/axiosClient';
import { socketService } from '../../services/socketService';

const { Title, Text } = Typography;

const Dashboard = () => {
    const [gateways, setGateways] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sensorDataMap, setSensorDataMap] = useState({}); // Stores data by gatewayId

    // 1. Fetch Gateway List and Latest Data
    const fetchData = async () => {
        try {
            // Cache busting timestamp to prevent browser from serving old data
            const timestamp = new Date().getTime();

            const [gatewayRes, dataRes] = await Promise.all([
                axiosClient.get(`/data/gateways?t=${timestamp}`), 
                axiosClient.get(`/data/latest?t=${timestamp}`)    
            ]);

            const gatewayList = gatewayRes.data?.data || [];
            setGateways(gatewayList);

            // Map sensor data to Gateways
            const dataMap = {};
            const nodesData = dataRes.data?.data || [];
            
            // Logic: Match data strictly by gateway_id
            gatewayList.forEach(gw => {
                // Find node data where gateway_id matches the current gateway's id
                const nodeData = nodesData.find(d => d.gateway_id === gw.id);
                
                // IMPORTANT: Prioritize valve_status from the Gateway itself if available
                // Otherwise fallback to node data (though Gateway is the source of truth for valves now)
                dataMap[gw.id] = {
                    ...(nodeData || {}),
                    valve_status: gw.valve_status // Always use the gateway's valve status
                };
            });
            setSensorDataMap(dataMap);

        } catch (error) {
            console.error("Error loading dashboard:", error);
            // Suppress error message on initial load to avoid spamming user if network is flaky
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // 2. Initialize Socket Connection
        console.log("🔌 Dashboard: Connecting Socket...");
        socketService.connect();

        // 3. Listen for Realtime Events
        socketService.on('new_sensor_data', (data) => {
            console.log("📩 SOCKET RECEIVED DATA:", data);
            
            // data format: { gatewayId, valve_status, soil_moisture, ... }
            if (data.gatewayId) {
                setSensorDataMap(prev => {
                    const currentData = prev[data.gatewayId] || {};
                    return {
                        ...prev,
                        [data.gatewayId]: {
                            ...currentData,
                            ...data, // Overwrite with latest data
                            last_update: new Date()
                        }
                    };
                });
            }
        });

        // Cleanup
        return () => {
            socketService.off('new_sensor_data');
        };
    }, []);

    // 4. Handle Toggle (Control Valve) on Dashboard
    const handleToggleGateway = async (gatewayId, checked) => {
        const command = checked ? 'OPEN' : 'CLOSE';
        
        // Optimistic Update: Update UI immediately
        setSensorDataMap(prev => ({
            ...prev,
            [gatewayId]: {
                ...prev[gatewayId],
                valve_status: command
            }
        }));

        try {
            await axiosClient.post(`/control/gateway/${gatewayId}/valve`, { command });
            message.success(`Sent command ${command} successfully!`);
        } catch (error) {
            message.error('Error controlling Gateway');
            fetchData(); // Revert on error
        }
    };

    // Render Gateway Card
    const renderGatewayCard = (gateway) => {
        const data = sensorDataMap[gateway.id] || {};
        
        // Check valve status (handle both "OPEN" and "ON")
        const isValveOpen = data.valve_status === 'OPEN' || data.valve_status === 'ON';

        return (
            <Col xs={24} sm={12} lg={8} key={gateway.id}>
                <Card 
                    hoverable
                    style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    styles={{ body: { padding: '20px' } }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 15 }}>
                        <div>
                            <Title level={4} style={{ margin: 0, color: '#1890ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <EnvironmentOutlined /> {gateway.location}
                            </Title>
                            <Text type="secondary" style={{ fontSize: 12 }}>ID: {gateway.client_id}</Text>
                        </div>
                        <Switch 
                            checkedChildren="WATERING" 
                            unCheckedChildren="OFF" 
                            checked={isValveOpen}
                            onChange={(checked) => handleToggleGateway(gateway.id, checked)}
                            style={{ backgroundColor: isValveOpen ? '#52c41a' : undefined }}
                        />
                    </div>

                    <Row gutter={16} style={{ textAlign: 'center' }}>
                        <Col span={12}>
                            <Statistic 
                                title="Độ ẩm đất" 
                                value={data.soil_moisture ?? '--'} 
                                suffix="%" 
                                valueStyle={{ color: '#52c41a', fontWeight: 'bold' }} 
                            />
                        </Col>
                        <Col span={12}>
                            <Statistic 
                                title="Nhiệt độ" 
                                value={data.temperature ?? '--'} 
                                suffix="°C" 
                                valueStyle={{ color: '#faad14', fontWeight: 'bold' }} 
                            />
                        </Col>
                    </Row>
                    
                    <div style={{ marginTop: 15, borderTop: '1px solid #f0f0f0', paddingTop: 10, fontSize: 12, color: '#888', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Độ ẩm không khí: {data.air_humidity ?? '--'}%</span>
                        <span>{data.last_update ? new Date(data.last_update).toLocaleTimeString() : 'No data'}</span>
                    </div>
                </Card>
            </Col>
        );
    };

    return (
        <div>
            <Title level={3} style={{ marginBottom: 20 }}>System Overview</Title>
            
            {/* Summary Statistics */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={12}>
                    <Card bordered={false} style={{background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)'}}>
                        <Statistic 
                            title={<span style={{color: 'white'}}>Khu vực</span>}
                            value={gateways.length} 
                            prefix={<CloudOutlined style={{color: 'white'}}/>} 
                            valueStyle={{ color: 'white', fontWeight: 'bold' }}
                        />
                    </Card>
                </Col>
                <Col span={12}>
                    <Card bordered={false} style={{background: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)'}}>
                        <Statistic 
                            title={<span style={{color: 'white'}}>Đang tưới</span>}
                            value={Object.values(sensorDataMap).filter(d => d.valve_status === 'OPEN' || d.valve_status === 'ON').length} 
                            prefix={<ThunderboltOutlined style={{color: 'white'}} />} 
                            valueStyle={{ color: 'white', fontWeight: 'bold' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Gateway Cards List */}
            {loading ? (
                <div style={{textAlign: 'center', marginTop: 50}}><Spin size="large" tip="Loading data..." /></div>
            ) : (
                gateways.length > 0 ? (
                    <Row gutter={[24, 24]}>
                        {gateways.map(renderGatewayCard)}
                    </Row>
                ) : (
                    <Empty description="No Gateways configured" />
                )
            )}
        </div>
    );
};

export default Dashboard;