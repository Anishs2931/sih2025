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
  getUserIssues: (userEmail) => api.get(`/issue/user/${encodeURIComponent(userEmail)}`),
  getIssueById: (issueId) => api.get(`/issue/${issueId}`),
  getAnalytics: (params) => api.get('/issue/analytics', { params }),
  // Helper function to get image URL
  getImageUrl: (pictureId) => {
    const imageUrl = `${BASE_URL}/issue/image/${pictureId}`;
    console.log('Getting image URL for pictureId:', pictureId, '-> URL:', imageUrl);
    return imageUrl;
  },
};

// User API calls
export const userAPI = {
  getProfile: (userId) => api.get(`/userData/${userId}`),
  updateProfile: (userId, userData) => api.put(`/userData/${userId}`, userData),
};

// Location API calls
export const locationAPI = {
  getMunicipality: (coordinates) => api.post('/location/get-municipality', coordinates),
  getLocationByIP: () => api.get('/location/get-location-by-ip'),
};

export default api;
