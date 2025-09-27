// file: client/src/api.js

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

// Interceptor untuk MENAMBAHKAN token ke setiap request
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Interceptor untuk MENANGANI error dari setiap response
api.interceptors.response.use(
  (response) => response, // Jika response sukses, langsung teruskan
  (error) => {
    // Cek jika error adalah 401 (Unauthorized / token tidak valid)
    if (error.response && error.response.status === 401) {
      console.log("Sesi kedaluwarsa, logout otomatis...");
      localStorage.removeItem('token'); // Hapus token lama yang salah
      // Arahkan paksa ke halaman login
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default api;