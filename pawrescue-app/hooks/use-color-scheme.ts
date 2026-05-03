import { useTheme } from '@/context/ThemeContext';

export const useColorScheme = () => {
  const { colorScheme } = useTheme();
  return colorScheme;
};
