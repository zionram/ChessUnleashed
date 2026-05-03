import type { Template, PieceThemeConfig } from './defaultTemplate';

const defaultPieceTheme: PieceThemeConfig = {
  type: 'builtin',
  builtinSet: 'alpha',
  customPieces: {
    wp: '', wn: '', wb: '', wr: '', wq: '', wk: '',
    bp: '', bn: '', bb: '', br: '', bq: '', bk: ''
  },
  customVariants: {}
};

export const darkTemplate: Template = {
  id: 'dark-knight',
  name: 'Dark Knight',
  boardColors: {
    light: '#706677',
    dark: '#392e4a',
    selected: '#63b3ed',
    moveTarget: '#4a5568',
  },
  pieceThemeMode: 'unified',
  pieceTheme: { ...defaultPieceTheme },
  whitePieceTheme: { ...defaultPieceTheme },
  blackPieceTheme: { ...defaultPieceTheme },
  pieceSet: 'alpha',
  pathStyle: {
    icon: 'diamond',
    colors: {
      p: '#a0aec0',
      n: '#4299e1',
      b: '#9f7aea',
      r: '#f56565',
      q: '#ecc94b',
      k: '#edf2f7'
    },
  },
  badgeColors: {
    defender: '#38a169',
    attacker: '#e53e3e',
  },
  boardOverlay: {
    image: '',
    opacity: 0.1,
    color: '#1a1a2e',
    colorEnabled: false,
    colorOpacity: 0.3
  },
  background: {
    color: '#1a202c',
    image: '',
    opacity: 1,
    repeat: 'no-repeat',
    size: 'cover',
    xOffset: 0,
    yOffset: 0,
    scale: 100
  },
  frameLayer: {
    color: 'transparent',
    image: '',
    opacity: 1,
    repeat: 'no-repeat',
    size: 'auto',
    xOffset: 0,
    yOffset: 0,
    scale: 100
  },
  timerAppearance: {
    face: 'digital',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 16,
    activeColor: '#edf2f7',
    inactiveColor: '#a0aec0',
    backgroundColor: '#2d3748',
    borderColor: '#4a5568'
  },
  audioControllerAppearance: {
    layout: 'compact',
    shape: 'rounded',
    accentColor: '#63b3ed',
    backgroundColor: '#2d3748',
    textColor: '#edf2f7',
    sliderColor: '#63b3ed',
    barStyle: 'bars',
    controlStyle: 'buttons',
    controlImages: {}
  },
  backgroundColor: '#1a202c',
};
