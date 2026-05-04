import React, { useEffect, useState, useCallback } from 'react';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
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
  ScrollView,
  Linking,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { appointmentService } from '@/services/appointmentService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');

type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

interface Appointment {
  _id: string;
  petId?: {
    _id: string;
    name: string;
    images?: string[];
    breed?: string;
  } | null;
  requesterId?: {
    _id: string;
    name: string;
    username: string;
    phoneNumber?: string;
  } | null;
  ownerId?: {
    _id: string;
    name: string;
    username: string;
    phoneNumber?: string;
  } | null;
  appointmentDate: string;
  location: string;
  status: AppointmentStatus;
  createdAt: string;
}

const STATUS_META: Record<AppointmentStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'Pending',   color: '#F0A500', bg: '#FFF8E6', icon: 'time-outline' },
  confirmed: { label: 'Confirmed', color: '#27AE60', bg: '#E8F8EE', icon: 'calendar-outline' },
  completed: { label: 'Completed', color: '#3498DB', bg: '#EBF5FB', icon: 'checkmark-done-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#E74C3C', bg: '#FEF0EF', icon: 'close-circle-outline' },
};

export const AppointmentsScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{ id: string; action: string } | null>(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [editDateObj, setEditDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editLocation, setEditLocation] = useState('');

  const loadData = useCallback(async () => {
    try {
      const userRaw = await AsyncStorage.getItem('user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        setCurrentUserId(u._id || u.id);
      }

      const res = await appointmentService.getMyAppointments();
      setAppointments(res.data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load appointments');
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

  const handleStatusUpdate = async (id: string, status: AppointmentStatus, actionName: string) => {
    try {
      setActionLoading({ id, action: actionName });
      await appointmentService.updateAppointment(id, { status });
      setAppointments(prev => prev.map(appt => appt._id === id ? { ...appt, status } : appt));
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading({ id, action: 'cancel' });
            await appointmentService.cancelAppointment(id);
            setAppointments(prev => prev.map(appt => appt._id === id ? { ...appt, status: 'cancelled' } : appt));
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

  const handleDelete = (id: string) => {
    Alert.alert('Delete Request', 'Are you sure you want to delete this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading({ id, action: 'delete' });
            await appointmentService.deleteAppointment(id);
            setAppointments(prev => prev.filter(appt => appt._id !== id));
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

  const openEditModal = (appt: Appointment) => {
    setSelectedAppt(appt);
    setEditDateObj(new Date(appt.appointmentDate));
    setEditLocation(appt.location);
    setShowEditModal(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(editDateObj);
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setEditDateObj(newDate);
      setTimeout(() => setShowTimePicker(true), 500);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(editDateObj);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setEditDateObj(newDate);
    }
  };

  const handleUpdateSchedule = async () => {
    if (!selectedAppt) return;
    try {
      setActionLoading({ id: 'updating', action: 'update' });
      await appointmentService.updateAppointment(selectedAppt._id, {
        appointmentDate: editDateObj.toISOString(),
        location: editLocation,
      });
      setShowEditModal(false);
      setAppointments(prev => prev.map(appt => appt._id === selectedAppt._id ? {
        ...appt,
        appointmentDate: editDateObj.toISOString(),
        location: editLocation
      } : appt));
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const meta = STATUS_META[item.status];
    const isOwner = currentUserId === item.ownerId?._id;
    const otherUser = isOwner ? item.requesterId : item.ownerId;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon as any} size={14} color={meta.color} />
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.createdAt} numberOfLines={1}>{formatDate(item.createdAt)}</Text>
        </View>

        <TouchableOpacity
          style={styles.petInfo}
          onPress={() => item.petId && router.push(`/pet/${item.petId._id}` as any)}
          disabled={!item.petId}
        >
          {item.petId?.images?.[0] ? (
            <Image source={{ uri: item.petId.images[0] }} style={styles.petImg} />
          ) : (
            <View style={[styles.petImg, { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="paw" size={24} color="#ccc" />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.petName} numberOfLines={1}>{item.petId?.name || 'Pet Unavailable'}</Text>
            <Text style={styles.petBreed} numberOfLines={1}>{item.petId?.breed || (item.petId ? 'Pet' : 'This pet post was removed')}</Text>
          </View>
          {item.petId && <Ionicons name="chevron-forward" size={18} color="#ccc" />}
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={16} color="#888" />
            <Text style={styles.detailText} numberOfLines={1}>{formatDate(item.appointmentDate)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="location-outline" size={16} color="#888" />
            <Text style={styles.detailText} numberOfLines={1}>{item.location}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="person-outline" size={16} color="#888" />
            <Text style={styles.detailText} numberOfLines={1}>
              {isOwner ? 'Requester: ' : 'Owner: '}{otherUser?.name || 'Unknown User'}
            </Text>
            {isOwner && otherUser?.phoneNumber && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${otherUser.phoneNumber}`)}>
                <Ionicons name="call" size={16} color="#3498DB" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          {item.status === 'pending' && (
            <>
              {isOwner && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.confirmBtn]}
                  onPress={() => handleStatusUpdate(item._id, 'confirmed', 'confirm')}
                  disabled={!!actionLoading}
                >
                  {actionLoading?.id === item._id && actionLoading?.action === 'confirm' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmBtnText} numberOfLines={1} adjustsFontSizeToFit>Confirm</Text>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.editBtn]}
                onPress={() => openEditModal(item)}
                disabled={!!actionLoading}
              >
                <Text style={styles.editBtnText} numberOfLines={1} adjustsFontSizeToFit>Reschedule</Text>
              </TouchableOpacity>
            </>
          )}

          {item.status === 'confirmed' && isOwner && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.confirmBtn]}
              onPress={() => handleStatusUpdate(item._id, 'completed', 'complete')}
              disabled={!!actionLoading}
            >
              {actionLoading?.id === item._id && actionLoading?.action === 'complete' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText} numberOfLines={1} adjustsFontSizeToFit>Mark Completed</Text>
              )}
            </TouchableOpacity>
          )}

          {(item.status === 'pending' || item.status === 'confirmed') && isOwner && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => handleCancel(item._id)}
              disabled={!!actionLoading}
            >
              {actionLoading?.id === item._id && actionLoading?.action === 'cancel' ? (
                <ActivityIndicator size="small" color="#E74C3C" />
              ) : (
                <Text style={styles.cancelBtnText} numberOfLines={1} adjustsFontSizeToFit>Cancel</Text>
              )}
            </TouchableOpacity>
          )}

          {!isOwner && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => handleDelete(item._id)}
              disabled={!!actionLoading}
            >
              {actionLoading?.id === item._id && actionLoading?.action === 'delete' ? (
                <ActivityIndicator size="small" color="#E74C3C" />
              ) : (
                <Text style={styles.cancelBtnText} numberOfLines={1} adjustsFontSizeToFit>Delete</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E8A358" />
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={80} color="#F0F0F0" />
          <Text style={styles.emptyTitle}>No Appointments</Text>
          <Text style={styles.emptySubtitle}>You haven't booked any visits yet. Visit a pet detail page to book one!</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.replace('/(tabs)/explore')}>
            <Text style={styles.browseBtnText}>Browse Pets</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item._id}
          renderItem={renderAppointment}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        />
      )}

      {/* Reschedule Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalTitle}>Reschedule Appointment</Text>

              <Text style={styles.label}>New Date & Time</Text>
              <TouchableOpacity style={styles.dateDisplay} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={20} color="#E8A358" />
                <Text style={styles.dateDisplayText}>
                  {editDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' at '}
                  {editDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#aaa" />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={editDateObj}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={editDateObj}
                  mode="time"
                  display="default"
                  onChange={onTimeChange}
                />
              )}

              <Text style={styles.label}>Location</Text>
              <View style={{ height: 180, zIndex: 100, marginBottom: 10 }}>
                <GooglePlacesAutocomplete
                  placeholder="Search meeting location..."
                  onPress={(data, details = null) => {
                    setEditLocation(data.description);
                  }}
                  query={{
                    key: 'AIzaSyCZ1MzvV0ndr3tZZo1TyJ8q01HjjOtBCOU',
                    language: 'en',
                  }}
                  styles={{
                    container: { flex: 0 },
                    textInput: styles.input,
                    listView: { 
                      backgroundColor: colors.card, 
                      position: 'absolute', 
                      top: 50, 
                      zIndex: 1000,
                      elevation: 5,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border
                    },
                    row: { backgroundColor: colors.card, padding: 13 },
                    separator: { backgroundColor: colors.border },
                    description: { color: colors.text },
                  }}
                  textInputProps={{
                    value: editLocation,
                    onChangeText: setEditLocation,
                  }}
                  enablePoweredByContainer={false}
                  nearbyPlacesAPI="GooglePlacesSearch"
                  debounce={200}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowEditModal(false)}>
                  <Text style={styles.modalCancelText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSubmit}
                  onPress={handleUpdateSchedule}
                  disabled={actionLoading?.action === 'update'}
                >
                  {actionLoading?.action === 'update' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Update Schedule</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },

  card: { backgroundColor: colors.card, borderRadius: 24, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  createdAt: { fontSize: 11, color: colors.textMuted },

  petInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 12, borderRadius: 16 },
  petImg: { width: 50, height: 50, borderRadius: 12 },
  petName: { fontSize: 16, fontWeight: '800', color: colors.text },
  petBreed: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },

  detailsGrid: { gap: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { flex: 1, fontSize: 14, color: colors.text, opacity: 0.8, fontWeight: '500' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmBtn: { backgroundColor: '#27AE60' },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
  editBtn: { backgroundColor: colors.background },
  editBtnText: { color: colors.textMuted, fontWeight: '700' },
  cancelBtn: { backgroundColor: '#FEF0EF', borderWidth: 1, borderColor: '#E74C3C' },
  cancelBtnText: { color: '#E74C3C', fontWeight: '700' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 20 },
  emptySubtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  browseBtn: { marginTop: 30, backgroundColor: '#E8A358', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 16 },
  browseBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  dateDisplay: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background,
    borderRadius: 12, padding: 16, marginBottom: 20, gap: 12, borderWidth: 1, borderColor: colors.border
  },
  dateDisplayText: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  modalCancelText: { color: colors.textMuted, fontWeight: '700' },
  modalSubmit: { flex: 2, backgroundColor: '#E8A358', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  modalSubmitText: { color: '#fff', fontWeight: '800' },
});
