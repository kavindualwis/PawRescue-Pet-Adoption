import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { campaignService } from '@/services/campaignService';
import { Colors } from '@/constants/theme';
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
  currency?: string;
  createdAt: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  } | string;
}

export const CampaignsScreen = () => {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const raw = await AsyncStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        setCurrentUserId(u._id || u.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const res = await campaignService.getAllCampaigns();
      console.log('Campaigns response:', res.data);
      setCampaigns(res.data || []);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUpdate = (id: string) => {
    router.push(`/campaign/edit/${id}` as any);
  };

  const handleDelete = (id: string) => {
    import('react-native').then(({ Alert }) => {
      Alert.alert(
        'Delete Campaign',
        'Are you sure you want to delete this campaign? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setActionLoading(id);
                await campaignService.deleteCampaign(id);
                loadData();
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to delete campaign');
              } finally {
                setActionLoading(null);
              }
            }
          }
        ]
      );
    });
  };

  const renderCampaign = ({ item }: { item: Campaign }) => {
    const progress = Math.min(item.collectedAmount / item.targetAmount, 1);
    const isOwner = item.createdBy && (
      (typeof item.createdBy === 'object' && item.createdBy._id === currentUserId) ||
      item.createdBy === currentUserId
    );

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.text + '08' }]}
        onPress={() => router.push(`/campaign/${item._id}` as any)}
        activeOpacity={0.9}
      >
        <TouchableOpacity 
          style={styles.imageWrapper}
          onPress={() => {
            setViewerImages(item.images || []);
            setShowImageViewer(true);
          }}
          activeOpacity={0.9}
        >
          <Image
            source={item.images?.[0] ? { uri: item.images[0] } : require('@/assets/images/splash_image.png')}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={[styles.categoryFloatingBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.categoryFloatingText}>{item.category}</Text>
          </View>
          {item.status !== 'active' && (
            <View style={[
              styles.statusFloatingBadge,
              { backgroundColor: item.status === 'pending' ? '#E8A358' : '#FF4D4D' }
            ]}>
              <Text style={styles.statusFloatingText}>{item.status}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          </View>

          <Text style={[styles.cardDescription, { color: colors.textMuted }]} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <View>
                <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Raised</Text>
                <Text style={[styles.amountText, { color: colors.text }]}>
                  {item.currency || 'LKR'} <Text style={{ fontWeight: '900', color: colors.primary, fontSize: 18 }}>{item.collectedAmount.toLocaleString()}</Text>
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.percentageText, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
                <Text style={[styles.targetHint, { color: colors.textMuted }]}>
                  of {item.currency || 'LKR'} {item.targetAmount.toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={[styles.progressBarBg, { backgroundColor: colors.text + '08' }]}>
              <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]}>
                <View style={styles.progressGlow} />
              </View>
            </View>

            {isOwner ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => handleUpdate(item._id)}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>Update</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#FF3B3015' }]}
                  onPress={() => handleDelete(item._id)}
                  disabled={actionLoading === item._id}
                >
                  {actionLoading === item._id ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                      <Text style={[styles.actionBtnText, { color: '#FF3B30' }]}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.donateBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push(`/campaign/${item._id}` as any)}
              >
                <Ionicons name="heart" size={16} color="#fff" />
                <Text style={styles.donateBtnText}>Donate Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Donations</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>Help animals in need</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/campaign/create' as any)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={campaigns}
          renderItem={renderCampaign}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={80} color={colors.textMuted + '40'} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No active campaigns at the moment.</Text>
            </View>
          }
        />
      )}

      {/* Image Viewer Modal */}
      <Modal visible={showImageViewer} transparent animationType="fade">
        <View style={styles.viewerOverlay}>
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setShowImageViewer(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <FlatList
            data={viewerImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => `viewer-${i}`}
            renderItem={({ item }) => (
              <View style={styles.viewerItem}>
                <Image
                  source={{ uri: item }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  headerSub: { fontSize: 14, marginTop: 2 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    borderRadius: 24,
    marginBottom: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  imageWrapper: { width: '100%', height: 160, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  categoryFloatingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryFloatingText: { color: '#fff', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  statusFloatingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusFloatingText: { color: '#fff', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  cardContent: { padding: 16 },
  titleRow: { marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '900', lineHeight: 24 },
  cardDescription: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  progressSection: { width: '100%' },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  amountLabel: { fontSize: 11, fontWeight: '700', marginBottom: 1, textTransform: 'uppercase', letterSpacing: 0.5 },
  amountText: { fontSize: 13, fontWeight: '600' },
  percentageText: { fontSize: 20, fontWeight: '900' },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4, position: 'relative' },
  progressGlow: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 20, backgroundColor: 'rgba(255,255,255,0.4)', shadowRadius: 10 },
  targetHint: { fontSize: 11, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, lineHeight: 24 },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 5,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  donateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 15,
    marginTop: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  donateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  // Viewer Styles
  viewerOverlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  viewerItem: { width: width, height: '100%', justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: { position: 'absolute', right: 20, top: 40, padding: 10, zIndex: 100 },
});

export default CampaignsScreen;
