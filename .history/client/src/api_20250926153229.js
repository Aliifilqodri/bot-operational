// src/api.js

import axios from 'axios';

// Buat instance Axios
const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Sesuaikan dengan base URL backend Anda
});

// Tambahkan interceptor untuk setiap request yang keluar
api.interceptors.request.use(
  (config) => {
    // Ambil token dari localStorage
    const token = localStorage.getItem('token');

    // Jika token ada, tambahkan ke header Authorization
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    // Lakukan sesuatu jika ada error pada request
    return Promise.reject(error);
  }
);

export default api;