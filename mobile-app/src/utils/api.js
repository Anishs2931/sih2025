import axios from 'axios';

// Replace with your backend URL - Update this to your computer's IP address
const BASE_URL = 'http://192.168.1.4:3000/api'; // Update IP address as needed

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
};

// Issue API calls
export const issueAPI = {
  reportIssue: (issueData) => api.post('/issue/add', issueData),
  detectIssue: (imageData) => api.post('/issue/detect', imageData),
  getAllIssues: () => api.get('/issue/all'),
};

// User API calls
export const userAPI = {
  getProfile: (userId) => api.get(`/userData/${userId}`),
  updateProfile: (userId, userData) => api.put(`/userData/${userId}`, userData),
};

// Technician API calls
export const technicianAPI = {
  assignTechnician: (issueId) => api.post('/technician/assign', { issueId }),
  getTechnicianLocation: (technicianId) => api.get(`/technician/location/${technicianId}`),
};

export default api;
