import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  LogBox,
} from 'react-native';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { shelterService } from '@/services/shelterService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY } from "@/services/config";
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getDistance, formatDistance } from '@/utils/distance';

const { width, height } = Dimensions.get('window');

interface Shelter {
  _id: string;
  name: string;
  location: string;
  contactNumber: string;
  email: string;
  description: string;
  images?: string[];
  type: 'shelter' | 'care-center';
  latitude?: number;
  longitude?: number;
  createdBy: {
    _id: string;
    name: string;
    username: string;
  };
  distance?: number;
}

export const SheltersScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Filter States
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'shelter' | 'care-center'>('shelter');
  const [sortByNearest, setSortByNearest] = useState(false);

  // Create Modal State
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    contactNumber: "",
    email: "",
    description: "",
    type: 'shelter' as 'shelter' | 'care-center',
    images: [] as string[],
    latitude: 0,
    longitude: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    // Load user ID
    try {
      const userRaw = await AsyncStorage.getItem('user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        setCurrentUserId(u._id || u.id);
      }
    } catch (e) {
      console.error("Error loading user from storage:", e);
    }

    // Start fetching data immediately
    const fetchSheltersPromise = shelterService.getShelters();

    // Try to get location in parallel
    const fetchLocationPromise = (async () => {
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) return;

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Use last known position first as it's nearly instant
          const lastKnown = await Location.getLastKnownPositionAsync({});
          if (lastKnown) {
            setUserLocation({
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude
            });
          }

          // Then get current position for better accuracy
          try {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            setUserLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude
            });
          } catch (posError) {
            console.log("Could not get current position, using last known.");
          }
        }
      } catch (locError) {
        console.log("Location error in SheltersScreen:", locError);
      }
    })();

    try {
      // Wait for data, location can finish later
      const res = await fetchSheltersPromise;
      setShelters(res.data || []);
    } catch (err: any) {
      console.error("Failed to load shelters:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const processedShelters = useMemo(() => {
    let data = shelters.filter(s => (s.type || 'shelter') === activeTab);

    if (userLocation) {
      data = data.map(item => {
        if (item.latitude && item.longitude) {
          const distance = getDistance(userLocation.latitude, userLocation.longitude, item.latitude, item.longitude);
          return { ...item, distance };
        }
        return item;
      });

      if (sortByNearest) {
        data.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      } else {
        // Default sort (maybe by name or newest)
        data.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return data;
  }, [shelters, activeTab, userLocation, sortByNearest]);

  const resetForm = () => {
    setFormData({ name: '', location: '', contactNumber: '', email: '', description: '', type: activeTab, images: [], latitude: 0, longitude: 0 });
    setIsEditing(false);
    setSelectedShelterId(null);
  };

  const handleCreatePress = () => {
    if (!currentUserId) {
      Alert.alert('Login Required', 'Please log in to register.');
      return;
    }
    resetForm();
    setIsCreateModalVisible(true);
  };

  const handleEditPress = (shelter: Shelter) => {
    setFormData({
      name: shelter.name,
      location: shelter.location,
      contactNumber: shelter.contactNumber,
      email: shelter.email,
      description: shelter.description || '',
      type: shelter.type || 'shelter',
      images: shelter.images || [],
      latitude: shelter.latitude || 0,
      longitude: shelter.longitude || 0,
    });
    setSelectedShelterId(shelter._id);
    setIsEditing(true);
    setIsCreateModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.location || !formData.contactNumber || !formData.email) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);

      if (isEditing && selectedShelterId) {
        await shelterService.updateShelter(selectedShelterId, formData);
        Alert.alert('Success', 'Updated successfully');
      } else {
        await shelterService.createShelter(formData);
        Alert.alert('Success', 'Registered successfully');
      }

      setIsCreateModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const newImage = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setFormData({ ...formData, images: [...formData.images, newImage] });
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    setFormData({ ...formData, images: newImages });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await shelterService.deleteShelter(id);
            loadData();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const renderShelter = ({ item }: { item: Shelter }) => {
    const isCreator = currentUserId === item.createdBy?._id;

    return (
      <TouchableOpacity
        style={styles.shelterCard}
        onPress={() => router.push(`/shelter/${item._id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.cardMain}>
          <View style={styles.imageWrapper}>
            {item.images && item.images.length > 0 ? (
              <Image source={{ uri: item.images[0] }} style={styles.shelterImage} resizeMode="cover" />
            ) : (
              <View style={styles.shelterImagePlaceholder}>
                <Ionicons name={item.type === 'care-center' ? 'medkit' : 'business'} size={32} color={colors.primary} />
              </View>
            )}
            <View style={styles.typeBadgeOverlay}>
              <Text style={styles.typeBadgeText}>
                {item.type === 'care-center' ? 'Pet Care' : 'Shelter'}
              </Text>
            </View>
          </View>

          <View style={styles.shelterInfo}>
            <View style={styles.shelterHeader}>
              <Text style={styles.shelterName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.distanceText}>{item.distance !== undefined ? formatDistance(item.distance) : ''}</Text>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} style={{ marginTop: 2 }} />
              <Text style={styles.locationText} numberOfLines={2}>{item.location}</Text>
            </View>

            {isCreator && (
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => handleEditPress(item)} style={[styles.miniActionBtn, { backgroundColor: colors.primary }]}>
                  <Ionicons name="pencil" size={14} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={[styles.miniActionBtn, { backgroundColor: '#E74C3C' }]}>
                  <Ionicons name="trash" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.text + '10' }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Centers & Shelters</Text>
          <View style={styles.activeFilters}>
            <Text style={styles.filterSummary}>
              {activeTab === 'shelter' ? 'Shelters' : 'Care Centers'} • {sortByNearest ? 'Nearest First' : 'A-Z Sort'}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconButton, { marginRight: 8 }]}
            onPress={handleCreatePress}
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="options-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'shelter' && styles.activeTab]}
          onPress={() => setActiveTab('shelter')}
        >
          <Text style={[styles.tabText, activeTab === 'shelter' && styles.activeTabText]}>Shelters</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'care-center' && styles.activeTab]}
          onPress={() => setActiveTab('care-center')}
        >
          <Text style={[styles.tabText, activeTab === 'care-center' && styles.activeTabText]}>Pet Care</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={processedShelters}
          renderItem={renderShelter}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Results Found</Text>
            </View>
          }
        />
      )}

      {/* List content continues */}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={() => setShowFilterModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Filter & Sort</Text>
                  <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.filterLabel}>Center Type</Text>
                <View style={styles.optionRow}>
                  <TouchableOpacity
                    style={[styles.optionChip, { backgroundColor: colors.text + '05', borderColor: colors.text + '05' }, activeTab === 'shelter' && styles.optionChipActive]}
                    onPress={() => setActiveTab('shelter')}
                  >
                    <Text style={[styles.optionChipText, { color: colors.text + '60' }, activeTab === 'shelter' && styles.optionChipTextActive]}>Shelters</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.optionChip, { backgroundColor: colors.text + '05', borderColor: colors.text + '05' }, activeTab === 'care-center' && styles.optionChipActive]}
                    onPress={() => setActiveTab('care-center')}
                  >
                    <Text style={[styles.optionChipText, { color: colors.text + '60' }, activeTab === 'care-center' && styles.optionChipTextActive]}>Care Centers</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.filterLabel}>Sort By</Text>
                <View style={styles.sortOptions}>
                  <TouchableOpacity
                    style={styles.sortOptionItem}
                    onPress={() => setSortByNearest(false)}
                  >
                    <Ionicons
                      name={!sortByNearest ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={!sortByNearest ? colors.primary : "#888"}
                    />
                    <Text style={[styles.sortOptionText, !sortByNearest && styles.sortOptionTextActive]}>Alphabetical (A-Z)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sortOptionItem}
                    onPress={() => {
                      if (!userLocation) {
                        Alert.alert('Location Required', 'Enable location to use this feature.');
                        return;
                      }
                      setSortByNearest(true);
                    }}
                  >
                    <Ionicons
                      name={sortByNearest ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={sortByNearest ? colors.primary : colors.text + '30'}
                    />
                    <Text style={[styles.sortOptionText, { color: colors.text + '90' }, sortByNearest && { color: colors.text, fontWeight: '700' }]}>Nearest to Me</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.applyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Register/Create Modal */}
      <Modal visible={isCreateModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalSheetOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', width: width, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderRadius: 0 }]}>
            <View style={[styles.modalHeader, { paddingHorizontal: 24, paddingTop: 24, marginBottom: 12 }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Register {activeTab === 'shelter' ? 'Shelter' : 'Care Center'}</Text>
              <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[]}
              renderItem={null}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListHeaderComponent={
                <>
                  <View style={{ padding: 24 }}>
                    <View style={styles.imagesContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {formData.images.map((img, idx) => (
                          <View key={idx} style={styles.imagePreviewWrapper}>
                            <Image source={{ uri: img }} style={styles.previewImage} />
                            <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(idx)}>
                              <Ionicons name="close-circle" size={20} color="#E74C3C" />
                            </TouchableOpacity>
                          </View>
                        ))}
                        {formData.images.length < 5 && (
                          <TouchableOpacity style={styles.addMoreBtn} onPress={pickImage}>
                            <Ionicons name="camera" size={24} color="#999" />
                            <Text style={styles.addMoreText}>Add Photo</Text>
                          </TouchableOpacity>
                        )}
                      </ScrollView>
                    </View>

                    <View style={styles.formField}>
                      <Text style={styles.fieldLabel}>Name *</Text>
                      <TextInput style={styles.modalInput} value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} placeholder="e.g. Happy Paws" />
                    </View>

                    <View style={styles.formField}>
                      <Text style={styles.fieldLabel}>Type *</Text>
                      <View style={styles.typeRow}>
                        <TouchableOpacity style={[styles.typeBtn, formData.type === 'shelter' && styles.activeTypeBtn]} onPress={() => setFormData({ ...formData, type: 'shelter' })}>
                          <Text style={[styles.typeBtnText, formData.type === 'shelter' && styles.activeTypeBtnText]}>Shelter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.typeBtn, formData.type === 'care-center' && styles.activeTypeBtn]} onPress={() => setFormData({ ...formData, type: 'care-center' })}>
                          <Text style={[styles.typeBtnText, formData.type === 'care-center' && styles.activeTypeBtnText]}>Care Center</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[styles.formField, { zIndex: 1000 }]}>
                      <Text style={styles.fieldLabel}>Location *</Text>
                      <GooglePlacesAutocomplete
                        placeholder="Search for a location"
                        fetchDetails={true}
                        onPress={(data, details = null) => {
                          setFormData({
                            ...formData,
                            location: data.description,
                            latitude: details?.geometry.location.lat || 0,
                            longitude: details?.geometry.location.lng || 0,
                          });
                        }}
                        query={{ key: GOOGLE_MAPS_API_KEY, language: 'en' }}
                        styles={{
                          textInput: styles.modalInput,
                          listView: { backgroundColor: colors.background, position: 'absolute', top: 60, zIndex: 9999, elevation: 5, borderRadius: 12 },
                        }}
                        enablePoweredByContainer={false}
                      />
                      {formData.latitude !== 0 && (
                        <View style={styles.mapPreviewWrapper}>
                          <MapView
                            provider={PROVIDER_GOOGLE}
                            style={styles.mapPreview}
                            region={{
                              latitude: formData.latitude || 0,
                              longitude: formData.longitude || 0,
                              latitudeDelta: 0.005,
                              longitudeDelta: 0.005,
                            }}
                            scrollEnabled={false}
                          >
                            <Marker coordinate={{ latitude: formData.latitude || 0, longitude: formData.longitude || 0 }} pinColor="#F39334" />
                          </MapView>
                        </View>
                      )}
                    </View>

                    <View style={styles.formField}>
                      <Text style={styles.fieldLabel}>Description</Text>
                      <TextInput
                        style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                        value={formData.description}
                        onChangeText={(t) => setFormData({ ...formData, description: t })}
                        placeholder="Describe your center..."
                        multiline
                      />
                    </View>

                    <View style={styles.formField}>
                      <Text style={styles.fieldLabel}>Contact Number *</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={formData.contactNumber}
                        onChangeText={(t) => setFormData({ ...formData, contactNumber: t.replace(/[^0-9]/g, '') })}
                        keyboardType="phone-pad"
                        placeholder="e.g. 0112345678"
                      />
                    </View>

                    <View style={styles.formField}>
                      <Text style={styles.fieldLabel}>Email *</Text>
                      <TextInput style={styles.modalInput} value={formData.email} onChangeText={(t) => setFormData({ ...formData, email: t })} autoCapitalize="none" />
                    </View>

                    <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSubmit} disabled={submitting}>
                      {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>{isEditing ? 'Update Center' : 'Register Center'}</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  activeFilters: { marginTop: 4 },
  filterSummary: { fontSize: 13, color: colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 25,
    padding: 6,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
  },
  activeTabText: {
    color: '#FFF',
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  shelterCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 3,
  },
  cardMain: { flexDirection: 'row', gap: 16 },
  imageWrapper: { width: 100, height: 100, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.secondary + '20' },
  typeBadgeOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 4, alignItems: 'center' },
  typeBadgeText: { fontSize: 9, fontWeight: '900', color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 },
  shelterImagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  shelterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
  distanceText: { fontSize: 11, color: colors.primary, fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 8 },
  shelterImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    backgroundColor: colors.background,
  },
  shelterInfo: {
    flex: 1,
    marginLeft: 15,
  },
  shelterName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  shelterLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  shelterStats: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  miniActionBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  // Modal Styles
  modalSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 20,
  },
  formField: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  activeTypeBtn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  activeTypeBtnText: {
    color: colors.primary,
  },

  modalSubmitBtn: { backgroundColor: colors.primary, borderRadius: 18, paddingVertical: 18, alignItems: 'center', marginTop: 10, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  modalSubmitText: { color: '#FFF', fontSize: 17, fontWeight: '800' },

  imagesContainer: { marginBottom: 20, height: 100 },
  imagePreviewWrapper: { width: 100, height: 100, borderRadius: 15, overflow: 'hidden', marginRight: 12 },
  previewImage: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: '#FFF', borderRadius: 12 },
  addMoreBtn: { width: 100, height: 100, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addMoreText: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '700' },
  mapPreviewWrapper: { height: 160, borderRadius: 18, marginTop: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border },
  mapPreview: { ...StyleSheet.absoluteFillObject },

  // Filter Overlay
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  filterLabel: { fontSize: 13, fontWeight: '800', color: colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  optionRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  optionChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  optionChipActive: { backgroundColor: colors.primary + '10', borderColor: colors.primary },
  optionChipText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  optionChipTextActive: { color: colors.primary },
  sortOptions: { marginBottom: 25 },
  sortOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 12,
  },
  sortOptionText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sortOptionTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
  applyBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  applyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textMuted },
});

const mapDarkStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#212121" }]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#212121" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9e9e9e" }]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#bdbdbd" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#181818" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#1b1b1b" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#2c2c2c" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#8a8a8a" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [{ "color": "#373737" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#3c3c3c" }]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [{ "color": "#4e4e4e" }]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#000000" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#3d3d3d" }]
  }
];
