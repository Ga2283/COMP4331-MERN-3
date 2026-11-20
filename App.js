import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View, RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

// This is the backend domain shown in your supplied Expo guide.
// Change it if your deployed backend uses a different domain.
const API_BASE_URL = 'https://mern.gabrielf2283.com';
const TOKEN_KEY = 'mycollection_token';

const CATEGORIES = ['All', 'Cards', 'Comic books', 'Figurines', 'Misc.'];
const ITEM_CATEGORIES = ['Cards', 'Comic books', 'Figurines', 'Misc.'];

function PrimaryButton({ title, onPress, disabled, secondary = false }) {
  return (
    <TouchableOpacity style={[secondary ? styles.secondaryButton : styles.primaryButton, disabled && styles.disabled]}
      onPress={onPress} disabled={disabled}>
      {disabled ? <ActivityIndicator color={secondary ? '#2563EB' : '#fff'} /> :
        <Text style={secondary ? styles.secondaryButtonText : styles.primaryButtonText}>{title}</Text>}
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, multiline }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9299A5"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'none'}
        autoCorrect={false}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Cards');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemImage, setNewItemImage] = useState(null);
  const [addingItem, setAddingItem] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [dashboardMessage, setDashboardMessage] = useState('');

  useEffect(() => {
    // Start at Login on first access. If a previous session exists, restore it.
    // Remove this restore block if your instructor requires Login on every launch.
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (savedToken) {
          setToken(savedToken);
          await loadDashboard(savedToken);
        }
      } catch (e) {
        console.log('Session restore failed:', e);
      }
    })();
  }, []);

  async function apiRequest(path, options = {}, authToken = token) {
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  async function handleLogin() {
    setMessage('');
    if (!username.trim() || !password) {
      setMessage('Please enter your username and password.');
      return;
    }
    setBusy(true);
    try {
      const { response, data } = await apiRequest('/api/users/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password }),
      }, null);

      if (!response.ok) {
        // Keep the displayed login failure generic, as required by the rubric.
        setMessage('Login failed. Invalid username or password.');
        setScreen('loginError');
        return;
      }
      if (!data.token) throw new Error('The server did not return a login token.');
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      await loadDashboard(data.token);
    } catch (e) {
      setMessage('Unable to connect to the server. Check your connection and API address.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister() {
    setMessage('');
    if (!firstName.trim() || !lastName.trim() || !email.trim() ||
        !registerUsername.trim() || !registerPassword) {
      setMessage('Please complete all fields.');
      return;
    }
    setBusy(true);
    try {
      const { response, data } = await apiRequest('/api/users/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          username: registerUsername.trim(),
          password: registerPassword,
        }),
      }, null);

      if (!response.ok) {
        setMessage(data.error || data.message || 'Registration failed. Please try another username or email.');
      } else {
        setMessage('Registration successful. Check your email and verify your account before logging in.');
        setScreen('login');
        setUsername(registerUsername.trim());
        setPassword('');
      }
    } catch (e) {
      setMessage('Unable to connect to the server. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function loadDashboard(authToken) {
    try {
      const [profileResult, collectionResult] = await Promise.all([
        apiRequest('/api/users/profile', { method: 'GET' }, authToken),
        apiRequest('/api/collectibles', { method: 'GET' }, authToken),
      ]);

      if (profileResult.response.status === 401 || profileResult.response.status === 403) {
        await logout();
        setMessage('Your session has expired. Please log in again.');
        return;
      }
      if (!profileResult.response.ok) throw new Error('Could not load user profile.');
      if (!collectionResult.response.ok) throw new Error('Could not load collectibles.');

      setProfile(profileResult.data);
      // Your repository returns { collectibles: [...] }, not a bare array.
      setItems(Array.isArray(collectionResult.data.collectibles)
        ? collectionResult.data.collectibles : []);
      setScreen('dashboard');
      setMessage('');
    } catch (e) {
      setMessage(e.message || 'Could not load your collection.');
      setScreen('login');
    }
  }

  async function refreshCollection() {
    setRefreshing(true);
    try {
      const { response, data } = await apiRequest('/api/collectibles', { method: 'GET' });
      if (!response.ok) throw new Error('Refresh failed.');
      setItems(Array.isArray(data.collectibles) ? data.collectibles : []);
    } catch (e) {
      setMessage('Could not refresh your collection.');
    } finally {
      setRefreshing(false);
    }
  }

  async function chooseItemImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to select a collectible image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      setNewItemImage(result.assets[0]);
    }
  }

  function resetAddForm() {
    setNewItemName('');
    setNewItemCategory('Cards');
    setNewItemDescription('');
    setNewItemImage(null);
    setDashboardMessage('');
  }

  async function addCollectible() {
    if (!newItemName.trim()) {
      Alert.alert('Missing name', 'Please enter a name for your collectible.');
      return;
    }
    if (!newItemImage?.uri) {
      Alert.alert('Image required', 'Please choose an image for your collectible.');
      return;
    }

    setAddingItem(true);
    setDashboardMessage('');
    try {
      const formData = new FormData();
      formData.append('name', newItemName.trim());
      formData.append('category', newItemCategory);
      formData.append('description', newItemDescription.trim());
      formData.append('imageFile', {
        uri: newItemImage.uri,
        name: newItemImage.fileName || `collectible-${Date.now()}.jpg`,
        type: newItemImage.mimeType || 'image/jpeg',
      });

      const { response, data } = await apiRequest('/api/collectibles', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Could not add collectible.');
      }

      setAddModalVisible(false);
      resetAddForm();
      await refreshCollection();
      setDashboardMessage('Collectible added successfully.');
    } catch (e) {
      Alert.alert('Could not add collectible', e.message || 'Please try again.');
    } finally {
      setAddingItem(false);
    }
  }

  async function deleteCollectible(item) {
    Alert.alert(
      'Delete collectible?',
      `Are you sure you want to remove "${item.name}" from your collection?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item._id);
            setDashboardMessage('');
            try {
              const { response, data } = await apiRequest(`/api/collectibles/${item._id}`, {
                method: 'DELETE',
              });
              if (!response.ok) throw new Error(data.error || 'Could not delete collectible.');
              setItems(current => current.filter(entry => entry._id !== item._id));
              setDashboardMessage('Collectible deleted.');
            } catch (e) {
              Alert.alert('Delete failed', e.message || 'Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }

  async function logout() {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setProfile(null);
    setItems([]);
    setPassword('');
    setScreen('login');
  }

  const filteredItems = useMemo(() => items.filter(item => {
    const q = search.trim().toLowerCase();
    const matchesCategory = category === 'All' || item.category === category;
    const matchesSearch = !q ||
      (item.name || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  }), [items, search, category]);

  function imageUri(item) {
    const path = item.image || item.imagePath || item.imageUrl;
    if (!path) return null;
    return path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  if (screen === 'dashboard') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor="#172554" />
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brand}>📦 MyCollection</Text>
            <Text style={styles.welcome}>
              {profile?.firstName ? `Welcome, ${profile.firstName}` : 'Your collection'}
            </Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dashboard}>
          <Text style={styles.heading}>Your Collection</Text>
          <Text style={styles.subheading}>{items.length} items in your collection</Text>
          <PrimaryButton title="+ Add to your collection" onPress={() => { resetAddForm(); setAddModalVisible(true); }} />
          {!!dashboardMessage && <Text style={styles.successMessage}>{dashboardMessage}</Text>}
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="🔍  Search your collection..."
            placeholderTextColor="#9299A5"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}>
            {CATEGORIES.map(value => (
              <TouchableOpacity key={value}
                onPress={() => setCategory(value)}
                style={[styles.filter, category === value && styles.activeFilter]}>
                <Text style={[styles.filterText, category === value && styles.activeFilterText]}>{value}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredItems}
            keyExtractor={(item, index) => item._id || String(index)}
            numColumns={2}
            columnWrapperStyle={styles.cardRow}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshCollection} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No collectibles found</Text>
                <Text style={styles.emptyText}>Try another search or category, or pull down to refresh.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                {imageUri(item) ? (
                  <Image source={{ uri: imageUri(item) }} style={styles.itemImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.itemImage, styles.imagePlaceholder]}>
                    <Text style={styles.placeholderIcon}>📦</Text>
                  </View>
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemCategory}>{item.category || 'Collectible'}</Text>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.itemDescription} numberOfLines={3}>
                    {item.description || 'No description provided.'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.deleteButton, deletingId === item._id && styles.disabled]}
                    onPress={() => deleteCollectible(item)}
                    disabled={deletingId === item._id}
                  >
                    {deletingId === item._id
                      ? <ActivityIndicator color="#B42318" size="small" />
                      : <Text style={styles.deleteButtonText}>Remove</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
        <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalCard}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Add New Item</Text>
                <Text style={styles.modalSubtitle}>Add a collectible to your MyCollection account.</Text>
                <Field label="Item Name" value={newItemName} onChangeText={setNewItemName} placeholder="e.g. Charizard 1st Edition" autoCapitalize="sentences" />
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryChoices}>
                  {ITEM_CATEGORIES.map(value => (
                    <TouchableOpacity key={value}
                      onPress={() => setNewItemCategory(value)}
                      style={[styles.categoryChoice, newItemCategory === value && styles.categoryChoiceActive]}>
                      <Text style={[styles.categoryChoiceText, newItemCategory === value && styles.categoryChoiceTextActive]}>{value}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Field label="Description" value={newItemDescription} onChangeText={setNewItemDescription} placeholder="Describe your collectible..." multiline />
                <Text style={styles.label}>Collectible Image (required)</Text>
                <TouchableOpacity style={styles.imagePickerButton} onPress={chooseItemImage}>
                  <Text style={styles.imagePickerText}>{newItemImage ? 'Choose a different image' : 'Select image from gallery'}</Text>
                </TouchableOpacity>
                {newItemImage?.uri && <Image source={{ uri: newItemImage.uri }} style={styles.previewImage} resizeMode="cover" />}
                <Text style={styles.helperText}>JPEG, PNG or WebP images up to 5 MB are supported by your backend.</Text>
                <PrimaryButton title="Save Item" onPress={addCollectible} disabled={addingItem} />
                <PrimaryButton title="Cancel" onPress={() => setAddModalVisible(false)} secondary disabled={addingItem} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  if (screen === 'loginError') {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.authPage}>
          <Text style={styles.logo}>📦 MyCollection</Text>
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>Login Failed</Text>
            <Text style={styles.bodyText}>{message || 'Login failed. Invalid username or password.'}</Text>
            <PrimaryButton title="Try Again" onPress={() => { setMessage(''); setScreen('login'); }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isRegister = screen === 'register';
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.authPage}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>📦 MyCollection</Text>
          <Text style={styles.tagline}>Everything you collect, in one spot!</Text>
          <View style={styles.featurePanel}>
            <Text style={styles.featureText}>ADD  ·  SHARE  ·  KEEP IT TOGETHER</Text>
          </View>

          <View style={styles.authCard}>
            <Text style={styles.authTitle}>{isRegister ? 'Create Account' : 'Welcome Back'}</Text>
            <Text style={styles.bodyText}>
              {isRegister ? 'Create an account to start organizing your collection.' : 'Log in to continue to your collection.'}
            </Text>

            {!!message && <Text style={styles.message}>{message}</Text>}

            {isRegister ? (
              <>
                <Field label="First Name" value={firstName} onChangeText={setFirstName} placeholder="Enter your first name" />
                <Field label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Enter your last name" />
                <Field label="Email" value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" />
                <Field label="Username" value={registerUsername} onChangeText={setRegisterUsername} placeholder="Choose a username" />
                <Field label="Password" value={registerPassword} onChangeText={setRegisterPassword} placeholder="Create a password" secureTextEntry />
                <PrimaryButton title="Sign Up" onPress={handleRegister} disabled={busy} />
                <TouchableOpacity onPress={() => { setMessage(''); setScreen('login'); }}>
                  <Text style={styles.switchText}>Already have an account? <Text style={styles.link}>Log in</Text></Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Field label="Username" value={username} onChangeText={setUsername} placeholder="Enter your username" />
                <Field label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry />
                <PrimaryButton title="Log In" onPress={handleLogin} disabled={busy} />
                <TouchableOpacity onPress={() => { setMessage(''); setScreen('register'); }}>
                  <Text style={styles.switchText}>Don't have an account? <Text style={styles.link}>Create an account</Text></Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F6FA' },
  authPage: { flex: 1, backgroundColor: '#F4F6FA' },
  authScroll: { flexGrow: 1, justifyContent: 'center', padding: 22, paddingTop: 35, paddingBottom: 40 },
  logo: { fontSize: 29, fontWeight: '800', color: '#172554', textAlign: 'center', marginBottom: 8 },
  tagline: { color: '#667085', textAlign: 'center', fontSize: 14, marginBottom: 18 },
  featurePanel: { backgroundColor: '#172554', padding: 15, borderRadius: 13, marginBottom: 18 },
  featureText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '700', letterSpacing: 1, fontSize: 12 },
  authCard: { backgroundColor: '#FFFFFF', padding: 22, borderRadius: 17, elevation: 3, shadowColor: '#172554', shadowOpacity: 0.08, shadowRadius: 12 },
  authTitle: { fontSize: 24, color: '#172554', fontWeight: '800', marginBottom: 6 },
  bodyText: { color: '#667085', fontSize: 14, lineHeight: 21, marginBottom: 18 },
  field: { marginBottom: 14 },
  label: { color: '#344054', fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 9, paddingHorizontal: 13, paddingVertical: 12, color: '#101828', fontSize: 15 },
  multilineInput: { minHeight: 85 },
  primaryButton: { backgroundColor: '#2563EB', padding: 15, borderRadius: 9, alignItems: 'center', marginTop: 5 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  secondaryButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#2563EB', padding: 14, borderRadius: 9, alignItems: 'center', marginTop: 9 },
  secondaryButtonText: { color: '#2563EB', fontWeight: '800', fontSize: 14 },
  disabled: { opacity: 0.65 },
  switchText: { textAlign: 'center', color: '#667085', marginTop: 19, fontSize: 13 },
  link: { color: '#2563EB', fontWeight: '800' },
  message: { color: '#B42318', backgroundColor: '#FEF3F2', padding: 10, borderRadius: 8, marginBottom: 14, lineHeight: 19, fontSize: 13 },
  topBar: { backgroundColor: '#172554', paddingHorizontal: 18, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  welcome: { color: '#CBD5E1', fontSize: 12, marginTop: 3 },
  logoutButton: { borderWidth: 1, borderColor: '#93C5FD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  dashboard: { flex: 1, paddingHorizontal: 15, paddingTop: 18 },
  heading: { color: '#172554', fontSize: 24, fontWeight: '800' },
  subheading: { color: '#667085', fontSize: 13, marginTop: 4, marginBottom: 15 },
  searchInput: { backgroundColor: '#FFFFFF', borderColor: '#D0D5DD', borderWidth: 1, borderRadius: 10, padding: 12, color: '#101828', marginBottom: 12 },
  filters: { gap: 8, paddingBottom: 13 },
  filter: { borderRadius: 20, backgroundColor: '#E9EDF5', paddingHorizontal: 14, paddingVertical: 9 },
  activeFilter: { backgroundColor: '#2563EB' },
  filterText: { color: '#475467', fontSize: 12, fontWeight: '700' },
  activeFilterText: { color: '#FFFFFF' },
  listContent: { paddingBottom: 25 },
  cardRow: { justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  itemCard: { width: '48.5%', backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#101828', shadowOpacity: 0.06, shadowRadius: 5 },
  itemImage: { width: '100%', height: 125, backgroundColor: '#E9EDF5' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 35 },
  itemInfo: { padding: 10 },
  itemCategory: { color: '#2563EB', fontSize: 10, fontWeight: '800', marginBottom: 5 },
  itemName: { color: '#172554', fontSize: 14, fontWeight: '800', marginBottom: 5 },
  itemDescription: { color: '#667085', fontSize: 11, lineHeight: 16 },
  deleteButton: { marginTop: 11, borderWidth: 1, borderColor: '#FDA29B', borderRadius: 7, paddingVertical: 8, alignItems: 'center' },
  deleteButtonText: { color: '#B42318', fontSize: 12, fontWeight: '800' },
  successMessage: { color: '#027A48', backgroundColor: '#ECFDF3', padding: 9, borderRadius: 8, marginBottom: 10, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(16,24,40,0.55)', justifyContent: 'center', padding: 18 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalTitle: { color: '#172554', fontSize: 22, fontWeight: '800', marginBottom: 5 },
  modalSubtitle: { color: '#667085', fontSize: 13, marginBottom: 18 },
  categoryChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 15 },
  categoryChoice: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9 },
  categoryChoiceActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  categoryChoiceText: { color: '#475467', fontSize: 12, fontWeight: '700' },
  categoryChoiceTextActive: { color: '#FFFFFF' },
  imagePickerButton: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 9, padding: 13, alignItems: 'center', marginTop: 8 },
  imagePickerText: { color: '#1D4ED8', fontWeight: '800', fontSize: 13 },
  previewImage: { width: '100%', height: 150, borderRadius: 9, marginTop: 10, backgroundColor: '#E9EDF5' },
  helperText: { color: '#667085', fontSize: 11, lineHeight: 16, marginTop: 8 },
  empty: { padding: 30, alignItems: 'center' },
  emptyTitle: { color: '#344054', fontSize: 16, fontWeight: '700', marginBottom: 5 },
  emptyText: { color: '#667085', textAlign: 'center', fontSize: 12, lineHeight: 18 },
});
