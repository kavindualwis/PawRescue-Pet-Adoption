import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  LogBox,
} from "react-native";

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GOOGLE_MAPS_API_KEY } from "@/services/config";
import { petService } from "@/services/petService";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface Category {
  _id: string;
  name: string;
}

interface FormData {
  name: string;
  type: string;
  breed: string;
  age: string;
  gender: string;
  status: string;
  description: string;
  location: string;
  price: string;
  isFree: boolean;
  latitude?: number;
  longitude?: number;
}

interface EditPetModalProps {
  visible: boolean;
  onClose: () => void;
  onPetUpdated?: () => void;
  pet: any;
}

export const EditPetModal = ({ visible, onClose, onPetUpdated, pet }: EditPetModalProps) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const modalStyles = React.useMemo(() => getStyles(colors), [colors]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "",
    breed: "",
    age: "",
    gender: "Male",
    status: "available",
    description: "",
    location: "",
    price: "",
    isFree: false,
    latitude: undefined,
    longitude: undefined,
  });

  useEffect(() => {
    if (visible) {
      loadCategories();
      if (pet) {
        setFormData({
          name: pet.name || "",
          type: pet.type?._id || pet.type || "",
          breed: pet.breed || "",
          age: pet.age ? pet.age.toString() : "",
          gender: pet.gender || "Male",
          status: pet.status || "available",
          description: pet.description || "",
          location: pet.location || "",
          price: pet.price ? pet.price.toString() : "",
          isFree: pet.price === 0,
          latitude: pet.latitude,
          longitude: pet.longitude,
        });
        setImages(pet.images || []);
      }
    }
  }, [visible, pet]);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await petService.getCategories();
      setCategories(response.data);
      if (response.data.length > 0 && !pet?.type) {
        setFormData((prev) => ({
          ...prev,
          type: response.data[0]._id,
        }));
      }
    } catch (error) {
      console.log("Error loading categories", error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      if (images.length >= 5) {
        Alert.alert("Limit", "You can only add up to 5 images");
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photo library in Settings.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setImages([...images, base64]);
      }
    } catch (error) {
      console.error("Image pick error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.type || !formData.breed || !formData.age || !formData.location) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    if (images.length === 0) {
      Alert.alert("Error", "Please add at least one image");
      return;
    }

    try {
      setLoading(true);
      const petData = {
        ...formData,
        age: parseInt(formData.age),
        price: formData.isFree ? 0 : parseFloat(formData.price),
        images,
      };

      await petService.updatePet(pet._id, petData);
      Alert.alert("Success", "Pet updated successfully!");
      onPetUpdated?.();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update pet";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[modalStyles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={modalStyles.title}>Edit Pet</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            <Text style={[modalStyles.submitBtn, loading && { opacity: 0.5 }]}>
              {loading ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          style={{ flex: 1 }}
        >
          <FlatList
            data={[]}
            renderItem={null}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            ListHeaderComponent={
              <View style={modalStyles.form}>
                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Pet Name *</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Enter pet name"
                    placeholderTextColor={colors.textMuted}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    editable={!loading}
                  />
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Category *</Text>
                  {categoriesLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View style={modalStyles.picker}>
                      <Picker
                        selectedValue={formData.type}
                        onValueChange={(value: string) => setFormData({ ...formData, type: value })}
                        enabled={!loading}
                        dropdownIconColor={colors.text}
                        style={{ color: colors.text }}
                      >
                        {categories.map((cat) => (
                          <Picker.Item key={cat._id} label={cat.name} value={cat._id} color={colors.text} style={{ backgroundColor: colors.card }} />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Breed *</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="e.g., Golden Retriever"
                    placeholderTextColor={colors.textMuted}
                    value={formData.breed}
                    onChangeText={(text) => setFormData({ ...formData, breed: text })}
                    editable={!loading}
                  />
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Age (years) *</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Enter age"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={formData.age}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, '');
                      setFormData({ ...formData, age: numericValue });
                    }}
                    editable={!loading}
                  />
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Price (LKR) *</Text>
                  <TextInput
                    style={[modalStyles.input, formData.isFree && { backgroundColor: colors.card, color: colors.textMuted }]}
                    placeholder="Enter price in Rs."
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={formData.isFree ? "Free" : formData.price}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, '');
                      setFormData({ ...formData, price: numericValue });
                    }}
                    editable={!loading && !formData.isFree}
                  />
                  <TouchableOpacity 
                    style={modalStyles.checkboxContainer} 
                    onPress={() => setFormData({ ...formData, isFree: !formData.isFree, price: "" })}
                    activeOpacity={0.7}
                  >
                    <View style={[modalStyles.checkbox, formData.isFree && modalStyles.checkboxChecked]}>
                      {formData.isFree && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                    <Text style={modalStyles.checkboxLabel}>Mark as Free Pet</Text>
                  </TouchableOpacity>
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Gender *</Text>
                  <View style={modalStyles.picker}>
                    <Picker
                      selectedValue={formData.gender}
                      onValueChange={(value: string) => setFormData({ ...formData, gender: value })}
                      enabled={!loading}
                      dropdownIconColor={colors.text}
                      style={{ color: colors.text }}
                    >
                      <Picker.Item label="Male" value="Male" color={colors.text} style={{ backgroundColor: colors.card }} />
                      <Picker.Item label="Female" value="Female" color={colors.text} style={{ backgroundColor: colors.card }} />
                      <Picker.Item label="Unknown" value="Unknown" color={colors.text} style={{ backgroundColor: colors.card }} />
                    </Picker>
                  </View>
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Status *</Text>
                  <View style={modalStyles.picker}>
                    <Picker
                      selectedValue={formData.status}
                      onValueChange={(value: string) => setFormData({ ...formData, status: value })}
                      enabled={!loading}
                      dropdownIconColor={colors.text}
                      style={{ color: colors.text }}
                    >
                      <Picker.Item label="Available" value="available" color={colors.text} style={{ backgroundColor: colors.card }} />
                      <Picker.Item label="Adopted" value="adopted" color={colors.text} style={{ backgroundColor: colors.card }} />
                      <Picker.Item label="Rescue Needed" value="rescue-needed" color={colors.text} style={{ backgroundColor: colors.card }} />
                    </Picker>
                  </View>
                </View>

                <View style={[modalStyles.field, { zIndex: 1000 }]}>
                  <Text style={modalStyles.label}>Location *</Text>
                  <GooglePlacesAutocomplete
                    placeholder="Search for a location"
                    fetchDetails={true}
                    onPress={(data, details = null) => {
                      setFormData({
                        ...formData,
                        location: data.description,
                        latitude: details?.geometry.location.lat,
                        longitude: details?.geometry.location.lng,
                      });
                      const { Keyboard } = require('react-native');
                      Keyboard.dismiss();
                    }}
                    query={{
                      key: GOOGLE_MAPS_API_KEY,
                      language: 'en',
                    }}
                    styles={{
                      textInput: {
                        ...modalStyles.input,
                        height: 55,
                        paddingVertical: 0,
                      },
                      container: { flex: 0 },
                      listView: {
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                        marginTop: 5,
                        elevation: 5,
                        zIndex: 9999,
                        position: 'absolute',
                        top: 60,
                      },
                      row: { backgroundColor: colors.card },
                      description: { color: colors.text },
                    }}
                    enablePoweredByContainer={false}
                    textInputProps={{
                      placeholderTextColor: colors.textMuted,
                      value: formData.location,
                      onChangeText: (text) => setFormData({ ...formData, location: text }),
                    }}
                  />

                  {formData.latitude && formData.longitude && (
                    <View style={modalStyles.mapPreviewContainer}>
                      <MapView
                        provider={PROVIDER_GOOGLE}
                        style={modalStyles.mapPreview}
                        initialRegion={{
                          latitude: formData.latitude,
                          longitude: formData.longitude,
                          latitudeDelta: 0.005,
                          longitudeDelta: 0.005,
                        }}
                        region={{
                          latitude: formData.latitude,
                          longitude: formData.longitude,
                          latitudeDelta: 0.005,
                          longitudeDelta: 0.005,
                        }}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        customMapStyle={colorScheme === 'dark' ? mapDarkStyle : []}
                      >
                        <Marker
                          coordinate={{
                            latitude: formData.latitude,
                            longitude: formData.longitude,
                          }}
                          pinColor={colors.primary}
                        />
                      </MapView>
                    </View>
                  )}
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Description</Text>
                  <TextInput
                    style={[modalStyles.input, modalStyles.textArea]}
                    placeholder="Tell us about this pet..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    editable={!loading}
                  />
                </View>

                <View style={modalStyles.field}>
                  <Text style={modalStyles.label}>Images ({images.length}/5)</Text>
                  <TouchableOpacity
                    style={modalStyles.addImageBtn}
                    onPress={pickImage}
                    disabled={loading || images.length >= 5}
                  >
                    <Ionicons name="image-outline" size={24} color={colors.primary} />
                    <Text style={modalStyles.addImageText}>Add Image</Text>
                  </TouchableOpacity>

                  <View style={modalStyles.imagesList}>
                    {images.map((img, idx) => (
                      <View key={idx} style={modalStyles.imageItem}>
                        <Image source={{ uri: img }} style={modalStyles.imageThumbnail} />
                        <TouchableOpacity
                          style={modalStyles.removeImageBtn}
                          onPress={() => removeImage(idx)}
                        >
                          <Ionicons name="close" size={16} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={modalStyles.spacer} />
              </View>
            }
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border 
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  submitBtn: { fontSize: 16, fontWeight: "800", color: colors.primary },
  form: { padding: 20 },
  field: { marginBottom: 24 },
  label: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 10 },
  input: { 
    borderWidth: 1.5, 
    borderColor: colors.border, 
    borderRadius: 14, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    fontSize: 15, 
    color: colors.text,
    backgroundColor: colors.card,
  },
  textArea: { paddingTop: 14, textAlignVertical: "top", minHeight: 120 },
  picker: { 
    borderWidth: 1.5, 
    borderColor: colors.border, 
    borderRadius: 14, 
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  addImageBtn: { 
    borderWidth: 1.5, 
    borderColor: colors.primary, 
    borderRadius: 14, 
    paddingVertical: 16, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 8,
    backgroundColor: colors.primary + '10',
  },
  addImageText: { color: colors.primary, fontSize: 15, fontWeight: "700" },
  imagesList: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 15 },
  imageItem: { 
    width: 80, 
    height: 80, 
    backgroundColor: colors.card, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: colors.border 
  },
  imageThumbnail: { width: "100%", height: "100%", borderRadius: 14 },
  removeImageBtn: { 
    position: "absolute", 
    top: -6, 
    right: -6, 
    backgroundColor: "#E74C3C", 
    borderRadius: 12, 
    width: 24, 
    height: 24, 
    justifyContent: "center", 
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  spacer: { height: 40 },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '600',
  },
  mapPreviewContainer: {
    height: 160,
    width: '100%',
    borderRadius: 18,
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  mapPreview: {
    ...StyleSheet.absoluteFillObject,
  },
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
