export interface PieceVariantRule {
  threshold: number;
  operator: '>=' | '<=' | '>' | '<' | '=';
  image: string;
}

export interface PieceThemeConfig {
  type: 'builtin' | 'custom';
  builtinSet: string;
  customPieces: Record<string, string>;
  customVariants: Record<string, PieceVariantRule[]>;
}

export interface LayerConfig {
  color: string;
  image: string;
  opacity: number;
  repeat: 'repeat' | 'no-repeat' | 'space' | 'round' | 'centered';
  size: 'auto' | 'cover' | 'contain' | string;
  xOffset?: number;
  yOffset?: number;
  scale?: number;
}

export interface TimerAppearanceConfig {
  face: 'digital';
  fontFamily: string;
  fontSize: number;
  activeColor: string;
  inactiveColor: string;
  backgroundColor: string;
  borderColor: string;
}

export interface AudioControllerAppearanceConfig {
  layout: 'compact';
  shape: 'rounded' | 'square';
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  sliderColor: string;
  barStyle: 'bars';
  controlStyle: 'buttons';
  controlImages?: {
    play?: string;
    pause?: string;
    stop?: string;
    previous?: string;
    next?: string;
    sliderThumb?: string;
    sliderTrack?: string;
  };
}

export interface Template {
  id: string;
  name: string;
  boardColors: {
    light: string;
    dark: string;
    selected: string;
    moveTarget: string;
  };
  pieceThemeMode: 'unified' | 'team';
  pieceTheme: PieceThemeConfig;
  whitePieceTheme?: PieceThemeConfig;
  blackPieceTheme?: PieceThemeConfig;
  pieceSet: string; // Legacy support
  pathStyle: {
    icon: 'dot' | 'diamond' | 'square';
    colors: Record<string, string>;
  };
  badgeColors: {
    defender: string;
    attacker: string;
  };
  boardOverlay: {
    image: string;
    opacity: number;
  };
  background: LayerConfig;
  frameLayer: LayerConfig;
  timerAppearance: TimerAppearanceConfig;
  audioControllerAppearance: AudioControllerAppearanceConfig;
  backgroundColor: string;
}

const defaultPieceTheme: PieceThemeConfig = {
  type: 'builtin',
  builtinSet: 'cburnett',
  customPieces: {
    wp: '', wn: '', wb: '', wr: '', wq: '', wk: '',
    bp: '', bn: '', bb: '', br: '', bq: '', bk: ''
  },
  customVariants: {}
};

const defaultLayer: LayerConfig = {
  color: '#f5f5f5',
  image: '',
  opacity: 1,
  repeat: 'no-repeat',
  size: 'cover',
  xOffset: 0,
  yOffset: 0,
  scale: 100
};

const defaultTimerAppearance: TimerAppearanceConfig = {
  face: 'digital',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: 16,
  activeColor: '#2c3e50',
  inactiveColor: '#7f8c8d',
  backgroundColor: '#ffffff',
  borderColor: '#dcdde1'
};

const defaultAudioControllerAppearance: AudioControllerAppearanceConfig = {
  layout: 'compact',
  shape: 'rounded',
  accentColor: '#3498db',
  backgroundColor: '#ffffff',
  textColor: '#2c3e50',
  sliderColor: '#3498db',
  barStyle: 'bars',
  controlStyle: 'buttons',
  controlImages: {}
};

export const defaultTemplate: Template = {
  id: 'default',
  name: 'Standard Theme',
  boardColors: {
    light: '#f0d9b5',
    dark: '#b58863',
    selected: '#ffeb3b',
    moveTarget: '#c8e6c9',
  },
  pieceThemeMode: 'unified',
  pieceTheme: { ...defaultPieceTheme },
  whitePieceTheme: { ...defaultPieceTheme },
  blackPieceTheme: { ...defaultPieceTheme },
  pieceSet: 'cburnett',
  pathStyle: {
    icon: 'dot',
    colors: {
      p: '#9e9e9e',
      n: '#2196f3',
      b: '#9c27b0',
      r: '#f44336',
      q: '#ffc107',
      k: '#ffffff'
    },
  },
  badgeColors: {
    defender: '#4caf50',
    attacker: '#f44336',
  },
  boardOverlay: {
    image: '',
    opacity: 0.2,
  },
  background: { ...defaultLayer },
  frameLayer: { ...defaultLayer, color: 'transparent', size: 'auto', scale: 100 },
  timerAppearance: { ...defaultTimerAppearance },
  audioControllerAppearance: { ...defaultAudioControllerAppearance },
  backgroundColor: '#f5f5f5',
};
