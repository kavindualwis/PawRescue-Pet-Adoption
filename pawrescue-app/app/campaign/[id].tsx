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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { campaignService } from '@/services/campaignService';
import { Colors } from '@/constants/theme';
import { useColorScheme, StatusBar } from 'react-native';

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

  useEffect(() => {
    if (id) loadCampaign(id);
  }, [id]);

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

  const handleDonate = () => {
    Alert.alert('Donation', 'Payment integration has been removed.');
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
              <View key={i} style={styles.imageCard}>
                {item ? (
                  <Image source={{ uri: item }} style={styles.galleryImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.galleryImage, styles.galleryPlaceholder, { backgroundColor: colors.text + '05' }]}>
                    <Ionicons name="paw" size={80} color={colors.text + '20'} />
                  </View>
                )}
              </View>
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
        <TouchableOpacity 
          style={[styles.donateBtn, { backgroundColor: colors.primary }]}
          onPress={handleDonate}
        >
          <Text style={styles.donateBtnText}>Donate Now</Text>
        </TouchableOpacity>
      </View>
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
});
