import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlants } from '../context/PlantContext';
import { cancelAllNotifications } from '../services/notifications';

export default function SettingsScreen() {
  const { settings, updateSettings, plants } = usePlants();

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [notificationHour, setNotificationHour] = useState(8);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setApiKey(settings.apiKey || '');
    setNotificationHour(settings.notificationHour ?? 8);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        apiKey: apiKey.trim(),
        notificationHour,
      });
      Alert.alert('✅ Uloženo', 'Nastavení bylo úspěšně uloženo.');
    } catch (e) {
      Alert.alert('Chyba', 'Nepodařilo se uložit nastavení.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = () => {
    Alert.alert('Smazat API klíč?', 'AI funkce přestanou fungovat.', [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Smazat', style: 'destructive', onPress: () => setApiKey('') },
    ]);
  };

  const adjustHour = (delta) => {
    setNotificationHour((h) => Math.max(6, Math.min(22, h + delta)));
  };

  const hasKey = apiKey.trim().length > 0;
  const maskedKey = hasKey
    ? (showKey ? apiKey : apiKey.slice(0, 8) + '••••••••' + apiKey.slice(-4))
    : '';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <Text style={styles.title}>Nastavení</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsCard}>
            <StatItem icon="leaf" label="Celkem kytek" value={plants.length} />
            <StatItem icon="water" label="Celkem zalití" value={plants.reduce((s, p) => s + (p.wateringHistory || []).length, 0)} />
            <StatItem icon="sparkles" label="AI klíč" value={hasKey ? '✅' : '❌'} />
          </View>

          {/* AI Key section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={20} color="#7B1FA2" />
              <Text style={styles.sectionTitle}>Anthropic API klíč</Text>
            </View>
            <Text style={styles.sectionDesc}>
              Pro AI rozpoznávání kytek a rady potřebuješ API klíč z{'\n'}
              <Text style={styles.link}>console.anthropic.com</Text>
            </Text>

            <View style={styles.keyInputRow}>
              <TextInput
                style={styles.keyInput}
                placeholder="sk-ant-..."
                placeholderTextColor="#B0BEC5"
                value={showKey ? apiKey : (hasKey ? maskedKey : '')}
                onChangeText={(v) => { if (showKey || !hasKey) setApiKey(v); }}
                secureTextEntry={!showKey && hasKey}
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => !showKey && setShowKey(true)}
              />
              {hasKey && (
                <TouchableOpacity onPress={() => setShowKey(!showKey)} style={styles.eyeBtn}>
                  <Ionicons name={showKey ? 'eye-off' : 'eye'} size={20} color="#78909C" />
                </TouchableOpacity>
              )}
            </View>

            {hasKey && (
              <View style={styles.keyStatus}>
                <Ionicons name="checkmark-circle" size={16} color="#43A047" />
                <Text style={styles.keyStatusText}>API klíč je nastaven</Text>
                <TouchableOpacity onPress={handleClearKey} style={styles.clearBtn}>
                  <Text style={styles.clearBtnText}>Smazat</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Notifications section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="notifications" size={20} color="#1565C0" />
              <Text style={styles.sectionTitle}>Notifikace</Text>
            </View>
            <Text style={styles.sectionDesc}>V kolik hodin dostávat připomínky zalévání</Text>

            <View style={styles.hourRow}>
              <TouchableOpacity style={styles.hourBtn} onPress={() => adjustHour(-1)}>
                <Ionicons name="remove" size={22} color="#1565C0" />
              </TouchableOpacity>
              <Text style={styles.hourValue}>{notificationHour}:00</Text>
              <TouchableOpacity style={styles.hourBtn} onPress={() => adjustHour(1)}>
                <Ionicons name="add" size={22} color="#1565C0" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Save button */}
          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnLoading]} onPress={handleSave} disabled={saving}>
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={styles.saveBtnText}>{saving ? 'Ukládám...' : 'Uložit nastavení'}</Text>
          </TouchableOpacity>

          {/* About */}
          <View style={styles.about}>
            <Text style={styles.aboutTitle}>🌱 Moje Zahrada</Text>
            <Text style={styles.aboutText}>Evidence zalévání kytek s AI asistencí</Text>
            <Text style={styles.aboutVersion}>Verze 1.0.0</Text>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatItem({ icon, label, value }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={18} color="#558B2F" />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f8e9' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#e8f5e9',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1B5E20' },

  statsCard: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 11, color: '#78909C', fontWeight: '600', textAlign: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#2E7D32' },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#212121' },
  sectionDesc: { fontSize: 13, color: '#78909C', marginBottom: 14, lineHeight: 20 },
  link: { color: '#1565C0', textDecorationLine: 'underline' },

  keyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingLeft: 12,
    paddingRight: 8,
  },
  keyInput: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
    paddingVertical: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  eyeBtn: { padding: 8 },
  keyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  keyStatusText: { flex: 1, fontSize: 13, color: '#43A047', fontWeight: '600' },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  clearBtnText: { fontSize: 12, color: '#E53935', fontWeight: '700' },

  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    justifyContent: 'center',
    marginTop: 8,
  },
  hourBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourValue: { fontSize: 30, fontWeight: '800', color: '#1565C0', minWidth: 80, textAlign: 'center' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnLoading: { backgroundColor: '#81C784' },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  about: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 24,
  },
  aboutTitle: { fontSize: 18, fontWeight: '700', color: '#2E7D32' },
  aboutText: { fontSize: 13, color: '#78909C' },
  aboutVersion: { fontSize: 11, color: '#B0BEC5', marginTop: 4 },
});
