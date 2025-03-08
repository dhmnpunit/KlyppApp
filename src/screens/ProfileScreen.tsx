import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../navigation/AppNavigator';
import { useAuthStore, UserProfile } from '../store/authStore';
import { supabase } from '../services/supabase';

type ProfileScreenNavigationProp = NativeStackNavigationProp<MainTabParamList, 'Profile'>;

export const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { 
    user, 
    profile, 
    fetchProfile, 
    updateProfile, 
    signOut, 
    loading: authLoading, 
    error,
    ensureProfileExists 
  } = useAuthStore();
  
  // Form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch profile when component mounts
    console.log('ProfileScreen mounted, fetching profile...');
    
    const loadProfile = async () => {
      try {
        console.log('Loading profile...');
        await fetchProfile();
        
        // If profile is still not available, ensure it exists
        if (!profile) {
          console.log('Profile not found, ensuring it exists...');
          await ensureProfileExists();
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    
    loadProfile();
    
    // Set up a listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (session) {
        await loadProfile();
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Add a second useEffect to handle the case when the component mounts but profile is not loaded yet
  useEffect(() => {
    if (!profile && user && !authLoading && !loading) {
      console.log('Profile not loaded yet but user exists, ensuring profile exists...');
      ensureProfileExists();
    }
  }, [profile, user, authLoading, loading]);

  useEffect(() => {
    // Update form state when profile changes
    console.log('Profile updated:', profile);
    if (profile) {
      setName(profile.name || '');
      setUsername(profile.username || '');
      setCurrency(profile.currency);
      setTheme(profile.theme);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    try {
      // Validate form
      if (!username.trim()) {
        Alert.alert('Error', 'Username is required');
        return;
      }

      // Check if username is already taken (only if it changed)
      if (username.trim() !== profile?.username) {
        console.log('Username changed, checking if already taken');
        const { data, error } = await supabase
          .from('users')
          .select('username')
          .eq('username', username.trim())
          .neq('user_id', user?.id || '')
          .maybeSingle();

        if (data) {
          console.log('Username already taken:', data);
          Alert.alert('Error', 'Username is already taken. Please choose another one.');
          return;
        }
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking username:', error);
          Alert.alert('Error', 'Failed to check username availability');
          return;
        }
      }

      // Update profile
      await updateProfile({
        name: name.trim() || null,
        username: username.trim(),
        currency,
        theme,
      });

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleRefreshProfile = async () => {
    console.log('Manually refreshing profile...');
    try {
      setLoading(true);
      await ensureProfileExists();
      setLoading(false);
      
      if (profile) {
        Alert.alert('Success', 'Profile refreshed successfully');
      } else {
        Alert.alert('Error', 'Unable to load profile. Please try again.');
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to refresh profile');
    }
  };

  if (authLoading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#008CFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.containerWrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.headerButtons}>
          {!isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerButton}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleRefreshProfile} style={styles.headerButton}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {username ? username.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name || 'No name set'}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>

          {isEditing ? (
            <View style={styles.formContainer}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Currency</Text>
              <View style={styles.currencyContainer}>
                {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    style={[
                      styles.currencyButton,
                      currency === curr && styles.currencyButtonSelected,
                    ]}
                    onPress={() => setCurrency(curr)}
                  >
                    <Text
                      style={[
                        styles.currencyButtonText,
                        currency === curr && styles.currencyButtonTextSelected,
                      ]}
                    >
                      {curr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.themeContainer}>
                <Text style={styles.label}>Dark Theme</Text>
                <Switch
                  value={theme === 'dark'}
                  onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
                  trackColor={{ false: '#ccc', true: '#008CFF' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsEditing(false)}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Username</Text>
                <Text style={styles.detailValue}>{username || 'Not set'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Currency</Text>
                <Text style={styles.detailValue}>{currency}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Theme</Text>
                <Text style={styles.detailValue}>
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={loading}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  containerWrapper: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 44, // For status bar
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  editText: {
    color: '#008CFF',
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#008CFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  detailsContainer: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  formContainer: {
    marginTop: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  currencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  currencyButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  currencyButtonSelected: {
    backgroundColor: '#008CFF',
  },
  currencyButtonText: {
    color: '#333',
    fontSize: 14,
  },
  currencyButtonTextSelected: {
    color: '#fff',
  },
  themeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  buttonContainer: {
    marginTop: 24,
  },
  saveButton: {
    backgroundColor: '#008CFF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    margin: 16,
    marginTop: 8,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    margin: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
  },
  refreshText: {
    color: '#008CFF',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 20,
  },
}); 