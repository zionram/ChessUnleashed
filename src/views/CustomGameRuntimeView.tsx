import React, { useEffect, useMemo, useState } from 'react';
import type { CustomRuleset, StartingPosition } from '../rules/RulePackages';
import { getStartingPositionSummary, isSandboxPlayableRuleset } from '../rules/RulePackages';
import { useSettings } from '../context/SettingsContext';
import { clearGameSnapshot, readGameSnapshot, writeGameSnapshot, type CustomGameHistoryEntry, type CustomGameHistoryEntryType, type CustomRuntimeSnapshot } from '../runtime/GameSnapshot';
import { eventBus } from '../events/EventBus';

type RuntimeMove = {
  row: number;
  col: number;
  capturedPositionId?: string;
};

export interface CustomGameSnapshot {
  rulesetId: string;
  boardState: StartingPosition[];
  currentTurnIndex: number;
  moveHistory: CustomGameHistoryEntry[];
  result: string | null;
}

interface CustomGameRuntimeViewProps {
  ruleset: CustomRuleset;
  onEnd: () => void;
}

const createHistoryEntry = (type: CustomGameHistoryEntryType, summary: string): CustomGameHistoryEntry => ({
  id: `history-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  timestamp: new Date().toISOString(),
  type,
  summary
});

const parseRuleOffsets = (offsets: string) =>
  offsets
    .split(';')
    .map(offset => offset.trim())
    .filter(Boolean)
    .map(offset => {
      const [col, row] = offset.split(',').map(value => Number(value.trim()));
      return Number.isFinite(row) && Number.isFinite(col) ? { row, col } : null;
    })
    .filter((offset): offset is { row: number; col: number } => Boolean(offset));

const CustomGameRuntimeView: React.FC<CustomGameRuntimeViewProps> = ({ ruleset, onEnd }) => {
  const { settings } = useSettings();
  const teams = ruleset.teams ?? [];
  const pieces = ruleset.pieces ?? [];
  const startingSetup = ruleset.startingSetup ?? [];
  const promotionRules = ruleset.promotionRules ?? [];
  const winConditions = ruleset.winConditions ?? [];
  const boardWidth = Math.max(1, ruleset.boardWidth || 8);
  const boardHeight = Math.max(1, ruleset.boardHeight || 8);
  const restoredCustomSnapshot = useMemo<CustomRuntimeSnapshot | null>(() => {
    const snapshot = readGameSnapshot();
    return snapshot?.gameType === 'custom' && snapshot.selectedCustomRulesetId === ruleset.id ? snapshot : null;
  }, [ruleset.id]);
  const [boardSetup, setBoardSetup] = useState<StartingPosition[]>(() =>
    restoredCustomSnapshot?.boardState?.length
      ? restoredCustomSnapshot.boardState.map(position => ({ ...position }))
      : startingSetup.map(position => ({ ...position }))
  );
  const [selectedSquare, setSelectedSquare] = useState<{ row: number; col: number } | null>(null);
  const [turnIndex, setTurnIndex] = useState(restoredCustomSnapshot?.currentTurnIndex ?? 0);
  const [result, setResult] = useState<string | null>(restoredCustomSnapshot?.result ?? null);
  const [message, setMessage] = useState(restoredCustomSnapshot?.message ?? 'Custom local game started.');
  const [multiJumpPieceId, setMultiJumpPieceId] = useState<string | null>(restoredCustomSnapshot?.multiJumpPieceId ?? null);
  const [moveHistory, setMoveHistory] = useState<CustomGameHistoryEntry[]>(() => [
    ...(restoredCustomSnapshot?.moveHistory?.length
      ? restoredCustomSnapshot.moveHistory
      : [createHistoryEntry('start', `${ruleset.name || 'Custom game'} started.`)])
  ]);
  const [snapshotEnabled, setSnapshotEnabled] = useState(true);
  const readiness = useMemo(() => isSandboxPlayableRuleset(ruleset), [ruleset]);
  const unsupportedWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (pieces.some(piece => (piece.movementRules ?? []).some(rule => rule.type === 'ray'))) {
      warnings.push('Ray movement is metadata-only in this first custom runtime.');
    }
    if (winConditions.some(condition => !['eliminate-opponent-pieces', 'opponent-no-legal-moves'].includes(condition.type))) {
      warnings.push('Some win conditions are shown as metadata and are not enforced yet.');
    }
    return warnings;
  }, [pieces, winConditions]);
  const turnTeamIds = (ruleset.turnOrder?.teamIds?.length ? ruleset.turnOrder.teamIds : teams.map(team => team.id)) ?? [];
  const currentTurnTeamId = turnTeamIds[turnIndex % Math.max(1, turnTeamIds.length)] ?? '';
  const currentTurnTeam = teams.find(team => team.id === currentTurnTeamId);
  const selectedPiece = selectedSquare
    ? boardSetup.find(position => position.row === selectedSquare.row && position.col === selectedSquare.col)
    : null;
  const localProfileName = settings.localProfile.displayName.trim();

  useEffect(() => {
    if (restoredCustomSnapshot) {
      setBoardSetup(restoredCustomSnapshot.boardState.map(position => ({ ...position })));
      setSelectedSquare(null);
      setTurnIndex(restoredCustomSnapshot.currentTurnIndex);
      setResult(restoredCustomSnapshot.result);
      setMultiJumpPieceId(restoredCustomSnapshot.multiJumpPieceId);
      setMessage(restoredCustomSnapshot.message);
      setMoveHistory(restoredCustomSnapshot.moveHistory);
      setSnapshotEnabled(true);
      return;
    }
    setBoardSetup(startingSetup.map(position => ({ ...position })));
    setSelectedSquare(null);
    setTurnIndex(0);
    setResult(null);
    setMultiJumpPieceId(null);
    setMessage('Custom local game started.');
    setMoveHistory([createHistoryEntry('start', `${ruleset.name || 'Custom game'} started.`)]);
    setSnapshotEnabled(true);
    eventBus.emit({ type: 'game.start', payload: { mode: 'custom', rulesetId: ruleset.id, name: ruleset.name } });
  }, [ruleset.id, restoredCustomSnapshot]);

  const getTeamName = (teamId: string) => {
    const team = teams.find(item => item.id === teamId);
    const teamName = team?.name || teamId || 'Unknown team';
    return teamId === turnTeamIds[0] && localProfileName ? `${teamName} (${localProfileName})` : teamName;
  };

  const getPieceName = (pieceId: string) => {
    const piece = pieces.find(item => item.id === pieceId);
    return piece?.displayName || piece?.name || pieceId || 'Unknown piece';
  };

  const getTeamInitial = (teamId: string) => {
    const label = teams.find(item => item.id === teamId)?.name || teamId || '?';
    return label.trim().slice(0, 1).toUpperCase() || '?';
  };

  const getTeamAvatar = (teamId: string) => {
    if (teamId === turnTeamIds[0] && settings.localProfile.profileImage) {
      return (
        <img
          src={settings.localProfile.profileImage}
          alt=""
          style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid #d0d7de' }}
        />
      );
    }
    return (
      <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#e0e7ff', color: '#334155', fontWeight: 900, fontSize: '0.74rem', border: '1px solid #c7d2fe' }}>
        {getTeamInitial(teamId)}
      </div>
    );
  };

  const getMovesForPiece = (piece: StartingPosition, board: StartingPosition[]): RuntimeMove[] => {
    const definition = pieces.find(item => item.id === piece.pieceId);
    if (!definition) return [];
    const teamIndex = teams.findIndex(team => team.id === piece.teamId);
    const forward = teamIndex <= 0 ? -1 : 1;

    return (definition.movementRules ?? []).flatMap(rule => {
      if (rule.type === 'ray') return [];
      if (rule.type === 'jump') {
        return parseRuleOffsets(rule.offsets).flatMap(offset => {
          const destination = { row: piece.row + offset.row, col: piece.col + offset.col };
          if (destination.row < 0 || destination.row >= boardHeight || destination.col < 0 || destination.col >= boardWidth) return [];
          if (board.some(position => position.row === destination.row && position.col === destination.col)) return [];
          if (rule.captureBehavior === 'capture-only' && (rule.captureMethod ?? 'normal') !== 'jump') return [];
          if ((rule.captureMethod ?? 'normal') !== 'jump') return [destination];
          const capturedOffset = parseRuleOffsets(rule.capturedPieceOffset ?? '')[0];
          if (!capturedOffset) return [];
          const captured = board.find(position => position.row === piece.row + capturedOffset.row && position.col === piece.col + capturedOffset.col);
          if (!captured || captured.teamId === piece.teamId) return [];
          return [{ ...destination, capturedPositionId: captured.id }];
        });
      }
      if (rule.type === 'step') {
        if (rule.captureBehavior === 'capture-only') return [];
        const directions = rule.directions.toLowerCase();
        const maxDistance = Math.max(1, rule.maxDistance || 1);
        const deltas: Array<{ row: number; col: number }> = [];
        if (directions.includes('forward') && directions.includes('diagonal')) deltas.push({ row: forward, col: -1 }, { row: forward, col: 1 });
        else if (directions.includes('diagonal')) deltas.push({ row: -1, col: -1 }, { row: -1, col: 1 }, { row: 1, col: -1 }, { row: 1, col: 1 });
        else if (directions.includes('orthogonal')) deltas.push({ row: -1, col: 0 }, { row: 1, col: 0 }, { row: 0, col: -1 }, { row: 0, col: 1 });
        return deltas.flatMap(delta =>
          Array.from({ length: maxDistance }, (_, index) => ({ row: piece.row + delta.row * (index + 1), col: piece.col + delta.col * (index + 1) }))
        ).filter(destination =>
          destination.row >= 0 &&
          destination.row < boardHeight &&
          destination.col >= 0 &&
          destination.col < boardWidth &&
          !board.some(position => position.row === destination.row && position.col === destination.col)
        );
      }
      return [];
    });
  };

  const getPromotedPieceId = (piece: StartingPosition, row: number) => {
    const rule = promotionRules.find(item => item.sourcePieceId === piece.pieceId && item.condition === 'team-relative-last-row');
    if (!rule) return piece.pieceId;
    const teamIndex = teams.findIndex(team => team.id === piece.teamId);
    const promotionRow = teamIndex <= 0 ? 0 : boardHeight - 1;
    return row === promotionRow ? rule.targetPieceId : piece.pieceId;
  };

  const evaluateWin = (board: StartingPosition[], nextTeamId: string, winnerTeamId: string) => {
    const opponentPieces = board.filter(position => position.teamId === nextTeamId);
    const winnerName = getTeamName(winnerTeamId);
    if (winConditions.some(condition => condition.type === 'eliminate-opponent-pieces') && opponentPieces.length === 0) {
      return `${winnerName} wins.`;
    }
    if (winConditions.some(condition => condition.type === 'opponent-no-legal-moves')) {
      const hasLegalMove = opponentPieces.some(position => getMovesForPiece(position, board).length > 0);
      if (!hasLegalMove) return `${winnerName} wins.`;
    }
    return null;
  };

  const currentTurnPieces = boardSetup.filter(position => position.teamId === currentTurnTeamId);
  const currentTurnCaptureMoves = currentTurnPieces.flatMap(position => getMovesForPiece(position, boardSetup).filter(move => Boolean(move.capturedPositionId)));
  const selectedMoves = selectedPiece ? getMovesForPiece(selectedPiece, boardSetup) : [];
  const legalMoves = selectedMoves.filter(move =>
    (!ruleset.forcedCaptures || currentTurnCaptureMoves.length === 0 || Boolean(move.capturedPositionId)) &&
    (!multiJumpPieceId || Boolean(move.capturedPositionId))
  );
  const legalKeys = new Set(legalMoves.map(move => `${move.row},${move.col}`));
  const selectedPieceLabel = selectedPiece
    ? `${getTeamName(selectedPiece.teamId)} ${getPieceName(selectedPiece.pieceId)} at row ${selectedPiece.row + 1}, column ${selectedPiece.col + 1}`
    : 'None';
  const forcedCaptureNotice = ruleset.forcedCaptures && currentTurnCaptureMoves.length > 0
    ? 'A capture is available, so only capture moves are allowed.'
    : '';
  const runtimeSnapshot: CustomGameSnapshot = useMemo(() => ({
    rulesetId: ruleset.id,
    boardState: boardSetup.map(position => ({ ...position })),
    currentTurnIndex: turnIndex,
    moveHistory,
    result
  }), [ruleset.id, boardSetup, turnIndex, moveHistory, result]);
  const snapshotPieceCount = runtimeSnapshot.boardState.length;

  useEffect(() => {
    if (!snapshotEnabled) return;
    writeGameSnapshot({
      version: 1,
      gameType: 'custom',
      timestamp: new Date().toISOString(),
      selectedCustomRulesetId: ruleset.id,
      boardState: boardSetup.map(position => ({ ...position })),
      currentTurnIndex: turnIndex,
      moveHistory,
      result,
      message,
      multiJumpPieceId,
      players: {
        localProfileName
      }
    });
  }, [snapshotEnabled, ruleset.id, boardSetup, turnIndex, moveHistory, result, message, multiJumpPieceId, localProfileName]);

  const resetBoard = () => {
    clearGameSnapshot();
    setSnapshotEnabled(false);
    setBoardSetup(startingSetup.map(position => ({ ...position })));
    setSelectedSquare(null);
    setTurnIndex(0);
    setResult(null);
    setMultiJumpPieceId(null);
    setMessage('Custom game reset.');
    setMoveHistory([
      createHistoryEntry('reset', `${ruleset.name || 'Custom game'} reset to the starting setup.`)
    ]);
  };

  const executeMove = (move: RuntimeMove) => {
    if (!selectedPiece || result) return;
    setSnapshotEnabled(true);
    setBoardSetup(current => {
      const fromLabel = `row ${selectedPiece.row + 1}, column ${selectedPiece.col + 1}`;
      const toLabel = `row ${move.row + 1}, column ${move.col + 1}`;
      const capturedPiece = move.capturedPositionId
        ? current.find(position => position.id === move.capturedPositionId)
        : null;
      const nextPieceId = getPromotedPieceId(selectedPiece, move.row);
      const nextBoard = current
        .filter(position => position.id !== move.capturedPositionId)
        .map(position => position.id === selectedPiece.id ? { ...position, row: move.row, col: move.col, pieceId: nextPieceId } : position);
      const movedPiece = nextBoard.find(position => position.id === selectedPiece.id);
      const additionalJumps = movedPiece && ruleset.multiJump
        ? getMovesForPiece(movedPiece, nextBoard).filter(nextMove => Boolean(nextMove.capturedPositionId))
        : [];
      if (move.capturedPositionId && additionalJumps.length > 0) {
        eventBus.emit({
          type: 'piece.captured',
          payload: {
            pieceType: selectedPiece.pieceId,
            team: selectedPiece.teamId,
            from: fromLabel,
            to: toLabel,
            capturedPiece: capturedPiece?.pieceId
          }
        });
        setMultiJumpPieceId(selectedPiece.id);
        setSelectedSquare({ row: move.row, col: move.col });
        setMessage('Continue the multi-jump.');
        setMoveHistory(history => [
          ...history,
          createHistoryEntry('capture', `${getTeamName(selectedPiece.teamId)} ${getPieceName(selectedPiece.pieceId)} jumped from ${fromLabel} to ${toLabel}${capturedPiece ? ` and captured ${getTeamName(capturedPiece.teamId)} ${getPieceName(capturedPiece.pieceId)}` : ''}.`),
          createHistoryEntry('turn', `${getTeamName(selectedPiece.teamId)} continues the multi-jump.`)
        ]);
        return nextBoard;
      }
      const nextTurnIndex = turnIndex + 1;
      const nextTeamId = turnTeamIds[nextTurnIndex % Math.max(1, turnTeamIds.length)] ?? '';
      const nextResult = evaluateWin(nextBoard, nextTeamId, selectedPiece.teamId);
      setSelectedSquare(null);
      setMultiJumpPieceId(null);
      setTurnIndex(nextTurnIndex);
      setResult(nextResult);
      setMessage(nextPieceId !== selectedPiece.pieceId ? `${getPieceName(selectedPiece.pieceId)} promoted to ${getPieceName(nextPieceId)}.` : move.capturedPositionId ? 'Jump capture applied.' : 'Move applied.');
      setMoveHistory(history => {
        const entries: CustomGameHistoryEntry[] = [
          createHistoryEntry(move.capturedPositionId ? 'capture' : 'move', `${getTeamName(selectedPiece.teamId)} ${getPieceName(selectedPiece.pieceId)} moved from ${fromLabel} to ${toLabel}${capturedPiece ? ` and captured ${getTeamName(capturedPiece.teamId)} ${getPieceName(capturedPiece.pieceId)}` : ''}.`)
        ];
        if (nextPieceId !== selectedPiece.pieceId) {
          entries.push(createHistoryEntry('promotion', `${getTeamName(selectedPiece.teamId)} ${getPieceName(selectedPiece.pieceId)} promoted to ${getPieceName(nextPieceId)}.`));
        }
        if (nextResult) entries.push(createHistoryEntry('win', nextResult));
        else entries.push(createHistoryEntry('turn', `${getTeamName(nextTeamId)} to move.`));
        return [...history, ...entries];
      });
      eventBus.emit({
        type: 'move.made',
        payload: {
          pieceType: selectedPiece.pieceId,
          team: selectedPiece.teamId,
          from: fromLabel,
          to: toLabel,
          capturedPiece: capturedPiece?.pieceId,
          isPromotion: nextPieceId !== selectedPiece.pieceId
        }
      });
      if (capturedPiece) {
        eventBus.emit({
          type: 'piece.captured',
          payload: {
            pieceType: selectedPiece.pieceId,
            team: selectedPiece.teamId,
            from: fromLabel,
            to: toLabel,
            capturedPiece: capturedPiece.pieceId
          }
        });
      }
      if (nextResult) {
        eventBus.emit({ type: 'game.end', payload: { mode: 'custom', reason: 'win', result: nextResult, winner: selectedPiece.teamId } });
      }
      return nextBoard;
    });
  };

  const cells = Array.from({ length: boardWidth * boardHeight });

  if (!readiness.playable) {
    return (
      <div style={{ padding: 16, border: '1px solid #fecaca', borderRadius: 8, background: '#fef2f2', color: '#991b1b' }}>
        <div style={{ fontWeight: 800 }}>This custom ruleset is not ready for runtime play.</div>
        <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          {readiness.messages.filter(item => item !== 'Ruleset metadata looks valid.').map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', width: 'min(100%, 760px)' }}>
      <section style={{ width: '100%', padding: 12, border: '1px solid #d0d7de', borderRadius: 8, background: 'rgba(255,255,255,0.9)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#2c3e50' }}>{ruleset.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Turn: {currentTurnTeam ? getTeamName(currentTurnTeam.id) : 'Not set'}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Selected: {selectedPieceLabel}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Legal moves: {selectedPiece ? legalMoves.length : 'Select a piece'}</div>
            <div style={{ fontSize: '0.78rem', color: result ? '#166534' : '#64748b', fontWeight: result ? 800 : 500 }}>{result ?? message}</div>
            {forcedCaptureNotice && !result && (
              <div style={{ fontSize: '0.74rem', color: '#92400e', marginTop: 3 }}>{forcedCaptureNotice}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <button type="button" onClick={resetBoard} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>Reset Board</button>
            <button type="button" onClick={onEnd} style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid #b42318', background: '#fff', color: '#b42318', cursor: 'pointer', fontWeight: 700 }}>End Custom Game</button>
          </div>
        </div>
      </section>
      <section style={{ width: '100%', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {turnTeamIds.map(teamId => (
          <div key={teamId} style={{ display: 'flex', gap: 7, alignItems: 'center', padding: '7px 9px', border: teamId === currentTurnTeamId ? '2px solid #2c3e50' : '1px solid #d0d7de', borderRadius: 8, background: '#fff' }}>
            {getTeamAvatar(teamId)}
            <div>
              <div style={{ fontSize: '0.76rem', color: '#2c3e50', fontWeight: 800 }}>{getTeamName(teamId)}</div>
              <div style={{ fontSize: '0.66rem', color: '#64748b' }}>{teamId === currentTurnTeamId && !result ? 'Current turn' : 'Player'}</div>
            </div>
          </div>
        ))}
      </section>
      {unsupportedWarnings.length > 0 && (
        <section style={{ width: '100%', padding: 10, border: '1px solid #fde68a', borderRadius: 8, background: '#fffbeb', color: '#92400e', fontSize: '0.76rem' }}>
          {unsupportedWarnings.map(warning => (
            <div key={warning}>{warning}</div>
          ))}
        </section>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${boardWidth}, minmax(28px, 1fr))`,
          width: 'min(88vw, 520px)',
          aspectRatio: `${boardWidth} / ${boardHeight}`,
          border: '2px solid #334155',
          background: '#fff'
        }}
      >
        {cells.map((_, index) => {
          const row = Math.floor(index / boardWidth);
          const col = index % boardWidth;
          const piece = boardSetup.find(position => position.row === row && position.col === col);
          const isSelected = selectedSquare?.row === row && selectedSquare.col === col;
          const isLegal = legalKeys.has(`${row},${col}`);
          const team = piece ? teams.find(item => item.id === piece.teamId) : null;
          const definition = piece ? pieces.find(item => item.id === piece.pieceId) : null;
          const label = piece ? `${team?.name?.slice(0, 1) ?? '?'}${definition?.displayName?.slice(0, 1) ?? '?'}` : '';
          return (
            <button
              key={`${row}-${col}`}
              type="button"
              onClick={() => {
                if (result) {
                  setMessage('Game complete. Reset to play again.');
                  return;
                }
                const move = legalMoves.find(item => item.row === row && item.col === col);
                if (move) {
                  executeMove(move);
                  return;
                }
                if (!piece) return;
                if (multiJumpPieceId && piece.id !== multiJumpPieceId) {
                  setMessage('Continue the multi-jump with the same piece.');
                  return;
                }
                if (piece.teamId !== currentTurnTeamId) {
                  setMessage(`It is ${currentTurnTeam ? getTeamName(currentTurnTeam.id) : 'the current team'}'s turn.`);
                  return;
                }
                const pieceMoves = getMovesForPiece(piece, boardSetup).filter(move =>
                  (!ruleset.forcedCaptures || currentTurnCaptureMoves.length === 0 || Boolean(move.capturedPositionId)) &&
                  (!multiJumpPieceId || Boolean(move.capturedPositionId))
                );
                setSelectedSquare({ row, col });
                setMessage(pieceMoves.length > 0 ? 'Choose a highlighted destination.' : 'No supported legal moves for this piece right now.');
              }}
              title={piece ? getStartingPositionSummary(piece, teams, pieces) : undefined}
              style={{
                border: isSelected ? '2px solid #b45309' : isLegal ? '2px solid #16a34a' : '1px solid rgba(15,23,42,0.12)',
                background: isSelected ? '#fde68a' : isLegal ? '#bbf7d0' : (row + col) % 2 === 1 ? '#94a3b8' : '#f8fafc',
                color: '#0f172a',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <section style={{ width: '100%', display: 'grid', gap: 10, gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)' }}>
        <div style={{ padding: 10, border: '1px solid #d0d7de', borderRadius: 8, background: '#fff' }}>
          <div style={{ fontSize: '0.82rem', color: '#2c3e50', fontWeight: 800, marginBottom: 6 }}>Action History</div>
          <div style={{ maxHeight: 160, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {moveHistory.map(entry => (
              <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '70px minmax(0, 1fr)', gap: 6, alignItems: 'start', fontSize: '0.72rem', color: entry.type === 'win' ? '#166534' : '#475569' }}>
                <span style={{ padding: '2px 5px', borderRadius: 999, background: entry.type === 'win' ? '#dcfce7' : '#f1f5f9', color: entry.type === 'win' ? '#166534' : '#475569', fontSize: '0.62rem', fontWeight: 800, textTransform: 'capitalize', textAlign: 'center' }}>
                  {entry.type}
                </span>
                <span>{entry.summary}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 10, border: '1px solid #d0d7de', borderRadius: 8, background: '#f8fafc', color: '#475569', fontSize: '0.72rem' }}>
          <div style={{ fontSize: '0.82rem', color: '#2c3e50', fontWeight: 800, marginBottom: 6 }}>Save Readiness</div>
          <div>Custom Game Ruleset: reusable definition.</div>
          <div>Custom Game Snapshot: future saved game in progress.</div>
          <div style={{ marginTop: 6 }}>Snapshot prepared locally: {snapshotPieceCount} pieces, {moveHistory.length} history entries.</div>
        </div>
      </section>
    </div>
  );
};

export default CustomGameRuntimeView;
