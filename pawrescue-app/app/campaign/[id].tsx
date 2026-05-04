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
  DeviceEventEmitter,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { campaignService } from '@/services/campaignService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';
import { StatusBar } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');

interface Campaign {
  _id: string;
  title: string;
  description: string;
  targetAmount: number;
  collectedAmount: number;
  status: string;
  category: string;
  images: string[];
  animalType?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  currency: string;
  createdAt: string;
}

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = React.useMemo(() => getStyles(colors, colorScheme), [colors, colorScheme]);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donateAmount, setDonateAmount] = useState('');
  const [donating, setDonating] = useState(false);

  useEffect(() => {
    loadUser();
    if (id) loadCampaign(id);

    const subscription = DeviceEventEmitter.addListener('campaignDataChanged', () => {
      if (id) loadCampaign(id);
    });

    return () => {
      subscription.remove();
    };
  }, [id]);

  const loadUser = async () => {
    try {
      const raw = await AsyncStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        setCurrentUserId(u._id || u.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadCampaign = async (campaignId: string) => {
    try {
      setLoading(true);
      const res = await campaignService.getCampaignById(campaignId);
      setCampaign(res.data);
    } catch {
      Alert.alert('Error', 'Could not load campaign details.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = async () => {
    if (!donateAmount || isNaN(Number(donateAmount))) {
      Alert.alert('Invalid Amount', 'Please enter a valid donation amount.');
      return;
    }

    try {
      setDonating(true);
      const amount = Number(donateAmount);
      await campaignService.updateProgress(campaign!._id, amount);
      
      // Update local state for immediate feedback
      setCampaign(prev => prev ? {
        ...prev,
        collectedAmount: prev.collectedAmount + amount
      } : null);
      
      DeviceEventEmitter.emit('campaignDataChanged');
      setShowDonateModal(false);
      setDonateAmount('');
      Alert.alert('Thank You! 🎉', `Your donation of ${campaign?.currency} ${amount.toLocaleString()} was successful!`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process donation');
    } finally {
      setDonating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Campaign', 'Are you sure you want to delete this campaign?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!campaign) return;
          try {
            await campaignService.deleteCampaign(campaign._id);
            DeviceEventEmitter.emit('campaignDataChanged');
            Alert.alert('Success', 'Campaign deleted successfully');
            router.back();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete campaign');
          }
        }
      }
    ]);
  };

  const handleUpdate = () => {
    if (!campaign) return;
    router.push(`/campaign/edit/${campaign._id}` as any);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!campaign) return null;

  const images = campaign.images && campaign.images.length > 0 ? campaign.images : [null];
  const progress = Math.min(campaign.collectedAmount / campaign.targetAmount, 1);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      
      <View style={[styles.headerBar, { paddingTop: insets.top + 12, backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Campaign Details</Text>
        <TouchableOpacity style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        {/* Gallery */}
        <View style={styles.galleryWrapper}>
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentImage(idx);
            }}
          >
            {images.map((item: string | null, i: number) => (
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
                    <Ionicons name="paw" size={80} color={colors.text + '20'} />
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
          <View style={[styles.categoryBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>{campaign.category}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{campaign.title}</Text>
          
          <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
            <View style={styles.progressHeader}>
                <View>
                    <Text style={[styles.raisedText, { color: colors.primary }]}>{campaign.currency} {campaign.collectedAmount.toLocaleString()}</Text>
                    <Text style={[styles.totalText, { color: colors.text + '60' }]}>raised of {campaign.currency} {campaign.targetAmount.toLocaleString()}</Text>
                </View>
                <Text style={[styles.percentageLabel, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: colors.background }]}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>

          <View style={styles.organizerCard}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="business" size={24} color={colors.primary} />
            </View>
            <View>
                <Text style={[styles.orgName, { color: colors.text }]}>{campaign.createdBy?.name}</Text>
                <Text style={[styles.orgSub, { color: colors.text + '40' }]}>Verified Organization</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>About this campaign</Text>
          <Text style={[styles.description, { color: colors.text + '80' }]}>{campaign.description}</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20, backgroundColor: colors.background, borderTopColor: colors.text + '05' }]}>
        {campaign.createdBy?._id === currentUserId ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              style={[styles.donateBtn, { flex: 1, backgroundColor: colors.primary }]}
              onPress={handleUpdate}
            >
              <Text style={styles.donateBtnText}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.donateBtn, { flex: 1, backgroundColor: '#FF3B30' }]}
              onPress={handleDelete}
            >
              <Text style={styles.donateBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.donateBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowDonateModal(true)}
          >
            <Text style={styles.donateBtnText}>Donate Now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Image Viewer Modal */}
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

      {/* Donate Modal */}
      <Modal visible={showDonateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Support {campaign.title}</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>Enter the amount you'd like to donate ({campaign.currency})</Text>
            
            <TextInput
              style={[styles.donateInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={donateAmount}
              onChangeText={setDonateAmount}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.text + '05' }]} 
                onPress={() => {
                  setShowDonateModal(false);
                  setDonateAmount('');
                }}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.primary }]} 
                onPress={handleDonate}
                disabled={donating}
              >
                {donating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Donate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, colorScheme: string) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.text + '05', justifyContent: 'center', alignItems: 'center' },
  shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.text + '05', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  galleryWrapper: { position: 'relative' },
  imageCard: { width: width, height: 350 },
  galleryImage: { width: '100%', height: '100%' },
  galleryPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  dots: { position: 'absolute', bottom: 20, alignSelf: 'center', flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 24, backgroundColor: '#fff' },
  categoryBadge: { position: 'absolute', top: 20, right: 20, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  categoryText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  content: { padding: 20 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 20 },
  statsCard: { padding: 20, borderRadius: 24, marginBottom: 25 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  raisedText: { fontSize: 24, fontWeight: '800' },
  totalText: { fontSize: 14, fontWeight: '600' },
  percentageLabel: { fontSize: 20, fontWeight: '800' },
  progressBarBg: { height: 12, borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 6 },
  organizerCard: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 30 },
  avatar: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  orgName: { fontSize: 16, fontWeight: '700' },
  orgSub: { fontSize: 13 },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 15 },
  description: { fontSize: 16, lineHeight: 26 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 20, borderTopWidth: 1 },
  donateBtn: { paddingVertical: 18, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  donateBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  // Viewer Styles
  viewerOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  viewerItem: { width, height: '100%', justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', right: 20, zIndex: 10, padding: 10 },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', padding: 24, borderRadius: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  modalSub: { fontSize: 14, marginBottom: 20 },
  donateInput: { height: 60, borderRadius: 16, borderWidth: 1, paddingHorizontal: 20, fontSize: 24, fontWeight: '800', marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  modalBtnText: { fontSize: 16, fontWeight: '700' },
});
