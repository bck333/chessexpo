import { Chess } from 'chess.js';

/**
 * Converts a list of UCI moves (e.g., ["e2e4", "e7e5"]) to Standard Algebraic Notation (e.g., ["e4", "e5"])
 * @param fen The starting FEN for the move sequence
 * @param uciMoves Array of UCI move strings
 * @returns Array of SAN move strings
 */
export const formatMovesToSAN = (fen: string, uciMoves: string[]): string[] => {
    const game = new Chess(fen);
    const sanMoves: string[] = [];

    for (const uci of uciMoves) {
        try {
            // UCI moves are typically 4-5 chars (e2e4, e7e8q)
            const move = game.move(uci);
            if (move) {
                sanMoves.push(move.san);
            } else {
                // Fallback to raw uci if move is invalid
                sanMoves.push(uci);
            }
        } catch (e) {
            sanMoves.push(uci);
        }
    }

    return sanMoves;
};

/**
 * Formats a single UCI move to SAN
 */
export const toSAN = (fen: string, uci: string): string => {
    const game = new Chess(fen);
    try {
        const move = game.move(uci);
        return move ? move.san : uci;
    } catch {
        return uci;
    }
};
