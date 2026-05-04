import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const ActivityScreen = () => {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#FFE5B4', dark: '#3D3D2D' }}
        headerImage={
          <IconSymbol
            size={310}
            color="#FFB347"
            name="bell.fill"
            style={styles.headerImage}
          />
        }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Activity</ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Recent Updates</ThemedText>
        <ThemedText>
          Your pet activity and notifications will appear here. Stay updated on all your pet rescues and adoptions!
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Quick Stats</ThemedText>
        <ThemedView style={styles.statsContainer}>
          <ThemedView style={styles.statBox}>
            <ThemedText type="defaultSemiBold">0</ThemedText>
            <ThemedText style={styles.statLabel}>Rescues</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statBox}>
            <ThemedText type="defaultSemiBold">0</ThemedText>
            <ThemedText style={styles.statLabel}>Adoptions</ThemedText>
          </ThemedView>
          <ThemedView style={styles.statBox}>
            <ThemedText type="defaultSemiBold">0</ThemedText>
            <ThemedText style={styles.statLabel}>Favorites</ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
      </ParallaxScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  headerImage: {
    height: 200,
    width: 200,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});
