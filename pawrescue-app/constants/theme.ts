/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const primaryOrange = '#F39334';
const secondaryOrange = '#FFD7B5';
const lightYellow = '#FEE6B0';

export const Colors = {
  light: {
    primary: primaryOrange,
    secondary: secondaryOrange,
    accent: lightYellow,
    text: '#1F1F1F',
    textMuted: '#7D7D7D',
    background: '#f8edda',
    card: '#FFFFFF',
    border: '#EAEAEA',
    tint: primaryOrange,
    icon: '#2C2C2C',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: primaryOrange,
    error: '#FF5A5A',
    success: '#2ECC71',
    tabBar: '#1A1A1A',
  },
  dark: {
    primary: primaryOrange,
    secondary: '#3D2C1E',
    accent: '#3D3D1E',
    text: '#ECEDEE',
    textMuted: '#9BA1A6',
    background: '#151718',
    card: '#222526',
    border: '#2A2E30',
    tint: primaryOrange,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: primaryOrange,
    error: '#CF6679',
    success: '#03DAC6',
    tabBar: '#0D0D0D',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
