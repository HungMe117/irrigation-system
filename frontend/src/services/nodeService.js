import axiosClient from './axiosClient';

const nodeService = {
    getAll: () => {
        return axiosClient.get('/config/nodes'); 
    },

    // Gọi API tưới thủ công
    // URL: /api/v1/config/control/valve/{id}
    manualWatering: (nodeId, duration) => {
        return axiosClient.post(`/config/control/valve/${nodeId}`, {
            duration_seconds: duration
        });
    }
};

export default nodeService;