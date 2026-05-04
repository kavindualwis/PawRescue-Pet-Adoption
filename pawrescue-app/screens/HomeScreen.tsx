import React from 'react';
import {
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  Linking,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { petService } from '@/services/petService';
import { authService } from '@/services/authService';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface User {
  name: string;
  username: string;
  email: string;
  phoneNumber: string;
  _id?: string;
  id?: string;
  profileImage?: string;
}

interface Pet {
  _id: string;
  name: string;
  breed?: string;
  location?: string;
  images?: string[];
  status?: string;
  type?: { _id: string; name: string };
  price?: number;
  [key: string]: any;
}

const getCardStyles = (colors: any) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 35,
    padding: 12,
    width: 220,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 30,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  heartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    marginTop: 15,
    paddingHorizontal: 8,
  },
  petName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F39334',
  },
});

const getStyles = (colors: any) => StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  userInfo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.card,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: colors.card,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  titleSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 4,
  },
  promoCard: {
    backgroundColor: '#006B61',
    borderRadius: 30,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
    overflow: 'hidden',
  },
  promoContent: {
    flex: 1,
    zIndex: 1,
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },
  promoSubtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.8,
    marginTop: 4,
    marginBottom: 15,
  },
  joinBtn: {
    backgroundColor: '#F39334',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  joinBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  promoImage: {
    width: 140,
    height: 140,
    position: 'absolute',
    right: -10,
    bottom: -10,
    borderRadius: 70,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  seeMore: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  categoryScroll: {
    marginBottom: 25,
  },
  categoryContainer: {
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 6,
    paddingVertical: 6,
    paddingRight: 16,
    borderRadius: 35,
    gap: 10,
  },
  categoryIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
  },
  horizontalPetsContainer: {
    gap: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});

