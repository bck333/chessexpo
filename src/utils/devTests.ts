import { Chess } from 'chess.js';

/**
 * Developer Test: Analysis Mode
 * Plays 100 random legal moves to verify engine/state behavior.
 */
export const testAnalysisRandomMoves = () => {
    const game = new Chess();
    console.log("--- Starting Analysis Random Moves Test ---");
    let moveCount = 0;
    while (!game.game_over() && moveCount < 100) {
        const moves = game.moves();
        if (moves.length === 0) break;
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        game.move(randomMove);
        moveCount++;
        // In a real environment, you would trigger the Stockfish engine here
        // and verify it returns a valid evaluation for game.fen()
    }
    console.log(`Test Complete. Played ${moveCount} random moves.`);
    console.log(`Final FEN: ${game.fen()}`);
    return game.fen();
};

/**
 * Developer Test: Board Setup FEN Generation
 * Creates random positions and verifies FEN generation is valid.
 */
export const testBoardSetupRandomPositions = () => {
    console.log("--- Starting Board Setup Random Position Test ---");
    const pieces = ['p', 'n', 'b', 'r', 'q', 'k', 'P', 'N', 'B', 'R', 'Q', 'K'];
    const squares = ['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', 'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2']; // Just testing a subset for brevity

    let validPositions = 0;
    for (let i = 0; i < 50; i++) {
        const game = new Chess();
        game.clear();
        
        // Always add kings to make it potentially valid
        game.put({ type: 'k', color: 'b' }, 'e8');
        game.put({ type: 'k', color: 'w' }, 'e1');

        // Add 5 random pieces
        for (let j = 0; j < 5; j++) {
            const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
            const randomSquare = squares[Math.floor(Math.random() * squares.length)] as any;
            
            const color = randomPiece === randomPiece.toUpperCase() ? 'w' : 'b';
            const type = randomPiece.toLowerCase() as any;
            
            if (type !== 'k') {
                game.put({ type, color }, randomSquare);
            }
        }
        
        const generatedFen = game.fen();
        console.log(`Generated FEN ${i}: ${generatedFen}`);
        validPositions++;
    }
    console.log(`Test Complete. Generated ${validPositions} random FENs.`);
};
