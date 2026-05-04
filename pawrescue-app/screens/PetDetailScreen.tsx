import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, FlatList, Alert, Linking, Modal, TextInput, KeyboardAvoidingView, Platform, StatusBar, DeviceEventEmitter } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { petService } from '@/services/petService';
import { authService } from '@/services/authService';
import { adoptionService } from '@/services/adoptionService';
import { appointmentService } from '@/services/appointmentService';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { EditPetModal } from '@/components/edit-pet-modal';

const { width } = Dimensions.get('window');

interface Pet {
  _id: string;
  name: string;
  breed?: string;
  age?: number;
  gender?: string;
  location?: string;
  description?: string;
  images?: string[];
  price?: number;
  latitude?: number;
  longitude?: number;
  status?: string;
  type?: { _id: string; name: string };
  createdBy?: { _id?: string; name: string; username: string; email?: string; phoneNumber?: string };
  [key: string]: any;
}

interface AdoptionRequest {
  _id: string;
  status: 'pending' | 'approved' | 'rejected';
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: 'Available', color: '#fff', bg: '#27AE60' },
  adopted: { label: 'Adopted', color: '#fff', bg: '#3498DB' },
  'rescue-needed': { label: 'Rescue Needed', color: '#fff', bg: '#E74C3C' },
};

