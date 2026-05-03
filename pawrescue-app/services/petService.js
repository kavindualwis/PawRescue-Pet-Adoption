import api from "./authService";

export const petService = {
  async getAllPets(filters = {}) {
    try {
      const response = await api.get("/pets", {
        params: filters
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getPetById(petId) {
    try {
      const response = await api.get(`/pets/${petId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getCategories() {
    try {
      const response = await api.get("/categories");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async initializeCategories() {
    try {
      const response = await api.post("/categories/initialize");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async createPet(petData) {
    try {
      const response = await api.post("/pets", petData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updatePet(petId, petData) {
    try {
      const response = await api.put(`/pets/${petId}`, petData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async deletePet(petId) {
    try {
      const response = await api.delete(`/pets/${petId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getPetsByUser(userId) {
    try {
      const response = await api.get(`/pets/user/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
