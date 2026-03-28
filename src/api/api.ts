import axios from 'axios';

const api = axios.create({
    // Mengambil URL dari file .env
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
});

// Tambahkan Interceptor untuk otomatis menyertakan Token di setiap request
api.interceptors.request.use((config: any) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error: any) => {
    return Promise.reject(error);
});

export default api;