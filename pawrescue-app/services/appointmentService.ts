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

export const appointmentService = {
  /** Book an appointment for a pet */
  async bookAppointment(petId: string, appointmentDate: string, location: string) {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/appointments`, {
      method: "POST",
      headers,
      body: JSON.stringify({ petId, appointmentDate, location }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to book appointment");
    return data;
  },

  /** Get all appointments for the current user */
  async getMyAppointments() {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/appointments`, { headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to fetch appointments");
    return data;
  },

  /** Update an appointment (schedule or status) */
  async updateAppointment(id: string, updates: { appointmentDate?: string; location?: string; status?: string }) {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to update appointment");
    return data;
  },

  /** Cancel an appointment */
  async cancelAppointment(id: string) {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
      method: "DELETE",
      headers,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to cancel appointment");
    return data;
  },

  /** Delete an appointment (permanently removes it) */
  async deleteAppointment(id: string) {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/delete`, {
      method: "DELETE",
      headers,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to delete appointment");
    return data;
  },
};
