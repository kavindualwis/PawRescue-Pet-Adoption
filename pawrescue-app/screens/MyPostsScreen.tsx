import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { petService } from '@/services/petService';
import { PetCard } from '@/components/pet-card';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { authService } from '@/services/authService';
import { EditPetModal } from '@/components/edit-pet-modal';

interface Pet {
  _id: string;
  name: string;
  images?: string[];
  status?: string;
  [key: string]: any;
}

export const MyPostsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  useEffect(() => {
    loadMyPosts();
    const sub = DeviceEventEmitter.addListener('petDataChanged', loadMyPosts);
    return () => sub.remove();
  }, []);

  const loadMyPosts = async () => {
    try {
      setLoading(true);
      let parsedUser = null;
      const userData = await AsyncStorage.getItem('user');
      
      if (userData && userData !== 'undefined') {
        parsedUser = JSON.parse(userData);
      } else {
        const response = await authService.getMe();
        if (response.data) {
          parsedUser = response.data.user || response.data;
          await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
        }
      }

      if (parsedUser) {
        const userId = parsedUser._id || parsedUser.id;
        if (userId) {
          const response = await petService.getPetsByUser(userId);
          setPets(response.data || []);
        }
      }
    } catch (error) {
      console.log('Error fetching user posts:', error);
      Alert.alert('Error', 'Failed to load your posts.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (petId: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await petService.deletePet(petId);
            Alert.alert('Success', 'Post deleted successfully');
            DeviceEventEmitter.emit('petDataChanged');
          } catch (error) {
            console.log('Error deleting post:', error);
            Alert.alert('Error', 'Failed to delete post.');
          }
        },
      },
    ]);
  };

  const handleEdit = (pet: Pet) => {
    setSelectedPet(pet);
    setEditModalVisible(true);
  };

  const renderPetCard = ({ item }: { item: Pet }) => (
    <View style={styles.cardWrapper}>
      <PetCard
        pet={item}
        onPress={() => router.push(`/pet/${item._id}`)}
        actionButtons={
          <>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => handleEdit(item)}>
              <Ionicons name="pencil" size={14} color="#fff" />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.error }]} onPress={() => handleDelete(item._id)}>
              <Ionicons name="trash" size={14} color="#fff" />
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </>
        }
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>My Posts</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : pets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ color: colors.textMuted }}>You haven't posted any pets yet.</Text>
        </View>
      ) : (
        <FlatList
          data={pets}
          renderItem={renderPetCard}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.petsGrid}
          contentContainerStyle={styles.petsContent}
        />
      )}

      {selectedPet && (
        <EditPetModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onPetUpdated={() => DeviceEventEmitter.emit('petDataChanged')}
          pet={selectedPet}
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
    fontSize: 18,
    fontWeight: '600',
  },
  petsGrid: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 8,
  },
  petsContent: {
    paddingBottom: 20,
  },
  cardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  },
});
