import axios from "axios";

// Prefer relative '/api' so Vite dev proxy and Vercel rewrites both work without extra config.
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true, // Important for CORS with credentials
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log for debugging in production
    if (import.meta.env.MODE === "production") {
      console.log("API Request:", {
        url: config.url,
        method: config.method,
        hasToken: !!token,
      });
    }
    return config;
  },
  (error) => {
    // Log detailed error for debugging
    if (
      import.meta.env.MODE === "production" &&
      error.response?.status === 401
    ) {
      console.error("401 Error Details:", {
        url: error.config?.url,
        message: error.response?.data?.message,
        hasAuthHeader: !!error.config?.headers?.Authorization,
      });
    }

    return Promise.reject(error);
  },
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only logout if it's an auth-related endpoint or explicit authentication failure
      // Don't logout on AI timeouts or other transient errors
      const isAuthEndpoint = error.config?.url?.includes("/auth/");
      const isAuthError =
        error.response?.data?.message?.toLowerCase().includes("token") ||
        error.response?.data?.message?.toLowerCase().includes("unauthorized");

      if (isAuthEndpoint || isAuthError) {
        // Token expired or invalid
        localStorage.removeItem("authToken");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// API service object
export const api = {
  // Set auth token
  setAuthToken: (token) => {
    if (token) {
      axiosInstance.defaults.headers.Authorization = `Bearer ${token}`;
    }
  },

  // Remove auth token
  removeAuthToken: () => {
    delete axiosInstance.defaults.headers.Authorization;
  },

  // Auth endpoints
  auth: {
    login: (data) => axiosInstance.post("/auth/login", data),
    register: (data) => axiosInstance.post("/auth/register", data),
    getCurrentUser: () => axiosInstance.get("/auth/me"),
  },

  // User endpoints
  users: {
    getProfile: (userId) => axiosInstance.get(`/users/profile/${userId || ""}`),
    updateProfile: (data) => axiosInstance.put("/users/profile", data),
    uploadProfilePicture: (file) => {
      const formData = new FormData();
      formData.append("profilePicture", file);
      return axiosInstance.post("/users/profile-picture", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    changePassword: (data) =>
      axiosInstance.post("/users/change-password", data),
    updateNotifications: (enabled) =>
      axiosInstance.put("/users/notifications", { enabled }),
    deleteAccount: () => axiosInstance.delete("/users/delete"),
    searchUsers: (params) => axiosInstance.get("/users/search", { params }),
    getStats: () => axiosInstance.get("/users/stats"),
  },

  // Ideas endpoints
  ideas: {
    getIdeas: (params) => axiosInstance.get("/ideas", { params }),
    getIdea: (id) => axiosInstance.get(`/ideas/${id}`),
    createIdea: (data) => axiosInstance.post("/ideas", data),
    uploadFiles: (ideaId, files) => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      return axiosInstance.post(`/ideas/${ideaId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    editIdea: (id, data) => axiosInstance.put(`/ideas/${id}`, data),
    likeIdea: (id) => axiosInstance.post(`/ideas/${id}/like`),
    addComment: (id, data) => axiosInstance.post(`/ideas/${id}/comments`, data),
    requestCollaboration: (id) =>
      axiosInstance.post(`/ideas/${id}/collaborate`),
  },

  // Investor endpoints
  investors: {
    getLeaderboard: (params) =>
      axiosInstance.get("/investors/leaderboard", { params }),
    getSectorRoom: (sector, params) =>
      axiosInstance.get(`/investors/rooms/${sector}`, { params }),
    makeInvestment: (ideaId, data) =>
      axiosInstance.post(`/investors/invest/${ideaId}`, data),
    getMyInvestments: () => axiosInstance.get("/investors/my-investments"),
  },

  // Chat endpoints
  chat: {
    getChats: () => axiosInstance.get("/chat"),
    createChat: (data) => axiosInstance.post("/chat/create", data),
    getMessages: (chatId, params) =>
      axiosInstance.get(`/chat/${chatId}/messages`, { params }),
    sendMessage: (chatId, data) =>
      axiosInstance.post(`/chat/${chatId}/messages`, data),
    markAsRead: (chatId) => axiosInstance.post(`/chat/${chatId}/read`),
  },

  // Notification endpoints
  notifications: {
    getNotifications: (params) =>
      axiosInstance.get("/notifications", { params }),
    markAsRead: (id) => axiosInstance.patch(`/notifications/${id}/read`),
    markAllAsRead: () => axiosInstance.patch("/notifications/read-all"),
    deleteNotification: (id) => axiosInstance.delete(`/notifications/${id}`),
    updateFCMToken: (token) =>
      axiosInstance.post("/notifications/fcm-token", { token }),
  },

  // AI endpoints (with extended timeout)
  ai: {
    chat: (data) => axiosInstance.post("/ai/chat", data, { timeout: 60000 }), // 60 second timeout for AI
    getImpactScore: (data) =>
      axiosInstance.post("/ai/impact-score", data, { timeout: 60000 }),
  },
};

// Utility functions for handling API responses
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error
    return error.response.data.message || "An error occurred";
  } else if (error.request) {
    // Network error
    return "Network error. Please check your connection.";
  } else {
    // Other error
    return "An unexpected error occurred";
  }
};

export const createFormData = (data) => {
  const formData = new FormData();

  Object.keys(data).forEach((key) => {
    if (data[key] !== null && data[key] !== undefined) {
      if (Array.isArray(data[key])) {
        data[key].forEach((item) => formData.append(key, item));
      } else {
        formData.append(key, data[key]);
      }
    }
  });

  return formData;
};

export default api;
