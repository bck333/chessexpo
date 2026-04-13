import { BoardTheme, PieceSet, GameOptions } from '../context/ThemeContext';
import { ColorThemeType } from '../constants/theme';

interface BoardConfig {
    orientation: 'white' | 'black';
    fen: string;
    showLegalMoves?: boolean;
    draggable?: boolean;
    dropOffBoard?: 'snapback' | 'trash';
    sparePieces?: boolean;
    mode?: 'playing' | 'setup';
}

const BOARD_THEMES: Record<BoardTheme, { light: string; dark: string }> = {
    classic: { light: '#f0d9b5', dark: '#b58863' },
    emerald: { light: '#ebecd0', dark: '#779556' },
    ocean: { light: '#dee3e6', dark: '#8ca2ad' },
    charcoal: { light: '#d5d5d5', dark: '#888888' },
    wood: { light: '#dcb35c', dark: '#926432' },
};

const PIECE_SETS: Record<PieceSet, string> = {
    wikipedia: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
    alpha: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/alpha/{piece}.png',
    neo: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/neo/{piece}.png',
    cburnett: 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/{piece}.png',
};

export const getChessboardHtml = (
    config: BoardConfig,
    colors: ColorThemeType,
    boardTheme: BoardTheme,
    pieceSet: PieceSet,
    gameOptions: GameOptions
) => {
    const theme = BOARD_THEMES[boardTheme] || BOARD_THEMES.classic;
    const pieceUrl = PIECE_SETS[pieceSet] || PIECE_SETS.wikipedia;
    const isSetup = config.mode === 'setup';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.css">
  <script src="https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>
  <style>
    body { 
        margin: 0; 
        padding: 0; 
        background-color: ${colors.background}; 
        overflow: hidden; 
        transition: background-color 0.3s; 
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
    }
    #board { 
        width: 100vw; 
        height: 100vw; 
        max-width: 100vh; 
        max-height: 100vh; 
        touch-action: none; /* Prevents scrolling while dragging */
        -webkit-user-select: none;
        -webkit-touch-callout: none;
    }
    
    /* Board Theme */
    .white-1e1d7 { background-color: ${theme.light} !important; }
    .black-3c85d { background-color: ${theme.dark} !important; }
    
    /* Highlights */
    .highlight-move { background-color: rgba(247, 247, 105, 0.6) !important; }
    .highlight-check { transition: background-color 0.2s; background-color: rgba(255, 0, 0, 0.4) !important; }
    .highlight-select { background-color: ${colors.primary}60 !important; }

    /* Legal Move Dots */
    .square-55d63 { position: relative; }
    .dot {
        height: 28%;
        width: 28%;
        background-color: rgba(0, 0, 0, 0.12);
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        display: ${!isSetup && gameOptions.showLegalMoves ? 'block' : 'none'};
    }
    .capture-ring {
        height: 85%;
        width: 85%;
        border: 4px solid rgba(0, 0, 0, 0.12);
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        display: ${!isSetup && gameOptions.showLegalMoves ? 'block' : 'none'};
    }
    
    /* Coordinates */
    .notation-322f9 {
        display: ${gameOptions.showCoordinates ? 'block' : 'none'};
        color: ${colors.textMuted};
        font-weight: bold;
        font-size: 10px;
    }
  </style>