const HomePetCard = ({ 
  pet, 
  onPress,
  isLiked: initialLiked = false,
  onLike
}: { 
  pet: Pet; 
  onPress?: () => void;
  isLiked?: boolean;
  onLike?: (liked: boolean) => void;
}) => {
  const [liked, setLiked] = React.useState(initialLiked);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = React.useMemo(() => getCardStyles(colors), [colors]);

  React.useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  const handleLikePress = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    if (onLike) {
      onLike(newLiked);
    }
  };

  const imageSource =
    pet.images && pet.images.length > 0 && pet.images[0].startsWith('data:')
      ? { uri: pet.images[0] }
      : require('@/assets/images/splash_image.png');

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      <View style={[styles.imageContainer, { backgroundColor: colors.secondary + '40' }]}>
        <Image source={imageSource} style={styles.image} resizeMode="cover" />
        <TouchableOpacity style={styles.heartBtn} onPress={handleLikePress}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={18}
            color={liked ? colors.error : colors.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <ThemedText style={styles.petName} numberOfLines={1}>{pet.name}</ThemedText>
          <Text style={styles.priceText}>
            {pet.price === 0 ? 'Free' : pet.price ? `Rs.${pet.price}` : 'Free'}
          </Text>
        </View>
        
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <ThemedText style={styles.locationText} numberOfLines={1}>
            {pet.location 
              ? pet.location.split(',').slice(-2).join(',').trim() 
              : 'Sydney, CA'}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const HomeScreen = () => {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [user, setUser] = React.useState<User | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState('Dogs');
  const [pets, setPets] = React.useState<Pet[]>([]);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const getUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const parsed = JSON.parse(userData);
          setUser(parsed);
          loadFavorites();
        }
      } catch (e) {}
    };
    getUserData();

    const { DeviceEventEmitter } = require('react-native');
    const profileSub = DeviceEventEmitter.addListener('profileUpdated', (newImage: string) => {
      setUser(prev => prev ? { ...prev, profileImage: newImage } : null);
    });

    return () => profileSub.remove();
  }, []);

  React.useEffect(() => {
    loadPets();
    const { DeviceEventEmitter } = require('react-native');
    const sub = DeviceEventEmitter.addListener('petDataChanged', () => {
      loadPets();
      loadFavorites();
    });
    
    const favSub = DeviceEventEmitter.addListener('petFavorited', ({ petId, isFavorite }: { petId: string, isFavorite: boolean }) => {
      setFavorites(prev => {
        if (isFavorite && !prev.includes(petId)) return [...prev, petId];
        if (!isFavorite && prev.includes(petId)) return prev.filter(id => id !== petId);
        return prev;
      });
    });

    return () => {
      sub.remove();
      favSub.remove();
    };
  }, [selectedCategory]);

  const loadPets = async () => {
    try {
      setLoading(true);
      const response = await petService.getAllPets();
      let allPets: Pet[] = response.data || [];

      if (selectedCategory !== 'All') {
        allPets = allPets.filter((p) => {
          const petType = (p.type?.name || '').toLowerCase();
          const selected = selectedCategory.toLowerCase();
          
          if (selected === 'other') {
            return !petType.includes('cat') && !petType.includes('dog');
          }

          return petType === selected || 
                 selected.includes(petType) || 
                 petType.includes(selected.replace(/s$/, ''));
        });
      }

      setPets(allPets.slice(0, 10));
    } catch (error) {
      console.error('Failed to load pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      const res = await authService.getFavorites();
      if (res.data.success) {
        setFavorites(res.data.data.map((p: any) => p._id));
      }
    } catch (e) {}
  };

  const handleLike = async (petId: string) => {
    // Optimistic update
    const isCurrentlyLiked = favorites.includes(petId);
    if (isCurrentlyLiked) {
      setFavorites(favorites.filter(id => id !== petId));
    } else {
      setFavorites([...favorites, petId]);
    }

    try {
      const res = await authService.toggleFavorite(petId);
      if (!res.data.success) {
        // Rollback on failure
        loadFavorites();
      } else {
        // Sync with backend result
        const { DeviceEventEmitter } = require('react-native');
        DeviceEventEmitter.emit('petFavorited', { petId, isFavorite: !isCurrentlyLiked });
      }
    } catch (e) {
      loadFavorites();
    }
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning!';
    if (hours < 18) return 'Good Afternoon!';
    return 'Good Evening!';
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.userInfo} onPress={() => router.push('/profile')}>
            <Image
              source={user?.profileImage ? { uri: user.profileImage } : { uri: 'https://i.pravatar.cc/150?u=martin' }}
              style={styles.avatar}
            />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="search-outline" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#F39334' }]}>
              <Ionicons name="ribbon-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.titleSection}>
          <ThemedText style={styles.greetingTitle}>Hello {user?.name || 'Alwis'},</ThemedText>
          <ThemedText style={styles.subtitle}>Local pet care services for you!</ThemedText>
        </View>

        {/* Promo Card - Pet Lover Zone */}
        <TouchableOpacity 
          style={styles.promoCard}
          onPress={() => Linking.openURL('https://t.me/pawrescueofficial')}
          activeOpacity={0.9}
        >
          <View style={styles.promoContent}>
            <ThemedText style={styles.promoTitle}>Pet lover zone!</ThemedText>
            <ThemedText style={styles.promoSubtitle}>Get more valuable tips.</ThemedText>
            <TouchableOpacity 
              style={styles.joinBtn}
              onPress={() => Linking.openURL('https://t.me/pawrescueofficial')}
            >
              <Text style={styles.joinBtnText}>Join now</Text>
            </TouchableOpacity>
          </View>
          <Image 
            source={require('@/assets/images/splash_image.png')} 
            style={styles.promoImage}
            resizeMode="cover"
          />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Categories</ThemedText>
          <TouchableOpacity onPress={() => router.push('/explore')}>
            <ThemedText style={styles.seeMore}>See more</ThemedText>
          </TouchableOpacity>
        </View>
        {/* Category Section */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {[
            { id: 'Dogs', icon: 'paw' },
            { id: 'Cats', icon: 'logo-octocat' },
            { id: 'Rabbits', icon: 'leaf' },
            { id: 'Other', icon: 'apps' }
          ].map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard,
                  isSelected && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <View style={[styles.categoryIconBg, isSelected && { backgroundColor: '#FFF' }]}>
                  <Ionicons 
                    name={cat.icon as any} 
                    size={20} 
                    color={isSelected ? colors.primary : colors.textMuted} 
                  />
                </View>
                <ThemedText style={[
                  styles.categoryText,
                  isSelected && { color: '#FFFFFF', fontWeight: '700' }
                ]}>
                  {cat.id.replace(/s$/, '')}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Pet Cards Horizontal List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : pets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>No pets found in this category.</ThemedText>
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalPetsContainer}
          >
            {pets.map((pet) => (
              <HomePetCard
                key={pet._id}
                pet={pet}
                isLiked={favorites.includes(pet._id)}
                onLike={() => handleLike(pet._id)}
                onPress={() => router.push(`/pet/${pet._id}`)}
              />
            ))}
          </ScrollView>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
};
