export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  bgCard: string;
  bgInput: string;
  bgElevated: string;
  border: string;
  borderLight: string;
  borderFocus: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  accent: string;
  accentLight: string;
  accentDim: string;
  accentSoft: string;

  assign: string;
  assignBg: string;
  complete: string;
  completeBg: string;
  cancel: string;
  cancelBg: string;

  statusActive: string;
  statusPending: string;
  statusCancelled: string;

  white: string;
  black: string;

  slack: string;
  slackBg: string;
  hubstaff: string;
  hubstaffBg: string;
  airtable: string;
  airtableBg: string;
  sheets: string;
  sheetsBg: string;

  tabBar: string;
  tabBarBorder: string;

  skeleton: string;
  overlay: string;

  shadow: string;
  shadowCard: string;

  terminal: string;
  terminalBg: string;
  terminalGreen: string;
  terminalDim: string;

  alertYellow: string;
  alertYellowBg: string;
  recollectRed: string;
  recollectRedBg: string;
  statsGreen: string;
  statsGreenBg: string;

  mxOrange: string;
  mxOrangeBg: string;
  sfBlue: string;
  sfBlueBg: string;

  gold: string;
  goldBg: string;
  silver: string;
  silverBg: string;
  bronze: string;
  bronzeBg: string;

  cardDepth: string;
}

export const LightTheme: ThemeColors = {
  bg: '#F5F3F0',
  bgSecondary: '#EDEAE6',
  bgCard: '#FFFFFF',
  bgInput: '#F0EDE9',
  bgElevated: '#E5E2DD',
  border: '#DDD9D3',
  borderLight: '#E8E5E0',
  borderFocus: '#8B6FC0',

  textPrimary: '#1A1720',
  textSecondary: '#4A4555',
  textMuted: '#8E889A',

  accent: '#7C3AED',
  accentLight: '#9461F5',
  accentDim: '#D8CFF0',
  accentSoft: '#EEEAFF',

  assign: '#7C3AED',
  assignBg: '#EEEAFF',
  complete: '#2D8A56',
  completeBg: '#E4F4EB',
  cancel: '#C53030',
  cancelBg: '#FDE8E8',

  statusActive: '#2D8A56',
  statusPending: '#B8860B',
  statusCancelled: '#C53030',

  white: '#FFFFFF',
  black: '#000000',

  slack: '#5B3A6B',
  slackBg: '#F0E8F8',
  hubstaff: '#2D8A56',
  hubstaffBg: '#E4F4EB',
  airtable: '#B8860B',
  airtableBg: '#FEF5E5',
  sheets: '#2D8A56',
  sheetsBg: '#E4F4EB',

  tabBar: '#FFFFFF',
  tabBarBorder: 'transparent',

  skeleton: '#DDD9D3',
  overlay: 'rgba(0,0,0,0.25)',

  shadow: '#3D2B6B',
  shadowCard: 'rgba(60, 40, 110, 0.08)',

  terminal: '#7C3AED',
  terminalBg: '#F5F3F0',
  terminalGreen: '#2D8A56',
  terminalDim: '#8E889A',

  alertYellow: '#A67C00',
  alertYellowBg: '#FFF8E1',
  recollectRed: '#C53030',
  recollectRedBg: '#FFF0F0',
  statsGreen: '#2D8A56',
  statsGreenBg: '#E4F8EB',

  mxOrange: '#C47A3A',
  mxOrangeBg: '#FFF3E8',
  sfBlue: '#4A6FA5',
  sfBlueBg: '#EEF3FA',

  gold: '#B8860B',
  goldBg: '#FFF8E1',
  silver: '#6B7280',
  silverBg: '#F0EEF4',
  bronze: '#A0522D',
  bronzeBg: '#FDF0E8',

  cardDepth: 'rgba(124,58,237,0.03)',
};

export const DarkTheme: ThemeColors = {
  bg: '#0F0E13',
  bgSecondary: '#151419',
  bgCard: '#1B1A21',
  bgInput: '#201F27',
  bgElevated: '#26252D',
  border: '#2A2933',
  borderLight: '#32313B',
  borderFocus: '#A78BFA',

  textPrimary: '#EEEDF2',
  textSecondary: '#A09CAB',
  textMuted: '#5E5B6A',

  accent: '#A78BFA',
  accentLight: '#C4B5FD',
  accentDim: '#2A1F4E',
  accentSoft: '#1C1630',

  assign: '#A78BFA',
  assignBg: '#1C1630',
  complete: '#5EBD8A',
  completeBg: '#0E2018',
  cancel: '#E87070',
  cancelBg: '#200D0D',

  statusActive: '#5EBD8A',
  statusPending: '#D4A843',
  statusCancelled: '#E87070',

  white: '#FFFFFF',
  black: '#000000',

  slack: '#C490C8',
  slackBg: '#1C101D',
  hubstaff: '#5EBD8A',
  hubstaffBg: '#0E1A12',
  airtable: '#D4A843',
  airtableBg: '#1A1408',
  sheets: '#5EBD8A',
  sheetsBg: '#0E1A12',

  tabBar: '#1B1A21',
  tabBarBorder: 'transparent',

  skeleton: '#2A2933',
  overlay: 'rgba(0,0,0,0.6)',

  shadow: '#000000',
  shadowCard: 'rgba(0, 0, 0, 0.4)',

  terminal: '#A78BFA',
  terminalBg: '#0F0E13',
  terminalGreen: '#5EBD8A',
  terminalDim: '#4A4858',

  alertYellow: '#D4A843',
  alertYellowBg: '#1A1608',
  recollectRed: '#E87070',
  recollectRedBg: '#1A0C0C',
  statsGreen: '#5EBD8A',
  statsGreenBg: '#0E1A12',

  mxOrange: '#E8A060',
  mxOrangeBg: '#1F1508',
  sfBlue: '#7BA3D4',
  sfBlueBg: '#0D1520',

  gold: '#D4A843',
  goldBg: '#1A1608',
  silver: '#9CA3AF',
  silverBg: '#1B1A21',
  bronze: '#C87B52',
  bronzeBg: '#1A1208',

  cardDepth: 'rgba(255,255,255,0.02)',
};
