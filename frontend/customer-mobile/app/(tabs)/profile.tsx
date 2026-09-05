import React, { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { getMe, updateProfile } from '../../src/services/api/auth.api';
import {
  User,
  Mail,
  Camera,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Phone,
  Key,
  CircleUserRound,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        const token = await SecureStore.getItemAsync('pharmaToken');
        if (token) {
          const freshUser = await getMe(token);
          updateUser(freshUser);
          if (freshUser.name) setName(freshUser.name);
          if (freshUser.email) setEmail(freshUser.email);
          if (freshUser.phone) setPhone(freshUser.phone);
        }
      } catch (err) {
        console.warn('[MediaCare Profile] fetchLatestProfile notice:', err);
      }
    };
    fetchLatestProfile();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfile({ name: name.trim(), phone: phone.trim() });
      updateUser(updated);
      Alert.alert('Saved', 'Your profile details have been saved to the database.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear persisted JWT so session is not restored on next cold launch
      await SecureStore.deleteItemAsync('pharmaToken');
    } catch (e) {
      console.warn('SecureStore clear error:', e);
    }
    logout();
    router.replace('/(public)/home');
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 20) + 12,
              paddingBottom: (insets.bottom || 10) + 30,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Patient Account</Text>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={14} color="#ea580c" />
              <Text style={styles.verifiedText}>KYC Verified</Text>
            </View>
          </View>

          {/* Avatar Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
              <View style={styles.cameraBtn}>
                <Camera size={12} color="#ffffff" />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.avatarName}>{name}</Text>
                <CheckCircle2 size={16} color="#ff5a36" />
              </View>
              <Text style={styles.avatarEmail}>{email}</Text>
              <View style={styles.patientIdPill}>
                <Text style={styles.patientIdText}>ID: #{user?.fabricNodeId || 'PC-889214'} • Fabric Node</Text>
              </View>
            </View>
          </View>

          {/* Personal Info Form */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <CircleUserRound size={18} color="#ff5a36" />
              <Text style={styles.sectionTitle}>Account Details</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <CircleUserRound size={18} color="#a8a29e" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter full name"
                  placeholderTextColor="#a8a29e"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Mail size={18} color="#a8a29e" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  placeholderTextColor="#a8a29e"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.inputContainer}>
                <Phone size={18} color="#a8a29e" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor="#a8a29e"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Profile Updates</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Security & Ledger Node Status */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Key size={18} color="#ea580c" />
              <Text style={styles.sectionTitle}>Cryptographic Consensus</Text>
            </View>

            <View style={styles.ledgerInfoRow}>
              <Text style={styles.ledgerLabel}>Network Identity</Text>
              <Text style={styles.ledgerVal}>ECDSA secp256r1</Text>
            </View>
            <View style={styles.ledgerInfoRow}>
              <Text style={styles.ledgerLabel}>Consensus State</Text>
              <Text style={[styles.ledgerVal, { color: '#ff5a36' }]}>Active & Synchronized</Text>
            </View>
            <View style={[styles.ledgerInfoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.ledgerLabel}>CDSCO Compliance</Text>
              <Text style={styles.ledgerVal}>Rule 96 Verifiable</Text>
            </View>
          </View>

          {/* Sign Out */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <LogOut size={18} color="#dc2626" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Sign Out of Patient Account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fed7aa',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#c2410c',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff5a36',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 14,
    shadowColor: '#ff5a36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1f2937',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  avatarEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  patientIdPill: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  patientIdText: {
    fontSize: 10,
    color: '#c2410c',
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  saveBtn: {
    backgroundColor: '#ff5a36',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#ff5a36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  ledgerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  ledgerLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  ledgerVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#e11d48',
  },
});