</head>
<body>
  <div id="board"></div>
  <script>
    var board = null;
    var game = new Chess();
    var currentFen = '${config.fen}';
    
    // Handle special fen values
    if (currentFen === 'empty') {
        game.clear();
    } else if (currentFen && currentFen !== 'start') {
        try { game.load(currentFen); } catch(e) { console.error('Invalid FEN', currentFen); }
    }

    var $board = $('#board');
    var selectedSquare = null;
    var currentPiece = null;
    var position = {};

    function removeGreyDots () { 
        $('#board .dot').remove(); 
        $('#board .capture-ring').remove(); 
    }
    function greyDot (square) {
      if (!${!isSetup && gameOptions.showLegalMoves}) return;
      var $square = $('#board .square-' + square);
      var piece = game.get(square);
      if (piece) {
        if ($square.find('.capture-ring').length === 0) $square.append('<div class="capture-ring"></div>');
      } else {
        if ($square.find('.dot').length === 0) $square.append('<div class="dot"></div>');
      }
    }
    function removeHighlights () { 
        $board.find('.square-55d63').removeClass('highlight-select'); 
        if (!${!isSetup && gameOptions.highlightLastMove}) {
            $board.find('.square-55d63').removeClass('highlight-move');
        }
    }

    function onSquareClick (square) {
      if (${isSetup}) {
        position = board.position();
        if (!currentPiece) {
          if (position[square]) {
            delete position[square];
            board.position(position, false);
            setTimeout(sendPosition, 10);
          }
          return;
        }
        // If current piece is 'trash', it means we are in remove mode
        if (currentPiece === 'trash') {
          delete position[square];
          board.position(position, false);
          setTimeout(sendPosition, 10);
          return;
        }
        position[square] = currentPiece;
        board.position(position, false);
        setTimeout(sendPosition, 10);
        return;
      }

      var moves = game.moves({ square: square, verbose: true });
      if (selectedSquare === square) {
        selectedSquare = null;
        removeGreyDots();
        removeHighlights();
        return;
      }
      if (selectedSquare) {
        var move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
        if (move === null) {
          if (moves.length > 0 && game.get(square) && game.get(square).color === game.turn()) {
              selectedSquare = square;
              removeGreyDots();
              removeHighlights();
              $board.find('.square-' + square).addClass('highlight-select');
              for (var i = 0; i < moves.length; i++) greyDot(moves[i].to);
          } else {
              selectedSquare = null;
              removeGreyDots();
              removeHighlights();
          }
          return;
        }
        selectedSquare = null;
        removeGreyDots();
        removeHighlights();
        board.position(game.fen());
        updateStatus(move.san, move);
        return;
      }
      if (moves.length === 0) return;
      selectedSquare = square;
      $board.find('.square-' + square).addClass('highlight-select');
      for (var i = 0; i < moves.length; i++) greyDot(moves[i].to);
    }

    function sendPosition() {
      if (!${isSetup}) return;
      var pos = board.position();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'position_update',
        position: pos,
        pieceCount: Object.keys(pos).length
      }));
    }

    function onDragStart (source, piece, position, orientation) {
      if (!${isSetup}) {
        if (game.game_over()) return false;
        if (game.turn() !== piece.charAt(0)) return false;
      }
      removeHighlights();
      selectedSquare = null;
    }

    function onDrop (source, target) {
      removeGreyDots();
      if (${isSetup}) {
        setTimeout(sendPosition, 50);
        return;
      }
      var move = game.move({ from: source, to: target, promotion: 'q' });
      if (move === null) return 'snapback';
      updateStatus(move.san, move);
    }

    function onSnapEnd () { board.position(game.fen()); }

    function updateStatus (lastSan, lastMove) {
      if (${!isSetup && gameOptions.highlightLastMove}) {
          $board.find('.square-55d63').removeClass('highlight-move');
          if (lastMove) {
            $board.find('.square-' + lastMove.from).addClass('highlight-move');
            $board.find('.square-' + lastMove.to).addClass('highlight-move');
          }
      }

      if (${!isSetup && gameOptions.kingInCheckIndicator}) {
          $board.find('.square-55d63').removeClass('highlight-check');
          if (game.in_check()) {
              var turn = game.turn();
              var squares = game.SQUARES;
              for (var i = 0; i < squares.length; i++) {
                  var p = game.get(squares[i]);
                  if (p && p.type === 'k' && p.color === turn) {
                      $board.find('.square-' + squares[i]).addClass('highlight-check');
                      break;
                  }
              }
          }
      }

      var reason = null;
      if (game.in_checkmate()) reason = "Checkmate!";
      else if (game.in_draw()) reason = "Draw";
      else if (game.in_stalemate()) reason = "Stalemate";
      else if (game.in_threefold_repetition()) reason = "Threefold Repetition";

      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        type: 'move', 
        fen: game.fen(), 
        san: lastSan,
        turn: game.turn(),
        isGameOver: game.game_over(),
        gameOverReason: reason
      }));
    }

    function buildFen(pos, turn) {
      var fen = '';
      for (var rank = 8; rank >= 1; rank--) {
        var empty = 0;
        for (var fileIdx = 0; fileIdx < 8; fileIdx++) {
          var file = 'abcdefgh'[fileIdx];
          var sq = file + rank;
          if (pos[sq]) {
            if (empty > 0) { fen += empty; empty = 0; }
            var p = pos[sq];
            var pieceChar = p.charAt(1);
            if (p.charAt(0) === 'w') { fen += pieceChar.toUpperCase(); } else { fen += pieceChar.toLowerCase(); }
          } else { empty++; }
        }
        if (empty > 0) fen += empty;
        if (rank > 1) fen += '/';
      }
      fen += ' ' + turn + ' KQkq - 0 1';
      return fen;
    }

    var config = {
      draggable: ${config.draggable ?? true},
      position: currentFen === 'empty' ? 'clear' : (currentFen === 'start' ? 'start' : currentFen),
      orientation: '${config.orientation}',
      onDragStart: onDragStart,
      onDrop: onDrop,
      onSnapEnd: onSnapEnd,
      onSquareClick: onSquareClick,
      pieceTheme: '${pieceUrl}',
      sparePieces: ${config.sparePieces ?? false},
      dropOffBoard: '${config.dropOffBoard ?? 'snapback'}'
    };
    board = Chessboard('board', config);
    if (${isSetup}) { position = board.position(); }
    
    setTimeout(function() { 
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' })); 
    }, 200);

    window.addEventListener('message', function(event) {
        try {
            var data = JSON.parse(event.data);
            if(data.type === 'engine_move') {
                // Parse UCI move (e.g., "e2e4" or "e7e8q")
                var moveInput = data.move;
                if (typeof moveInput === 'string' && moveInput.length >= 4) {
                    moveInput = {
                        from: moveInput.slice(0, 2),
                        to: moveInput.slice(2, 4),
                        promotion: moveInput.length > 4 ? moveInput.charAt(4) : 'q'
                    };
                }
                
                var move = game.move(moveInput);
                if (move) {
                    board.position(game.fen());
                    updateStatus(move.san, move);
                } else {
                    console.error('Engine sent invalid move:', data.move);
                }
            }
            if(data.type === 'update_theme') {
                document.body.style.backgroundColor = data.colors.background;
            }
            if(data.type === 'reset') {
                game.reset();
                board.start();
                removeHighlights();
                removeGreyDots();
            }
            if(data.type === 'set_fen') {
                game.load(data.fen);
                board.position(data.fen);
                updateStatus();
            }
            if(data.type === 'set_piece') { currentPiece = data.piece; }
            if(data.type === 'clear') {
                position = {};
                board.position({}, false);
                currentPiece = null;
                sendPosition();
            }
            if(data.type === 'start_position') {
                board.start(false);
                position = board.position();
                currentPiece = null;
                sendPosition();
            }
            if(data.type === 'get_fen') {
                var pos = board.position();
                var fen = buildFen(pos, data.turn || 'w');
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'fen_ready', fen: fen }));
            }
        } catch(e) {}
    });
  </script>
</body>
</html>
`;
};
