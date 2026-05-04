import { useEffect, useState, useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthContext } from "@/context/AuthContext";
import { petService } from "@/services/petService";
import { authService } from "@/services/authService";
import { PetCard } from "@/components/pet-card";
import { PostPetModal } from "@/components/post-pet-modal";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface Category {
  _id: string;
  name: string;
}

interface Pet {
  _id: string;
  name: string;
  images?: string[];
  status?: string;
  [key: string]: any;
}

const { width } = Dimensions.get("window");

export const ExploreScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const { state } = useContext(AuthContext);

  useEffect(() => {
    loadPets();
    loadCategories();
    initializeCategories();
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const res = await authService.getFavorites();
      if (res.data.success) {
        setFavorites(res.data.data.map((p: any) => p._id));
      }
    } catch (e) { }
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
        // Sync with other screens
        const { DeviceEventEmitter } = require('react-native');
        DeviceEventEmitter.emit('petFavorited', { petId, isFavorite: !isCurrentlyLiked });
      }
    } catch (e) {
      loadFavorites();
    }
  };

  const initializeCategories = async () => {
    try {
      await petService.initializeCategories();
    } catch (error) {
      console.log("Categories already initialized or error:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await petService.getCategories();

      const orderPriority: Record<string, number> = {
        "dog": 1,
        "cat": 2,
        "bird": 3,
        "birds": 3,
        "fish": 4,
        "guinea pig": 5
      };

      const sortedData = response.data.sort((a: Category, b: Category) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();

        if (nameA === "other") return 1;
        if (nameB === "other") return -1;

        const priorityA = orderPriority[nameA] || 99;
        const priorityB = orderPriority[nameB] || 99;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        return nameA.localeCompare(nameB);
      });

      setCategories([{ _id: "All", name: "All" }, ...sortedData]);
    } catch (error) {
      console.log("Error loading categories:", error);
    }
  };

  const loadPets = async () => {
    try {
      setLoading(true);
      const filters = selectedCategory !== "All" ? { type: selectedCategory } : {};
      const response = await petService.getAllPets(filters);
      setPets(response.data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handlePetCreated = () => {
    loadPets();
    loadCategories();
  };

  useEffect(() => {
    loadPets();
    loadFavorites();
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

  const filteredPets = useMemo(() => {
    if (!searchQuery.trim()) return pets;
    return pets.filter((pet) =>
      pet.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pets, searchQuery, favorites]);
  const renderPetCard = ({ item }: { item: Pet }) => (
    <PetCard
      pet={item}
      isLiked={favorites.includes(item._id)}
      onLike={() => handleLike(item._id)}
      onPress={() => router.push(`/pet/${item._id}`)}
      onAddPress={
        state.userToken
          ? () => {
            // Show action sheet with options
          }
          : undefined
      }
    />
  );
  const renderEmptyPets = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="paw" size={40} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No pets found</Text>
      <Text style={styles.emptySubtitle}>
        There are currently no {selectedCategory === 'All' ? '' : categories.find(c => c._id === selectedCategory)?.name.toLowerCase()} pets available in this category.
      </Text>
    </View>
  );

  const renderCategoryItem = ({ item }: { item: Category }) => {
    const isSelected = selectedCategory === item._id;
    let iconName: any = 'paw';
    const name = item.name.toLowerCase();
    if (name === 'all') iconName = 'apps';
    else if (name.includes('dog')) iconName = 'paw';
    else if (name.includes('cat')) iconName = 'logo-octocat';
    else if (name.includes('bird')) iconName = 'airplane';
    else if (name.includes('fish')) iconName = 'water';
    else if (name.includes('rabbit')) iconName = 'leaf';
    else if (name.includes('hamster')) iconName = 'bug'; 
    else if (name.includes('horse')) iconName = 'analytics'; 
    else if (name.includes('guinea')) iconName = 'color-filter'; 

    return (
      <TouchableOpacity
        style={[
          styles.categoryButton,
          isSelected && styles.categoryButtonActive,
        ]}
        onPress={() => handleCategoryChange(item._id)}
      >
        <View style={[styles.categoryIconBg, isSelected && { backgroundColor: '#FFF' }]}>
          <Ionicons
            name={iconName}
            size={18}
            color={isSelected ? colors.primary : colors.textMuted}
          />
        </View>
        <Text
          style={[
            styles.categoryButtonText,
            isSelected && styles.categoryButtonTextActive,
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Find your companion</Text>
        <TouchableOpacity
          onPress={() => (state.userToken ? setPostModalVisible(true) : Alert.alert("Login Required", "Please log in to post a pet."))}
        >
          <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search pets by name..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.categoryTitle}>Category</Text>
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredPets}
          renderItem={renderPetCard}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.petsGrid}
          contentContainerStyle={styles.petsContent}
          ListEmptyComponent={renderEmptyPets}
          showsVerticalScrollIndicator={false}
        />
      )}

      <PostPetModal
        visible={postModalVisible}
        onClose={() => setPostModalVisible(false)}
        onPetCreated={handlePetCreated}
      />
    </View>
  );
};

const getStyles = (colors: typeof Colors.light & typeof Colors.dark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  postButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
    padding: 0, // Remove default padding on Android
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  // Tab styles matching HomeScreen
  categoryScroll: {
    marginBottom: 16,
    flexGrow: 0,
    flexShrink: 0,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    alignItems: 'center',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    paddingRight: 16,
    borderRadius: 35,
    backgroundColor: '#FFF',
    gap: 10,
    elevation: 0,
  },
  categoryIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryButtonText: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: "600",
  },
  categoryButtonTextActive: {
    color: "#fff",
  },
  // End Tab styles
  petsGrid: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 8,
  },
  petsContent: {
    paddingTop: 0,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.card,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  emptyTitle: {
    fontSize: 20, fontWeight: '700', color: colors.text,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 15, color: colors.textMuted, textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
