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
  TouchableWithoutFeedback,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { rescueService } from '@/services/rescueService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDistance, formatDistance } from '@/utils/distance';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

type RescueStatus = 'all' | 'pending' | 'in-progress' | 'rescued';
type SortOption = 'latest' | 'nearest';

interface RescueCase {
  _id: string;
  petId?: {
    _id: string;
    name: string;
    images?: string[];
    breed?: string;
  };
  title: string;
  animalType: string;
  reportedBy: {
    _id: string;
    name: string;
    username: string;
  };
  description: string;
  rescueStatus: 'pending' | 'in-progress' | 'rescued';
  location: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  createdAt: string;
  distance?: number;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending', color: '#F0A500', bg: '#FFF8E6', icon: 'time-outline' },
  'in-progress': { label: 'In Progress', color: '#3498DB', bg: '#EBF5FB', icon: 'sync-outline' },
  rescued: { label: 'Rescued', color: '#27AE60', bg: '#E8F8EE', icon: 'checkmark-circle-outline' },
};

export const RescueCasesScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);

  const [rescueCases, setRescueCases] = useState<RescueCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);
  
  // Filter States
  const [showFilterModal, setShowFilterModal] = useState(false);
  // Active Filters (Applied to the list)
  const [activeStatusFilter, setActiveStatusFilter] = useState<RescueStatus>('all');
  const [activeSortOption, setActiveSortOption] = useState<SortOption>('latest');
  
  // Temporary Filters (Used in the modal)
  const [tempStatusFilter, setTempStatusFilter] = useState<RescueStatus>('all');
  const [tempSortOption, setTempSortOption] = useState<SortOption>('latest');

  const loadData = useCallback(async () => {
    console.log("Refreshing Rescue Cases data...");
    
    // Load user ID
    try {
      const raw = await AsyncStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        setCurrentUserId(u._id || u.id);
      }
    } catch (e) {
      console.error(e);
    }

    // Start fetching data immediately
    const fetchCasesPromise = rescueService.getAllRescueCases();
    
    // Try to get location in parallel
    const fetchLocationPromise = (async () => {
      try {
        // First check if location services are enabled
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          console.log("Location services are disabled.");
          return;
        }

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
          
          // Then get current position with lower accuracy for speed
          try {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
              // timeout: 5000, // Optional: add timeout to avoid hanging
            });
            setUserLocation({ 
              latitude: loc.coords.latitude, 
              longitude: loc.coords.longitude 
            });
          } catch (posError) {
            console.log("Could not get current position, using last known if available.");
          }
        }
      } catch (e) {
        console.log("Location permission or fetch failed:", e);
      }
    })();

    try {
      // Wait for data, location can finish later
      const res = await fetchCasesPromise;
      setRescueCases(res.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load rescue cases');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('rescueDataChanged', () => {
        console.log("Event 'rescueDataChanged' received!");
        loadData();
    });
    
    return () => sub.remove();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Rescue Case', 'Are you sure you want to delete this case?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading({ id, action: 'delete' });
            await rescueService.deleteRescueCase(id);
            setRescueCases(prev => prev.filter(item => item._id !== id));
            DeviceEventEmitter.emit('rescueDataChanged');
            Alert.alert('Success', 'Rescue case deleted');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete');
          } finally {
            setActionLoading(null);
          }
        }
      }
    ]);
  };

  const handleUpdate = (id: string) => {
    router.push(`/rescue/edit/${id}` as any);
  };

  const processedCases = useMemo(() => {
    let data = [...rescueCases];
    
    // Calculate distances first
    if (userLocation) {
      data = data.map(item => {
        if (item.latitude && item.longitude) {
          const distance = getDistance(userLocation.latitude, userLocation.longitude, item.latitude, item.longitude);
          return { ...item, distance };
        }
        return item;
      });
    }

    // Apply Status Filter
    if (activeStatusFilter !== 'all') {
      data = data.filter(item => item.rescueStatus === activeStatusFilter);
    }

    // Apply Sorting
    if (activeSortOption === 'nearest' && userLocation) {
      data.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    } else {
      // Default to Latest
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    return data;
  }, [rescueCases, userLocation, activeStatusFilter, activeSortOption]);

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderRescueCase = ({ item }: { item: RescueCase }) => {
    const meta = STATUS_META[item.rescueStatus] || STATUS_META.pending;
    const displayImage = item.images?.[0] || item.petId?.images?.[0];
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push(`/rescue/${item._id}` as any)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusChip, { backgroundColor: colorScheme === 'dark' ? meta.color + '20' : meta.bg }]}>
            <Ionicons name={meta.icon as any} size={14} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={[styles.createdAt, { color: colors.text + '60' }]}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.contentRow}>
          {displayImage ? (
            <Image 
              source={{ uri: displayImage }} 
              style={styles.caseImg} 
            />
          ) : (
            <View style={[styles.caseImg, { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="paw" size={24} color="#ccc" />
            </View>
          )}
          <View style={styles.caseDetails}>
            <Text style={[styles.petName, { color: colors.text }]}>{item.title || item.petId?.name || 'Injured Animal'}</Text>
            <View style={styles.tagRow}>
                <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{item.animalType || 'Stray'}</Text>
                </View>
                {item.distance !== undefined && (
                    <View style={styles.distanceBadge}>
                        <Ionicons name="location-sharp" size={10} color="#E8A358" />
                        <Text style={styles.distanceText}>{formatDistance(item.distance)}</Text>
                    </View>
                )}
            </View>
            <Text style={[styles.description, { color: colors.text + '90' }]} numberOfLines={2}>{item.description}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.text + '60'} />
              <Text style={[styles.locationText, { color: colors.text + '60' }]} numberOfLines={1}>{item.location}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.text + '30'} />
        </View>

        {item.reportedBy._id === currentUserId && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border + '20', paddingTop: 12 }}>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.text + '05', alignItems: 'center' }}
              onPress={() => handleUpdate(item._id)}
              disabled={!!actionLoading}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: '#FF3B3015', alignItems: 'center' }}
              onPress={() => handleDelete(item._id)}
              disabled={!!actionLoading}
            >
              {actionLoading?.id === item._id && actionLoading?.action === 'delete' ? (
                <ActivityIndicator size="small" color="#FF3B30" />
              ) : (
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF3B30' }}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.text + '10' }]}>
        <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Rescue Cases</Text>
            <View style={styles.activeFilters}>
                <Text style={[styles.filterSummary, { color: colors.primary }]}>
                    {activeStatusFilter === 'all' ? 'All Cases' : STATUS_META[activeStatusFilter].label} • {activeSortOption === 'nearest' ? 'Nearest First' : 'Latest'}
                </Text>
            </View>
        </View>
        <View style={styles.headerActions}>
            <TouchableOpacity 
                style={[styles.iconButton, { backgroundColor: colors.text + '05' }]}
                onPress={() => {
                    setTempStatusFilter(activeStatusFilter);
                    setTempSortOption(activeSortOption);
                    setShowFilterModal(true);
                }}
            >
                <Ionicons name="options-outline" size={22} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.reportBtn}
                onPress={() => router.push('/rescue/report' as any)}
            >
                <Ionicons name="add-circle" size={28} color="#E8A358" />
            </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E8A358" />
        </View>
      ) : processedCases.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="medical-outline" size={80} color={colors.text + '10'} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Results Found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.text + '60' }]}>Try adjusting your filters or report a new case if you see an animal in need!</Text>
        </View>
      ) : (
        <FlatList
          data={processedCases}
          keyExtractor={(item) => item._id}
          renderItem={renderRescueCase}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
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

                <Text style={styles.filterLabel}>Rescue Status</Text>
                <View style={styles.optionRow}>
                    {['all', 'pending', 'in-progress', 'rescued'].map((status) => (
                        <TouchableOpacity 
                            key={status}
                            style={[
                                styles.optionChip, 
                                { backgroundColor: colors.text + '05', borderColor: colors.text + '05' },
                                tempStatusFilter === status && { backgroundColor: colors.primary + '15', borderColor: colors.primary }
                            ]}
                            onPress={() => setTempStatusFilter(status as any)}
                        >
                            <Text style={[
                                styles.optionChipText, 
                                { color: colors.text + '60' },
                                tempStatusFilter === status && { color: colors.primary }
                            ]}>
                                {status === 'all' ? 'All' : STATUS_META[status]?.label || status}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.filterLabel}>Sort By</Text>
                <View style={styles.sortOptions}>
                    <TouchableOpacity 
                        style={styles.sortOptionItem}
                        onPress={() => setTempSortOption('latest')}
                    >
                        <Ionicons 
                            name={tempSortOption === 'latest' ? "radio-button-on" : "radio-button-off"} 
                            size={20} 
                            color={tempSortOption === 'latest' ? colors.primary : colors.text + '30'} 
                        />
                        <Text style={[styles.sortOptionText, { color: colors.text + '90' }, tempSortOption === 'latest' && { color: colors.text, fontWeight: '700' }]}>Latest Reports</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.sortOptionItem}
                        onPress={() => {
                            if (!userLocation) {
                                Alert.alert('Location Required', 'Please enable location to use this feature.');
                                return;
                            }
                            setTempSortOption('nearest');
                        }}
                    >
                        <Ionicons 
                            name={tempSortOption === 'nearest' ? "radio-button-on" : "radio-button-off"} 
                            size={20} 
                            color={tempSortOption === 'nearest' ? colors.primary : colors.text + '30'} 
                        />
                        <Text style={[styles.sortOptionText, { color: colors.text + '90' }, tempSortOption === 'nearest' && { color: colors.text, fontWeight: '700' }]}>Nearest to Me</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={[styles.applyBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                        setActiveStatusFilter(tempStatusFilter);
                        setActiveSortOption(tempSortOption);
                        setShowFilterModal(false);
                    }}
                >
                    <Text style={styles.applyBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const getStyles = (colors: typeof Colors.light & typeof Colors.dark, colorScheme: string) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.background,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  activeFilters: { marginTop: 2 },
  filterSummary: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.text + '05', justifyContent: 'center', alignItems: 'center' },
  reportBtn: { justifyContent: 'center', alignItems: 'center' },

  card: { backgroundColor: colors.card, borderRadius: 24, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: colors.border + '20' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  createdAt: { fontSize: 11, color: colors.text + '60' },

  contentRow: { flexDirection: 'row', alignItems: 'center' },
  caseImg: { width: 80, height: 80, borderRadius: 16 },
  caseDetails: { flex: 1, marginLeft: 12, gap: 2 },
  petName: { fontSize: 17, fontWeight: '800', color: colors.text },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { backgroundColor: colors.primary + '15', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 10, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  distanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  distanceText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  description: { fontSize: 13, color: colors.text + '90', lineHeight: 18, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { fontSize: 12, color: colors.text + '60' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 20 },
  emptySubtitle: { fontSize: 14, color: colors.text + '60', textAlign: 'center', marginTop: 10, lineHeight: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.background, width: width * 0.9, borderRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  filterLabel: { fontSize: 14, fontWeight: '700', color: colors.text + '40', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  optionChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.text + '05', borderWidth: 1, borderColor: colors.text + '05' },
  optionChipText: { fontSize: 14, fontWeight: '600', color: colors.text + '60' },
  sortOptions: { marginBottom: 24 },
  sortOptionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sortOptionText: { fontSize: 16, fontWeight: '500', color: colors.text + '90' },
  applyBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
