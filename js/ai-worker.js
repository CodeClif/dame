// Runs the minimax search off the main thread so animations stay smooth.
import { chooseMove } from './ai.js';

self.onmessage = (e) => {
  const { id, state, opts, level } = e.data;
  self.postMessage({ id, move: chooseMove(state, opts, level) });
};
