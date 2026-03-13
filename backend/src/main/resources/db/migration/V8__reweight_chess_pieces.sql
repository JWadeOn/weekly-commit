-- V8: Replace linear chess-weight scale with non-linear strategic weighting
-- Old scale: KING=100, QUEEN=80, ROOK=60, BISHOP=40, KNIGHT=20, PAWN=10
-- New scale:  KING=20,  QUEEN=10, ROOK=5,  BISHOP=3,  KNIGHT=3,  PAWN=1
-- All weights are relative; percentage calculations are unchanged in structure.

ALTER TABLE commit_items DROP CONSTRAINT IF EXISTS commit_items_chess_weight_check;

UPDATE commit_items SET chess_weight =
    CASE chess_piece
        WHEN 'KING'   THEN 20
        WHEN 'QUEEN'  THEN 10
        WHEN 'ROOK'   THEN 5
        WHEN 'BISHOP' THEN 3
        WHEN 'KNIGHT' THEN 3
        ELSE 1
    END;

ALTER TABLE commit_items
    ADD CONSTRAINT commit_items_chess_weight_check
    CHECK (chess_weight IN (20, 10, 5, 3, 1));
