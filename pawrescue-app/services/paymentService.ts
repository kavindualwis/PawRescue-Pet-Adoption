import axios from 'axios';
import { API_BASE_URL } from './config';

export const paymentService = {
  getPaymentParams: async (campaignId: string, amount: number, donorName: string, donorEmail: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/payments/params`, {
        campaignId,
        amount,
        donorName,
        donorEmail
      });
      return response.data;
    } catch (error) {
      console.error('Error getting payment params:', error);
      throw error;
    }
  },
};
