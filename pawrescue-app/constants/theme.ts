/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const primaryOrange = '#E8A358';
const primaryOrangeDark = '#D79247'; // slightly darker for contrast if needed, or same

export const Colors = {
  light: {
    primary: primaryOrange,
    text: '#11181C',
    textMuted: '#687076',
    background: '#FFFFFF',
    card: '#F5F5F5',
    border: '#EAEAEA',
    tint: primaryOrange,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: primaryOrange,
    error: '#E74C3C',
    success: '#2ECC71',
  },
  dark: {
    primary: primaryOrangeDark,
    text: '#ECEDEE',
    textMuted: '#9BA1A6',
    background: '#151718',
    card: '#222526',
    border: '#2A2E30',
    tint: primaryOrangeDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: primaryOrangeDark,
    error: '#CF6679',
    success: '#03DAC6',
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
