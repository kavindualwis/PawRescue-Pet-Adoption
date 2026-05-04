import api from './authService';

export const rescueService = {
  reportRescueCase: async (rescueData: any) => {
    try {
      const response = await api.post('/rescues', rescueData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAllRescueCases: async (status?: string) => {
    try {
      const response = await api.get('/rescues', {
        params: { status }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getRescueCaseById: async (id: string) => {
    try {
      const response = await api.get(`/rescues/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateRescueStatus: async (id: string, updateData: any) => {
    try {
      const response = await api.put(`/rescues/${id}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateRescueCase: async (id: string, updateData: any) => {
    try {
      const response = await api.put(`/rescues/${id}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteRescueCase: async (id: string) => {
    try {
      const response = await api.delete(`/rescues/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
