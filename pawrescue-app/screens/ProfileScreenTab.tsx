import React from 'react';
import { StyleSheet, TouchableOpacity, Alert, View, ScrollView, StatusBar, Platform, Switch, Image, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { petService } from '@/services/petService';
import { authService } from '@/services/authService';
import { adoptionService } from '@/services/adoptionService';
import { useTheme } from '@/context/ThemeContext';
import * as ImagePicker from 'expo-image-picker';

interface User {
  name: string;
  username: string;
  email: string;
  phoneNumber: string;
  _id?: string;
  id?: string;
  profileImage?: string;
}

export const ProfileScreenTab = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { signOut } = React.useContext(AuthContext);
  const { themeMode, setThemeMode } = useTheme();

  const [user, setUser] = React.useState<User | null>(null);
  const [myPostsCount, setMyPostsCount] = React.useState(0);
  const [adoptionCount, setAdoptionCount] = React.useState(0);   // total requests (sent by me)
  const [pendingCount, setPendingCount] = React.useState(0);      // pending requests on MY posts
  const [savedCount, setSavedCount] = React.useState(0);

  const loadStats = React.useCallback(async () => {
    try {
      let parsedUser = null;
      const userData = await AsyncStorage.getItem('user');

      if (userData && userData !== 'undefined') {
        parsedUser = JSON.parse(userData);
      } else {
        const response = await authService.getMe();
        if (response.data) {
          parsedUser = response.data.user || response.data;
          await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
        }
      }

      if (parsedUser) {
        setUser(parsedUser);

        const userId = parsedUser._id || parsedUser.id;
        if (userId) {
          // Posts count
          petService.getPetsByUser(userId).then((res) => {
            if (res.data) setMyPostsCount(res.data.length);
          }).catch(() => { });

          // Adoption counts
          adoptionService.getMyRequests().then((res) => {
            if (res.data) setAdoptionCount(res.data.length);
          }).catch(() => { });

          // Pending incoming requests on my posts
          adoptionService.getPendingCount().then((res) => {
            if (res.count !== undefined) setPendingCount(res.count);
          }).catch(() => { });

          // Saved pets count
          authService.getFavorites().then((res) => {
            if (res.data.success) {
              setSavedCount(res.data.count);
            }
          }).catch((err) => {
            console.log('Error fetching favorites count:', err.message);
          });
        }
      }
    } catch (error) {
      console.log('Error fetching user data:', error);
    }
  }, [signOut]);

  React.useEffect(() => {
    loadStats();
    const { DeviceEventEmitter } = require('react-native');
    const sub = DeviceEventEmitter.addListener('petDataChanged', loadStats);
    return () => sub.remove();
  }, [loadStats]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        // Update local state
        const updatedUser = { ...user, profileImage: base64Image };
        setUser(updatedUser as User);

        // Persist to storage
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

        // Update backend
        await authService.updateProfile({ profileImage: base64Image });

        // Notify other screens
        DeviceEventEmitter.emit('profileUpdated', base64Image);
        
        Alert.alert('Success', 'Profile picture updated');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.log(error);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/login');
          } catch {
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  };

  const getInitials = (name: string) => name ? name.charAt(0).toUpperCase() : '?';

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingTop: 40,
      paddingBottom: 40,
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderBottomLeftRadius: 40,
      borderBottomRightRadius: 40,
    },
    avatarWrapper: {
      padding: 4,
      borderRadius: 60,
      backgroundColor: 'rgba(255,255,255,0.2)',
      marginBottom: 16,
    },
    avatarContainer: {
      width: 100, height: 100, borderRadius: 50,
      backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
    },
    avatarText: { fontSize: 42, fontWeight: '800', color: colors.primary },
    avatarImage: { width: '100%', height: '100%', borderRadius: 50 },
    editBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#FFF',
    },
    userName: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 2 },
    userHandle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

    statsContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      marginHorizontal: 24,
      marginTop: -35,
      borderRadius: 24,
      paddingVertical: 20,
      paddingHorizontal: 10,
      shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.08, shadowRadius: 25, elevation: 8,
      justifyContent: 'space-around',
      borderWidth: 1,
      borderColor: colors.border,
    },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { fontSize: 24, fontWeight: '800', color: colors.primary, marginBottom: 2 },
    statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    statDivider: { width: 1, backgroundColor: colors.border, height: '60%', alignSelf: 'center' },

    content: {
      paddingHorizontal: 24,
      paddingTop: 32,
    },
    section: { marginBottom: 32 },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },

    menuCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 12, elevation: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    menuIconContainer: {
      width: 42, height: 42, borderRadius: 14,
      backgroundColor: colors.primary + '10',
      justifyContent: 'center', alignItems: 'center', marginRight: 16,
    },
    menuText: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '600' },

    logoutBtn: {
      marginTop: 8,
      marginBottom: 40,
      backgroundColor: colors.error + '10',
      padding: 18,
      borderRadius: 20,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.error + '20',
    },
    logoutText: { color: colors.error, fontSize: 16, fontWeight: '700' },

    badge: {
      backgroundColor: colors.error,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginLeft: 8,
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }} // Extra padding for tab bar
      >
        {/* Header Section */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} activeOpacity={0.8}>
            <View style={styles.avatarContainer}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatarImage} />
              ) : (
                <ThemedText style={styles.avatarText}>
                  {getInitials(user?.name || 'U')}
                </ThemedText>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={14} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>
          <ThemedText style={styles.userName}>{user?.name || 'User'}</ThemedText>
          <ThemedText style={styles.userHandle}>@{user?.username || 'username'}</ThemedText>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => router.push('/my-posts')}>
            <ThemedText style={styles.statValue}>{myPostsCount}</ThemedText>
            <ThemedText style={styles.statLabel}>My Posts</ThemedText>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => router.push('/adoptions')}>
            <ThemedText style={styles.statValue}>{pendingCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Adoptions</ThemedText>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => router.push('/saved-pets')}>
            <ThemedText style={styles.statValue}>{savedCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Saved</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Quick Links Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Quick Links</ThemedText>
            </View>
            <View style={styles.menuCard}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/adoptions')}
                activeOpacity={0.6}
              >
                <View style={styles.menuIconContainer}>
                  <Ionicons name="heart" size={20} color={colors.primary} />
                </View>
                <ThemedText style={styles.menuText}>Adoption Requests</ThemedText>
                {pendingCount > 0 && (
                  <View style={styles.badge}>
                    <ThemedText style={styles.badgeText}>{pendingCount}</ThemedText>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/appointments')}
                activeOpacity={0.6}
              >
                <View style={styles.menuIconContainer}>
                  <Ionicons name="calendar" size={20} color={colors.primary} />
                </View>
                <ThemedText style={styles.menuText}>My Appointments</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                onPress={() => router.push('/my-posts')}
                activeOpacity={0.6}
              >
                <View style={styles.menuIconContainer}>
                  <Ionicons name="list" size={20} color={colors.primary} />
                </View>
                <ThemedText style={styles.menuText}>My Pet Posts</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
            </View>
            <View style={styles.menuCard}>
              <TouchableOpacity 
                style={styles.menuItem} 
                activeOpacity={0.6}
                onPress={() => router.push('/edit-profile')}
              >
                <View style={styles.menuIconContainer}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
                <ThemedText style={styles.menuText}>Edit Profile</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name={colorScheme === 'dark' ? "moon" : "sunny"} size={20} color={colors.primary} />
                </View>
                <ThemedText style={styles.menuText}>Dark Mode</ThemedText>
                <Switch
                  value={colorScheme === 'dark'}
                  onValueChange={(value) => setThemeMode(value ? 'dark' : 'light')}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={Platform.OS === 'ios' ? undefined : (colorScheme === 'dark' ? colors.primary : '#f4f3f4')}
                />
              </View>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
            <ThemedText style={styles.logoutText}>Log Out</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

