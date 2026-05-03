import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Linking,
  Platform,
  DeviceEventEmitter,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { rescueService } from '@/services/rescueService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface RescueCase {
  _id: string;
  petId?: {
    _id: string;
    name: string;
    images?: string[];
    breed?: string;
    status?: string;
  };
  title: string;
  animalType: string;
  reportedBy: {
    _id: string;
    name: string;
    username: string;
    email?: string;
    phoneNumber?: string;
  };
  description: string;
  rescueStatus: 'pending' | 'in-progress' | 'rescued';
  location: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  assignedTo?: {
    _id: string;
    name: string;
  };
  createdAt: string;
}
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

const getStatusConfig = (colors: any) => ({
  pending: { label: 'Pending', color: '#F0A500', bg: '#F0A50015', icon: 'time-outline' },
  'in-progress': { label: 'In Progress', color: '#3498DB', bg: '#3498DB15', icon: 'sync-outline' },
  rescued: { label: 'Rescued', color: '#27AE60', bg: '#27AE6015', icon: 'checkmark-circle-outline' },
});

export const RescueDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = Colors[colorScheme];
  const styles = React.useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);
  const STATUS_CONFIG = React.useMemo(() => getStatusConfig(colors), [colors]);

  const [rescueCase, setRescueCase] = useState<RescueCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  useEffect(() => {
    loadUser();
    if (id) loadRescueCase(id);

    const subscription = DeviceEventEmitter.addListener('rescueDataChanged', () => {
      if (id) loadRescueCase(id);
    });

    return () => {
      subscription.remove();
    };
  }, [id]);

  const loadUser = async () => {
    const raw = await AsyncStorage.getItem('user');
    if (raw) {
      const u = JSON.parse(raw);
      setCurrentUserId(u._id || u.id);
    }
  };

  const loadRescueCase = async (caseId: string) => {
    try {
      setLoading(true);
      const res = await rescueService.getRescueCaseById(caseId);
      setRescueCase(res.data);
    } catch {
      Alert.alert('Error', 'Could not load rescue case details.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const confirmStatusChange = (status: string, message: string) => {
    Alert.alert(
      'Confirm Status Change',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Change', onPress: () => handleUpdateStatus(status) }
      ]
    );
  };

  const handleUpdateStatus = async (status: string) => {
    if (!rescueCase) return;
    try {
      setUpdating(true);
      await rescueService.updateRescueStatus(rescueCase._id, { 
        rescueStatus: status,
        assignedTo: status === 'in-progress' ? currentUserId : (status === 'pending' ? null : rescueCase.assignedTo?._id)
      });
      
      console.log("Emitting 'rescueDataChanged' from Detail Screen...");
      DeviceEventEmitter.emit('rescueDataChanged');
      
      loadRescueCase(rescueCase._id);
      Alert.alert('Success', `Rescue status updated to ${status}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Rescue Case', 'Are you sure you want to delete this case?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!rescueCase) return;
          try {
            await rescueService.deleteRescueCase(rescueCase._id);
            Alert.alert('Success', 'Rescue case deleted');
            DeviceEventEmitter.emit('rescueDataChanged');
            router.back();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete');
          }
        }
      }
    ]);
  };

  const handleUpdate = () => {
    if (!rescueCase) return;
    router.push(`/rescue/edit/${rescueCase._id}` as any);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!rescueCase) return null;

  const images = rescueCase.images && rescueCase.images.length > 0 ? rescueCase.images : 
                 (rescueCase.petId?.images && rescueCase.petId.images.length > 0 ? [rescueCase.petId.images[0]] : [null]);
  const status = STATUS_CONFIG[rescueCase.rescueStatus];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      
      <View style={[styles.headerBar, { paddingTop: insets.top + 12, backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Rescue Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        {/* Images */}
        <View style={styles.galleryWrapper}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
              setCurrentImage(idx);
            }}
          >
            {images.map((item, i) => (
              <TouchableOpacity 
                key={i} 
                style={styles.imageCard}
                onPress={() => {
                  setViewerIndex(i);
                  setShowImageViewer(true);
                }}
                activeOpacity={0.9}
              >
                {item ? (
                  <Image source={{ uri: item }} style={styles.galleryImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.galleryImage, styles.galleryPlaceholder, { backgroundColor: colors.text + '05' }]}>
                    <Ionicons name="paw" size={60} color={colors.text + '20'} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          {images.length > 1 && (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, currentImage === i && styles.dotActive]} />
              ))}
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon as any} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.petName, { color: colors.text }]}>{rescueCase.title || rescueCase.petId?.name || 'Injured Animal'}</Text>
            <View style={[styles.typeBadge, { backgroundColor: colors.primary + '15' }]}>
               <Text style={[styles.typeText, { color: colors.primary }]}>{rescueCase.animalType || 'Stray'}</Text>
            </View>
          </View>

          <Text style={[styles.description, { color: colors.text + '80' }]}>{rescueCase.description}</Text>

          {rescueCase.petId && (
            <TouchableOpacity 
                style={[styles.petLink, { backgroundColor: colors.text + '05' }]}
                onPress={() => router.push(`/pet/${rescueCase.petId?._id}` as any)}
            >
                <Ionicons name="paw" size={18} color={colors.primary} />
                <Text style={[styles.petLinkText, { color: colors.primary }]}>View Linked Pet Profile: {rescueCase.petId.name}</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.divider, { backgroundColor: colors.text + '05' }]} />

          {/* Location Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rescue Location</Text>
          <View style={styles.locationInfo}>
            <Ionicons name="location-sharp" size={20} color={colors.primary} />
            <Text style={[styles.locationText, { color: colors.text + '60' }]}>{rescueCase.location}</Text>
          </View>

          {rescueCase.latitude && rescueCase.longitude && (
            <View style={[styles.mapWrapper, { borderColor: colors.text + '10', borderWidth: 1 }]}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                  latitude: rescueCase.latitude,
                  longitude: rescueCase.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                customMapStyle={colorScheme === 'dark' ? mapDarkStyle : []}
              >
                <Marker 
                  coordinate={{ latitude: rescueCase.latitude, longitude: rescueCase.longitude }}
                  pinColor={colors.primary}
                />
              </MapView>
              <TouchableOpacity 
                style={styles.mapOverlay}
                onPress={() => {
                  const url = Platform.select({
                    ios: `maps:0,0?q=${rescueCase.latitude},${rescueCase.longitude}`,
                    android: `geo:0,0?q=${rescueCase.latitude},${rescueCase.longitude}`,
                  });
                  if (url) Linking.openURL(url);
                }}
              >
                <View style={[styles.directionsBtn, { backgroundColor: colors.primary }]}>
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.directionsText}>Open in Maps</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.text + '05' }]} />

          {/* Reported By Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Reported By</Text>
          <View style={[styles.userCard, { backgroundColor: colors.text + '05' }]}>
            <View style={[styles.userAvatar, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: colors.text }]}>{rescueCase.reportedBy.name}</Text>
              <Text style={[styles.userSub, { color: colors.text + '40' }]}>Reported on {new Date(rescueCase.createdAt).toLocaleDateString()}</Text>
            </View>
            {rescueCase.reportedBy.phoneNumber && (
              <TouchableOpacity 
                style={[styles.contactBtn, { backgroundColor: colors.primary }]}
                onPress={() => Linking.openURL(`tel:${rescueCase.reportedBy.phoneNumber}`)}
              >
                <Ionicons name="call" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          
          {rescueCase.assignedTo && rescueCase.rescueStatus !== 'pending' && (
            <>
              <Text style={[styles.sectionTitle, {marginTop: 20, color: colors.text }]}>Assigned To</Text>
              <View style={[styles.userCard, { backgroundColor: colors.text + '05' }]}>
                <View style={[styles.userAvatar, {backgroundColor: '#3498DB15'}]}>
                  <Ionicons name="shield-checkmark" size={24} color="#3498DB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: colors.text }]}>{rescueCase.assignedTo.name}</Text>
                  <Text style={[styles.userSub, { color: colors.text + '40' }]}>Rescue Team</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.text + '05' }]}>
        {updating ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <>
            {rescueCase.reportedBy._id === currentUserId && (
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <TouchableOpacity 
                  style={[styles.flatActionBtn, { flex: 1, backgroundColor: colors.text + '05', paddingVertical: 12 }]}
                  onPress={handleUpdate}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text, fontSize: 14 }]}>Update</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.flatActionBtn, { flex: 1, backgroundColor: '#FF3B3015', paddingVertical: 12 }]}
                  onPress={handleDelete}
                >
                  <Text style={[styles.actionBtnText, { color: '#FF3B30', fontSize: 14 }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}

            {rescueCase.rescueStatus === 'pending' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#3498DB' }]}
                onPress={() => confirmStatusChange('in-progress', 'Are you sure you want to accept this rescue case?')}
              >
                <Text style={styles.actionBtnText}>Accept Rescue Case</Text>
              </TouchableOpacity>
            )}
            
            {rescueCase.rescueStatus === 'in-progress' && (
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.smallBtn, { backgroundColor: colors.text + '05' }]}
                  onPress={() => confirmStatusChange('pending', 'Are you sure you want to move this back to pending?')}
                >
                  <Ionicons name="close-circle" size={20} color={colors.text + '40'} />
                  <Text style={[styles.smallBtnText, { color: colors.text + '60' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, { flex: 1, backgroundColor: '#27AE60' }]}
                  onPress={() => confirmStatusChange('rescued', 'Has this pet been successfully rescued?')}
                >
                  <Text style={styles.actionBtnText}>Mark as Rescued</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {rescueCase.rescueStatus === 'rescued' && (
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.smallBtn, { backgroundColor: colors.text + '05' }]}
                  onPress={() => confirmStatusChange('in-progress', 'Reopen this case for further rescue actions?')}
                >
                  <Ionicons name="refresh" size={18} color={colors.text + '40'} />
                  <Text style={[styles.smallBtnText, { color: colors.text + '60' }]}>Reopen</Text>
                </TouchableOpacity>
                <View style={[styles.flatActionBtn, { flex: 1, backgroundColor: '#27AE6015' }]}>
                  <Text style={[styles.actionBtnText, { color: '#27AE60' }]}>Pet Rescued! 🎉</Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>

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
    </View>
  );
};

const getStyles = (colors: any, colorScheme: string) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.text + '05', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  galleryWrapper: { position: 'relative', marginHorizontal: 16, marginTop: 16, borderRadius: 24, overflow: 'hidden' },
  imageCard: { width: width - 32, height: 300, backgroundColor: colors.text + '05' },
  galleryImage: { width: '100%', height: '100%' },
  galleryPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  dots: { position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 20, backgroundColor: '#fff' },
  statusBadge: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '800' },

  content: { padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  petName: { fontSize: 26, fontWeight: '800', color: colors.text },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  description: { fontSize: 16, lineHeight: 24, marginBottom: 16 },
  
  petLink: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginBottom: 10 },
  petLinkText: { fontSize: 14, fontWeight: '700' },

  divider: { height: 1, marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  
  locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  locationText: { fontSize: 15, flex: 1 },
  
  mapWrapper: { height: 200, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  map: { width: '100%', height: '100%' },
  mapOverlay: { position: 'absolute', bottom: 12, right: 12 },
  directionsBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 6 },
  directionsText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16 },
  userAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 16, fontWeight: '700' },
  userSub: { fontSize: 13 },
  contactBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  buttonRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  smallBtn: { paddingHorizontal: 16, paddingVertical: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallBtnText: { fontSize: 14, fontWeight: '700' },
  actionBtn: { paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  flatActionBtn: { paddingVertical: 18, borderRadius: 18, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  // Viewer Styles
  viewerOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  viewerItem: { width, height: '100%', justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', right: 20, zIndex: 10, padding: 10 },
});

const mapDarkStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];
