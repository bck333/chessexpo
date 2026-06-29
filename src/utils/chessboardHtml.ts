import { BoardTheme, PieceSet, GameOptions } from '../context/ThemeContext';
import { ColorThemeType } from '../constants/theme';
import { JQUERY_JS, CHESSBOARD_JS, CHESSBOARD_CSS, CHESS_JS } from './chessboardLibraries';

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
    /* Commented out for now
    alpha: 'https://lichess1.org/assets/piece/alpha/{piece}.svg',
    neo: 'https://lichess1.org/assets/piece/neo/{piece}.svg',
    cburnett: 'https://lichess1.org/assets/piece/cburnett/{piece}.svg',
    */
    alpha: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
    neo: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
    cburnett: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
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
  <meta charset="utf-8" />
  <script>
    // Console bridge - forward all console output to React Native
    (function() {
      var origLog = console.log;
      var origError = console.error;
      var origWarn = console.warn;
      function send(level, args) {
        try {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'console',
              level: level,
              message: Array.prototype.slice.call(args).map(function(a) {
                return typeof a === 'object' ? JSON.stringify(a) : String(a);
              }).join(' ')
            }));
          }
        } catch(e) {}
      }
      console.log = function() { send('log', arguments); origLog.apply(console, arguments); };
      console.error = function() { send('error', arguments); origError.apply(console, arguments); };
      console.warn = function() { send('warn', arguments); origWarn.apply(console, arguments); };
      window.onerror = function(msg, url, line, col, err) {
        send('error', ['WINDOW_ERROR: ' + msg + ' at line ' + line]);
      };
    })();
  </script>
  <style>${CHESSBOARD_CSS}</style>
  <script>${JQUERY_JS}</script>
  <script>${CHESSBOARD_JS}</script>
  <script>${CHESS_JS}</script>
  <style>
    * { touch-action: none; -webkit-touch-callout: none; -webkit-user-select: none; }
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
        touch-action: none;
        -webkit-overflow-scrolling: auto;
    }
    #boardContainer {
        width: 100vw;
        touch-action: none;
    }
    #board { 
        width: 100%; 
        touch-action: none; 
        -webkit-user-select: none;
        -webkit-touch-callout: none;
    }
    
    /* Board Theme */
    .white-1e1d7 { background-color: ${theme.light} !important; }
    .black-3c85d { background-color: ${theme.dark} !important; }
    
    /* Better Piece Rendering */
    .square-55d63 .piece-417db {
        width: 100% !important;
        height: 100% !important;
    }
    
    /* Highlights */
    .highlight-move { background-color: rgba(247, 247, 105, 0.6) !important; }
    .highlight-check { transition: background-color 0.2s; background-color: rgba(255, 0, 0, 0.4) !important; }
    .highlight-select { background-color: ${colors.primary}60 !important; }
    .highlight-wrong { background-color: rgba(239, 68, 68, 0.5) !important; }

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
    /* Spare Pieces Palette */
    .spare-pieces-7492f {
        display: ${isSetup ? 'flex' : 'none'} !important;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        background: rgba(0,0,0,0.05);
        border-radius: 12px;
        margin: 10px 0;
    }
    .spare-pieces-7492f .piece-417db {
        width: 40px !important;
        height: 40px !important;
        border-radius: 6px;
        cursor: pointer;
        transition: transform 0.1s;
    }
    .spare-pieces-7492f .piece-417db:active {
        transform: scale(0.9);
    }
    .highlight-spare {
        background-color: ${colors.primary}40 !important;
        box-shadow: 0 0 0 2px ${colors.primary};
    }
  </style>
