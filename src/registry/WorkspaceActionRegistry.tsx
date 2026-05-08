import type { ComponentType } from 'react';
import { useSettings } from '../context/SettingsContext';
import { registerView } from './ViewRegistry';
import HistoryView from '../views/HistoryView';
import StatsView from '../views/StatsView';
import WelcomeView from '../views/WelcomeView';
import ThemeEditorView from '../views/ThemeEditorView';
import MultiplayerView from '../views/MultiplayerView';
import AnalysisView from '../views/AnalysisView';
import ComputerOpponentView from '../views/ComputerOpponentView';
import SquaresView from '../views/SquaresView';
import PathsView from '../views/PathsView';
import LayersView from '../views/LayersView';
import AudioView from '../views/AudioView';
import SoundEditorView from '../views/SoundEditorView';
import EventLogView from '../views/EventLogView';
import EventBuilderView from '../views/EventBuilderView';
import TroubleshooterView from '../views/TroubleshooterView';
import ChatSettingsView from '../views/ChatSettingsView';
import BotsView from '../views/BotsView';
import TimerSettingsView from '../views/TimerSettingsView';
import TimerView from '../views/TimerView';
import PlatformAppearanceView from '../views/PlatformAppearanceView';
import AnimationSettingsView from '../views/AnimationSettingsView';
import AnimationBuilderView from '../views/AnimationBuilderView';
import AboutSupportView from '../views/AboutSupportView';
import ProfileView from '../views/ProfileView';
import FicsOnlineView from '../views/FicsOnlineView';
import FicsConsoleView from '../views/FicsConsoleView';
import RuleBuilderView from '../views/RuleBuilderView';
import BackgroundView from '../views/BackgroundView';
import MoveAssistView from '../views/MoveAssistView';
import ChatContainer from '../components/layout/ChatContainer';

export type WorkspaceActionViewConfig = {
  actionId: string;
  viewId: string;
  name: string;
  component: ComponentType<any>;
  defaultEnabled?: boolean;
  position?: 'left' | 'right' | 'bottom' | 'top' | 'center';
};

const ChatRight = () => {
  const { settings } = useSettings();
  if (settings.chatSettings.position !== 'right') return null;
  return <ChatContainer requiredPosition="right" />;
};

const TimerRight = () => {
  const { settings } = useSettings();
  if (!settings.timeControl.enabled || settings.timeControl.placement !== 'right-panel') return null;
  return <TimerView />;
};

export const WORKSPACE_ACTION_VIEW_CONFIGS: WorkspaceActionViewConfig[] = [
  { actionId: 'toggle-welcome', viewId: 'welcome', name: 'Welcome', component: WelcomeView, defaultEnabled: true, position: 'left' },
  { actionId: 'toggle-history', viewId: 'history', name: 'History', component: HistoryView, defaultEnabled: true, position: 'right' },
  { actionId: 'toggle-chat', viewId: 'chat', name: 'Chat', component: ChatRight, position: 'right' },
  { actionId: 'toggle-chat-settings', viewId: 'chat-settings', name: 'Chat Settings', component: ChatSettingsView, position: 'right' },
  { actionId: 'toggle-bots', viewId: 'bots', name: 'Bots Management', component: BotsView, position: 'right' },
  { actionId: 'toggle-profile', viewId: 'profile', name: 'Profile', component: ProfileView, position: 'right' },
  { actionId: 'toggle-rule-builder', viewId: 'rule-builder', name: 'Rule Builder', component: RuleBuilderView, position: 'right' },
  { actionId: 'toggle-timer', viewId: 'timer', name: 'Timer', component: TimerRight, position: 'right' },
  { actionId: 'toggle-timer-settings', viewId: 'timer-settings', name: 'Timer Settings', component: TimerSettingsView, position: 'right' },
  { actionId: 'toggle-event-log', viewId: 'event-log', name: 'Event Log', component: EventLogView, position: 'right' },
  { actionId: 'toggle-event-builder', viewId: 'event-builder', name: 'Do Something Cool', component: EventBuilderView, position: 'center' },
  { actionId: 'toggle-troubleshooter', viewId: 'troubleshooter', name: 'Troubleshooter', component: TroubleshooterView, position: 'right' },
  { actionId: 'toggle-stats', viewId: 'stats', name: 'Stats', component: StatsView, position: 'right' },
  { actionId: 'toggle-piece-editor', viewId: 'theme-editor', name: 'Piece Editor', component: ThemeEditorView, position: 'right' },
  { actionId: 'toggle-multiplayer', viewId: 'multiplayer', name: 'Multiplayer', component: MultiplayerView, position: 'right' },
  { actionId: 'toggle-analysis', viewId: 'analysis', name: 'Analysis', component: AnalysisView, position: 'right' },
  { actionId: 'toggle-computer', viewId: 'computer-opponent', name: 'Computer Opponent', component: ComputerOpponentView, position: 'right' },
  { actionId: 'toggle-squares', viewId: 'squares', name: 'Squares', component: SquaresView, position: 'right' },
  { actionId: 'toggle-paths', viewId: 'paths', name: 'Paths', component: PathsView, position: 'right' },
  { actionId: 'toggle-layers', viewId: 'layers', name: 'Layers', component: LayersView, position: 'right' },
  { actionId: 'toggle-background', viewId: 'background', name: 'Background', component: BackgroundView, position: 'right' },
  { actionId: 'toggle-wheels', viewId: 'move-assist', name: 'Move Assist', component: MoveAssistView, position: 'right' },
  { actionId: 'toggle-audio', viewId: 'audio', name: 'Audio Settings', component: AudioView, position: 'right' },
  { actionId: 'toggle-sound-editor', viewId: 'sound-editor', name: 'Sound Editor', component: SoundEditorView, position: 'right' },
  { actionId: 'toggle-platform-appearance', viewId: 'platform-appearance', name: 'Platform UI', component: PlatformAppearanceView, position: 'right' },
  { actionId: 'toggle-animation-settings', viewId: 'animation-settings', name: 'Animation', component: AnimationSettingsView, position: 'right' },
  { actionId: 'toggle-animation-builder', viewId: 'animation-builder', name: 'Animation Builder', component: AnimationBuilderView, position: 'center' },
  { actionId: 'toggle-about-support', viewId: 'about-support', name: 'About / Support', component: AboutSupportView, position: 'right' },
  { actionId: 'toggle-fics-online', viewId: 'fics-online', name: 'FICS Online', component: FicsOnlineView, position: 'right' },
  { actionId: 'toggle-fics-console', viewId: 'fics-console', name: 'FICS Console', component: FicsConsoleView, position: 'right' },
];

export const WORKSPACE_ACTION_VIEW_MAP = new Map(
  WORKSPACE_ACTION_VIEW_CONFIGS.map(config => [config.actionId, config])
);

export const getWorkspaceActionViewConfig = (actionId?: string | null): WorkspaceActionViewConfig | null => {
  if (!actionId) return null;
  return WORKSPACE_ACTION_VIEW_MAP.get(actionId) ?? null;
};

export const getWorkspaceViewId = (actionId?: string | null): string | null => {
  return getWorkspaceActionViewConfig(actionId)?.viewId ?? null;
};

export const isWorkspaceAction = (actionId?: string | null): boolean => {
  return !!getWorkspaceActionViewConfig(actionId);
};

export const registerWorkspaceActionViews = () => {
  WORKSPACE_ACTION_VIEW_CONFIGS.forEach(config => {
    registerView({
      id: config.viewId,
      name: config.name,
      component: config.component,
      defaultEnabled: config.defaultEnabled ?? false,
      position: config.position ?? 'right',
    });
  });
};
