import api from "./authService";

export const shelterService = {
  /** Get all shelters */
  async getShelters() {
    try {
      const response = await api.get("/shelters");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /** Get a single shelter with its pets */
  async getShelterById(id: string) {
    try {
      const response = await api.get(`/shelters/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /** Create a new shelter */
  async createShelter(shelterData: any) {
    try {
      const response = await api.post("/shelters", shelterData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /** Update a shelter */
  async updateShelter(id: string, shelterData: any) {
    try {
      const response = await api.put(`/shelters/${id}`, shelterData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /** Delete a shelter */
  async deleteShelter(id: string) {
    try {
      const response = await api.delete(`/shelters/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
