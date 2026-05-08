import { useState, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { GameProvider, useGame } from './context/GameContext';
import { AudioProvider } from './context/AudioContext';
import ChessBoard from './components/board/ChessBoard';
import DynamicMenu from './components/menu/DynamicMenu';
import ViewManager from './components/layout/ViewManager';
import {
  getWorkspaceActionViewConfig,
  getWorkspaceViewId as getRegisteredWorkspaceViewId,
  registerWorkspaceActionViews
} from './registry/WorkspaceActionRegistry';
import WelcomeView from './views/WelcomeView';
import TimerView from './views/TimerView';
import CustomGameRuntimeView from './views/CustomGameRuntimeView';
import LetsPlaySetupView from './views/LetsPlaySetupView';
import ChatContainer from './components/layout/ChatContainer';
import FloatingWindow from './components/layout/FloatingWindow';
import AudioController from './components/layout/AudioController';
import GameEndOverlay from './components/layout/GameEndOverlay';
import Overlay from './components/layout/Overlay';
import MobileMenuSheet from './components/menu/MobileMenuSheet';
import ImportExportView from './views/ImportExportView';
import { MENU_SCHEMA, type MenuItem } from './config/menuSchema';
import { clearErrorLogEntries, installGlobalErrorLogging } from './utils/ErrorLog';
import { SETTINGS_STORAGE_KEY } from './context/SettingsContext';
import { clearGameSnapshot, readGameSnapshot } from './runtime/GameSnapshot';
import './App.css';

registerWorkspaceActionViews();

type LauncherWindowEntry = {
  item: MenuItem;
  zIndex: number;
  nestedTabs: Record<string, string>;
  tabId: string | null;
  insertionIndex: number;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
};

type LauncherWindowBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DockedPanel = {
  id: string;
  item: MenuItem;
  nestedTabs: Record<string, string>;
  tabId: string | null;
  isMinimized: boolean;
};

type TabDragState = {
  sourceWindowId: string;
  tabItem: MenuItem;
  startX: number;
  startY: number;
  detached: boolean;
  parentItemId?: string;
};

type LauncherDockTarget = {
  windowId: string;
  parentItemId?: string;
  element: HTMLDivElement;
};

type TabDragPreviewState = {
  icon?: ReactNode;
  label: string;
  x: number;
  y: number;
} | null;

const NON_WORKSPACE_ACTION_IDS = new Set([
  'reset-system',
  'upload-rules',
  'set-mode-standard'
]);

const getWorkspaceViewId = (actionId: string): string | null => {
  if (NON_WORKSPACE_ACTION_IDS.has(actionId)) return null;
  return getRegisteredWorkspaceViewId(actionId);
};

const canDockToWorkspace = (item: MenuItem): boolean => {
  if (item.children?.length) {
    return item.children.some(c => !!getWorkspaceViewId(c.actionId ?? ''));
  }
  return !!getWorkspaceViewId(item.actionId ?? '');
};

const FICS_LAUNCHER_ITEM: MenuItem = {
  id: 'fics-hub',
  label: 'FICS',
  icon: '♞',
  children: [
    { id: 'fics-online', label: 'Online', icon: '🌐', actionId: 'toggle-fics-online' },
    { id: 'fics-console', label: 'Console', icon: '⌨', actionId: 'toggle-fics-console' }
  ]
};


type WorkspaceChromeConfig = {
  zIndex: {
    hud: number;
    sidePanels: number;
    launcherBase: number;
    launcherDragPreview: number;
    overlay: number;
  };
  safeAreas: {
    outerMargin: number;
    panelGap: number;
    bottomInset: number;
  };
  leftPanel: {
    defaultPosition: { x: number; y: number };
    defaultWidth: number;
    collapsedWidth: number;
    minWidth: number;
    maxWidth: number;
    defaultHeight: number;
    minHeight: number;
  };
  rightPanel: {
    defaultWidth: number;
    minWidth: number;
    maxWidth: number;
  };
  board: {
    defaultScale: number;
    minScale: number;
    maxScale: number;
    scaleStep: number;
    defaultOffset: { x: number; y: number };
  };
  hud: {
    activity: { visible: boolean; anchor: 'bottom-left'; offset: { x: number; y: number } };
    meta: { visible: boolean; anchor: 'bottom-right'; offset: { x: number; y: number } };
  };
  launcher: {
    defaultSize: { width: number; height: number };
    spawnOffset: { x: number; y: number };
    cascadeOffset: { x: number; y: number };
  };
};

const DEFAULT_WORKSPACE_CHROME: WorkspaceChromeConfig = {
  zIndex: {
    hud: 320,
    sidePanels: 200,
    launcherBase: 2600,
    launcherDragPreview: 9999,
    overlay: 3000
  },
  safeAreas: {
    outerMargin: 18,
    panelGap: 14,
    bottomInset: 72
  },
  leftPanel: {
    defaultPosition: { x: 12, y: 12 },
    defaultWidth: 280,
    collapsedWidth: 72,
    minWidth: 120,
    maxWidth: 320,
    defaultHeight: 520,
    minHeight: 240
  },
  rightPanel: {
    defaultWidth: 320,
    minWidth: 250,
    maxWidth: 600
  },
  board: {
    defaultScale: 100,
    minScale: 75,
    maxScale: 125,
    scaleStep: 5,
    defaultOffset: { x: 0, y: 0 }
  },
  hud: {
    activity: { visible: true, anchor: 'bottom-left', offset: { x: 0, y: 0 } },
    meta: { visible: true, anchor: 'bottom-right', offset: { x: 0, y: 0 } }
  },
  launcher: {
    defaultSize: { width: 520, height: 420 },
    spawnOffset: { x: 14, y: 42 },
    cascadeOffset: { x: 0, y: 24 }
  }
};

const numberOr = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const boolOr = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

const readPoint = (value: unknown, fallback: { x: number; y: number }) => {
  if (!value || typeof value !== 'object') return fallback;
  const point = value as { x?: unknown; y?: unknown };
  return { x: numberOr(point.x, fallback.x), y: numberOr(point.y, fallback.y) };
};

const readSize = (value: unknown, fallback: { width: number; height: number }) => {
  if (!value || typeof value !== 'object') return fallback;
  const size = value as { width?: unknown; height?: unknown };
  return { width: numberOr(size.width, fallback.width), height: numberOr(size.height, fallback.height) };
};

const getWorkspaceChrome = (template: unknown): WorkspaceChromeConfig => {
  const source = ((template as { workspaceChrome?: unknown })?.workspaceChrome ?? {}) as Record<string, any>;
  const zIndex = source.zIndex ?? {};
  const safeAreas = source.safeAreas ?? {};
  const leftPanel = source.leftPanel ?? {};
  const rightPanel = source.rightPanel ?? {};
  const board = source.board ?? {};
  const hud = source.hud ?? {};
  const activity = hud.activity ?? {};
  const meta = hud.meta ?? {};
  const launcher = source.launcher ?? {};

  return {
    zIndex: {
      hud: numberOr(zIndex.hud, DEFAULT_WORKSPACE_CHROME.zIndex.hud),
      sidePanels: numberOr(zIndex.sidePanels, DEFAULT_WORKSPACE_CHROME.zIndex.sidePanels),
      launcherBase: numberOr(zIndex.launcherBase, DEFAULT_WORKSPACE_CHROME.zIndex.launcherBase),
      launcherDragPreview: numberOr(zIndex.launcherDragPreview, DEFAULT_WORKSPACE_CHROME.zIndex.launcherDragPreview),
      overlay: numberOr(zIndex.overlay, DEFAULT_WORKSPACE_CHROME.zIndex.overlay)
    },
    safeAreas: {
      outerMargin: numberOr(safeAreas.outerMargin, DEFAULT_WORKSPACE_CHROME.safeAreas.outerMargin),
      panelGap: numberOr(safeAreas.panelGap, DEFAULT_WORKSPACE_CHROME.safeAreas.panelGap),
      bottomInset: numberOr(safeAreas.bottomInset, DEFAULT_WORKSPACE_CHROME.safeAreas.bottomInset)
    },
    leftPanel: {
      defaultPosition: readPoint(leftPanel.defaultPosition, DEFAULT_WORKSPACE_CHROME.leftPanel.defaultPosition),
      defaultWidth: numberOr(leftPanel.defaultWidth, DEFAULT_WORKSPACE_CHROME.leftPanel.defaultWidth),
      collapsedWidth: numberOr(leftPanel.collapsedWidth, DEFAULT_WORKSPACE_CHROME.leftPanel.collapsedWidth),
      minWidth: numberOr(leftPanel.minWidth, DEFAULT_WORKSPACE_CHROME.leftPanel.minWidth),
      maxWidth: numberOr(leftPanel.maxWidth, DEFAULT_WORKSPACE_CHROME.leftPanel.maxWidth),
      defaultHeight: numberOr(leftPanel.defaultHeight, DEFAULT_WORKSPACE_CHROME.leftPanel.defaultHeight),
      minHeight: numberOr(leftPanel.minHeight, DEFAULT_WORKSPACE_CHROME.leftPanel.minHeight)
    },
    rightPanel: {
      defaultWidth: numberOr(rightPanel.defaultWidth, DEFAULT_WORKSPACE_CHROME.rightPanel.defaultWidth),
      minWidth: numberOr(rightPanel.minWidth, DEFAULT_WORKSPACE_CHROME.rightPanel.minWidth),
      maxWidth: numberOr(rightPanel.maxWidth, DEFAULT_WORKSPACE_CHROME.rightPanel.maxWidth)
    },
    board: {
      defaultScale: numberOr(board.defaultScale, DEFAULT_WORKSPACE_CHROME.board.defaultScale),
      minScale: numberOr(board.minScale, DEFAULT_WORKSPACE_CHROME.board.minScale),
      maxScale: numberOr(board.maxScale, DEFAULT_WORKSPACE_CHROME.board.maxScale),
      scaleStep: numberOr(board.scaleStep, DEFAULT_WORKSPACE_CHROME.board.scaleStep),
      defaultOffset: readPoint(board.defaultOffset, DEFAULT_WORKSPACE_CHROME.board.defaultOffset)
    },
    hud: {
      activity: {
        visible: boolOr(activity.visible, DEFAULT_WORKSPACE_CHROME.hud.activity.visible),
        anchor: 'bottom-left',
        offset: readPoint(activity.offset, DEFAULT_WORKSPACE_CHROME.hud.activity.offset)
      },
      meta: {
        visible: boolOr(meta.visible, DEFAULT_WORKSPACE_CHROME.hud.meta.visible),
        anchor: 'bottom-right',
        offset: readPoint(meta.offset, DEFAULT_WORKSPACE_CHROME.hud.meta.offset)
      }
    },
    launcher: {
      defaultSize: readSize(launcher.defaultSize, DEFAULT_WORKSPACE_CHROME.launcher.defaultSize),
      spawnOffset: readPoint(launcher.spawnOffset, DEFAULT_WORKSPACE_CHROME.launcher.spawnOffset),
      cascadeOffset: readPoint(launcher.cascadeOffset, DEFAULT_WORKSPACE_CHROME.launcher.cascadeOffset)
    }
  };
};

function MainLayout() {
  const { settings, toggleView, setTrainingWheels, setGameMode, setThemeEditorMode, updateTimeControl } = useSettings();
  const { gameState, multiplayer, timeoutResult, resignationResult, resetGame, resignGame, ficsGame } = useGame();
  const { localProfile } = settings;
  const activeTemplate = settings.themeDraft ?? settings.template;
  const workspaceChrome = getWorkspaceChrome(activeTemplate);

  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [activeMobileSection, setActiveMobileSection] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [leftPanelPosition, setLeftPanelPosition] = useState(() => workspaceChrome.leftPanel.defaultPosition);
  const isDraggingLeftPanel = useRef(false);
  const leftPanelDragOffset = useRef({ x: 0, y: 0 });
  const [leftPanelHeight, setLeftPanelHeight] = useState(() => Math.max(workspaceChrome.leftPanel.minHeight, Math.min(workspaceChrome.leftPanel.defaultHeight, window.innerHeight - 120)));
  const isResizingLeftPanel = useRef(false);
  const isResizingLeftPanelHeight = useRef(false);
  const leftPanelResizeStart = useRef({ x: 0, width: 150 });
  const leftPanelHeightResizeStart = useRef({ y: 0, height: 520 });
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [newGameOverlayOpen, setNewGameOverlayOpen] = useState(false);
  const [packageManagerOpen, setPackageManagerOpen] = useState(false);
  const [packageManagerMode, setPackageManagerMode] = useState<'landing' | 'import' | 'export' | 'extract'>('landing');
  const [packageManagerAction, setPackageManagerAction] = useState<'load' | 'save' | null>(null);
  const [packageManagerActionId, setPackageManagerActionId] = useState(0);
  const [activeCustomRulesetId, setActiveCustomRulesetId] = useState<string | null>(() => {
    const snapshot = readGameSnapshot();
    return snapshot?.gameType === 'custom' ? snapshot.selectedCustomRulesetId : null;
  });

  const [activeLauncherOverlay, setActiveLauncherOverlay] = useState<MenuItem | null>(null);
  const [launcherOverlayCloseRequest, setLauncherOverlayCloseRequest] = useState<(() => void) | null>(null);
  const [openLauncherWindows, setOpenLauncherWindows] = useState<Map<string, LauncherWindowEntry>>(() => new Map());
  const launcherTopZRef = useRef(workspaceChrome.zIndex.launcherBase);
  const launcherWindowCountRef = useRef(0);
  const launcherWindowBoundsRef = useRef<Map<string, LauncherWindowBounds>>(new Map());
  const tabDragRef = useRef<TabDragState | null>(null);
  const tabDetachSuppressClickRef = useRef(false);
  const [tabDragPreview, setTabDragPreview] = useState<TabDragPreviewState>(null);
  const tabRowRefs = useRef<Map<string, LauncherDockTarget>>(new Map());
  const rightPanelRef = useRef<HTMLElement | null>(null);
  const [dockedPanels, setDockedPanels] = useState<DockedPanel[]>([]);
  const [leftWidth, setLeftWidth] = useState(workspaceChrome.leftPanel.defaultWidth);
  const [collapsedLeftWidth, setCollapsedLeftWidth] = useState(workspaceChrome.leftPanel.collapsedWidth);
  const collapsedLauncherItemCount = MENU_SCHEMA.length;
  const collapsedLauncherColumns = Math.max(1, Math.floor(Math.max(72, collapsedLeftWidth - 16) / 64));
  const collapsedLauncherRows = Math.ceil(collapsedLauncherItemCount / collapsedLauncherColumns);
  const collapsedRequiredHeight = 34 + 20 + (collapsedLauncherRows * 74) + (Math.max(0, collapsedLauncherRows - 1) * 10);
  const effectiveLeftPanelHeight = leftPanelCollapsed
    ? Math.max(leftPanelHeight, collapsedRequiredHeight)
    : leftPanelHeight;
  const [rightWidth, setRightWidth] = useState(workspaceChrome.rightPanel.defaultWidth);
  const [dismissedGameEndOverlay, setDismissedGameEndOverlay] = useState(false);
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);
  const timerDragBounds = useRef<HTMLDivElement | null>(null);
  const draggableTimerRef = useRef<HTMLDivElement | null>(null);
  const centerPanelRef = useRef<HTMLElement | null>(null);
  const boardWrapperRef = useRef<HTMLDivElement | null>(null);
  const timerDragOffset = useRef({ x: 0, y: 0 });
  const [isTimerDragging, setIsTimerDragging] = useState(false);
  const [frameAnchor, setFrameAnchor] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [topbarTipIndex, setTopbarTipIndex] = useState(0);
  const [workspaceScale, setWorkspaceScale] = useState(workspaceChrome.board.defaultScale);
  const [workspaceActivityVisible, setWorkspaceActivityVisible] = useState(workspaceChrome.hud.activity.visible);
  const [workspaceMetaVisible, setWorkspaceMetaVisible] = useState(workspaceChrome.hud.meta.visible);
  const [workspaceActivityPosition, setWorkspaceActivityPosition] = useState(workspaceChrome.hud.activity.offset);
  const [workspaceMetaPosition, setWorkspaceMetaPosition] = useState(workspaceChrome.hud.meta.offset);
  const [workspaceHudHover, setWorkspaceHudHover] = useState<'activity' | 'meta' | null>(null);
  const workspaceHudDragRef = useRef<{ panel: 'activity' | 'meta'; x: number; y: number; startX: number; startY: number } | null>(null);
  const [boardDragPosition, setBoardDragPosition] = useState(workspaceChrome.board.defaultOffset);
  const isDraggingBoardShell = useRef(false);
  const boardShellDragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    installGlobalErrorLogging();
  }, []);

  useEffect(() => {
    const tips = settings.uiAppearance.tipsMessages ?? [];
    if (tips.length <= 1 || !settings.uiAppearance.showTipsBoard) return;
    const seconds = Math.max(4, settings.uiAppearance.tipsRotationSeconds || 12);
    const interval = window.setInterval(() => {
      setTopbarTipIndex(current => (current + 1) % tips.length);
    }, seconds * 1000);
    return () => window.clearInterval(interval);
  }, [settings.uiAppearance.showTipsBoard, settings.uiAppearance.tipsMessages, settings.uiAppearance.tipsRotationSeconds]);

  useEffect(() => {
    const startCustomGame = (event: Event) => {
      const rulesetId = (event as CustomEvent<{ rulesetId?: string }>).detail?.rulesetId;
      if (rulesetId) setActiveCustomRulesetId(rulesetId);
    };
    const endCustomGame = () => {
      clearGameSnapshot();
      setActiveCustomRulesetId(null);
    };
    window.addEventListener('chess-unleashed-start-custom-game', startCustomGame);
    window.addEventListener('chess-unleashed-end-custom-game', endCustomGame);
    return () => {
      window.removeEventListener('chess-unleashed-start-custom-game', startCustomGame);
      window.removeEventListener('chess-unleashed-end-custom-game', endCustomGame);
    };
  }, []);

  useEffect(() => {
    if (activeCustomRulesetId && !settings.customRulesets.some(ruleset => ruleset.id === activeCustomRulesetId)) {
      clearGameSnapshot();
      setActiveCustomRulesetId(null);
    }
  }, [activeCustomRulesetId, settings.customRulesets]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth <= 768) return;
      if (isDraggingLeft.current) setLeftWidth(Math.max(workspaceChrome.leftPanel.minWidth, Math.min(workspaceChrome.leftPanel.maxWidth, e.clientX - leftPanelPosition.x)));
      if (isDraggingRight.current) setRightWidth(Math.max(workspaceChrome.rightPanel.minWidth, Math.min(workspaceChrome.rightPanel.maxWidth, window.innerWidth - e.clientX)));
    };
    const handleMouseUp = () => {
      isDraggingLeft.current = false;
      isDraggingRight.current = false;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [leftPanelPosition.x]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const drag = workspaceHudDragRef.current;
      if (!drag) return;
      const nextPosition = {
        x: drag.startX + event.clientX - drag.x,
        // HUD panels are bottom-anchored. Positive Y moves them below the visible workspace,
        // so clamp to 0 and let the active template's safeAreas.bottomInset control bottom spacing.
        y: Math.min(0, drag.startY + event.clientY - drag.y)
      };
      if (drag.panel === 'activity') setWorkspaceActivityPosition(nextPosition);
      else setWorkspaceMetaPosition(nextPosition);
    };
    const handleMouseUp = () => {
      if (!workspaceHudDragRef.current) return;
      workspaceHudDragRef.current = null;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingLeftPanel.current) return;

      const panelWidth = leftPanelCollapsed ? collapsedLeftWidth : leftWidth;
      const panelHeight = leftPanelCollapsed ? Math.max(leftPanelHeight, collapsedRequiredHeight) : leftPanelHeight;
      const nextX = e.clientX - leftPanelDragOffset.current.x;
      const nextY = e.clientY - leftPanelDragOffset.current.y;
      const margin = workspaceChrome.safeAreas.outerMargin;
      const maxX = Math.max(margin, window.innerWidth - panelWidth - margin);
      const maxY = Math.max(margin, window.innerHeight - panelHeight - margin);

      setLeftPanelPosition({
        x: Math.max(margin, Math.min(maxX, nextX)),
        y: Math.max(margin, Math.min(maxY, nextY))
      });
    };

    const handleMouseUp = () => {
      if (!isDraggingLeftPanel.current) return;
      isDraggingLeftPanel.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [leftPanelCollapsed, leftPanelHeight, collapsedLeftWidth, leftWidth, collapsedRequiredHeight]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingLeftPanel.current) return;

      const delta = e.clientX - leftPanelResizeStart.current.x;
      const minWidth = leftPanelCollapsed ? workspaceChrome.leftPanel.collapsedWidth : workspaceChrome.leftPanel.minWidth;
      const maxWidth = Math.min(leftPanelCollapsed ? workspaceChrome.leftPanel.collapsedWidth : workspaceChrome.leftPanel.maxWidth, window.innerWidth - leftPanelPosition.x - workspaceChrome.safeAreas.outerMargin);
      const nextWidth = Math.max(minWidth, Math.min(maxWidth, leftPanelResizeStart.current.width + delta));
      if (leftPanelCollapsed) setCollapsedLeftWidth(nextWidth);
      else setLeftWidth(nextWidth);
    };

    const handleMouseUp = () => {
      if (!isResizingLeftPanel.current) return;
      isResizingLeftPanel.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [leftPanelPosition.x, leftPanelCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingLeftPanelHeight.current) return;

      const delta = e.clientY - leftPanelHeightResizeStart.current.y;
      const maxHeight = Math.max(workspaceChrome.leftPanel.minHeight, window.innerHeight - leftPanelPosition.y - workspaceChrome.safeAreas.outerMargin);
      const nextHeight = Math.max(workspaceChrome.leftPanel.minHeight, Math.min(maxHeight, leftPanelHeightResizeStart.current.height + delta));
      setLeftPanelHeight(nextHeight);
    };

    const handleMouseUp = () => {
      if (!isResizingLeftPanelHeight.current) return;
      isResizingLeftPanelHeight.current = false;
      document.body.style.cursor = 'ns-resize';
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [leftPanelPosition.y]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingBoardShell.current) return;

      const bounds = centerPanelRef.current?.getBoundingClientRect();
      const shell = boardWrapperRef.current?.getBoundingClientRect();
      const fallbackWidth = 520;
      const fallbackHeight = 520;
      const shellWidth = shell?.width ?? fallbackWidth;
      const shellHeight = shell?.height ?? fallbackHeight;
      const maxX = bounds ? Math.max(0, (bounds.width - shellWidth) / 2 + 180) : 260;
      const maxY = bounds ? Math.max(0, (bounds.height - shellHeight) / 2 + 160) : 220;

      const nextX = event.clientX - boardShellDragOffset.current.x;
      const nextY = event.clientY - boardShellDragOffset.current.y;

      setBoardDragPosition({
        x: Math.max(-maxX, Math.min(maxX, nextX)),
        y: Math.max(-maxY, Math.min(maxY, nextY))
      });
    };

    const handleMouseUp = () => {
      if (!isDraggingBoardShell.current) return;
      isDraggingBoardShell.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('cu-tab-detach-dragging');
    };
  }, []);

  useEffect(() => {
    if (!isTimerDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const bounds = timerDragBounds.current?.getBoundingClientRect();
      const timerRect = draggableTimerRef.current?.getBoundingClientRect();
      if (!bounds) return;

      const timerWidth = timerRect?.width ?? 180;
      const timerHeight = timerRect?.height ?? 80;
      const x = Math.max(0, Math.min(bounds.width - timerWidth, e.clientX - bounds.left - timerDragOffset.current.x));
      const y = Math.max(0, Math.min(bounds.height - timerHeight, e.clientY - bounds.top - timerDragOffset.current.y));

      updateTimeControl({ draggablePosition: { x, y } });
    };

    const handleMouseUp = () => {
      setIsTimerDragging(false);
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isTimerDragging, updateTimeControl]);

  useEffect(() => {
    if (!timeoutResult && !resignationResult && !gameState.isCheckmate && !gameState.isDraw) {
      setDismissedGameEndOverlay(false);
    }
  }, [timeoutResult, resignationResult, gameState.isCheckmate, gameState.isDraw]);

  const toggleRightPanel = () => {
    if (window.innerWidth > 768) {
      setRightPanelCollapsed(current => !current);
      return;
    }

    const nextOpen = !rightPanelOpen;
    setRightPanelOpen(nextOpen);
    if (nextOpen) setRightPanelCollapsed(false);
  };

  const getPlayerName = (color: 'w' | 'b') => {
    if (multiplayer.vsComputer) {
      if (color === multiplayer.computerSide) return multiplayer.opponentProfile.name;
      return localProfile.displayName || 'Guest Player';
    }
    if (multiplayer.isConnected) {
      if (color === multiplayer.playerColor) return localProfile.displayName || 'Guest Player';
      return color === 'w' ? 'White' : 'Black'; // Fallback for multiplayer opponent for now
    }
    // Local play
    if (color === 'w') return localProfile.displayName || 'Guest Player';
    return 'Local Player';
  };

  const activeControlMode = (multiplayer.isConnected || multiplayer.vsComputer)
    ? (multiplayer.playerColor || 'both')
    : 'both';

  const handleMenuAction = (actionId: string) => {
    switch (actionId) {
      case 'toggle-history': toggleView('history'); break;
      case 'toggle-chat': toggleView('chat'); break;
      case 'toggle-chat-settings': toggleView('chat-settings'); break;
      case 'toggle-bots': toggleView('bots'); break;
      case 'toggle-profile': toggleView('profile'); break;
      case 'toggle-rule-builder': toggleView('rule-builder'); break;
      case 'toggle-timer': toggleView('timer'); break;
      case 'toggle-timer-settings': toggleView('timer-settings'); break;
      case 'toggle-stats': toggleView('stats'); break;
      case 'toggle-analysis': toggleView('analysis'); break;
      case 'toggle-event-log': toggleView('event-log'); break;
      case 'toggle-event-builder': toggleView('event-builder'); break;
      case 'toggle-troubleshooter': toggleView('troubleshooter'); break;
      case 'toggle-audio': toggleView('audio'); break;
      case 'toggle-platform-appearance': toggleView('platform-appearance'); break;
      case 'toggle-animation-settings': toggleView('animation-settings'); break;
      case 'toggle-animation-builder': toggleView('animation-builder'); break;
      case 'toggle-about-support': toggleView('about-support'); break;
      case 'toggle-sound-editor': toggleView('sound-editor'); break;
      case 'toggle-multiplayer': toggleView('multiplayer'); break;
      case 'toggle-computer': toggleView('computer-opponent'); break;
      case 'toggle-squares': toggleView('squares'); break;
      case 'toggle-paths': toggleView('paths'); break;
      case 'toggle-layers': toggleView('layers'); break;
      case 'toggle-piece-editor':
        setThemeEditorMode(true);
        if (!settings.activeViews.includes('theme-editor')) toggleView('theme-editor');
        break;
      case 'toggle-wheels': setTrainingWheels(!settings.trainingWheels); break;
      case 'reset-system': setResetConfirmationOpen(true); break;
      case 'upload-rules': alert('Rule Uploading enabled! Please select your .json rule file.'); break;
      case 'set-mode-standard': setGameMode('standard'); break;
      case 'toggle-welcome': toggleView('welcome'); break;
      case 'toggle-fics-online': toggleView('fics-online'); break;
      case 'toggle-fics-console': toggleView('fics-console'); break;
    }
  };

  const status = resignationResult
    ? `${getPlayerName(resignationResult.winner)} wins by resignation`
    : timeoutResult
    ? `${getPlayerName(timeoutResult.winner)} wins on time`
    : gameState.isCheckmate
      ? `${getPlayerName(gameState.turn === 'w' ? 'b' : 'w')} wins by checkmate!`
      : gameState.isDraw
        ? 'Draw'
        : gameState.isCheck
          ? `Check! (${getPlayerName(gameState.turn)})`
          : `${getPlayerName(gameState.turn)}'s Turn`;
  const activeCustomRuleset = settings.customRulesets.find(ruleset => ruleset.id === activeCustomRulesetId) ?? null;
  const displayStatus = activeCustomRuleset ? `Custom Game: ${activeCustomRuleset.name}` : status;
  const topbarTips = settings.uiAppearance.tipsMessages ?? [];
  const activeTip = settings.uiAppearance.showTipsBoard && topbarTips.length
    ? topbarTips[topbarTipIndex % topbarTips.length]
    : '';
  const modeLabel = activeCustomRuleset ? activeCustomRuleset.name : settings.gameMode === 'standard' ? 'Standard Chess' : settings.gameMode;
  const activeWorkspaceLabels = settings.activeViews.filter(viewId => !['welcome', 'chat'].includes(viewId));
  const workspaceSummary = activeWorkspaceLabels.length
    ? `${activeWorkspaceLabels.length} active tool${activeWorkspaceLabels.length === 1 ? '' : 's'}`
    : 'No active tools';
  const autosaveStatus = 'Local autosave active';
  const isTerminalGame = !!timeoutResult || !!resignationResult || gameState.isCheckmate || gameState.isDraw;
  const showGameEndOverlay = isTerminalGame && !dismissedGameEndOverlay;
  const handleNewGame = () => {
    setDismissedGameEndOverlay(true);
    setNewGameOverlayOpen(true);
  };

  const { background, frameLayer } = activeTemplate;
  const isSoundEditorActive = settings.activeViews.includes('sound-editor');
  const isEventBuilderActive = settings.activeViews.includes('event-builder');
  const isAnimationBuilderActive = settings.activeViews.includes('animation-builder');
  const activeCenterWorkspaceConfig = isSoundEditorActive
    ? getWorkspaceActionViewConfig('toggle-sound-editor')
    : isEventBuilderActive
      ? getWorkspaceActionViewConfig('toggle-event-builder')
      : isAnimationBuilderActive
        ? getWorkspaceActionViewConfig('toggle-animation-builder')
        : null;
  const ActiveCenterWorkspaceView = activeCenterWorkspaceConfig?.component ?? null;
  const isUnified = multiplayer.isConnected && multiplayer.enforceSharedExp;
  const timerPlacement = settings.timeControl.placement;
  const isFicsClockActive = !!ficsGame;
  const effectiveTimerPlacement = isFicsClockActive && timerPlacement === 'right-panel' ? 'top' : timerPlacement;
  const showBoardTimer = (settings.timeControl.enabled || isFicsClockActive) && effectiveTimerPlacement !== 'right-panel';
  const isDraggableTimer = showBoardTimer && settings.timeControl.behavior === 'draggable';
  const timerStatusLabel = isFicsClockActive ? 'FICS' : settings.timeControl.enabled ? 'On' : 'Off';
  const draggableTimerPosition = settings.timeControl.draggablePosition ?? { x: 24, y: 24 };
  const densitySpacing = {
    compact: 10,
    comfortable: 15,
    spacious: 20
  }[settings.uiAppearance.density];

  useEffect(() => {
    const updateFrameAnchor = () => {
      const centerRect = centerPanelRef.current?.getBoundingClientRect();
      const boardRect = boardWrapperRef.current?.getBoundingClientRect();
      if (!centerRect || !boardRect) return;

        const sizeMode = frameLayer.frameSizeMode ?? (frameLayer.lockToBoard ? 'match-board' : 'responsive');
        setFrameAnchor({
          x: boardRect.left - centerRect.left + boardRect.width / 2,
          y: boardRect.top - centerRect.top + boardRect.height / 2,
          width: sizeMode === 'match-board'
            ? boardRect.width
            : sizeMode === 'fixed'
              ? (frameLayer.fixedWidth || boardRect.width)
              : centerRect.width,
          height: sizeMode === 'match-board'
            ? boardRect.height
            : sizeMode === 'fixed'
              ? (frameLayer.fixedHeight || boardRect.height)
              : centerRect.height
        });
    };

    updateFrameAnchor();
    window.addEventListener('resize', updateFrameAnchor);
    const observer = new ResizeObserver(updateFrameAnchor);
    if (centerPanelRef.current) observer.observe(centerPanelRef.current);
    if (boardWrapperRef.current) observer.observe(boardWrapperRef.current);

    return () => {
      window.removeEventListener('resize', updateFrameAnchor);
      observer.disconnect();
    };
  }, [leftPanelCollapsed, rightPanelCollapsed, leftWidth, rightWidth, showBoardTimer, effectiveTimerPlacement, isSoundEditorActive, frameLayer.lockToBoard, frameLayer.frameSizeMode, frameLayer.fixedWidth, frameLayer.fixedHeight]);

  const getLayerImageStyles = (layer: any): CSSProperties => {
    const isCentered = layer.repeat === 'centered';
    const backgroundSize = layer.scale !== 100
      ? `${layer.scale}%`
      : (layer.size === 'auto' ? 'auto' : layer.size || 'cover');

    return {
      position: 'absolute',
      inset: 0,
      backgroundImage: layer.image ? `url(${layer.image})` : 'none',
      backgroundRepeat: isCentered ? 'no-repeat' : (layer.repeat || 'no-repeat'),
      backgroundPosition: isCentered
        ? `calc(50% + ${layer.xOffset || 0}px) calc(50% + ${layer.yOffset || 0}px)`
        : `${layer.xOffset || 0}px ${layer.yOffset || 0}px`,
      backgroundSize,
      opacity: layer.opacity,
      pointerEvents: 'none',
      transition: 'background-position 0.1s, background-size 0.1s, opacity 0.1s'
    };
  };

  const getFrameLayerImageStyles = (layer: any): CSSProperties => ({
    ...getLayerImageStyles(layer),
    inset: 'auto',
    left: frameAnchor.x,
    top: frameAnchor.y,
    width: frameAnchor.width || '100%',
    height: frameAnchor.height || '100%',
    transform: 'translate(-50%, -50%)'
  });

  const getLayerColorStyles = (layer: any): CSSProperties => ({
    position: 'absolute',
    inset: 0,
    backgroundColor: layer.color,
    pointerEvents: 'none'
  });

  const hexToRgba = (hex: string, alpha: number): string => {
    if (!hex.startsWith('#') || hex.length !== 7) return `rgba(255, 255, 255, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getSidePanelStyles = (): CSSProperties => {
    const { sidebarStyle, panelOpacity, panelBackdropBlur, accentColor, panelBackgroundColor } = settings.uiAppearance;
    if (sidebarStyle === 'glass') {
      return {
        backgroundColor: hexToRgba(panelBackgroundColor || '#ffffff', panelOpacity / 100),
        ...(panelBackdropBlur > 0 ? { backdropFilter: `blur(${panelBackdropBlur}px)` } : {})
      };
    }
    if (sidebarStyle === 'bordered') {
      return { border: `2px solid ${accentColor}` };
    }
    return {};
  };

  const getButtonRadius = (): number => ({ rounded: 6, square: 2, minimal: 0 }[settings.uiAppearance.buttonStyle]);

  const isGlassWorkspace = settings.uiAppearance.sidebarStyle === 'glass';
  const glassPanelBg = isGlassWorkspace
    ? hexToRgba(settings.uiAppearance.panelBackgroundColor || '#ffffff', settings.uiAppearance.panelOpacity / 100)
    : '';

  const getWelcomeContainerStyles = (): CSSProperties => {
    const mode = settings.uiAppearance.welcomeSidebarContainerFrameMode;
    const frameColor = mode === 'none'
      ? 'transparent'
      : mode === 'accent'
        ? settings.uiAppearance.accentColor
        : settings.uiAppearance.welcomeSidebarContainerFrameColor || '#eee8d5';
    return {
      padding: '20px',
      marginTop: 'auto',
      background: settings.uiAppearance.welcomeSidebarContainerColor || 'transparent',
      borderTop: `1px solid ${frameColor}`
    };
  };


  const clampLauncherWindowBounds = (bounds: LauncherWindowBounds): LauncherWindowBounds => {
    const width = Math.max(420, Math.min(bounds.width, Math.max(420, window.innerWidth - 24)));
    const height = Math.max(260, Math.min(bounds.height, Math.max(260, window.innerHeight - 24)));
    return {
      width,
      height,
      x: Math.max(8, Math.min(Math.max(8, window.innerWidth - width - 8), bounds.x)),
      y: Math.max(48, Math.min(Math.max(48, window.innerHeight - height - 8), bounds.y))
    };
  };

  const rememberLauncherWindowBounds = (itemId: string, bounds: LauncherWindowBounds) => {
    launcherWindowBoundsRef.current.set(itemId, clampLauncherWindowBounds(bounds));
  };

  const getLauncherSpawnBounds = (index: number): LauncherWindowBounds => {
    const paletteWidth = leftPanelCollapsed ? collapsedLeftWidth : leftWidth;
    const preferredX = leftPanelPosition.x + paletteWidth + workspaceChrome.launcher.spawnOffset.x;
    const preferredY = leftPanelPosition.y + workspaceChrome.launcher.spawnOffset.y + ((index % 5) * workspaceChrome.launcher.cascadeOffset.y);
    return clampLauncherWindowBounds({
      x: preferredX,
      y: preferredY,
      width: workspaceChrome.launcher.defaultSize.width,
      height: workspaceChrome.launcher.defaultSize.height
    });
  };


  const openLauncherWindow = (item: MenuItem) => {
    setOpenLauncherWindows(current => {
      const next = new Map(current);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        launcherTopZRef.current += 1;
        const insertionIndex = launcherWindowCountRef.current++;
        const savedBounds = launcherWindowBoundsRef.current.get(item.id);
        const bounds = savedBounds
          ? clampLauncherWindowBounds(savedBounds)
          : getLauncherSpawnBounds(insertionIndex);
        rememberLauncherWindowBounds(item.id, bounds);
        next.set(item.id, {
          item,
          zIndex: launcherTopZRef.current,
          nestedTabs: {},
          tabId: item.children?.[0]?.id ?? null,
          insertionIndex,
          initialX: bounds.x,
          initialY: bounds.y,
          initialWidth: bounds.width,
          initialHeight: bounds.height
        });
      }
      return next;
    });
  };

  const openFicsHubWindow = () => {
    setOpenLauncherWindows(current => {
      launcherTopZRef.current += 1;
      const next = new Map(current);
      const existing = next.get(FICS_LAUNCHER_ITEM.id);

      if (existing) {
        next.set(FICS_LAUNCHER_ITEM.id, {
          ...existing,
          zIndex: launcherTopZRef.current,
          tabId: existing.tabId ?? FICS_LAUNCHER_ITEM.children?.[0]?.id ?? null
        });
        return next;
      }

      const insertionIndex = launcherWindowCountRef.current++;
      const savedBounds = launcherWindowBoundsRef.current.get(FICS_LAUNCHER_ITEM.id);
      const bounds = savedBounds
        ? clampLauncherWindowBounds(savedBounds)
        : getLauncherSpawnBounds(insertionIndex);
      rememberLauncherWindowBounds(FICS_LAUNCHER_ITEM.id, bounds);

      next.set(FICS_LAUNCHER_ITEM.id, {
        item: FICS_LAUNCHER_ITEM,
        zIndex: launcherTopZRef.current,
        nestedTabs: {},
        tabId: FICS_LAUNCHER_ITEM.children?.[0]?.id ?? null,
        insertionIndex,
        initialX: bounds.x,
        initialY: bounds.y,
        initialWidth: bounds.width,
        initialHeight: bounds.height
      });
      return next;
    });
    setNewGameOverlayOpen(false);
  };

  useEffect(() => {
    const handleOpenFics = () => openFicsHubWindow();
    window.addEventListener('chess-unleashed-open-fics', handleOpenFics);
    return () => window.removeEventListener('chess-unleashed-open-fics', handleOpenFics);
  });

  const closeLauncherWindow = (itemId: string) => {
    setOpenLauncherWindows(current => {
      const next = new Map(current);
      next.delete(itemId);
      return next;
    });
  };

  const focusLauncherWindow = (itemId: string) => {
    setOpenLauncherWindows(current => {
      if (!current.has(itemId)) return current;
      launcherTopZRef.current += 1;
      const next = new Map(current);
      next.set(itemId, { ...next.get(itemId)!, zIndex: launcherTopZRef.current });
      return next;
    });
  };

  const dockToWorkspace = (item: MenuItem, windowId: string) => {
    const entry = openLauncherWindows.get(windowId);
    setDockedPanels(current => {
      if (current.some(p => p.id === windowId)) return current;
      return [...current, {
        id: windowId,
        item,
        nestedTabs: entry?.nestedTabs ?? {},
        tabId: entry?.tabId ?? item.children?.[0]?.id ?? null,
        isMinimized: false
      }];
    });
    if (rightPanelCollapsed) setRightPanelCollapsed(false);
    closeLauncherWindow(windowId);
  };

  const closeDockedPanel = (id: string) => {
    setDockedPanels(current => current.filter(p => p.id !== id));
  };

  const toggleDockedPanelMinimized = (id: string) => {
    setDockedPanels(current => current.map(p => p.id === id ? { ...p, isMinimized: !p.isMinimized } : p));
  };

  const undockDockedPanel = (panel: DockedPanel) => {
    const insertionIndex = launcherWindowCountRef.current++;
    const savedBounds = launcherWindowBoundsRef.current.get(panel.id);
    const bounds = savedBounds
      ? clampLauncherWindowBounds(savedBounds)
      : getLauncherSpawnBounds(insertionIndex);

    rememberLauncherWindowBounds(panel.id, bounds);
    launcherTopZRef.current += 1;

    setOpenLauncherWindows(current => {
      const next = new Map(current);
      next.set(panel.id, {
        item: panel.item,
        zIndex: launcherTopZRef.current,
        nestedTabs: panel.nestedTabs,
        tabId: panel.tabId ?? panel.item.children?.[0]?.id ?? null,
        insertionIndex,
        initialX: bounds.x,
        initialY: bounds.y,
        initialWidth: bounds.width,
        initialHeight: bounds.height
      });
      return next;
    });

    setDockedPanels(current => current.filter(p => p.id !== panel.id));
  };

  const handleWindowDragEnd = (windowId: string, mousePos: { x: number; y: number }) => {
    // Priority 1: compatible launcher/nested tab rows
    let target: LauncherDockTarget | null = null;
    for (const dockTarget of tabRowRefs.current.values()) {
      if (dockTarget.windowId === windowId) continue;
      const rect = dockTarget.element.getBoundingClientRect();
      if (mousePos.x >= rect.left && mousePos.x <= rect.right &&
          mousePos.y >= rect.top && mousePos.y <= rect.bottom) {
        target = dockTarget;
        break;
      }
    }

    if (target) {
      setOpenLauncherWindows(current => {
        const detachedEntry = current.get(windowId);
        const targetEntry = current.get(target!.windowId);
        if (!detachedEntry || !targetEntry) return current;

        const next = new Map(current);
        if (target!.parentItemId) {
          const parentItem = targetEntry.item.children?.find(c => c.id === target!.parentItemId);
          const isCompatibleNested = parentItem?.children?.some(c => c.id === detachedEntry.item.id) ?? false;
          if (!isCompatibleNested) return current;
          next.delete(windowId);
          next.set(target!.windowId, {
            ...targetEntry,
            tabId: target!.parentItemId,
            nestedTabs: { ...targetEntry.nestedTabs, [target!.parentItemId]: detachedEntry.item.id }
          });
          return next;
        }

        const isCompatible = targetEntry.item.children?.some(c => c.id === detachedEntry.item.id) ?? false;
        if (!isCompatible) return current;
        next.delete(windowId);
        next.set(target!.windowId, { ...targetEntry, tabId: detachedEntry.item.id });
        return next;
      });
      return;
    }

    // Priority 2: right workspace panel
    if (rightPanelRef.current) {
      const rect = rightPanelRef.current.getBoundingClientRect();
      if (mousePos.x >= rect.left && mousePos.x <= rect.right &&
          mousePos.y >= rect.top && mousePos.y <= rect.bottom) {
        const entry = openLauncherWindows.get(windowId);
        if (entry && canDockToWorkspace(entry.item)) {
          dockToWorkspace(entry.item, windowId);
        }
      }
    }
  };

  useEffect(() => {
    const THRESHOLD = 8;

    const handleMouseMove = (e: MouseEvent) => {
      const drag = tabDragRef.current;
      if (!drag) return;

      if (drag.detached) {
        setTabDragPreview({ icon: drag.tabItem.icon, label: drag.tabItem.label, x: e.clientX, y: e.clientY });
        return;
      }

      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > THRESHOLD) {
        tabDragRef.current = { ...drag, detached: true };
        setTabDragPreview({ icon: drag.tabItem.icon, label: drag.tabItem.label, x: e.clientX, y: e.clientY });
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        document.body.classList.add('cu-tab-detach-dragging');
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const drag = tabDragRef.current;
      tabDragRef.current = null;
      setTabDragPreview(null);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = '';
      document.body.classList.remove('cu-tab-detach-dragging');
      if (!drag || !drag.detached) return;
      tabDetachSuppressClickRef.current = true;

      const dropBounds = clampLauncherWindowBounds({ x: e.clientX - 260, y: e.clientY - 30, width: 520, height: 420 });

      setOpenLauncherWindows(current => {
        const next = new Map(current);
        const sourceEntry = next.get(drag.sourceWindowId);

        if (!next.has(drag.tabItem.id)) {
          launcherTopZRef.current += 1;
          const insertionIndex = launcherWindowCountRef.current++;
          const savedBounds = launcherWindowBoundsRef.current.get(drag.tabItem.id);
          const bounds = savedBounds ? clampLauncherWindowBounds(savedBounds) : dropBounds;
          rememberLauncherWindowBounds(drag.tabItem.id, bounds);
          next.set(drag.tabItem.id, {
            item: drag.tabItem,
            zIndex: launcherTopZRef.current,
            nestedTabs: {},
            tabId: drag.tabItem.children?.[0]?.id ?? null,
            insertionIndex,
            initialX: bounds.x,
            initialY: bounds.y,
            initialWidth: bounds.width,
            initialHeight: bounds.height
          });
        }

        if (sourceEntry) {
          const sourceChildren = sourceEntry.item.children ?? [];
          if (sourceChildren.length <= 1) {
            next.delete(drag.sourceWindowId);
          } else if (sourceEntry.tabId === drag.tabItem.id) {
            const remaining = sourceChildren.filter(c => c.id !== drag.tabItem.id);
            next.set(drag.sourceWindowId, { ...sourceEntry, tabId: remaining[0]?.id ?? null });
          }
        }

        return next;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const getLauncherTabButtonStyle = (active: boolean): CSSProperties => ({
    padding: '7px 10px',
    borderRadius: '8px 8px 0 0',
    border: active
      ? `1px solid ${settings.uiAppearance.accentColor}`
      : isGlassWorkspace
        ? '1px solid rgba(148, 163, 184, 0.18)'
        : '1px solid #d0d7de',
    borderBottom: active
      ? `2px solid ${settings.uiAppearance.accentColor}`
      : isGlassWorkspace
        ? '1px solid rgba(148, 163, 184, 0.14)'
        : '1px solid #d0d7de',
    background: active
      ? (isGlassWorkspace ? 'rgba(14, 47, 72, 0.92)' : '#eef6ff')
      : (isGlassWorkspace ? 'rgba(10, 18, 32, 0.76)' : '#f6f8fa'),
    color: isGlassWorkspace ? '#dbeafe' : '#1f2937',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    maxWidth: 150,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis'
  });

  const getLauncherActionButtonStyle = (): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
    padding: '9px 11px',
    borderRadius: 8,
    border: isGlassWorkspace ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid #d0d7de',
    background: isGlassWorkspace ? 'rgba(10, 20, 38, 0.72)' : '#ffffff',
    color: isGlassWorkspace ? '#dbeafe' : '#1f2937',
    cursor: 'pointer',
    fontSize: '0.82rem',
    textAlign: 'left'
  });

  const openPackageLoadFlow = () => {
    setPackageManagerMode('import');
    setPackageManagerAction('load');
    setPackageManagerActionId(current => current + 1);
    setPackageManagerOpen(true);
  };

  const openPackageSaveFlow = () => {
    setPackageManagerMode('export');
    setPackageManagerAction('save');
    setPackageManagerActionId(current => current + 1);
    setPackageManagerOpen(true);
  };

  // Shared leaf-content renderer for both floating windows and docked panels.
  // Registry owns actionId -> view/component mapping. App only embeds what the registry provides.
  const renderLeafItemContent = (menuItem: MenuItem, onClose: () => void): ReactNode => {
    const handleEmbeddedCloseCapture = (event: React.MouseEvent<HTMLElement>) => {
      const button = (event.target as HTMLElement).closest('button');
      if (!button) return;
      const closeText = button.textContent?.trim().toLowerCase();
      const closeTitle = button.getAttribute('title')?.trim().toLowerCase();
      if (closeText !== 'close' && closeTitle !== 'close') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };

    if (menuItem.type === 'overlay' && menuItem.component) {
      const OverlayComp = menuItem.component;
      return (
        <div className="cu-view-shell cu-themed-embedded-view" onClickCapture={handleEmbeddedCloseCapture}>
          <OverlayComp registerCloseAttempt={(_fn: () => void) => {}} closeOverlay={onClose} />
        </div>
      );
    }

    if (menuItem.actionId) {
      const vc = getWorkspaceActionViewConfig(menuItem.actionId);
      if (vc) {
        const VC = vc.component;
        return (
          <div className="cu-view-shell cu-themed-embedded-view" onClickCapture={handleEmbeddedCloseCapture}>
            <VC />
          </div>
        );
      }
      return (
        <div style={{ padding: '12px' }}>
          <div className="launcher-action-card">
            <button type="button" onClick={() => handleMenuAction(menuItem.actionId!)} style={getLauncherActionButtonStyle()}>
              <span>{menuItem.icon} {menuItem.label}</span><span>Open</span>
            </button>
          </div>
        </div>
      );
    }
    return (
      <div style={{ padding: '12px' }}>
        <div className="launcher-action-card"><p>No action is registered for this item yet.</p></div>
      </div>
    );
  };

  const activeLeftPanelWidth = leftPanelCollapsed ? collapsedLeftWidth : leftWidth;
  const activityHudLeft = leftPanelPosition.x + activeLeftPanelWidth + workspaceChrome.safeAreas.panelGap;
  const metaHudRight = rightPanelCollapsed
    ? workspaceChrome.safeAreas.outerMargin
    : rightWidth + workspaceChrome.safeAreas.panelGap;
  const hudBottom = workspaceChrome.safeAreas.bottomInset;

  return (
    <div
      className="App"
      data-sidebar-style={settings.uiAppearance.sidebarStyle}
      data-density={settings.uiAppearance.density}
      style={{
        fontSize: `${settings.uiAppearance.baseFontSize}px`,
        fontFamily: settings.uiAppearance.fontFamily,
        backgroundColor: settings.uiAppearance.appBackgroundColor,
        '--cu-accent': settings.uiAppearance.accentColor,
        '--cu-btn-radius': `${getButtonRadius()}px`,
        '--cu-glass-panel-bg': glassPanelBg,
        '--cu-hud-z': workspaceChrome.zIndex.hud,
        '--cu-side-panel-z': workspaceChrome.zIndex.sidePanels,
      } as CSSProperties}
    >
      <header className="app-header" style={{ backgroundColor: settings.uiAppearance.toolbarBackgroundColor }}>
        <div className="topbar-left">
          <div className="app-brand" aria-label="Chess Unleashed">
            <span className="app-brand-icon">♔</span>
            <span className="app-brand-name">Chess Unleashed</span>
          </div>
          <div className="topbar-actions" aria-label="File actions">
            <button type="button" onClick={() => setNewGameOverlayOpen(true)} title="Start a new game"><span>▤</span><span>New</span></button>
            <button type="button" onClick={openPackageLoadFlow} title="Open a Chess Unleashed package"><span>▰</span><span>Open</span></button>
            <button type="button" onClick={openPackageSaveFlow} title="Save current setup as a package"><span>▣</span><span>Save</span></button>
          </div>
        </div>
        <div className="topbar-center" aria-label="Current game status">
          <span className="topbar-label">MODE</span>
          <span className="topbar-mode-pill" title={modeLabel}>{modeLabel}</span>
          <span className="topbar-divider" />
          <span className="topbar-label">SAVE</span>
          <span className="topbar-status-pill" title="Settings are persisted to local storage">{autosaveStatus}</span>
        </div>
        <div className="topbar-right">
          {multiplayer.isConnected && (
            <div
              className="topbar-sync-pill"
              style={{ background: isUnified ? '#166534' : '#92400e' }}
            >
              {isUnified ? '✓ Unified' : '⚠ Independent'}
            </div>
          )}
          {activeTip && (
            <div className="topbar-tip" title={activeTip}>
              <span>💡</span><span>{activeTip}</span>
            </div>
          )}
          <button
            type="button"
            className="topbar-icon-btn"
            title="Open About / Support"
            onClick={() => {
              if (!settings.activeViews.includes('about-support')) toggleView('about-support');
            }}
          >
            ?
          </button>
          <div className="game-status-pill" title={displayStatus}>{displayStatus}</div>
          {!activeCustomRuleset && !isTerminalGame && (
            <button
              onClick={() => resignGame(multiplayer.playerColor || gameState.turn)}
              className="topbar-danger-btn"
            >
              Resign
            </button>
          )}
          <button
            type="button"
            className="header-profile-badge"
            onClick={() => {
              if (!settings.activeViews.includes('profile')) toggleView('profile');
            }}
            title="Open Profile"
          >
            {localProfile.profileImage ? (
              <img src={localProfile.profileImage} alt="" className="header-avatar" />
            ) : (
              <div className="header-avatar-placeholder">
                {(localProfile.displayName || 'G')[0].toUpperCase()}
              </div>
            )}
            <div className="header-profile-text">
              <span className="header-profile-name">{localProfile.displayName || 'Guest Player'}</span>
              <span className="header-guest-label">{localProfile.isGuest ? 'Guest' : 'Official'}</span>
            </div>
          </button>
          <button
            onClick={toggleRightPanel}
            className="mobile-only-btn"
            style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem' }}
          >
            ☰
          </button>
        </div>
      </header>
      <AudioController />

      <Overlay
        isOpen={resetConfirmationOpen}
        onClose={() => setResetConfirmationOpen(false)}
        title="Reset System"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '0.9rem', color: '#2c3e50', lineHeight: 1.45 }}>
            This will reset Chess Unleashed to system defaults. Unsaved settings, imported themes, and current games may be lost. Are you sure?
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>
            To restart the server, stop and rerun node server/chessServer.js.
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setResetConfirmationOpen(false)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #d0d7de', background: '#fff', color: '#2c3e50', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
                clearErrorLogEntries();
                window.location.reload();
              }}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #b42318', background: '#b42318', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
            >
              Reset System
            </button>
          </div>
        </div>
      </Overlay>

      <Overlay
        isOpen={newGameOverlayOpen}
        onClose={() => setNewGameOverlayOpen(false)}
        title="Let's Play!"
      >
        <LetsPlaySetupView
          closeOverlay={() => setNewGameOverlayOpen(false)}
          onOpenFicsWindow={openFicsHubWindow}
        />
      </Overlay>

      <Overlay
        isOpen={packageManagerOpen}
        onClose={() => setPackageManagerOpen(false)}
        title="Package Manager"
      >
        <ImportExportView
          closeOverlay={() => setPackageManagerOpen(false)}
          initialMode={packageManagerMode}
          autoAction={packageManagerAction}
          actionRequestId={packageManagerActionId}
        />
      </Overlay>

      {activeMobileSection && (
        <MobileMenuSheet
          sectionId={activeMobileSection}
          onClose={() => setActiveMobileSection(null)}
          onAction={handleMenuAction}
        />
      )}

      <div
        className="workspace-container"
        style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        {/* Template background layers fill the full workspace */}
        <div data-layer="background-color" style={{ ...getLayerColorStyles(background), zIndex: 0 }} />
        <div data-layer="background-image" style={{ ...getLayerImageStyles(background), zIndex: 0 }} />

        <div
          className="layout-grid workspace-grid"
          style={{
            gridTemplateColumns: '1fr',
            position: 'relative',
            zIndex: 1
          }}
        >
        <main ref={centerPanelRef} className="center-panel" style={{ position: 'relative' }}>
          <div data-layer="frame-image" style={{ ...getFrameLayerImageStyles(frameLayer), zIndex: 2 }} />
          {showGameEndOverlay && (
            <GameEndOverlay
              gameState={gameState}
              timeoutResult={timeoutResult}
              resignationResult={resignationResult}
              playerColor={multiplayer.playerColor}
              onRematch={resetGame}
              onNewGame={handleNewGame}
              onDismiss={() => setDismissedGameEndOverlay(true)}
            />
          )}

          <div
            style={{
              position: 'relative',
              overflow: 'visible',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 4
            }}
          >
            {ActiveCenterWorkspaceView ? (
              <div className="cu-view-shell cu-themed-embedded-view" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                <ActiveCenterWorkspaceView />
              </div>
            ) : (
              <div ref={timerDragBounds} data-layer="outer-wrapper" className="workspace-board-area" style={{ position: 'relative', padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', maxWidth: '100%', boxSizing: 'border-box' }}>
                {/* TODO: future timer behavior modes can add jumping or event-driven placement without changing TimerView. */}
                {isDraggableTimer && (
                  <div
                    ref={draggableTimerRef}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      const rect = draggableTimerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      timerDragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                      setIsTimerDragging(true);
                      document.body.style.cursor = 'move';
                    }}
                    style={{
                      position: 'absolute',
                      left: draggableTimerPosition.x,
                      top: draggableTimerPosition.y,
                      zIndex: 6,
                      cursor: 'move',
                      maxWidth: 'min(520px, calc(100% - 16px))',
                      touchAction: 'none'
                    }}
                  >
                    <TimerView displayMode="center" />
                  </div>
                )}
                {showBoardTimer && !isDraggableTimer && effectiveTimerPlacement === 'top' && (
                  <TimerView displayMode="center" />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', columnGap: '12px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
                    {showBoardTimer && !isDraggableTimer && effectiveTimerPlacement === 'left' && (
                      <TimerView displayMode="side" />
                    )}
                  </div>
				 <div
                    ref={boardWrapperRef}
                    data-layer="board-wrapper"
                    className="workspace-board-shell workspace-board-shell-draggable"
                    title="Drag the glass frame to move the board"
                    onMouseDown={(event) => {
                      if (event.button !== 0) return;
                      if ((event.target as HTMLElement).closest('[data-board-content="true"]')) return;
                      isDraggingBoardShell.current = true;
                      boardShellDragOffset.current = {
                        x: event.clientX - boardDragPosition.x,
                        y: event.clientY - boardDragPosition.y
                      };
                      document.body.style.cursor = 'grabbing';
                      document.body.style.userSelect = 'none';
                    }}
                    onDoubleClick={(event) => {
                      if ((event.target as HTMLElement).closest('[data-board-content="true"]')) return;
                      setBoardDragPosition(workspaceChrome.board.defaultOffset);
                    }}
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      padding: '20px',
                      transform: `translate(${boardDragPosition.x}px, ${boardDragPosition.y}px) scale(${workspaceScale / 100})`,
                      transformOrigin: 'center center',
                      cursor: 'grab',
                      touchAction: 'none'
                    }}
                  >
                    <div data-board-content="true" style={{ position: 'relative', zIndex: 2, cursor: 'default' }}>
                      {activeCustomRuleset ? (
                        <CustomGameRuntimeView
                          ruleset={activeCustomRuleset}
                          onEnd={() => {
                            clearGameSnapshot();
                            setActiveCustomRulesetId(null);
                          }}
                        />
                      ) : (
                        <ChessBoard
                          orientation={activeControlMode === 'b' ? 'b' : 'w'}
                          controlMode={activeControlMode}
                        />
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
                    {showBoardTimer && !isDraggableTimer && effectiveTimerPlacement === 'right' && (
                      <TimerView displayMode="side" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {settings.activeViews.includes('chat') && (
            <ChatContainer requiredPosition="bottom" />
          )}

          {workspaceActivityVisible ? (
            <div
              className="workspace-bottom-strip workspace-hud-panel workspace-activity-hud mobile-hidden"
              aria-label="Workspace activity status"
              onMouseEnter={() => setWorkspaceHudHover('activity')}
              onMouseLeave={() => setWorkspaceHudHover(current => current === 'activity' ? null : current)}
              onMouseDown={(event) => {
                if (event.button !== 0) return;
                if ((event.target as HTMLElement).closest('button')) return;
                workspaceHudDragRef.current = {
                  panel: 'activity',
                  x: event.clientX,
                  y: event.clientY,
                  startX: workspaceActivityPosition.x,
                  startY: workspaceActivityPosition.y
                };
                document.body.style.cursor = 'move';
                document.body.style.userSelect = 'none';
              }}
              style={{
                position: 'absolute',
                left: activityHudLeft,
                right: 'auto',
                bottom: hudBottom,
                width: 'auto',
                maxWidth: 'calc(100vw - 48px)',
                zIndex: workspaceChrome.zIndex.hud,
                pointerEvents: 'auto',
                transform: `translate(${workspaceActivityPosition.x}px, ${workspaceActivityPosition.y}px)`,
                cursor: 'move'
              }}
            >
              <div className="recent-activity-card">
                <span>Recent Activity</span>
                <strong>{displayStatus}</strong>
                <span>{workspaceSummary}</span>
                <button
                  type="button"
                  onClick={() => setWorkspaceActivityVisible(false)}
                  title="Hide activity status"
                  style={{ opacity: workspaceHudHover === 'activity' ? 1 : 0, pointerEvents: workspaceHudHover === 'activity' ? 'auto' : 'none', transition: 'opacity 120ms ease' }}
                >×</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="workspace-status-restore mobile-hidden"
              onClick={() => setWorkspaceActivityVisible(true)}
              title="Show activity status"
              style={{
                position: 'absolute',
                left: activityHudLeft,
                right: 'auto',
                bottom: hudBottom,
                width: 'auto',
                zIndex: workspaceChrome.zIndex.hud,
                pointerEvents: 'auto'
              }}
            >
              Activity
            </button>
          )}

          {workspaceMetaVisible ? (
            <div
              className="workspace-bottom-strip workspace-hud-panel workspace-meta-hud mobile-hidden"
              aria-label="Workspace board controls"
              onMouseEnter={() => setWorkspaceHudHover('meta')}
              onMouseLeave={() => setWorkspaceHudHover(current => current === 'meta' ? null : current)}
              onMouseDown={(event) => {
                if (event.button !== 0) return;
                if ((event.target as HTMLElement).closest('button')) return;
                workspaceHudDragRef.current = {
                  panel: 'meta',
                  x: event.clientX,
                  y: event.clientY,
                  startX: workspaceMetaPosition.x,
                  startY: workspaceMetaPosition.y
                };
                document.body.style.cursor = 'move';
                document.body.style.userSelect = 'none';
              }}
              style={{
                position: 'absolute',
                left: 'auto',
                right: metaHudRight,
                bottom: hudBottom,
                width: 'auto',
                maxWidth: 'calc(100vw - 48px)',
                zIndex: workspaceChrome.zIndex.hud,
                pointerEvents: 'auto',
                transform: `translate(${workspaceMetaPosition.x}px, ${workspaceMetaPosition.y}px)`,
                cursor: 'move'
              }}
            >
              <div className="workspace-bottom-meta">
                <span>Board: {activeCustomRuleset ? 'Custom' : 'Standard'}</span>
                <span>Timer: {timerStatusLabel}</span>
                <span>Scale: {workspaceScale}%</span>
                <button type="button" onClick={() => setWorkspaceScale(value => Math.max(workspaceChrome.board.minScale, value - workspaceChrome.board.scaleStep))} title="Zoom board out">−</button>
                <button type="button" onClick={() => setWorkspaceScale(workspaceChrome.board.defaultScale)} title="Reset board zoom">100</button>
                <button type="button" onClick={() => setWorkspaceScale(value => Math.min(workspaceChrome.board.maxScale, value + workspaceChrome.board.scaleStep))} title="Zoom board in">+</button>
                <button
                  type="button"
                  onClick={() => setWorkspaceMetaVisible(false)}
                  title="Hide board controls"
                  style={{ opacity: workspaceHudHover === 'meta' ? 1 : 0, pointerEvents: workspaceHudHover === 'meta' ? 'auto' : 'none', transition: 'opacity 120ms ease' }}
                >×</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="workspace-status-restore mobile-hidden"
              onClick={() => setWorkspaceMetaVisible(true)}
              title="Show board controls"
              style={{
                position: 'absolute',
                left: 'auto',
                right: metaHudRight,
                bottom: hudBottom,
                width: 'auto',
                zIndex: workspaceChrome.zIndex.hud,
                pointerEvents: 'auto'
              }}
            >
              Controls
            </button>
          )}
        </main>
        </div>

        {/* Floating left dock */}
        <aside
          className={`left-panel left-panel-float left-panel-floating-rail ${leftPanelCollapsed ? 'left-panel-collapsed' : ''} mobile-hidden`}
          style={{
            ...getSidePanelStyles(),
            position: 'absolute',
            left: leftPanelPosition.x,
            top: leftPanelPosition.y,
            height: effectiveLeftPanelHeight,
            width: `${leftPanelCollapsed ? collapsedLeftWidth : leftWidth}px`,
            zIndex: workspaceChrome.zIndex.sidePanels,
            transition: 'width 0.22s ease, transform 0.22s ease, opacity 0.22s ease',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div
            className="panel-header left-panel-floating-header"
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              if ((event.target as HTMLElement).closest('button')) return;
              isDraggingLeftPanel.current = true;
              leftPanelDragOffset.current = {
                x: event.clientX - leftPanelPosition.x,
                y: event.clientY - leftPanelPosition.y
              };
              document.body.style.cursor = 'move';
              document.body.style.userSelect = 'none';
            }}
            title="Drag tool palette"
            style={{
              borderTop: `3px solid ${settings.uiAppearance.accentColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
              cursor: 'move',
              userSelect: 'none'
            }}
          >
            {!leftPanelCollapsed && <span>Tool Palette</span>}
            <button
              className="left-panel-collapse-button"
              onClick={() => setLeftPanelCollapsed(current => !current)}
              title={leftPanelCollapsed ? 'Expand launcher' : 'Collapse launcher'}
              style={{ borderRadius: getButtonRadius(), marginLeft: 'auto' }}
            >
              {leftPanelCollapsed ? '›' : '‹'}
            </button>
          </div>
          <DynamicMenu
            items={MENU_SCHEMA}
            onAction={handleMenuAction}
            onRootItemSelect={openLauncherWindow}
            activeRootItemIds={[...openLauncherWindows.keys()]}
          />
          {!leftPanelCollapsed && (
            <div
              className="welcome-sidebar-container"
              style={getWelcomeContainerStyles()}
            >
              <WelcomeView />
            </div>
          )}
          <div
            className="left-panel-resize-handle"
            title="Resize tool palette width"
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              isResizingLeftPanel.current = true;
              leftPanelResizeStart.current = {
                x: event.clientX,
                width: leftPanelCollapsed ? collapsedLeftWidth : leftWidth
              };
              document.body.style.cursor = 'ew-resize';
              document.body.style.userSelect = 'none';
            }}
          />
          <div
            className="left-panel-resize-handle-y"
            title="Resize tool palette height"
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              isResizingLeftPanelHeight.current = true;
              leftPanelHeightResizeStart.current = { y: event.clientY, height: leftPanelHeight };
              document.body.style.cursor = 'ns-resize';
              document.body.style.userSelect = 'none';
            }}
          />
        </aside>

        {[...openLauncherWindows.values()].map((entry) => {
          const { item, zIndex, nestedTabs, tabId, insertionIndex, initialX, initialY, initialWidth, initialHeight } = entry;
          const activeTab = item.children?.find(c => c.id === tabId) ?? item.children?.[0] ?? null;

          const setNestedTab = (parentId: string, childId: string) => {
            setOpenLauncherWindows(current => {
              const e = current.get(item.id);
              if (!e) return current;
              const next = new Map(current);
              next.set(item.id, { ...e, nestedTabs: { ...e.nestedTabs, [parentId]: childId } });
              return next;
            });
          };

          const setTabId = (newTabId: string) => {
            setOpenLauncherWindows(current => {
              const e = current.get(item.id);
              if (!e) return current;
              const next = new Map(current);
              next.set(item.id, { ...e, tabId: newTabId });
              return next;
            });
          };

          const getActiveChildFor = (menuItem: MenuItem): MenuItem | null => {
            if (!menuItem.children?.length) return null;
            const id = nestedTabs[menuItem.id] ?? menuItem.children[0].id;
            return menuItem.children.find(c => c.id === id) ?? menuItem.children[0];
          };

          const renderContent = (menuItem: MenuItem): ReactNode => {
            if (menuItem.children?.length) {
              const activeChild = getActiveChildFor(menuItem);
              return (
                <div className="launcher-nested-tab-panel">
                  <div
                    className="launcher-nested-tab-row"
                    role="tablist"
                    aria-label={`${menuItem.label} tabs`}
                    data-launcher-dock-target={`${item.id}::${menuItem.id}`}
                    ref={(el) => {
                      const dockId = `${item.id}::${menuItem.id}`;
                      if (el) tabRowRefs.current.set(dockId, { windowId: item.id, parentItemId: menuItem.id, element: el });
                      else tabRowRefs.current.delete(dockId);
                    }}
                  >
                    {menuItem.children.map(child => (
                      <button
                        key={child.id}
                        type="button"
                        role="tab"
                        aria-selected={activeChild?.id === child.id}
                        className={`launcher-nested-tab ${activeChild?.id === child.id ? 'active' : ''}`}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          tabDragRef.current = { sourceWindowId: item.id, tabItem: child, parentItemId: menuItem.id, startX: e.clientX, startY: e.clientY, detached: false };
                        }}
                        onClick={() => {
                          if (tabDetachSuppressClickRef.current) { tabDetachSuppressClickRef.current = false; return; }
                          setNestedTab(menuItem.id, child.id);
                        }}
                        title={`${child.label} — drag to detach`}
                        style={{ ...getLauncherTabButtonStyle(activeChild?.id === child.id), cursor: 'grab' }}
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="launcher-nested-tab-content cu-scroll-area">
                    {activeChild && renderContent(activeChild)}
                  </div>
                </div>
              );
            }

            return renderLeafItemContent(menuItem, () => closeLauncherWindow(item.id));
          };

          return (
            <FloatingWindow
              key={item.id}
              title={<><span>{item.icon}</span><strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</strong></>}
              onClose={() => closeLauncherWindow(item.id)}
              initialPosition={{ x: initialX ?? getLauncherSpawnBounds(insertionIndex).x, y: initialY ?? getLauncherSpawnBounds(insertionIndex).y }}
              initialSize={{ width: initialWidth ?? workspaceChrome.launcher.defaultSize.width, height: initialHeight ?? workspaceChrome.launcher.defaultSize.height }}
              zIndex={zIndex}
              onFocusRequest={() => focusLauncherWindow(item.id)}
              onBoundsChange={(bounds) => rememberLauncherWindowBounds(item.id, bounds)}
              onDragEnd={(pos) => handleWindowDragEnd(item.id, pos)}
              onDock={canDockToWorkspace(item) ? () => dockToWorkspace(item, item.id) : undefined}
            >
              {item.children?.length ? (
                <>
                  <div
                    className="launcher-window-tab-row"
                    role="tablist"
                    aria-label={`${item.label} tabs`}
                    data-launcher-dock-target={item.id}
                    ref={(el) => { if (el) tabRowRefs.current.set(item.id, { windowId: item.id, element: el }); else tabRowRefs.current.delete(item.id); }}
                  >
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab?.id === child.id}
                        className={`launcher-window-tab ${activeTab?.id === child.id ? 'active' : ''}`}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          tabDragRef.current = { sourceWindowId: item.id, tabItem: child, startX: e.clientX, startY: e.clientY, detached: false };
                        }}
                        onClick={() => {
                          if (tabDetachSuppressClickRef.current) { tabDetachSuppressClickRef.current = false; return; }
                          setTabId(child.id);
                        }}
                        title={`${child.label} — drag to detach`}
                        style={{ ...getLauncherTabButtonStyle(activeTab?.id === child.id), cursor: 'grab' }}
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="launcher-window-content cu-scroll-area">
                    {activeTab && renderContent(activeTab)}
                  </div>
                </>
              ) : (
                <div className="launcher-window-content cu-scroll-area">
                  {renderContent(item)}
                </div>
              )}
            </FloatingWindow>
          );
        })}

        {tabDragPreview && (
          <div
            className="launcher-tab-drag-preview"
            style={{ left: tabDragPreview.x + 14, top: tabDragPreview.y + 14 }}
            aria-hidden="true"
          >
            <div className="launcher-tab-drag-preview-shell">
              <span>{tabDragPreview.icon}</span>
              <strong>{tabDragPreview.label}</strong>
            </div>
          </div>
        )}

        {activeLauncherOverlay && activeLauncherOverlay.component && (
          <Overlay
            isOpen={!!activeLauncherOverlay}
            onClose={() => {
              setActiveLauncherOverlay(null);
              setLauncherOverlayCloseRequest(null);
            }}
            onCloseAttempt={launcherOverlayCloseRequest || undefined}
            title={activeLauncherOverlay.overlayTitle || activeLauncherOverlay.label}
          >
            {(() => {
              const LauncherOverlayComponent = activeLauncherOverlay.component!;
              return (
                <LauncherOverlayComponent
                  registerCloseAttempt={(fn: () => void) => setLauncherOverlayCloseRequest(() => fn)}
                  closeOverlay={() => {
                    setActiveLauncherOverlay(null);
                    setLauncherOverlayCloseRequest(null);
                  }}
                />
              );
            })()}
          </Overlay>
        )}

        <aside
          ref={(el) => { rightPanelRef.current = el; }}
          className={`right-panel right-panel-float ${rightPanelOpen ? 'open' : ''}`}
          style={{
            ...getSidePanelStyles(),
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100%',
            width: `${rightWidth}px`,
            zIndex: workspaceChrome.zIndex.sidePanels,
            transform: rightPanelCollapsed ? `translateX(${rightWidth}px)` : 'translateX(0)',
            transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Left-edge resize handle */}
          <div
            className="right-panel-resizer"
            onMouseDown={() => {
              isDraggingRight.current = true;
              document.body.style.cursor = 'col-resize';
            }}
          />
          <div
            className="panel-header"
            style={{
              borderTop: `3px solid ${settings.uiAppearance.accentColor}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>Workspace</span>
            <button
              onClick={toggleRightPanel}
              title="Collapse workspace panel"
              style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: getButtonRadius() }}
            >
              ›
            </button>
          </div>
          <div className="workspace-panel-body" style={{ padding: `${densitySpacing}px`, flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {dockedPanels.length > 0 && (
              <div className="docked-panels-stack">
                {dockedPanels.map(panel => {
                  const { item, nestedTabs, tabId, isMinimized } = panel;
                  const activeTab = item.children?.find(c => c.id === tabId) ?? item.children?.[0] ?? null;

                  const renderPanelSection = (menuItem: MenuItem): ReactNode => {
                    if (menuItem.children?.length) {
                      const activeChild = menuItem.children.find(
                        c => c.id === (nestedTabs[menuItem.id] ?? menuItem.children![0]?.id)
                      ) ?? menuItem.children[0];
                      return (
                        <div className="launcher-nested-tab-panel">
                          <div className="launcher-nested-tab-row">
                            {menuItem.children.map(child => (
                              <button
                                key={child.id}
                                type="button"
                                className={`launcher-nested-tab ${activeChild?.id === child.id ? 'active' : ''}`}
                                style={getLauncherTabButtonStyle(activeChild?.id === child.id)}
                                onClick={() => setDockedPanels(cur => cur.map(p =>
                                  p.id === panel.id ? { ...p, nestedTabs: { ...p.nestedTabs, [menuItem.id]: child.id } } : p
                                ))}
                              >
                                {child.icon}<span>{child.label}</span>
                              </button>
                            ))}
                          </div>
                          <div className="launcher-nested-tab-content cu-scroll-area">
                            {activeChild && renderPanelSection(activeChild)}
                          </div>
                        </div>
                      );
                    }
                    return renderLeafItemContent(menuItem, () => closeDockedPanel(panel.id));
                  };

                  return (
                    <div key={panel.id} className="docked-panel">
                      <div className="docked-panel-header" style={{ borderTop: `3px solid ${settings.uiAppearance.accentColor}` }}>
                        <span style={{ opacity: 0.72, flexShrink: 0 }}>{item.icon}</span>
                        <strong style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{item.label}</strong>
                        <button
                          type="button"
                          onClick={() => undockDockedPanel(panel)}
                          title="Undock panel"
                          aria-label="Undock panel"
                          style={{ padding: '2px 8px', fontSize: '0.8rem', borderRadius: getButtonRadius(), flexShrink: 0, minWidth: '32px' }}
                        >
                          ↗
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleDockedPanelMinimized(panel.id)}
                          title={isMinimized ? 'Restore' : 'Minimize'}
                          style={{ padding: '2px 6px', fontSize: '0.7rem', borderRadius: getButtonRadius(), flexShrink: 0 }}
                        >
                          {isMinimized ? '▶' : '▼'}
                        </button>
                        <button
                          type="button"
                          onClick={() => closeDockedPanel(panel.id)}
                          title="Close panel"
                          style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: getButtonRadius(), flexShrink: 0 }}
                        >
                          ✕
                        </button>
                      </div>
                      {!isMinimized && item.children?.length && (
                        <div className="launcher-window-tab-row docked-panel-tab-row">
                          {item.children.map(child => (
                            <button
                              key={child.id}
                              type="button"
                              className={`launcher-window-tab ${activeTab?.id === child.id ? 'active' : ''}`}
                              style={getLauncherTabButtonStyle(activeTab?.id === child.id)}
                              onClick={() => setDockedPanels(cur => cur.map(p =>
                                p.id === panel.id ? { ...p, tabId: child.id } : p
                              ))}
                            >
                              {child.icon}<span>{child.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {!isMinimized && (
                        <div className="docked-panel-body cu-scroll-area">
                          {item.children?.length
                            ? (activeTab ? renderPanelSection(activeTab) : null)
                            : renderPanelSection(item)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <ViewManager />
          </div>
        </aside>

        {/* Activator tab — visible when panel is collapsed */}
        <button
          className="right-panel-activator mobile-hidden"
          onClick={() => setRightPanelCollapsed(false)}
          title="Open workspace panel"
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            zIndex: 201,
            padding: '6px 4px',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'translateY(-50%)',
            opacity: rightPanelCollapsed ? 1 : 0,
            pointerEvents: rightPanelCollapsed ? 'auto' : 'none',
            transition: 'opacity 0.2s',
            fontSize: '0.68rem',
            letterSpacing: '0.06em',
            cursor: 'pointer',
            borderRadius: `${getButtonRadius()}px 0 0 ${getButtonRadius()}px`,
            backgroundColor: isGlassWorkspace ? 'rgba(2,6,23,0.82)' : settings.uiAppearance.toolbarBackgroundColor,
            color: isGlassWorkspace ? '#94a3b8' : '#e5edf7',
            border: `1px solid ${isGlassWorkspace ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.12)'}`,
            borderRight: 'none'
          }}
        >
          ‹ Workspace
        </button>
      </div>

      <div className="mobile-bottom-nav mobile-only">
        <div className="mobile-nav-item" onClick={() => setActiveMobileSection('appearance')}>🎨 Look</div>
        <div className="mobile-nav-item" onClick={() => setActiveMobileSection('audio-config')}>🎵 Audio</div>
        <div className="mobile-nav-item" onClick={() => setActiveMobileSection('gamemodes')}>♟️ Play</div>
        <div className="mobile-nav-item" onClick={toggleRightPanel}>👁️ View</div>
      </div>

      {settings.activeViews.includes('chat') && (
        <ChatContainer requiredPosition="floating" />
      )}
    </div>
  );
}

function App() {
  return (
    <AudioProvider>
      <SettingsProvider>
        <GameProvider>
          <MainLayout />
        </GameProvider>
      </SettingsProvider>
    </AudioProvider>
  );
}

export default App;
