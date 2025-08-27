// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://fixify-4s77.onrender.com';

// Helper function to create full API URLs
export const createApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Helper function for making API requests with consistent error handling
export const apiRequest = async (endpoint, options = {}) => {
  const url = createApiUrl(endpoint);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    return response;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Export the base URL for direct use if needed
export { API_BASE_URL };
