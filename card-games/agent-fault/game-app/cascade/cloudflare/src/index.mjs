/** cascade-v0.2-P Cloudflare Worker. Preserve original rules; replace Netlify transport. */
import * as game from '../../lib/game.mjs';
import { GameRoomBase, BudgetGateBase, createWorker } from '../../../cloudflare/shared/room-adapter.mjs';

const configuration = {
  edition: 'cascade-v0.2-P',
  cascade: true,
  maxOutputTokens: 300,
  aiInstructions: "Continue the original fictional agent conversation. Honor all earlier context. Write one vivid, concrete and grammatically complete response of about 35–50 words. No labels, no mechanics."
};

export class GameRoom extends GameRoomBase {
  constructor(ctx, env) { super(ctx, env, game, configuration); }
}
export class BudgetGate extends BudgetGateBase {}
export default createWorker(game, configuration);
