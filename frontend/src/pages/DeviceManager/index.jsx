import React, { useState, useEffect } from 'react';
import { 
    Table, Card, Button, Modal, Form, Input, 
    InputNumber, Tag, Space, message, Tooltip, 
    Popconfirm, Row, Col, Statistic, Switch, Select, Divider 
} from 'antd';
import { 
    PlusOutlined, DeleteOutlined, EditOutlined, 
    AppstoreOutlined, EyeOutlined, PoweroffOutlined, 
    FormatPainterOutlined 
} from '@ant-design/icons';
import axiosClient from '../../services/axiosClient';
// import { socketService } from '../../services/socketService'; // Uncomment if you want realtime updates

// Helper function to generate time options (00:00 -> 23:30)
const generateTimeOptions = () => {
    const options = [];
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0');
        options.push({ value: `${hour}:00`, label: `${hour}:00` });
        options.push({ value: `${hour}:30`, label: `${hour}:30` });
    }
    return options;
};

const timeOptions = generateTimeOptions();

const DeviceManager = () => {
    const [gateways, setGateways] = useState([]);
    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [isGatewayModalOpen, setIsGatewayModalOpen] = useState(false);
    const [isNodesModalOpen, setIsNodesModalOpen] = useState(false);
    const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);
    
    const [editingGateway, setEditingGateway] = useState(null);
    const [selectedGatewayForNodes, setSelectedGatewayForNodes] = useState(null);

    const [gatewayForm] = Form.useForm();
    const [addNodeForm] = Form.useForm();

    // 1. Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [gwRes, nodesRes] = await Promise.all([
                axiosClient.get('/data/gateways'),
                axiosClient.get('/data/nodes')
            ]);
            setGateways(gwRes.data?.data || []);
            setNodes(nodesRes.data?.data || []);
        } catch (error) { 
            console.error(error);
            message.error('Lỗi tải dữ liệu');
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => {
        fetchData();
        // socketService.on('new_sensor_data', fetchData); 
        // return () => socketService.off('new_sensor_data');
    }, []);

    // 2. Logic Handlers
    const handleSaveGateway = async (values) => {
        try {
            if (editingGateway) {
                await axiosClient.put(`/config/gateway/${editingGateway.id}`, values);
                message.success('Cập nhật Gateway thành công!');
            } else {
                await axiosClient.post('/config/gateway', values);
                message.success('Thêm Gateway thành công!');
            }
            setIsGatewayModalOpen(false);
            gatewayForm.resetFields();
            fetchData();
        } catch (error) {
            message.error('Lỗi lưu Gateway');
        }
    };

    const handleDeleteGateway = async (id) => {
        try {
            await axiosClient.delete(`/config/gateway/${id}`);
            message.success('Đã xóa Gateway');
            fetchData();
        } catch (error) {
            message.error('Lỗi xóa Gateway');
        }
    };

    const handleCreateNode = async (values) => {
        try {
            await axiosClient.post('/config/node', { 
                ...values, 
                gateway_id: selectedGatewayForNodes.id 
            });
            message.success('Thêm Node thành công!');
            setIsAddNodeModalOpen(false);
            addNodeForm.resetFields();
            fetchData();
        } catch (error) {
            message.error('Lỗi thêm Node');
        }
    };

    const handleDeleteNode = async (id) => {
        try {
            await axiosClient.delete(`/config/node/${id}`);
            message.success('Đã xóa Node');
            fetchData();
        } catch (error) {
            message.error('Lỗi xóa Node');
        }
    };

    // --- GATEWAY CONTROL (Valve Open/Close) ---
    const handleToggleGatewayValve = async (gatewayId, command) => {
        try {
            message.loading({ content: `Đang gửi lệnh ${command}...`, key: 'valve_control' });
            await axiosClient.post(`/control/gateway/${gatewayId}/valve`, { command });
            message.success({ content: `Đã gửi lệnh ${command} thành công!`, key: 'valve_control' });
        } catch (error) {
            message.error({ content: 'Lỗi gửi lệnh điều khiển', key: 'valve_control' });
        }
    };

    // --- NODE CONTROL (Active/Inactive) ---
    const handleToggleNodeActive = async (nodeId, currentStatus) => {
        try {
            await axiosClient.post(`/control/node/${nodeId}/active`, { isActive: !currentStatus });
            message.success(`Đã cập nhật trạng thái Node`);
            fetchData();
        } catch (error) {
            message.error('Lỗi cập nhật trạng thái Node');
        }
    };

    // 3. Table Columns Configuration
    const gatewayColumns = [
        { title: 'STT', width: 50, align: 'center', render: (t, r, i) => i + 1 },
        { title: 'Tên Khu Vực', dataIndex: 'location', render: t => <b>{t}</b> },
        { title: 'Topic ID', dataIndex: 'client_id' },
        { 
            title: 'Lịch tưới (Giờ)', 
            dataIndex: 'watering_schedule', 
            width: 200,
            render: (schedules) => (
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px'}}>
                    {schedules && schedules.length > 0 
                        ? schedules.map(time => <Tag color="blue" key={time}>{time}</Tag>) 
                        : <span style={{color: '#ccc'}}>Chưa cài</span>
                    }
                </div>
            )
        },
        { 
            title: 'Điều khiển (Van)', 
            align: 'center',
            render: (_, r) => (
                <Space>
                    <Button 
                        type="primary" 
                        size="small"
                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                        icon={<FormatPainterOutlined />}
                        onClick={(e) => { e.stopPropagation(); handleToggleGatewayValve(r.id, 'OPEN'); }}
                    >
                        Mở
                    </Button>
                    <Button 
                        danger 
                        size="small"
                        icon={<PoweroffOutlined />}
                        onClick={(e) => { e.stopPropagation(); handleToggleGatewayValve(r.id, 'CLOSE'); }}
                    >
                        Đóng
                    </Button>
                </Space>
            )
        },
        { 
            title: 'Hành động', 
            align: 'center',
            width: 140,
            render: (_, r) => (
                <Space onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Xem Nodes"><Button icon={<EyeOutlined />} onClick={() => { setSelectedGatewayForNodes(r); setIsNodesModalOpen(true); }} /></Tooltip>
                    <Tooltip title="Sửa"><Button icon={<EditOutlined />} onClick={() => { setEditingGateway(r); gatewayForm.setFieldsValue(r); setIsGatewayModalOpen(true); }} /></Tooltip>
                    <Popconfirm title="Xóa?" onConfirm={() => handleDeleteGateway(r.id)}><Button danger icon={<DeleteOutlined />} /></Popconfirm>
                </Space>
            )
        }
    ];

    const nodeColumnsInsideModal = [
        { title: 'Node EUI', dataIndex: 'device_eui', render: t => <Tag color="purple">{t}</Tag> },
        { 
            title: 'Trạng thái', 
            align: 'center', 
            dataIndex: 'is_active', 
            render: (isActive) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Đang chạy' : 'Đã tắt'}</Tag> 
        },
        {
            title: 'Bật / Tắt',
            align: 'center',
            render: (_, r) => (
                <Switch 
                    checkedChildren={<PoweroffOutlined />}
                    unCheckedChildren={<PoweroffOutlined />}
                    checked={r.is_active}
                    onChange={() => handleToggleNodeActive(r.id, r.is_active)}
                />
            )
        },
        { 
            title: 'Xóa', 
            align: 'center', 
            render: (_, r) => <Popconfirm title="Xóa Node?" onConfirm={() => handleDeleteNode(r.id)}><Button danger size="small" icon={<DeleteOutlined />} /></Popconfirm>
        }
    ];

    const nodesOfSelectedGateway = selectedGatewayForNodes ? nodes.filter(n => n.gateway_id === selectedGatewayForNodes.id) : [];

    return (
        <div className="device-manager-page">
            <Card bordered={false} style={{ marginBottom: 16 }}>
                 <Row justify="space-between" align="middle">
                    <Col>
                         <Space align="center">
                            <AppstoreOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                            <h2 style={{ margin: 0 }}>Quản Lý Hệ Thống Tưới</h2>
                        </Space>
                    </Col>
                    <Col>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingGateway(null); gatewayForm.resetFields(); setIsGatewayModalOpen(true); }}>
                            Thêm Khu Vực (Gateway)
                        </Button>
                    </Col>
                 </Row>
            </Card>

            <Card bordered={false} bodyStyle={{padding: '12px'}}>
                <Table 
                    columns={gatewayColumns} 
                    dataSource={gateways} 
                    rowKey="id" 
                    loading={loading} 
                    onRow={(record) => ({ 
                        onClick: () => { setSelectedGatewayForNodes(record); setIsNodesModalOpen(true); }, 
                        style: { cursor: 'pointer' } 
                    })} 
                />
            </Card>

            {/* MODAL GATEWAY */}
            <Modal title={editingGateway ? "Sửa Gateway" : "Thêm Gateway"} open={isGatewayModalOpen} onCancel={() => setIsGatewayModalOpen(false)} footer={null}>
                <Form form={gatewayForm} layout="vertical" onFinish={handleSaveGateway}>
                    <Form.Item name="client_id" label="Topic ID" rules={[{ required: true }]}><Input disabled={!!editingGateway} /></Form.Item>
                    <Form.Item name="location" label="Tên Khu Vực / Vị trí" rules={[{ required: true }]}><Input /></Form.Item>
                    
                    {/* 👇 UPDATED TIME SELECTION WITH VALIDATION 👇 */}
                    <Form.Item 
                        name="watering_schedule" 
                        label="Lịch tưới tự động (HH:mm)" 
                        tooltip="Chọn giờ từ danh sách hoặc nhập giờ (ví dụ 07:15) rồi nhấn Enter"
                        rules={[
                            {
                                validator: (_, value) => {
                                    if (!value || value.length === 0) return Promise.resolve();
                                    
                                    // Regex validates 24-hour format HH:mm
                                    // ^([0-1]?[0-9]|2[0-3]): Checks hours 00-23
                                    // [0-5][0-9]$: Checks minutes 00-59
                                    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                                    
                                    // Find invalid time entries
                                    const invalidTimes = value.filter(time => !timeRegex.test(time));
                                    
                                    if (invalidTimes.length > 0) {
                                        return Promise.reject(new Error(`Giờ không hợp lệ: ${invalidTimes.join(', ')} (Đúng dạng: 15:30)`));
                                    }
                                    return Promise.resolve();
                                }
                            }
                        ]}
                    >
                        <Select
                            mode="tags" 
                            style={{ width: '100%' }} 
                            placeholder="Chọn giờ (VD: 07:00, 17:30)"
                            tokenSeparators={[',']}
                            options={timeOptions} // Use generated options here
                            notFoundContent={null}
                        />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                             <Form.Item name="min_moisture_threshold" label="Ngưỡng ẩm (%)" initialValue={30} tooltip="Dưới mức này sẽ tưới (khi đến giờ)"><InputNumber min={0} max={100} style={{width:'100%'}} /></Form.Item>
                        </Col>
                        <Col span={12}>
                             <Form.Item name="max_watering_duration" label="Thời gian tưới (s)" initialValue={60}><InputNumber min={10} style={{width:'100%'}} /></Form.Item>
                        </Col>
                    </Row>

                    <Button type="primary" htmlType="submit" block>Lưu Cấu Hình</Button>
                </Form>
            </Modal>

            {/* MODAL NODE LIST */}
            <Modal title={`Danh sách Node: ${selectedGatewayForNodes?.location}`} open={isNodesModalOpen} onCancel={() => setIsNodesModalOpen(false)} footer={null} width={700}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Statistic title="Tổng số Node" value={nodesOfSelectedGateway.length} valueStyle={{fontSize: 18, fontWeight: 'bold'}} />
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddNodeModalOpen(true)}>Thêm Node Mới</Button>
                </div>
                <Table dataSource={nodesOfSelectedGateway} columns={nodeColumnsInsideModal} rowKey="id" pagination={false} size="small" bordered />
            </Modal>

            {/* MODAL ADD NODE */}
            <Modal title="Thêm Node Mới" open={isAddNodeModalOpen} onCancel={() => setIsAddNodeModalOpen(false)} footer={null} width={400} zIndex={1002}>
                <Form form={addNodeForm} layout="vertical" onFinish={handleCreateNode}>
                    <Form.Item name="device_eui" label="Mã Node (EUI)" rules={[{ required: true }]}><Input placeholder="Nhập mã thiết bị..." /></Form.Item>
                    <Button type="primary" htmlType="submit" block>Thêm Node</Button>
                </Form>
            </Modal>
        </div>
    );
};

export default DeviceManager;