import apiClient from './client';

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Difficulty {
  id: string;
  name: string;
  level: number;
  description: string;
}

export interface Puzzle {
  id: string;
  rating: number;
  plays: number;
  solution: string[];
  themes: string[];
  fen: string;
  lastMove: string;
  title: string;
  description: string;
  difficulty: string;
}

export const puzzleApi = {
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get('/categories');
    return response.data;
  },

  getDifficulties: async (): Promise<Difficulty[]> => {
    const response = await apiClient.get('/difficulties');
    return response.data;
  },

  list: async (params: { page?: number; limit?: number; category_id?: string; difficulty?: string }) => {
    const response = await apiClient.get('/puzzles', { params });
    return response.data;
  },

  getDaily: async (): Promise<Puzzle> => {
    const response = await apiClient.get('/puzzles/daily');
    return response.data.puzzle;
  },

  solve: async (id: string) => {
    const response = await apiClient.post(`/puzzles/${id}/solve`);
    return response.data;
  },
};
