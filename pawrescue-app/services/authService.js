import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

console.log("[authService] API_BASE_URL:", API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    // Routes that REQUIRE token
    const privateRoutes = ["/auth/me", "/auth/favorites", "/auth/profile"];
    const isPrivateRoute = privateRoutes.some(route => config.url?.startsWith(route));
    
    // If it's NOT a public auth route, add token
    const isPublicAuthRoute = config.url?.startsWith("/auth/") && !isPrivateRoute;
    
    if (!isPublicAuthRoute) {
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    console.log("[authService-interceptor] Request to:", config.baseURL + config.url);
    return config;
  },
  (error) => {
    console.error("[authService-interceptor] Request error:", error);
    return Promise.reject(error);
  }
);

// Log responses
api.interceptors.response.use(
  (response) => {
    console.log("[authService-interceptor] Response from:", response.config.url, "Status:", response.status);
    return response;
  },
  (error) => {
    console.error("[authService-interceptor] Response error from:", error.config?.url);
    console.error("[authService-interceptor] Full URL:", error.config?.baseURL + error.config?.url);
    console.error("[authService-interceptor] Status:", error.response?.status);
    console.error("[authService-interceptor] Error data:", error.response?.data);
    console.error("[authService-interceptor] Error message:", error.message);
    return Promise.reject(error);
  }
);

export const authService = {
  register: async (name, username, email, phoneNumber, password) => {
    try {
      console.log("[authService.register] Registering user:", { name, username, email, phoneNumber });
      const response = await api.post("/auth/register", {
        name,
        username,
        email,
        phoneNumber,
        password,
      });
      console.log("[authService.register] Success:", response.data);
      return response;
    } catch (error) {
      console.error("[authService.register] Error:", error);
      throw error;
    }
  },

  login: async (username, password) => {
    try {
      console.log("[authService.login] Logging in user:", username);
      const response = await api.post("/auth/login", { username, password });
      console.log("[authService.login] Success:", response.data);
      return response;
    } catch (error) {
      console.error("[authService.login] Error:", error);
      throw error;
    }
  },

  checkUsername: async (username) => {
    try {
      console.log("[authService.checkUsername] Checking username:", username);
      const response = await api.post("/auth/check-username", { username });
      console.log("[authService.checkUsername] Success:", response.data);
      return response;
    } catch (error) {
      console.error("[authService.checkUsername] Error:", error);
      throw error;
    }
  },

  getMe: async () => {
    return api.get("/auth/me");
  },

  toggleFavorite: async (petId) => {
    return api.post("/auth/favorites/toggle", { petId });
  },

  getFavorites: async () => {
    return api.get("/auth/favorites");
  },

  logout: async () => {
    await AsyncStorage.removeItem("userToken");
    await AsyncStorage.removeItem("user");
  },

  updateProfile: async (data) => {
    return api.put("/auth/profile", data);
  },
};

export default api;
