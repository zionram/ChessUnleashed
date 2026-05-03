export interface UciWorkerMoveResult {
  bestMove: string;
}

export interface UciWorkerMoveRequest {
  promise: Promise<UciWorkerMoveResult>;
  cancel: () => void;
}

const waitForWorkerMessage = (
  worker: Worker,
  predicate: (line: string) => boolean,
  timeoutMs: number,
  timeoutMessage: string
) => new Promise<string>((resolve, reject) => {
  const timeout = window.setTimeout(() => {
    cleanup();
    reject(new Error(timeoutMessage));
  }, timeoutMs);

  const handleMessage = (event: MessageEvent) => {
    const line = String(event.data ?? '');
    if (!predicate(line)) return;
    cleanup();
    resolve(line);
  };

  const handleError = () => {
    cleanup();
    reject(new Error('Could not load this engine. Check that the file path is correct.'));
  };

  const cleanup = () => {
    window.clearTimeout(timeout);
    worker.removeEventListener('message', handleMessage);
    worker.removeEventListener('error', handleError);
  };

  worker.addEventListener('message', handleMessage);
  worker.addEventListener('error', handleError);
});

const resolveWorkerPath = (workerPath: string): string => {
  if (
    typeof window !== 'undefined' &&
    workerPath.startsWith('/') &&
    window.location.protocol === 'file:'
  ) {
    return new URL(workerPath.slice(1), window.location.href).toString();
  }
  return workerPath;
};

export const createUciWorkerBestMoveRequest = (
  workerPath: string,
  fen = 'startpos',
  depth = 1
): UciWorkerMoveRequest => {
  const worker = new Worker(resolveWorkerPath(workerPath));
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
    worker.terminate();
  };

  const promise = (async () => {
    worker.postMessage('uci');
    await waitForWorkerMessage(worker, line => line.includes('uciok'), 5000, 'The engine did not finish UCI setup.');
    if (cancelled) throw new Error('Worker request was cancelled.');

    worker.postMessage('isready');
    await waitForWorkerMessage(worker, line => line.includes('readyok'), 5000, 'The engine did not become ready.');
    if (cancelled) throw new Error('Worker request was cancelled.');

    worker.postMessage(fen === 'startpos' ? 'position startpos' : `position fen ${fen}`);
    worker.postMessage(`go depth ${Math.max(1, depth)}`);
    const bestMoveLine = await waitForWorkerMessage(worker, line => line.startsWith('bestmove '), 10000, 'The engine did not return a move.');
    if (cancelled) throw new Error('Worker request was cancelled.');
    const bestMove = bestMoveLine.split(/\s+/)[1] ?? '';
    if (!bestMove || bestMove === '(none)') throw new Error('The engine returned no legal move.');
    return { bestMove };
  })()
    .catch(error => {
      if (error instanceof Error) throw error;
      throw new Error('Could not load this engine. Check that the file path is correct.');
    })
    .finally(() => worker.terminate());

  return { promise, cancel };
};

export const getUciWorkerBestMove = async (
  workerPath: string,
  fen = 'startpos',
  depth = 1
): Promise<UciWorkerMoveResult> => createUciWorkerBestMoveRequest(workerPath, fen, depth).promise;

export const testUciWorkerBestMove = async (
  workerPath: string,
  depth = 1
): Promise<UciWorkerMoveResult> => getUciWorkerBestMove(workerPath, 'startpos', depth);