</head>
<body>
  <div id="boardContainer">
    <div id="board"></div>
  </div>
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
        $board.find('.square-55d63').removeClass('highlight-select highlight-wrong'); 
        if (!${!isSetup && gameOptions.highlightLastMove}) {
            $board.find('.square-55d63').removeClass('highlight-move');
        }
    }

    function onSquareClick (square) {
      if (${isSetup}) {
        var pos = board.position();
        
        // If a piece is selected from palette, place it
        if (currentPiece) {
            pos[square] = currentPiece;
            board.position(pos, false);
            setTimeout(sendPosition, 10);
            return;
        }
        
        // If no piece is selected, tapping an existing piece deletes it
        if (pos[square]) {
            delete pos[square];
            board.position(pos, false);
            setTimeout(sendPosition, 10);
        }
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
      var fen = buildFen(pos, 'w');
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'position_changed',
        position: pos,
        fen: board.fen(),
        pieceCount: Object.keys(pos).length
      }));
    }

    function onDragStart (source, piece, position, orientation) {
      if (!${isSetup}) {
        if (game.game_over()) return false;
        if (game.turn() !== piece.charAt(0)) return false;
        
        // Show possible moves when dragging a piece
        var moves = game.moves({ square: source, verbose: true });
        if (moves.length > 0) {
          $board.find('.square-' + source).addClass('highlight-select');
          for (var i = 0; i < moves.length; i++) {
            greyDot(moves[i].to);
          }
        }
      }
      selectedSquare = null;
      try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'drag_start' })); } catch(e) {}
    }

    function onDrop (source, target) {
      removeGreyDots();
      try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'drag_end' })); } catch(e) {}
      if (${isSetup}) {
        setTimeout(sendPosition, 50);
        return;
      }
      var move = game.move({ from: source, to: target, promotion: 'q' });
      if (move === null) {
        removeHighlights();
        return 'snapback';
      }
      updateStatus(move.san, move);
    }

    function onSnapEnd () {
      board.position(game.fen());
      try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'drag_end' })); } catch(e) {}
    }

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
    
    // Bind click AND touch events on squares to support tap-to-move and setup piece placing
    var _lastTapTime = 0;
    function handleSquareTap(e) {
      var now = Date.now();
      if (now - _lastTapTime < 200) return; // debounce
      _lastTapTime = now;
      var square = $(this).attr('data-square');
      if (square) onSquareClick(square);
    }
    $('#board').on('click', '.square-55d63', handleSquareTap);
    $('#board').on('touchend', '.square-55d63', function(e) {
      // Only handle single-finger taps, not drags
      if (e.originalEvent && e.originalEvent.changedTouches && e.originalEvent.changedTouches.length === 1) {
        if (e.cancelable) e.preventDefault(); // Prevent ghost click
        handleSquareTap.call(this, e);
      }
    });

    // Handle tapping spare pieces for tap-to-place
    $(document).on('click touchend', '.spare-pieces-7492f .piece-417db', function(e) {
        if (e.type === 'touchend' && e.cancelable) e.preventDefault();
        
        var pieceCode = $(this).attr('data-piece');
        if (pieceCode) {
            if (currentPiece === pieceCode) {
                // Deselect
                currentPiece = null;
                $('.spare-pieces-7492f .piece-417db').removeClass('highlight-spare');
            } else {
                // Select
                currentPiece = pieceCode;
                $('.spare-pieces-7492f .piece-417db').removeClass('highlight-spare');
                $(this).addClass('highlight-spare');
            }
        }
    });
    
    setTimeout(function() { 
        try {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' })); 
        } catch(e) {
            console.error('Failed to send ready message:', e);
        }
    }, 300);

    window.handleReactNativeMessage = function(data) {
        try {
            if (typeof data === 'string') {
                data = JSON.parse(data);
            }
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
                    board.position(game.fen(), true);
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
                board.position(data.fen, true);
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
            if(data.type === 'highlight_wrong_move') {
                removeHighlights();
                removeGreyDots();
                $board.find('.square-' + data.from).addClass('highlight-wrong');
                $board.find('.square-' + data.to).addClass('highlight-wrong');
            }
            if(data.type === 'flip_board') {
                board.flip();
            }
            if(data.type === 'set_orientation') {
                board.orientation(data.orientation);
            }
        } catch(e) {}
    };

    window.addEventListener('message', function(event) {
        try {
            var data = event.data;
            window.handleReactNativeMessage(data);
        } catch(e) {}
    });
  </script>
</body>
</html>
`;
};
