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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { GOOGLE_MAPS_API_KEY } from "@/services/config";
import { petService } from "@/services/petService";
import { shelterService } from "@/services/shelterService";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  shelterId?: string;
  latitude?: number;
  longitude?: number;
}

interface PostPetModalProps {
  visible: boolean;
  onClose: () => void;
  onPetCreated?: () => void;
}

export const PostPetModal = ({ visible, onClose, onPetCreated }: PostPetModalProps) => {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);
  const [sheltersLoading, setSheltersLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "",
    breed: "",
    age: "",
    gender: "Male",
    status: "available",
    description: "",
    location: "",
    shelterId: "",
    latitude: undefined,
    longitude: undefined,
  });

  useEffect(() => {
    if (visible) {
      loadCategories();
      loadShelters();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await petService.getCategories();
      setCategories(response.data);
      if (response.data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          type: response.data[0]._id,
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load categories";
      Alert.alert("Error", errorMessage);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadShelters = async () => {
    try {
      setSheltersLoading(true);
      const userRaw = await AsyncStorage.getItem('user');
      if (!userRaw) return;
      const user = JSON.parse(userRaw);
      const userId = user._id || user.id;

      const response = await shelterService.getShelters();
      // Filter shelters created by current user
      const myShelters = response.data.filter((s: any) => s.createdBy?._id === userId || s.createdBy === userId);
      setShelters(myShelters);
    } catch (error) {
      console.log("Error loading shelters:", error);
    } finally {
      setSheltersLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      if (images.length >= 5) {
        Alert.alert("Limit", "You can only add up to 5 images");
        return;
      }

      // Request permission first
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
        images,
      };

      await petService.createPet(petData);
      Alert.alert("Success", "Pet created successfully!");
      setFormData({
        name: "",
        type: categories.length > 0 ? categories[0]._id : "",
        breed: "",
        age: "",
        gender: "Male",
        status: "available",
        description: "",
        location: "",
        shelterId: "",
        latitude: undefined,
        longitude: undefined,
      });
      setImages([]);

      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit('petDataChanged');

      onPetCreated?.();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create pet";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: "#FFF" }}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Post a Pet</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading} style={{ padding: 4 }}>
            <Text style={[styles.submitBtn, loading && { opacity: 0.5 }]}>
              {loading ? "Posting..." : "Post"}
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
              <>
            <View style={styles.form}>
              {/* Pet Name */}
              <View style={styles.field}>
                <Text style={styles.label}>Pet Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter pet name"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  editable={!loading}
                />
              </View>

              {/* Category */}
              <View style={styles.field}>
                <Text style={styles.label}>Category *</Text>
                {categoriesLoading ? (
                  <ActivityIndicator size="small" color="#E8A358" />
                ) : (
                  <View style={styles.picker}>
                    <Picker
                      selectedValue={formData.type}
                      onValueChange={(value: string) => setFormData({ ...formData, type: value })}
                      enabled={!loading}
                    >
                      {categories.map((cat) => (
                        <Picker.Item key={cat._id} label={cat.name} value={cat._id} />
                      ))}
                    </Picker>
                  </View>
                )}
              </View>

              {/* Breed */}
              <View style={styles.field}>
                <Text style={styles.label}>Breed *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Golden Retriever"
                  value={formData.breed}
                  onChangeText={(text) => setFormData({ ...formData, breed: text })}
                  editable={!loading}
                />
              </View>

              {/* Age */}
              <View style={styles.field}>
                <Text style={styles.label}>Age (years) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter age"
                  keyboardType="number-pad"
                  value={formData.age}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, age: numericValue });
                  }}
                  editable={!loading}
                />
              </View>

              {/* Gender */}
              <View style={styles.field}>
                <Text style={styles.label}>Gender *</Text>
                <View style={styles.picker}>
                  <Picker
                    selectedValue={formData.gender}
                    onValueChange={(value: string) => setFormData({ ...formData, gender: value })}
                    enabled={!loading}
                  >
                    <Picker.Item label="Male" value="Male" />
                    <Picker.Item label="Female" value="Female" />
                    <Picker.Item label="Unknown" value="Unknown" />
                  </Picker>
                </View>
              </View>

              {/* Status */}
              <View style={styles.field}>
                <Text style={styles.label}>Status *</Text>
                <View style={styles.picker}>
                  <Picker
                    selectedValue={formData.status}
                    onValueChange={(value: string) => setFormData({ ...formData, status: value })}
                    enabled={!loading}
                  >
                    <Picker.Item label="Available" value="available" />
                    <Picker.Item label="Adopted" value="adopted" />
                    <Picker.Item label="Rescue Needed" value="rescue-needed" />
                  </Picker>
                </View>
              </View>

              {/* Shelter */}
              {shelters.length > 0 && (
                <View style={styles.field}>
                  <Text style={styles.label}>Post on behalf of Shelter (Optional)</Text>
                  <View style={styles.picker}>
                    <Picker
                      selectedValue={formData.shelterId}
                      onValueChange={(value: string) => setFormData({ ...formData, shelterId: value })}
                      enabled={!loading}
                    >
                      <Picker.Item label="Individual (None)" value="" />
                      {shelters.map((s) => (
                        <Picker.Item key={s._id} label={s.name} value={s._id} />
                      ))}
                    </Picker>
                  </View>
                </View>
              )}

              {/* Location */}
              <View style={[styles.field, { zIndex: 1000 }]}>
                <Text style={styles.label}>Location *</Text>
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
                    textInput: styles.input,
                    container: { flex: 0 },
                    listView: {
                      backgroundColor: '#fff',
                      borderWidth: 1,
                      borderColor: '#ddd',
                      borderRadius: 8,
                      marginTop: 5,
                      elevation: 5,
                      zIndex: 9999,
                      position: 'absolute',
                      top: 45,
                    }
                  }}
                  enablePoweredByContainer={false}
                  textInputProps={{
                    placeholderTextColor: "#999",
                    value: formData.location,
                    onChangeText: (text) => setFormData({ ...formData, location: text }),
                  }}
                />

                {/* Map Preview */}
                {formData.latitude && formData.longitude && (
                  <View style={styles.mapPreviewContainer}>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={styles.mapPreview}
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
                    >
                      <Marker
                        coordinate={{
                          latitude: formData.latitude,
                          longitude: formData.longitude,
                        }}
                        pinColor="#E8A358"
                      />
                    </MapView>
                  </View>
                )}
              </View>

              {/* Description */}
              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell us about this pet..."
                  multiline
                  numberOfLines={4}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  editable={!loading}
                />
              </View>

              {/* Images */}
              <View style={styles.field}>
                <Text style={styles.label}>Images ({images.length}/5)</Text>
                <TouchableOpacity
                  style={styles.addImageBtn}
                  onPress={pickImage}
                  disabled={loading || images.length >= 5}
                >
                  <Ionicons name="image-outline" size={24} color="#E8A358" />
                  <Text style={styles.addImageText}>Add Image</Text>
                </TouchableOpacity>

                <View style={styles.imagesList}>
                  {images.map((img, idx) => (
                    <View key={idx} style={styles.imageItem}>
                      <Image source={{ uri: img }} style={styles.imageThumbnail} />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => removeImage(idx)}
                      >
                        <Ionicons name="close" size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.spacer} />
            </View>
              </>
            }
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  submitBtn: {
    fontSize: 16,
    fontWeight: "600",
    color: "#C4956B",
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#000",
  },
  textArea: {
    paddingTop: 10,
    textAlignVertical: "top",
  },
  picker: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    overflow: "hidden",
  },
  addImageBtn: {
    borderWidth: 1,
    borderColor: "#C4956B",
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addImageText: {
    color: "#C4956B",
    fontSize: 14,
    fontWeight: "500",
  },
  imagesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  imageItem: {
    width: 70,
    height: 70,
    backgroundColor: "#E8E8E8",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  imageThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removeImageBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#E74C3C",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  spacer: {
    height: 20,
  },
  mapPreviewContainer: {
    height: 120,
    width: '100%',
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  mapPreview: {
    ...StyleSheet.absoluteFillObject,
  },
});
