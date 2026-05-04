import { API_BASE_URL } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const getToken = async () => {
  return await AsyncStorage.getItem("userToken");
};

const authHeaders = async () => {
  const token = await getToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const adoptionService = {
  /** Submit an adoption request for a pet */
  async createRequest(petId: string, message: string = "") {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/adoptions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ petId, message }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to submit request");
    return data;
  },

  /** Get all requests made BY the current user */
  async getMyRequests() {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/adoptions/my-requests`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to fetch your requests");
    return data;
  },

  /** Get all requests received by the current user (as pet owner) */
  async getOwnerRequests() {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/adoptions/owner-requests`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to fetch owner requests");
    return data;
  },

  /** Get pending request count for badge display */
  async getPendingCount() {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/adoptions/pending-count`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to fetch count");
    return data;
  },

  /** Check if current user already requested a specific pet */
  async checkRequest(petId: string) {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/adoptions/check/${petId}`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to check request");
    return data;
  },

  /** Approve or reject a request (owner only) */
  async updateStatus(requestId: string, status: string) {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/adoptions/${requestId}/status`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to update status");
    return data;
  },

  /** Cancel a pending request (requester only) */
  async cancelRequest(requestId: string) {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/adoptions/${requestId}`, {
      method: "DELETE",
      headers,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to cancel request");
    return data;
  },

  /** Update an existing request message (requester only) */
  async updateRequest(requestId: string, message: string) {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/adoptions/${requestId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ message }),
    });
    
    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Server Error: ${response.status} ${response.statusText}\n${text.substring(0, 100)}`);
    }

    if (!response.ok) throw new Error(data.message || "Failed to update request");
    return data;
  },
};
