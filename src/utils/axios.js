'use client';

/**
 * axios setup to use mock service
 */

import axios from 'axios';

// Usa richieste relative per passare dal proxy di Next (rewrites) ed evitare CORS in dev
const axiosServices = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || '/' });

// ==============================|| AXIOS - FOR MOCK SERVICES ||============================== //

axiosServices.interceptors.request.use(
  async (config) => {
    // Preferisci i token Cognito reali salvati da useAuthTokens
    const idToken = localStorage.getItem('cognito_id_token');
    const accessToken = localStorage.getItem('cognito_access_token');
    const token = idToken || accessToken || localStorage.getItem('serviceToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosServices.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && !window.location.href.includes('/login')) {
      window.location.pathname = '/login';
    }
    return Promise.reject((error?.response && error.response.data) || error?.message || 'Wrong Services');
  }
);

export default axiosServices;

export async function fetcher(args) {
  const [url, config] = Array.isArray(args) ? args : [args];

  const res = await axiosServices.get(url, { ...config });

  return res.data;
}
