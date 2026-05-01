import type { BotSettings } from '../context/SettingsContext';

export interface EngineParams {
  depth: number;
  randomness: number;
  capturePriority: number;
  checkPriority: number;
  thinkTime: number;
}

export const translateBotSettings = (
  _engineId: string,
  botSettings: BotSettings, 
  capabilities: any
): EngineParams => {
  const params: any = {
    randomness: botSettings.randomness,
    capturePriority: botSettings.capturePriority,
    checkPriority: botSettings.checkPriority,
    thinkTime: botSettings.thinkTime
  };

  if (capabilities.supportsDepth) {
    params.depth = botSettings.depth;
  }

  return params as EngineParams;
};