export const PetDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [liked, setLiked] = useState(false);

  // Adoption state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [existingRequest, setExistingRequest] = useState<AdoptionRequest | null>(null);
  const [adoptLoading, setAdoptLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [adoptMessage, setAdoptMessage] = useState('');

  // Appointment state
  const [showApptModal, setShowApptModal] = useState(false);
  const [apptDateObj, setApptDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [apptLocation, setApptLocation] = useState('');
  const [apptLoading, setApptLoading] = useState(false);

  // Image Viewer State
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Load current user id once
  useEffect(() => {
    AsyncStorage.getItem('user').then((raw) => {
      if (raw) {
        try {
          const u = JSON.parse(raw);
          setCurrentUserId(u._id || u.id || null);
        } catch { }
      }
    }).finally(() => setUserLoading(false));
  }, []);

  useEffect(() => {
    if (id) {
      loadPet(id);
      checkExistingRequest(id);
      checkIfLiked(id);
    }
    const sub = DeviceEventEmitter.addListener('petDataChanged', () => id && loadPet(id));
    return () => sub.remove();
  }, [id, currentUserId]);

  const loadPet = async (petId: string) => {
    try {
      setLoading(true);
      const res = await petService.getPetById(petId);
      setPet(res.data);
    } catch {
      Alert.alert('Error', 'Could not load pet details.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const checkIfLiked = async (petId: string) => {
    if (!currentUserId) return;
    try {
      const res = await authService.getFavorites();
      if (res.data.success) {
        const isLiked = res.data.data.some((p: any) => p._id === petId);
        setLiked(isLiked);
      }
    } catch { }
  };

  const checkExistingRequest = async (petId: string) => {
    if (!currentUserId) return;
    try {
      const res = await adoptionService.checkRequest(petId);
      setExistingRequest(res.data || null);
    } catch { }
  };

  const handleToggleFavorite = async () => {
    if (!currentUserId) {
      Alert.alert('Login Required', 'Please log in to save pets to your favorites.');
      return;
    }
    try {
      const res = await authService.toggleFavorite(id!);
      if (res.data.success) {
        setLiked(res.data.isFavorite);
        // Alert.alert(res.data.isFavorite ? '🐾 Added to Favorites' : 'Removed from Favorites');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const handleContact = () => {
    const phone = pet?.createdBy?.phoneNumber;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Contact', 'No phone number available.');
    }
  };

  const handleLocationPress = () => {
    if (pet?.latitude && pet?.longitude) {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${pet.latitude},${pet.longitude}`;
      const label = pet.name;
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`
      });
      if (url) Linking.openURL(url);
    } else {
      Alert.alert('Location', 'Map location not available for this pet.');
    }
  };

  const handleAdoptPress = () => {
    if (!currentUserId) {
      Alert.alert('Login Required', 'Please log in to request adoption.');
      return;
    }
    setAdoptMessage('');
    setShowModal(true);
  };

  const handleSubmitAdoption = async () => {
    if (!pet) return;
    try {
      setAdoptLoading(true);
      const res = await adoptionService.createRequest(pet._id, adoptMessage.trim());
      setExistingRequest(res.data);
      setShowModal(false);
      Alert.alert('🐾 Request Sent!', 'Your adoption request has been submitted.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit request');
    } finally {
      setAdoptLoading(false);
    }
  };

  const handleBookVisitPress = () => {
    if (!currentUserId) {
      Alert.alert('Login Required', 'Please log in to book a visit.');
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setApptDateObj(tomorrow);
    setApptLocation(pet?.location || '');
    setShowApptModal(true);
  };

  const handleDeletePet = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this pet post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await petService.deletePet(pet!._id);
            Alert.alert('Deleted', 'Pet post has been deleted.');
            DeviceEventEmitter.emit('petDataChanged');
            router.back();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(apptDateObj);
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setApptDateObj(newDate);
      setTimeout(() => setShowTimePicker(true), 500);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(apptDateObj);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setApptDateObj(newDate);
    }
  };

  const handleSubmitAppointment = async () => {
    if (!pet) return;
    try {
      setApptLoading(true);
      await appointmentService.bookAppointment(pet._id, apptDateObj.toISOString(), apptLocation);
      setShowApptModal(false);
      Alert.alert('📅 Visit Booked!', 'Your request to visit has been sent.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to book visit');
    } finally {
      setApptLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E8A358" />
      </View>
    );
  }

  if (!pet) return null;

  const images = pet.images && pet.images.length > 0 ? pet.images : [null];
  const ownerId = pet.createdBy?._id || (pet.createdBy as any)?.id;
  const isOwnPet = !!currentUserId && ownerId === currentUserId;

  const renderCTA = () => {
    if (userLoading) return <ActivityIndicator color="#E8A358" />;

    if (isOwnPet) {
      return (
        <View style={styles.ownerCtaRow}>
          <TouchableOpacity
            style={[styles.ownerBtn, { backgroundColor: '#F39334' }]}
            onPress={() => setEditModalVisible(true)}
          >
            <Ionicons name="pencil" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.ownerBtnText}>Edit Post</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ownerBtn, { backgroundColor: '#E74C3C' }]}
            onPress={handleDeletePet}
          >
            <Ionicons name="trash" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.ownerBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.ctaRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleContact}>
          <Ionicons name="call" size={22} color="#F39334" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={handleLocationPress}>
          <Ionicons name="navigate" size={22} color="#F39334" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.visitBtn} onPress={handleBookVisitPress}>
          <Text style={styles.visitBtnText}>Visit</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.adoptBtn, (existingRequest || adoptLoading) && { backgroundColor: '#ccc' }]} 
          onPress={handleAdoptPress} 
          disabled={!!existingRequest || adoptLoading}
        >
          {adoptLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.adoptText}>
              {existingRequest 
                ? existingRequest.status === 'pending' 
                  ? 'Request Pending' 
                  : existingRequest.status === 'approved' 
                    ? 'Request Approved' 
                    : 'Request Rejected'
                : 'Adopt me'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pet's Details</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleToggleFavorite}>
          <Ionicons name={liked ? "heart" : "heart-outline"} size={24} color={liked ? colors.primary : colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        {/* ── White Container Card ── */}
        <View style={styles.mainCard}>
          <View style={styles.imageContainer}>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentImage(idx);
              }}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    setViewerIndex(index);
                    setShowImageViewer(true);
                  }}
                  style={styles.imageWrapper}
                >
                  <Image source={item ? { uri: item } : require('@/assets/images/splash_image.png')} style={styles.mainImage} resizeMode="cover" />
                </TouchableOpacity>
              )}
            />
            {images.length > 1 && (
              <View style={styles.dots}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, currentImage === i && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.cardContent}>
            <View style={styles.titleRow}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.priceText}>{pet.price === 0 ? 'Free' : pet.price ? `Rs.${pet.price}` : 'Free'}</Text>
            </View>

            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <View style={styles.gridIconBg}><Ionicons name="hourglass-outline" size={20} color="#FFF" /></View>
                <View>
                  <Text style={styles.gridLabel}>Age</Text>
                  <Text style={styles.gridValue}>{pet.age || '—'} yr{pet.age !== 1 ? 's' : ''}</Text>
                </View>
              </View>

              <View style={styles.gridItem}>
                <View style={styles.gridIconBg}><Ionicons name="male-female-outline" size={20} color="#FFF" /></View>
                <View>
                  <Text style={styles.gridLabel}>Gender</Text>
                  <Text style={styles.gridValue}>{pet.gender || '—'}</Text>
                </View>
              </View>

              <View style={styles.gridItem}>
                <View style={styles.gridIconBg}><Ionicons name="paw-outline" size={20} color="#FFF" /></View>
                <View>
                  <Text style={styles.gridLabel}>Breed</Text>
                  <Text style={styles.gridValue} numberOfLines={1}>{pet.breed || '—'}</Text>
                </View>
              </View>

              <View style={styles.gridItem}>
                <View style={styles.gridIconBg}><Ionicons name="grid-outline" size={20} color="#FFF" /></View>
                <View>
                  <Text style={styles.gridLabel}>Category</Text>
                  <Text style={styles.gridValue}>{pet.type?.name || '—'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.aboutSection}>
            <Text style={styles.aboutTitle}>About {pet.name}</Text>
            <Text style={styles.aboutText}>{pet.description || "No description available."}</Text>
          </View>

          {pet.latitude && pet.longitude && (
            <View style={styles.section}>
              <Text style={styles.aboutTitle}>Location</Text>
              <View style={styles.mapWrapper}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: pet.latitude,
                    longitude: pet.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker coordinate={{ latitude: pet.latitude, longitude: pet.longitude }} title={pet.name} pinColor="#F39334" />
                </MapView>
                <TouchableOpacity style={styles.mapOverlay} onPress={handleLocationPress}>
                  <View style={styles.directionsBtn}>
                    <Ionicons name="navigate" size={20} color="#fff" />
                    <Text style={styles.directionsText}>Get Directions</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <Text style={styles.fullLocationText}>{pet.location}</Text>
            </View>
          )}

          {pet.createdBy && (
            <View style={styles.section}>
              <Text style={styles.aboutTitle}>Posted by</Text>
              <View style={styles.posterCard}>
                <View style={styles.posterAvatar}><Ionicons name="person" size={24} color="#F39334" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.posterName}>{pet.createdBy.name}</Text>
                  <Text style={styles.posterPhone}>{pet.createdBy.phoneNumber || pet.createdBy.email}</Text>
                </View>
                <TouchableOpacity style={styles.posterCallBtn} onPress={handleContact}>
                  <Ionicons name="call" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        {renderCTA()}
      </View>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Request to Adopt</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Your message to the owner..."
              multiline
              numberOfLines={4}
              value={adoptMessage}
              onChangeText={setAdoptMessage}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowModal(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSubmitAdoption} disabled={adoptLoading}>
                {adoptLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showApptModal} transparent animationType="slide" onRequestClose={() => setShowApptModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalSubtitle}>Schedule a time to meet <Text style={{ color: '#F39334', fontWeight: '700' }}>{pet.name}</Text></Text>

            <Text style={styles.inputLabel}>Date & Time</Text>
            <TouchableOpacity style={styles.dateDisplay} onPress={() => setShowDatePicker(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={styles.dateIconBg}>
                  <Ionicons name="calendar-outline" size={20} color="#F39334" />
                </View>
                <Text style={styles.dateDisplayText}>{apptDateObj.toLocaleString('en-US', { 
                  month: 'short', day: 'numeric', year: 'numeric', 
                  hour: 'numeric', minute: '2-digit', hour12: true 
                })}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#ccc" />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Meeting Location</Text>
            <View style={{ height: 180, zIndex: 100, marginBottom: 10 }}>
              <GooglePlacesAutocomplete
                placeholder="Search meeting location..."
                onPress={(data, details = null) => {
                  setApptLocation(data.description);
                }}
                query={{
                  key: 'AIzaSyCZ1MzvV0ndr3tZZo1TyJ8q01HjjOtBCOU',
                  language: 'en',
                }}
                styles={{
                  container: { flex: 0 },
                  textInput: styles.locationInputStyle,
                  listView: { 
                    backgroundColor: colors.card, 
                    position: 'absolute', 
                    top: 50, 
                    zIndex: 1000,
                    elevation: 5,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border
                  },
                  row: { backgroundColor: colors.card, padding: 13 },
                  separator: { backgroundColor: colors.border },
                  description: { color: colors.text },
                }}
                textInputProps={{
                  value: apptLocation,
                  onChangeText: setApptLocation,
                }}
                enablePoweredByContainer={false}
                nearbyPlacesAPI="GooglePlacesSearch"
                debounce={200}
              />
            </View>

            {showDatePicker && <DateTimePicker value={apptDateObj} mode="date" display="default" onChange={onDateChange} minimumDate={new Date()} />}
            {showTimePicker && <DateTimePicker value={apptDateObj} mode="time" display="default" onChange={onTimeChange} />}
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowApptModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSubmitAppointment} disabled={apptLoading}>
                {apptLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="calendar" size={20} color="#fff" />
                    <Text style={styles.modalSubmitText}>Confirm Visit</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showImageViewer} transparent animationType="fade">
        <View style={styles.viewerOverlay}>
          <TouchableOpacity
            style={[styles.viewerClose, { top: insets.top + 10 }]}
            onPress={() => setShowImageViewer(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <FlatList
            data={images}
            horizontal
            pagingEnabled
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            keyExtractor={(_, i) => `viewer-${i}`}
            renderItem={({ item }) => (
              <View style={styles.viewerItem}>
                <Image
                  source={{ uri: item || '' }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />
        </View>
      </Modal>

      {pet && (
        <EditPetModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onPetUpdated={() => DeviceEventEmitter.emit('petDataChanged')}
          pet={pet}
        />
      )}
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15 },
  headerBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  mainCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 35,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 3,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  imageContainer: { paddingHorizontal: 0, marginTop: 0 },
  imageWrapper: { width: width - 48, height: 360, borderRadius: 28, overflow: 'hidden', backgroundColor: colors.secondary + '20' },
  mainImage: { width: '100%', height: '100%' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: -30, marginBottom: 20, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.2)' },
  dotActive: { width: 20, backgroundColor: '#FFF' },
  content: { paddingHorizontal: 20, marginTop: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  petName: { fontSize: 24, fontWeight: '800', color: colors.text },
  priceText: { fontSize: 24, fontWeight: '900', color: '#F39334' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  gridItem: { width: (width - 80 - 12) / 2, height: 65, backgroundColor: '#006B61', borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  gridIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  gridLabel: { fontSize: 12, color: '#FFF', opacity: 0.8 },
  gridValue: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  aboutSection: { marginTop: 10 },
  aboutTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 10 },
  aboutText: { fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  section: { marginTop: 30 },
  mapWrapper: { height: 180, borderRadius: 20, overflow: 'hidden', marginTop: 10, backgroundColor: colors.border },
  map: { ...StyleSheet.absoluteFillObject },
  mapOverlay: { position: 'absolute', bottom: 12, right: 12 },
  directionsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F39334', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  directionsText: { color: '#fff', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  fullLocationText: { fontSize: 14, color: colors.textMuted, marginTop: 8, fontStyle: 'italic' },
  posterCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 16, marginTop: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  posterAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.secondary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  posterName: { fontSize: 16, fontWeight: '700', color: colors.text },
  posterPhone: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  posterCallBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#27AE60', justifyContent: 'center', alignItems: 'center' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 15, backgroundColor: colors.background },
  ctaRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  visitBtn: { flex: 1, height: 56, borderRadius: 28, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#F39334' },
  visitBtnText: { color: '#F39334', fontSize: 16, fontWeight: '800' },
  adoptBtn: { flex: 2, height: 56, borderRadius: 28, backgroundColor: '#F39334', justifyContent: 'center', alignItems: 'center' },
  adoptText: { color: '#FFF', fontSize: 17, fontWeight: '800' },

  ownerCtaRow: { flexDirection: 'row', gap: 12 },
  ownerBtn: { flex: 1, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  ownerBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 20 },
  modalSubtitle: { fontSize: 16, color: colors.textMuted, marginBottom: 24, marginTop: -10 },
  inputLabel: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  messageInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 15, minHeight: 120, color: colors.text, textAlignVertical: 'top', marginBottom: 20 },
  locationInputContainer: { 
    backgroundColor: colors.background, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: colors.border, 
    marginBottom: 25,
    paddingHorizontal: 15,
    height: 56,
    justifyContent: 'center'
  },
  locationInputStyle: {
    backgroundColor: colors.background,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    height: 50,
    fontSize: 15,
    color: colors.text,
  },
  modalActions: { flexDirection: 'row', gap: 15, marginTop: 10 },
  modalCancelBtn: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center' },
  modalCancelText: { color: colors.textMuted, fontWeight: '600' },
  modalSubmitBtn: { flex: 2, height: 56, borderRadius: 18, backgroundColor: '#F39334', justifyContent: 'center', alignItems: 'center' },
  modalSubmitText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  dateDisplay: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    backgroundColor: colors.background, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: colors.border, 
    marginBottom: 20,
    height: 64
  },
  dateIconBg: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#F3933415', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12
  },
  dateDisplayText: { color: colors.text, fontSize: 16, fontWeight: '600' },

  viewerOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  viewerItem: { width, height: '100%', justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', right: 20, zIndex: 10, padding: 10 },
});
