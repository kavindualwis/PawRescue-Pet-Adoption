import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { campaignService } from '@/services/campaignService';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');

export default function CreateCampaignScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState('Medical');
  const [animalType, setAnimalType] = useState('');
  const [orgPhoneNumber, setOrgPhoneNumber] = useState('');
  
  const [mainImages, setMainImages] = useState<string[]>([]);
  const [docs, setDocs] = useState<string[]>([]); // Verification documents

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset: any) => `data:image/jpeg;base64,${asset.base64}`);
      setMainImages([...mainImages, ...newImages]);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true, // Required for some Android versions to read the file
      });

      if (!result.canceled) {
        const newDocs = await Promise.all(
          result.assets.map(async (asset) => {
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: 'base64',
            });
            return `data:${asset.mimeType || 'application/octet-stream'};base64,${base64}`;
          })
        );
        setDocs([...docs, ...newDocs]);
      }
    } catch (error) {
      console.error("Document pick error:", error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !targetAmount || !orgPhoneNumber || docs.length === 0) {
      Alert.alert('Missing Fields', 'Please fill all required fields and provide at least one verification document.');
      return;
    }

    try {
      setLoading(true);
      await campaignService.createCampaign({
        title,
        description,
        targetAmount: parseFloat(targetAmount),
        category,
        animalType,
        orgPhoneNumber,
        images: mainImages,
        verificationDocuments: docs,
      });

      Alert.alert(
        'Success', 
        'Campaign submitted! Our admins will verify your details and business registration before making it live.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Start Campaign</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>Campaign Title *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="e.g. Help Max get his surgery"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="Tell your story..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Target Amount ($) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                placeholder="1000"
                keyboardType="numeric"
                value={targetAmount}
                onChangeText={setTargetAmount}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Animal Type</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
                placeholder="e.g. Dog"
                value={animalType}
                onChangeText={setAnimalType}
              />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.textMuted }]}>Org Contact Number *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
            placeholder="e.g. +94 77 123 4567"
            keyboardType="phone-pad"
            value={orgPhoneNumber}
            onChangeText={setOrgPhoneNumber}
          />

          <Text style={[styles.label, { color: colors.textMuted }]}>Category</Text>
          <View style={styles.categoryRow}>
            {['Medical', 'Rescue', 'Shelter', 'Food'].map((cat: string) => (
              <TouchableOpacity 
                key={cat}
                style={[
                  styles.catChip, 
                  { backgroundColor: category === cat ? colors.primary : colors.card }
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={{ color: category === cat ? '#fff' : colors.textMuted }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Verification Documents *</Text>
          <Text style={[styles.subLabel, { color: colors.textMuted }]}>
            Upload Business Registration, Campaign Letters, or any proof to verify this cause.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {docs.map((uri: string, index: number) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity 
                  style={styles.removeBtn}
                  onPress={() => setDocs(docs.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close-circle" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity 
              style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]} 
              onPress={pickDocument}
            >
              <Ionicons name="document-attach-outline" size={32} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4 }}>Add Doc</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Campaign Gallery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {mainImages.map((uri: string, index: number) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity 
                  style={styles.removeBtn}
                  onPress={() => setMainImages(mainImages.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close-circle" size={20} color="#ff4444" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity 
              style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.primary + '40' }]} 
              onPress={pickImage}
            >
              <Ionicons name="image-outline" size={32} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4 }}>Add Photo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit for Verification</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  subLabel: { fontSize: 13, marginBottom: 15, lineHeight: 18 },
  input: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  imageScroll: { flexDirection: 'row' },
  imageWrapper: { position: 'relative', marginRight: 15 },
  previewImage: { width: 100, height: 100, borderRadius: 16 },
  removeBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: '#fff', borderRadius: 10 },
  addCard: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
