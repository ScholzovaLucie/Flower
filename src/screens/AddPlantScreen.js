import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { usePlants } from '../context/PlantContext';
import { identifyPlant } from '../services/aiService';

const DAY_LABELS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
// Default order: Monday first
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function AddPlantScreen({ navigation }) {
  const { addPlant, settings } = usePlants();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [scheduleType, setScheduleType] = useState('interval'); // 'interval' | 'days'
  const [wateringInterval, setWateringInterval] = useState('7');
  const [wateringDays, setWateringDays] = useState([1, 4]); // Mon + Thu by default
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickImage = async (fromCamera) => {
    const permFn = fromCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    const { status } = await permFn();
    if (status !== 'granted') {
      Alert.alert('Chyba', 'Pro výběr fotky je potřeba povolení.');
      return;
    }

    const pickFn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await pickFn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
    }
  };

  const handlePickPhoto = () => {
    Alert.alert('Fotka kytky', 'Jak chceš přidat fotku?', [
      { text: 'Fotoaparát', onPress: () => pickImage(true) },
      { text: 'Galerie', onPress: () => pickImage(false) },
      { text: 'Zrušit', style: 'cancel' },
    ]);
  };

  const handleAiIdentify = async () => {
    if (!photoUri) {
      Alert.alert('Chybí fotka', 'Nejprve přidej fotku kytky.');
      return;
    }
    if (!settings.apiKey) {
      Alert.alert('Chybí API klíč', 'Pro AI rozpoznávání přidej Anthropic API klíč v Nastavení.');
      return;
    }

    setAiLoading(true);
    try {
      const result = await identifyPlant(settings.apiKey, photoUri);
      if (result.name) setName(result.name);
      if (result.description || result.wateringTips) {
        setDescription([result.description, result.wateringTips].filter(Boolean).join('\n\n'));
      }
      if (result.wateringIntervalDays && result.wateringIntervalDays >= 1) {
        setScheduleType('interval');
        setWateringInterval(String(result.wateringIntervalDays));
      }
      Alert.alert('✨ Kytka rozpoznána!', `Identifikována jako: ${result.name}${result.species ? ` (${result.species})` : ''}`);
    } catch (e) {
      Alert.alert('AI chyba', e.message || 'Nepodařilo se rozpoznat kytku. Zkontroluj API klíč a připojení.');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleDay = (day) => {
    setWateringDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Chybí název', 'Zadej název kytky.');
      return;
    }
    if (scheduleType === 'days' && wateringDays.length === 0) {
      Alert.alert('Chybí dny', 'Vyber alespoň jeden den zalévání.');
      return;
    }

    setSaving(true);
    try {
      // Copy photo to app storage for persistence
      let savedPhotoUri = null;
      if (photoUri) {
        const filename = `plant_${Date.now()}.jpg`;
        const dest = FileSystem.documentDirectory + filename;
        await FileSystem.copyAsync({ from: photoUri, to: dest });
        savedPhotoUri = dest;
      }

      await addPlant({
        name: name.trim(),
        description: description.trim(),
        photoUri: savedPhotoUri,
        scheduleType,
        wateringInterval: parseInt(wateringInterval, 10) || 7,
        wateringDays: scheduleType === 'days' ? wateringDays.slice() : [],
      });

      navigation.goBack();
    } catch (e) {
      Alert.alert('Chyba', 'Nepodařilo se uložit kytku: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={40} color="#81C784" />
                  <Text style={styles.photoHint}>Přidat fotku</Text>
                </View>
              )}
            </TouchableOpacity>

            {photoUri && (
              <TouchableOpacity
                style={[styles.aiBtn, aiLoading && styles.aiBtnLoading]}
                onPress={handleAiIdentify}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="sparkles" size={16} color="#fff" />
                )}
                <Text style={styles.aiBtnText}>
                  {aiLoading ? 'Rozpoznávám...' : 'AI rozpoznání'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Název kytky *</Text>
            <TextInput
              style={styles.input}
              placeholder="např. Monstera, Kaktus, Fikus..."
              placeholderTextColor="#B0BEC5"
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Popis a poznámky</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Kde kytka stojí, zvláštní péče..."
              placeholderTextColor="#B0BEC5"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          {/* Schedule type */}
          <View style={styles.field}>
            <Text style={styles.label}>Rozvrh zalévání</Text>
            <View style={styles.scheduleToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, scheduleType === 'interval' && styles.toggleBtnActive]}
                onPress={() => setScheduleType('interval')}
              >
                <Ionicons name="repeat" size={16} color={scheduleType === 'interval' ? '#fff' : '#558B2F'} />
                <Text style={[styles.toggleText, scheduleType === 'interval' && styles.toggleTextActive]}>
                  Každých X dní
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, scheduleType === 'days' && styles.toggleBtnActive]}
                onPress={() => setScheduleType('days')}
              >
                <Ionicons name="calendar" size={16} color={scheduleType === 'days' ? '#fff' : '#558B2F'} />
                <Text style={[styles.toggleText, scheduleType === 'days' && styles.toggleTextActive]}>
                  Dny v týdnu
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Interval input */}
          {scheduleType === 'interval' && (
            <View style={styles.field}>
              <Text style={styles.label}>Interval (dní)</Text>
              <View style={styles.intervalRow}>
                <TouchableOpacity
                  style={styles.intervalBtn}
                  onPress={() => setWateringInterval((v) => String(Math.max(1, parseInt(v) - 1)))}
                >
                  <Ionicons name="remove" size={20} color="#2E7D32" />
                </TouchableOpacity>
                <TextInput
                  style={styles.intervalInput}
                  value={wateringInterval}
                  onChangeText={(v) => setWateringInterval(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={3}
                  textAlign="center"
                />
                <TouchableOpacity
                  style={styles.intervalBtn}
                  onPress={() => setWateringInterval((v) => String(Math.min(365, parseInt(v) + 1)))}
                >
                  <Ionicons name="add" size={20} color="#2E7D32" />
                </TouchableOpacity>
                <Text style={styles.intervalUnit}>dní</Text>
              </View>
              <Text style={styles.hint}>
                {parseInt(wateringInterval) <= 3 ? '🌊 Často zalévat' :
                 parseInt(wateringInterval) <= 7 ? '💧 Týdně' :
                 parseInt(wateringInterval) <= 14 ? '🌿 Dvakrát měsíčně' :
                 '🏜️ Méně časté zalévání'}
              </Text>
            </View>
          )}

          {/* Days selector */}
          {scheduleType === 'days' && (
            <View style={styles.field}>
              <Text style={styles.label}>Dny zalévání</Text>
              <View style={styles.daysRow}>
                {DAY_ORDER.map((day) => {
                  const active = wateringDays.includes(day);
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayBtn, active && styles.dayBtnActive]}
                      onPress={() => toggleDay(day)}
                    >
                      <Text style={[styles.dayText, active && styles.dayTextActive]}>
                        {DAY_LABELS[day]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {wateringDays.length > 0 && (
                <Text style={styles.hint}>
                  💧 {wateringDays.length}× týdně
                </Text>
              )}
            </View>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnLoading]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.saveBtnText}>Uložit kytku</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f8e9' },
  scroll: { padding: 20 },

  photoSection: { alignItems: 'center', marginBottom: 24 },
  photoButton: {
    width: 150,
    height: 150,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#A5D6A7',
    borderStyle: 'dashed',
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoHint: { fontSize: 14, color: '#81C784', fontWeight: '600' },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7B1FA2',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  aiBtnLoading: { backgroundColor: '#AB47BC' },
  aiBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#2E7D32', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#212121',
  },
  textarea: { minHeight: 100, paddingTop: 12 },

  scheduleToggle: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  toggleBtnActive: { backgroundColor: '#43A047' },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#558B2F' },
  toggleTextActive: { color: '#fff' },

  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intervalBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  intervalInput: {
    width: 70,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
  },
  intervalUnit: { fontSize: 15, color: '#558B2F', fontWeight: '600' },
  hint: { fontSize: 12, color: '#78909C', marginTop: 6 },

  daysRow: { flexDirection: 'row', gap: 6 },
  dayBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  dayBtnActive: {
    backgroundColor: '#43A047',
    borderColor: '#43A047',
  },
  dayText: { fontSize: 11, fontWeight: '700', color: '#558B2F' },
  dayTextActive: { color: '#fff' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnLoading: { backgroundColor: '#81C784' },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
