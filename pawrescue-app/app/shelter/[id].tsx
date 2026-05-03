import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
  FlatList,
  Modal,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { shelterService } from '@/services/shelterService';
import { PetCard } from '@/components/pet-card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

const { width } = Dimensions.get('window');

interface Shelter {
  _id: string;
  name: string;
  location: string;
  contactNumber: string;
  email: string;
  description: string;
  images?: string[];
  image?: string;
  type: 'shelter' | 'care-center';
  latitude?: number;
  longitude?: number;
}

interface Pet {
  _id: string;
  name: string;
  breed?: string;
  images?: string[];
  type?: { name: string };
  location: string;
}

export default function ShelterDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  // Image Viewer State
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [activeHeaderIndex, setActiveHeaderIndex] = useState(0);

  const styles = React.useMemo(() => getStyles(colors), [colors, colorScheme]);

  useEffect(() => {
    loadShelterDetails();
  }, [id]);

  const loadShelterDetails = async () => {
    try {
      setLoading(true);
      const res = await shelterService.getShelterById(id as string);
      const shelterData = res.data;
      if ((!shelterData.images || shelterData.images.length === 0) && shelterData.image) {
        shelterData.images = [shelterData.image];
      }
      setShelter(shelterData);
      setPets(res.pets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!shelter) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.text }}>Center not found</Text>
      </View>
    );
  }

  const handleCall = () => Linking.openURL(`tel:${shelter.contactNumber}`);
  const handleEmail = () => Linking.openURL(`mailto:${shelter.email}`);
  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${shelter.latitude},${shelter.longitude}`;
    Linking.openURL(url);
  };

  const images = shelter.images && shelter.images.length > 0 ? shelter.images : [null];

  return (
    <View style={styles.container}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Back Button - Fixed in Safe Area */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} bounces={true} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Header Images Carousel */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ width: width, height: 350 }}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveHeaderIndex(index);
            }}
          >
            {images.map((img, index) => (
              <TouchableOpacity
                key={index}
                style={{ width: width, height: 350 }}
                activeOpacity={0.9}
                onPress={() => {
                  if (img) {
                    setViewerIndex(index);
                    setIsViewerVisible(true);
                  }
                }}
              >
                {img ? (
                  <Image source={{ uri: img }} style={styles.image} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name={shelter.type === 'care-center' ? 'medkit' : 'business'} size={80} color={colors.text + '20'} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {images.length > 1 && (
            <View style={styles.pagination}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeHeaderIndex && styles.activeDot]} />
              ))}
            </View>
          )}

          {/* Gradient Overlay for bottom of image */}
          <View style={styles.gradient} />
        </View>

        {/* Content Section */}
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <View style={styles.headerRow}>
            <View style={[styles.typeBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
                {shelter.type === 'care-center' ? 'PET CARE' : 'ANIMAL SHELTER'}
              </Text>
            </View>
          </View>

          <Text style={[styles.name, { color: colors.text }]}>{shelter.name}</Text>

          <View style={styles.addressRow}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <Text style={[styles.addressText, { color: colors.text + '60' }]}>{shelter.location}</Text>
          </View>

          <View style={styles.addressRow}>
            <Ionicons name="call" size={18} color={colors.primary} />
            <Text style={[styles.addressText, { color: colors.text + '60' }]}>{shelter.contactNumber}</Text>
          </View>

          {/* Contact Cards */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <View style={styles.btnIconCircle}>
                <Ionicons name="call" size={20} color="#FFF" />
              </View>
              <Text style={styles.actionBtnText}>Call Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3498DB' }]} onPress={handleEmail}>
              <View style={[styles.btnIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="mail" size={20} color="#FFF" />
              </View>
              <Text style={styles.actionBtnText}>Email</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About this Center</Text>
            <Text style={[styles.description, { color: colors.text + '80' }]}>
              {shelter.description || `Welcome to ${shelter.name}. We are dedicated to providing the best care for animals in our community. Our professional team ensures a safe and happy environment for all furry friends.`}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
            <Text style={[styles.locationSubtitle, { color: colors.text + '40' }]}>{shelter.location}</Text>
            <View style={[styles.mapContainer, { borderColor: colors.border + '20', borderWidth: 1 }]}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                  latitude: shelter.latitude || 0,
                  longitude: shelter.longitude || 0,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                customMapStyle={colorScheme === 'dark' ? mapDarkStyle : []}
              >
                <Marker
                  coordinate={{ latitude: shelter.latitude || 0, longitude: shelter.longitude || 0 }}
                >
                  <View style={styles.customMarker}>
                    <Ionicons name={shelter.type === 'care-center' ? 'medkit' : 'business'} size={20} color="#FFF" />
                  </View>
                </Marker>
              </MapView>
              <TouchableOpacity style={styles.directionsBtn} onPress={handleDirections}>
                <Ionicons name="navigate" size={16} color="#FFF" />
                <Text style={styles.directionsText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Shelter's Pets */}
          {shelter.type === 'shelter' && pets.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Pets</Text>
                <Text style={[styles.petCount, { color: colors.text + '40' }]}>{pets.length} Friends</Text>
              </View>
              <FlatList
                data={pets}
                renderItem={({ item }) => (
                  <PetCard
                    pet={item}
                    onPress={() => router.push(`/pet/${item._id}`)}
                  />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ gap: 12, paddingVertical: 10 }}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fullscreen Image Viewer Modal */}
      <Modal visible={isViewerVisible} animationType="fade" statusBarTranslucent={true}>
        <View style={[styles.viewerContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={styles.closeViewerBtn}
            onPress={() => setIsViewerVisible(false)}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: width * viewerIndex, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setViewerIndex(index);
            }}
          >
            {shelter.images?.map((img, index) => (
              <View key={index} style={styles.viewerImageWrapper}>
                <Image source={{ uri: img }} style={styles.viewerImage} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>

          <View style={styles.viewerFooter}>
            <Text style={styles.viewerIndexText}>
              {viewerIndex + 1} / {shelter.images?.length}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: typeof Colors.light & typeof Colors.dark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  imageContainer: { height: 350, width: width, position: 'relative', backgroundColor: colors.text + '05' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { width: '100%', height: 350, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.text + '05' },
  gradient: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 100,
    backgroundColor: 'transparent',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    backgroundColor: colors.background + 'CC',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  content: {
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.background,
    marginTop: -40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  headerRow: { marginBottom: 12 },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  typeBadgeText: { fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  name: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 },
  addressText: { fontSize: 14, color: colors.text + '60', flex: 1, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 35, marginTop: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  btnIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  section: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12 },
  petCount: { fontSize: 13, color: colors.text + '40', fontWeight: '600' },
  description: { fontSize: 15, color: colors.text + '80', lineHeight: 26 },
  locationSubtitle: { fontSize: 14, color: colors.text + '40', marginBottom: 15 },
  mapContainer: { height: 220, width: '100%', borderRadius: 24, overflow: 'hidden', position: 'relative' },
  map: { flex: 1 },
  customMarker: {
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  directionsBtn: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: '#1A1A1A',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, elevation: 5,
  },
  directionsText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  pagination: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  activeDot: {
    backgroundColor: '#FFF',
    width: 20,
    borderRadius: 4,
  },

  // Image Viewer
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeViewerBtn: {
    position: 'absolute',
    right: 20,
    top: 50,
    zIndex: 1000,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  viewerImageWrapper: {
    width: width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: width,
    height: '80%',
  },
  viewerFooter: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  viewerIndexText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  }
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
