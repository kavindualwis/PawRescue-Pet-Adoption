import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  FlatList,
  LogBox,
  DeviceEventEmitter,
} from 'react-native';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GOOGLE_MAPS_API_KEY } from "@/services/config";
import { rescueService } from '@/services/rescueService';
import { petService } from '@/services/petService';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface Pet {
  _id: string;
  name: string;
  breed?: string;
  images?: string[];
}

export const ReportRescueScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colorScheme } = useTheme();
  const colors = Colors[colorScheme];
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [loading, setLoading] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [title, setTitle] = useState('');
  const [animalType, setAnimalType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [showPetPicker, setShowPetPicker] = useState(false);
  const placesRef = React.useRef<any>(null);

  useEffect(() => {
    loadPets();
    getCurrentLocation();
  }, []);

  const loadPets = async () => {
    try {
      const res = await petService.getAllPets();
      setPets(res.data || []);
    } catch (error) {
      console.log('Error loading pets:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setFetchingLocation(true);
      
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert('Location Services Disabled', 'Please enable location services in your device settings to detect your current location.');
        setFetchingLocation(false);
        return;
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to report rescue cases with location.');
        setFetchingLocation(false);
        return;
      }

      let loc;
      try {
        loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch (posError) {
        // Fallback to last known position if current is unavailable
        loc = await Location.getLastKnownPositionAsync({});
        if (!loc) {
          Alert.alert('Location Unavailable', 'Could not determine your current location. Please search for the location manually.');
          setFetchingLocation(false);
          return;
        }
      }

      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);

      let address = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (address.length > 0) {
        const addr = address[0];
        const formatted = [addr.name, addr.street, addr.city, addr.region].filter(Boolean).join(', ');
        setLocation(formatted || 'Current Location');
        placesRef.current?.setAddressText(formatted || 'Current Location');
      }
    } catch (error) {
      console.log('Location error:', error);
      Alert.alert('Error', 'An unexpected error occurred while fetching your location.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleMapPress = async (e: any) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    setLatitude(lat);
    setLongitude(lng);

    try {
      let address = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (address.length > 0) {
        const addr = address[0];
        const formatted = [addr.name, addr.street, addr.city, addr.region].filter(Boolean).join(', ');
        setLocation(formatted || 'Selected Location');
        placesRef.current?.setAddressText(formatted || 'Selected Location');
      } else {
        setLocation('Selected Location');
        placesRef.current?.setAddressText('Selected Location');
      }
    } catch (error) {
      console.log(error);
      setLocation('Selected Location');
      placesRef.current?.setAddressText('Selected Location');
    }
  };

  const pickImages = async () => {
    try {
      // Use an array for mediaTypes to avoid native casting errors on Android
      let result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled) {
        const base64Images = result.assets.map(asset => `data:image/jpeg;base64,${asset.base64}`);
        setImages([...images, ...base64Images].slice(0, 5));
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick images');
      console.log(err);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const handleSubmit = async () => {
    if (!title) return Alert.alert('Error', 'Please provide a name/title for this report');
    if (!animalType) return Alert.alert('Error', 'Please specify the animal type');
    if (!description) return Alert.alert('Error', 'Please provide a description');
    if (!location) return Alert.alert('Error', 'Please provide a location');

    try {
      setLoading(true);
      await rescueService.reportRescueCase({
        petId: selectedPet?._id || null,
        title,
        animalType,
        description,
        location,
        latitude,
        longitude,
        images,
      });
      
      console.log("Emitting 'rescueDataChanged' from Report Screen...");
      DeviceEventEmitter.emit('rescueDataChanged');
      
      Alert.alert('Success', 'Rescue case reported successfully. Our team will look into it!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to report rescue case');
    } finally {
      setLoading(false);
    }
  };



  return (
    <KeyboardAvoidingView 
      style={[styles.root, { paddingTop: insets.top, backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={[styles.header, { borderBottomColor: colors.text + '10' }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.text + '05' }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Report Injured Animal</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
        <Text style={[styles.infoText, { color: colors.text + '80' }]}>Reporting a stray or injured animal helps rescuers find them faster.</Text>

        <Text style={[styles.label, { color: colors.text }]}>Report Title (Name/Label)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Injured Dog near Central Mall"
          placeholderTextColor={colors.text + '50'}
        />

        <Text style={[styles.label, { color: colors.text }]}>Animal Type</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={animalType}
          onChangeText={setAnimalType}
          placeholder="e.g. Dog, Cat, Bird"
          placeholderTextColor={colors.text + '50'}
        />

        <Text style={[styles.label, { color: colors.text }]}>Description of Situation</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the injury or condition..."
          placeholderTextColor={colors.text + '50'}
          multiline
          numberOfLines={4}
        />

        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.text }]}>Location Search</Text>
          <TouchableOpacity onPress={getCurrentLocation} disabled={fetchingLocation}>
            {fetchingLocation ? (
              <ActivityIndicator size="small" color="#E8A358" />
            ) : (
              <View style={styles.refreshBtn}>
                <Ionicons name="locate" size={16} color="#E8A358" />
                <Text style={styles.refreshText}>Detect</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ zIndex: 1000, marginBottom: 20 }}>
          <GooglePlacesAutocomplete
            ref={placesRef}
            placeholder="Search for a location..."
            fetchDetails={true}
            onPress={(data, details = null) => {
              setLocation(data.description);
              if (details) {
                setLatitude(details.geometry.location.lat);
                setLongitude(details.geometry.location.lng);
              }
            }}
            query={{
              key: GOOGLE_MAPS_API_KEY,
              language: 'en',
            }}
            styles={{
              container: { flex: 0 },
              textInput: [styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }],
              listView: { 
                backgroundColor: colors.card, 
                borderRadius: 12, 
                marginTop: 5, 
                elevation: 5, 
                shadowColor: '#000', 
                shadowOpacity: 0.1, 
                shadowRadius: 10, 
                shadowOffset: { width: 0, height: 5 },
                position: 'absolute',
                top: 55,
                zIndex: 2000,
                borderWidth: 1,
                borderColor: colors.border,
              },
              row: { padding: 13, backgroundColor: colors.card },
              description: { color: colors.text, fontSize: 14 }
            }}
            enablePoweredByContainer={false}
            minLength={2}
            textInputProps={{
              placeholderTextColor: colors.text + '50',
              value: location,
              onChangeText: (text) => setLocation(text)
            }}
            nearbyPlacesAPI="GooglePlacesSearch"
            debounce={200}
          />
        </View>

        {latitude && longitude && (
          <View style={styles.mapPreviewContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.mapPreview}
              region={{
                latitude: latitude,
                longitude: longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
              onPress={handleMapPress}
            >
              <Marker 
                coordinate={{ latitude, longitude }} 
                pinColor="#E8A358" 
                draggable
                onDragEnd={(e) => handleMapPress(e)}
              />
            </MapView>
          </View>
        )}

        <Text style={[styles.label, { color: colors.text }]}>Pet Profile Link (Optional)</Text>
        <TouchableOpacity 
          style={[styles.pickerTrigger, { backgroundColor: colors.card, borderColor: colors.border }]} 
          onPress={() => setShowPetPicker(!showPetPicker)}
        >
          {selectedPet ? (
            <View style={styles.selectedPetInfo}>
              <Image source={{ uri: selectedPet.images?.[0] }} style={styles.miniPetImg} />
              <View>
                <Text style={[styles.selectedPetName, { color: colors.text }]}>{selectedPet.name}</Text>
                <Text style={[styles.selectedPetBreed, { color: colors.text + '80' }]}>{selectedPet.breed || 'Unknown Breed'}</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.placeholderText, { color: colors.text + '50' }]}>Link to an existing pet profile</Text>
          )}
          <Ionicons name={showPetPicker ? "chevron-up" : "chevron-down"} size={20} color={colors.text + '80'} />
        </TouchableOpacity>

        {showPetPicker && (
          <View style={[styles.petPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity 
              style={[styles.petPickerItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setSelectedPet(null);
                setShowPetPicker(false);
              }}
            >
              <View style={[styles.miniPetImg, { backgroundColor: colors.text + '10', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="close" size={20} color={colors.text + '80'} />
              </View>
              <Text style={[styles.petPickerText, { color: colors.text }]}>None (New Stray)</Text>
            </TouchableOpacity>
            {pets.map(pet => (
              <TouchableOpacity 
                key={pet._id} 
                style={[styles.petPickerItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setSelectedPet(pet);
                  setShowPetPicker(false);
                  if(!title) setTitle(pet.name);
                }}
              >
                <Image source={{ uri: pet.images?.[0] }} style={styles.miniPetImg} />
                <Text style={[styles.petPickerText, { color: colors.text }]}>{pet.name}</Text>
                {selectedPet?._id === pet._id && <Ionicons name="checkmark-circle" size={20} color="#E8A358" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[styles.label, { color: colors.text }]}>Evidence Photos (Max 5)</Text>
        <View style={styles.imageRow}>
          {images.map((img, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri: img }} style={styles.uploadedImg} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                <Ionicons name="close-circle" size={20} color="#FF5252" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 5 && (
            <TouchableOpacity style={styles.addImgBtn} onPress={pickImages}>
              <Ionicons name="camera-outline" size={30} color="#E8A358" />
              <Text style={styles.addImgText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, loading && styles.disabledBtn]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Rescue Report</Text>
          )}
        </TouchableOpacity>
          </>
        }
      />
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  scrollContent: { padding: 20, paddingBottom: 40 },
  infoText: { fontSize: 14, color: colors.text + '80', marginBottom: 20, fontStyle: 'italic' },
  
  label: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  
  pickerTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  selectedPetInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  miniPetImg: { width: 40, height: 40, borderRadius: 10 },
  selectedPetName: { fontSize: 16, fontWeight: '700', color: colors.text },
  selectedPetBreed: { fontSize: 12, color: colors.text + '80' },
  placeholderText: { color: colors.text + '50', fontSize: 15 },
  
  petPicker: { 
    backgroundColor: colors.card, borderRadius: 16, padding: 8, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border, maxHeight: 200,
  },
  petPickerItem: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  petPickerText: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },

  input: { backgroundColor: colors.card, borderRadius: 16, padding: 16, fontSize: 16, color: colors.text, marginBottom: 0, borderWidth: 1, borderColor: colors.border },
  textArea: { height: 100, textAlignVertical: 'top', marginBottom: 20 },
  
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
  imageWrapper: { position: 'relative' },
  uploadedImg: { width: 80, height: 80, borderRadius: 16 },
  removeBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: colors.background, borderRadius: 10 },
  addImgBtn: { width: 80, height: 80, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary + '15' },
  addImgText: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 4 },
  
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  disabledBtn: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  mapPreviewContainer: {
    height: 150,
    width: '100%',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapPreview: { ...StyleSheet.absoluteFillObject },
});
