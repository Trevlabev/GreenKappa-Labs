/** hosted-v0.3.0 Cloudflare Worker. Preserve original rules; replace Netlify transport. */
import * as game from '../../lib/game.mjs';
import QRCode from 'qrcode';
import { GameRoomBase, BudgetGateBase, createWorker } from '../../../cloudflare/shared/room-adapter.mjs';

const configuration = {
  edition: 'hosted-v0.3.0',
  cascade: false,
  maxOutputTokens: 500,
  aiInstructions: "You produce short fictional card-game alternatives. Return only labeled answers. Do not explain your process."
};

export class GameRoom extends GameRoomBase {
  constructor(ctx, env) { super(ctx, env, game, configuration); }
}
export class BudgetGate extends BudgetGateBase {}
export default createWorker(game, configuration, QRCode);
