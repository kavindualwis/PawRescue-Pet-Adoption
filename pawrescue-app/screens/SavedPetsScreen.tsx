import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PetCard } from '@/components/pet-card';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/authService';

interface Pet {
  _id: string;
  name: string;
  images?: string[];
  status?: string;
  [key: string]: any;
}

export const SavedPetsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedPets();
    const sub = DeviceEventEmitter.addListener('petDataChanged', loadSavedPets);
    return () => sub.remove();
  }, []);

  const loadSavedPets = async () => {
    try {
      setLoading(true);
      const response = await authService.getFavorites();
      if (response.data.success) {
        setPets(response.data.data || []);
      }
    } catch (error) {
      console.log('Error fetching saved pets:', error);
      Alert.alert('Error', 'Failed to load your saved pets.');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (petId: string) => {
    try {
      const res = await authService.toggleFavorite(petId);
      if (res.data.success) {
        // If unliked, remove from list or just refresh
        loadSavedPets();
        DeviceEventEmitter.emit('petDataChanged');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const renderPetCard = ({ item }: { item: Pet }) => (
    <View style={styles.cardWrapper}>
      <PetCard
        pet={item}
        isLiked={true}
        onLike={() => handleLike(item._id)}
        onPress={() => router.push(`/pet/${item._id}`)}
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Saved Pets</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : pets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>You haven't saved any pets yet.</Text>
          <TouchableOpacity 
            style={[styles.exploreBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.exploreBtnText}>Explore Pets</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pets}
          renderItem={renderPetCard}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.petsGrid}
          contentContainerStyle={styles.petsContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  petsGrid: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 8,
  },
  petsContent: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  cardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontWeight: '500',
  },
  exploreBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
