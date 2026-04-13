import apiClient from './client';

export interface AnalysisResponse {
  best_move: string;
  evaluation: number;
  continuation: string[];
  depth: number;
  mate_in: number;
  is_mate: boolean;
}

export const analyzePosition = async (fen: string, depth: number = 10, movetime: number = 1000): Promise<AnalysisResponse> => {
  const response = await apiClient.post<AnalysisResponse>('/engine/analyze', {
    fen,
    depth,
    movetime,
  });
  return response.data;
};

export const playMove = async (
  fen: string, 
  level: number = 0, 
  elo: number = 0, 
  depth: number = 0
): Promise<AnalysisResponse> => {
  const response = await apiClient.post<AnalysisResponse>('/engine/play', {
    fen,
    level,
    elo,
    depth,
    movetime: 1000, // Reasonable buffer for play
  });
  return response.data;
};

const engineService = {
  analyzePosition,
  playMove,
};

export default engineService;
