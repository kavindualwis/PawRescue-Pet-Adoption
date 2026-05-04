import api from './authService';

export const campaignService = {
  createCampaign: async (campaignData: any) => {
    try {
      const response = await api.post('/campaigns', campaignData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAllCampaigns: async (params?: { status?: string; category?: string; petId?: string }) => {
    try {
      const response = await api.get('/campaigns', {
        params
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCampaignById: async (id: string) => {
    try {
      const response = await api.get(`/campaigns/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateProgress: async (id: string, amount: number) => {
    try {
      const response = await api.put(`/campaigns/${id}/progress`, { amount });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateCampaign: async (id: string, updateData: any) => {
    try {
      const response = await api.put(`/campaigns/${id}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteCampaign: async (id: string) => {
    try {
      const response = await api.delete(`/campaigns/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
