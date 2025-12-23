const Gateway = require('../models/GatewayModel');

exports.getAllGateways = async (req, res) => {
    try {
        const gateways = await Gateway.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json({ status: 'success', data: gateways });
    } catch (error) { res.status(500).json({ message: 'Lỗi server.' }); }
};

exports.createGateway = async (req, res) => {
    try {
        // 👇 Nhận thêm threshold và duration
        const { client_id, location, description, min_moisture_threshold, max_watering_duration } = req.body;
        
        if (!client_id) return res.status(400).json({ message: 'Thiếu Gateway ID' });

        const newGateway = await Gateway.create({
            client_id, location, description,
            min_moisture_threshold: min_moisture_threshold || 30,
            max_watering_duration: max_watering_duration || 60,
            status: 'OFFLINE'
        });
        res.status(201).json({ status: 'success', data: newGateway });
    } catch (error) { res.status(500).json({ message: 'Lỗi tạo Gateway.' }); }
};

exports.updateGateway = async (req, res) => {
    try {
        const { id } = req.params;
        const gateway = await Gateway.findByPk(id);
        if (!gateway) return res.status(404).json({ message: 'Gateway không tồn tại' });

        await gateway.update(req.body);
        res.status(200).json({ status: 'success', message: 'Cập nhật thành công', data: gateway });
    } catch (error) { res.status(500).json({ message: 'Lỗi cập nhật.' }); }
};

exports.deleteGateway = async (req, res) => {
    try {
        const { id } = req.params;
        await Gateway.destroy({ where: { id } });
        res.status(200).json({ status: 'success', message: 'Đã xóa Gateway' }); 
    } catch (error) { res.status(500).json({ message: 'Lỗi xóa Gateway.' }); }
};