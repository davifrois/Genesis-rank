import axios from 'axios';

const api = axios.create({
  baseURL: "" || 'http://localhost:8080'
});

api.interceptors.request.use(config => {
    config.headers['ngrok-skip-browser-warning'] = 'true';
    return config;
});

export const checkConnection = async () => {
    try {
        await api.get('/', { timeout: 3000 });
        return true;
    } catch (error) {
        // Assume offline if it times out or network error
        return false;
    }
};

export default api;
