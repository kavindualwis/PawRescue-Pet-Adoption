import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { adoptionService } from '@/services/adoptionService';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');

type RequestStatus = 'pending' | 'approved' | 'rejected';

interface AdoptionReq {
  _id: string;
  status: RequestStatus;
  message?: string;
  requestDate: string;
  createdAt: string;
  pet?: {
    _id: string;
    name: string;
    images?: string[];
    breed?: string;
    status?: string;
  };
  requester?: {
    _id?: string;
    name: string;
    username: string;
    email?: string;
    phoneNumber?: string;
  };
  owner?: {
    name: string;
    username: string;
    email?: string;
    phoneNumber?: string;
  };
}

type Tab = 'received' | 'sent';

const STATUS_META: Record<RequestStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:  { label: 'Pending',  color: '#F0A500', bg: '#FFF8E6', icon: 'time-outline' },
  approved: { label: 'Approved', color: '#27AE60', bg: '#E8F8EE', icon: 'checkmark-circle-outline' },
  rejected: { label: 'Rejected', color: '#E74C3C', bg: '#FEF0EF', icon: 'close-circle-outline' },
};

export const AdoptionRequestsScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [tab, setTab] = useState<Tab>('received');
  const [receivedRequests, setReceivedRequests] = useState<AdoptionReq[]>([]);
  const [sentRequests, setSentRequests] = useState<AdoptionReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<AdoptionReq | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [ownerRes, myRes] = await Promise.all([
        adoptionService.getOwnerRequests(),
        adoptionService.getMyRequests(),
      ]);
      setReceivedRequests(ownerRes.data || []);
      setSentRequests(myRes.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load requests');
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

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('petDataChanged', loadData);
    return () => sub.remove();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = (req: AdoptionReq) => {
    Alert.alert(
      'Approve Request',
      `Approve adoption request from ${req.requester?.name}?\n\nThis will mark ${req.pet?.name} as adopted and reject all other pending requests.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setActionLoading(`approve-${req._id}`);
              await adoptionService.updateStatus(req._id, 'approved');
              Alert.alert('✅ Approved!', `${req.requester?.name}'s request has been approved and ${req.pet?.name} is now marked as adopted.`);
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (req: AdoptionReq) => {
    Alert.alert(
      'Reject Request',
      `Reject adoption request from ${req.requester?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(`reject-${req._id}`);
              await adoptionService.updateStatus(req._id, 'rejected');
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleCancelSent = (req: AdoptionReq) => {
    Alert.alert('Cancel Request', 'Cancel your adoption request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Request',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(`cancel-${req._id}`);
            await adoptionService.cancelRequest(req._id);
            loadData();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const openEditModal = (req: AdoptionReq) => {
    setEditingRequest(req);
    setEditMessage(req.message || '');
    setShowEditModal(true);
  };

  const handleUpdateMessage = async () => {
    if (!editingRequest) return;
    try {
      setUpdateLoading(true);
      await adoptionService.updateRequest(editingRequest._id, editMessage.trim());
      setShowEditModal(false);
      Alert.alert('Success', 'Adoption request updated successfully.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update request');
    } finally {
      setUpdateLoading(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ─── Received request card (owner view) ───────────────────────────────────
  const renderReceivedCard = ({ item }: { item: AdoptionReq }) => {
    const meta = STATUS_META[item.status];
    const isLoading = actionLoading === item._id;

    return (
      <View style={styles.card}>
        {/* Pet info row */}
        <TouchableOpacity
          style={styles.petRow}
          onPress={() => item.pet?._id && router.push(`/pet/${item.pet._id}` as any)}
          activeOpacity={0.8}
        >
          {item.pet?.images?.[0] ? (
            <Image source={{ uri: item.pet.images[0] }} style={styles.petImg} />
          ) : (
            <View style={[styles.petImg, styles.petImgPlaceholder]}>
              <Ionicons name="paw" size={22} color="#E8A358" />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.petName}>{item.pet?.name || 'Unknown Pet'}</Text>
            <Text style={styles.petBreed}>{item.pet?.breed || ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Requester row */}
        <View style={styles.requesterRow}>
          <View style={styles.requesterAvatar}>
            <Text style={styles.requesterInitial}>
              {(item.requester?.name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.requesterName}>{item.requester?.name}</Text>
            <Text style={styles.requesterHandle}>@{item.requester?.username}</Text>
          </View>
          {item.requester?.phoneNumber && (
            <TouchableOpacity 
              style={styles.callButton} 
              onPress={() => Linking.openURL(`tel:${item.requester?.phoneNumber}`)}
            >
              <Ionicons name="call" size={18} color="#27AE60" />
            </TouchableOpacity>
          )}
          <View style={[styles.statusChip, { backgroundColor: meta.bg, marginLeft: 8 }]}>
            <Ionicons name={meta.icon as any} size={12} color={meta.color} />
            <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Message */}
        {!!item.message && (
          <View style={styles.messageBox}>
            <Ionicons name="chatbubble-outline" size={14} color="#888" style={{ marginRight: 6 }} />
            <Text style={styles.messageText} numberOfLines={3}>{item.message}</Text>
          </View>
        )}

        {/* Contact info */}
        {(item.requester?.phoneNumber || item.requester?.email) && (
          <Text style={styles.contactInfo}>
            {item.requester?.phoneNumber || item.requester?.email}
          </Text>
        )}

        <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>

        {/* Action buttons — only for pending */}
        {item.status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleReject(item)}
              disabled={!!actionLoading}
            >
              {actionLoading === `reject-${item._id}`
                ? <ActivityIndicator size="small" color="#E74C3C" />
                : <><Ionicons name="close" size={16} color="#E74C3C" /><Text style={styles.rejectBtnText}>Reject</Text></>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleApprove(item)}
              disabled={!!actionLoading}
            >
              {actionLoading === `approve-${item._id}`
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={styles.approveBtnText}>Approve</Text></>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ─── Sent request card (requester view) ───────────────────────────────────
  const renderSentCard = ({ item }: { item: AdoptionReq }) => {
    const meta = STATUS_META[item.status];
    const isLoading = actionLoading === item._id;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.petRow}
          onPress={() => item.pet?._id && router.push(`/pet/${item.pet._id}` as any)}
          activeOpacity={0.8}
        >
          {item.pet?.images?.[0] ? (
            <Image source={{ uri: item.pet.images[0] }} style={styles.petImg} />
          ) : (
            <View style={[styles.petImg, styles.petImgPlaceholder]}>
              <Ionicons name="paw" size={22} color="#E8A358" />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.petName}>{item.pet?.name || 'Unknown Pet'}</Text>
            <Text style={styles.petBreed}>{item.pet?.breed || ''}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon as any} size={12} color={meta.color} />
            <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </TouchableOpacity>

        {/* Owner info */}
        <View style={styles.ownerRow}>
          <Ionicons name="person-outline" size={14} color="#888" />
          <Text style={styles.ownerText}>Owner: {item.owner?.name}</Text>
        </View>

        {!!item.message && (
          <View style={styles.messageBox}>
            <Ionicons name="chatbubble-outline" size={14} color="#888" style={{ marginRight: 6 }} />
            <Text style={styles.messageText} numberOfLines={2}>{item.message}</Text>
          </View>
        )}

        <View style={styles.sentFooter}>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          {item.status === 'pending' && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.updateChip}
                onPress={() => openEditModal(item)}
                disabled={!!actionLoading}
              >
                <Ionicons name="pencil-outline" size={13} color="#E8A358" />
                <Text style={styles.updateChipText}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelChip}
                onPress={() => handleCancelSent(item)}
                disabled={!!actionLoading}
              >
                {actionLoading === `cancel-${item._id}`
                  ? <ActivityIndicator size="small" color="#E74C3C" />
                  : <><Ionicons name="trash-outline" size={13} color="#E74C3C" /><Text style={styles.cancelChipText}>Cancel</Text></>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>

        {item.status === 'approved' && (
          <View style={styles.approvedBanner}>
            <Ionicons name="heart" size={16} color="#27AE60" />
            <Text style={styles.approvedBannerText}>Congratulations! Your request was approved 🎉</Text>
          </View>
        )}
      </View>
    );
  };

  const data = tab === 'received' ? receivedRequests : sentRequests;
  const pendingCount = receivedRequests.filter((r) => r.status === 'pending').length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Adoptions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'received' && styles.tabBtnActive]}
          onPress={() => setTab('received')}
        >
          <Text style={[styles.tabBtnText, tab === 'received' && styles.tabBtnTextActive]}>
            Received
          </Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'sent' && styles.tabBtnActive]}
          onPress={() => setTab('sent')}
        >
          <Text style={[styles.tabBtnText, tab === 'sent' && styles.tabBtnTextActive]}>
            My Requests
          </Text>
          {sentRequests.filter((r) => r.status === 'pending').length > 0 && (
            <View style={[styles.badge, { backgroundColor: '#F0A500' }]}>
              <Text style={styles.badgeText}>
                {sentRequests.filter((r) => r.status === 'pending').length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E8A358" />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="paw-outline" size={64} color="#E8E8E8" />
          <Text style={styles.emptyTitle}>
            {tab === 'received' ? 'No requests yet' : 'No requests sent'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {tab === 'received'
              ? 'When someone wants to adopt your pet, requests will appear here.'
              : 'Browse pets and tap "Adopt Me" to send a request.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          renderItem={tab === 'received' ? renderReceivedCard : renderSentCard}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8A358" />}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        />
      )}

      {/* Edit Message Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Update Adoption Request</Text>
            <Text style={styles.modalSubtitle}>Update your message for {editingRequest?.pet?.name}</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Your message to the owner..."
              multiline
              numberOfLines={4}
              value={editMessage}
              onChangeText={setEditMessage}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleUpdateMessage} disabled={updateLoading}>
                {updateLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitText}>Update Request</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },

  tabBar: {
    flexDirection: 'row', backgroundColor: colors.card,
    paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4,
    gap: 10,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    backgroundColor: colors.background,
  },
  tabBtnActive: { backgroundColor: '#E8A358' },
  tabBtnText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  tabBtnTextActive: { color: '#fff' },
  badge: {
    backgroundColor: '#E74C3C', borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  // Cards
  card: {
    backgroundColor: colors.card, borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  petRow: { flexDirection: 'row', alignItems: 'center' },
  petImg: { width: 58, height: 58, borderRadius: 14 },
  petImgPlaceholder: { backgroundColor: colors.secondary + '20', justifyContent: 'center', alignItems: 'center' },
  petName: { fontSize: 16, fontWeight: '800', color: colors.text },
  petBreed: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },

  requesterRow: { flexDirection: 'row', alignItems: 'center' },
  requesterAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  requesterInitial: { fontSize: 18, fontWeight: '800', color: '#E8A358' },
  requesterName: { fontSize: 15, fontWeight: '700', color: colors.text },
  requesterHandle: { fontSize: 13, color: colors.textMuted },

  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusChipText: { fontSize: 12, fontWeight: '700' },

  messageBox: {
    flexDirection: 'row', alignItems: 'flex-start', marginTop: 12,
    backgroundColor: colors.background, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  messageText: { flex: 1, fontSize: 14, color: colors.text, opacity: 0.8, lineHeight: 20 },
  contactInfo: { fontSize: 13, color: colors.textMuted, marginTop: 8, fontWeight: '500' },
  dateText: { fontSize: 12, color: colors.textMuted, marginTop: 8 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rejectBtn: { borderWidth: 1.5, borderColor: '#E74C3C', backgroundColor: '#FEF0EF' },
  rejectBtnText: { fontSize: 14, fontWeight: '700', color: '#E74C3C' },
  approveBtn: { backgroundColor: '#27AE60' },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Sent card
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  ownerText: { fontSize: 13, color: colors.textMuted },
  sentFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cancelChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEF0EF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  cancelChipText: { fontSize: 12, fontWeight: '700', color: '#E74C3C' },
  updateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.background, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  updateChipText: { fontSize: 12, fontWeight: '700', color: '#E8A358' },
  approvedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: '#E8F8EE', borderRadius: 10, padding: 10,
  },
  approvedBannerText: { fontSize: 13, fontWeight: '600', color: '#27AE60', flex: 1 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 },

  // Modal styles
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { backgroundColor: colors.card, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 20 },
  messageInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 15, minHeight: 120, color: colors.text, textAlignVertical: 'top', marginBottom: 20, backgroundColor: colors.background },
  modalActions: { flexDirection: 'row', gap: 15 },
  modalCancelBtn: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center' },
  modalCancelText: { color: colors.textMuted, fontWeight: '600' },
  modalSubmitBtn: { flex: 2, height: 50, borderRadius: 25, backgroundColor: '#E8A358', justifyContent: 'center', alignItems: 'center' },
  modalSubmitText: { color: '#FFF', fontWeight: '700' },
});
