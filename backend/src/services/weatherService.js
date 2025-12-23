// backend/src/services/weatherService.js

const axios = require('axios');
// Đã được cấu hình trong .env:
const API_KEY = process.env.WEATHER_API_KEY; 
const API_URL = process.env.WEATHER_API_URL; 

/**
 * Lấy dự báo thời tiết cho 24 giờ tới dựa trên tọa độ.
 * Sử dụng API OpenWeatherMap 5-day / 3-hour forecast.
 * @param {number} lat - Vĩ độ (Latitude)
 * @param {number} lon - Kinh độ (Longitude)
 * @returns {object} - { rain_expected_24h: boolean, details: string }
 */
const getForecast = async (lat, lon) => {
    // Kiểm tra API Key
    if (!API_KEY || API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
         console.warn("⚠️ WEATHER_API_KEY chưa được cấu hình. Sử dụng dự báo giả lập.");
         return {
            rain_expected_24h: false,
            details: 'API Key Missing - No rain expected (using fallback).'
        };
    }

    try {
        const response = await axios.get(API_URL, {
            params: {
                lat: lat,
                lon: lon,
                appid: API_KEY,
                units: 'metric' // Đơn vị Celsius
            }
        });

        const forecastList = response.data.list;
        const now = Date.now();
        const tomorrow = now + 24 * 60 * 60 * 1000; // 24 giờ sau

        let rainExpected = false;
        let details = 'Không có mưa đáng kể dự báo trong 24h tới.';

        // Lọc và kiểm tra các dự báo trong 24 giờ tới (8 lần cập nhật)
        for (let i = 0; i < 8 && i < forecastList.length; i++) {
            const forecast = forecastList[i];
            const forecastTime = forecast.dt * 1000; // Chuyển từ Unix timestamp sang ms
            
            if (forecastTime <= tomorrow) {
                // Kiểm tra điều kiện thời tiết (ID < 600 thường là mưa) hoặc trường "rain"
                const weatherId = forecast.weather[0].id;
                
                if (weatherId < 600 || (forecast.rain && forecast.rain['3h'] > 0.5)) {
                    // Cảnh báo nếu dự báo có mưa (> 0.5mm trong 3 giờ)
                    rainExpected = true;
                    details = `Mưa dự báo vào lúc ${new Date(forecastTime).toLocaleTimeString()} (${forecast.weather[0].description}).`;
                    break; 
                }
            }
        }

        return {
            rain_expected_24h: rainExpected,
            details: details
        };

    } catch (error) {
        console.error('❌ Lỗi khi lấy dự báo thời tiết:', error.message);
        // Trả về false để hệ thống không bị dừng và tưới tiêu như bình thường
        return {
             rain_expected_24h: false, 
             details: 'Lỗi API thời tiết, sử dụng trạng thái mặc định (Tưới).'
        };
    }
};

module.exports = { getForecast };
