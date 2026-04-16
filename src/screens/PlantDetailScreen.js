import React, { useState, useMemo } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlants, calculatePlantHealth, getNextWateringDate } from '../context/PlantContext';
import { getPlantAdvice } from '../services/aiService';

const DAY_NAMES = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

const healthColor = (h) =>
  h >= 75 ? '#43A047' : h >= 50 ? '#8BC34A' : h >= 30 ? '#FFC107' : h >= 15 ? '#FF7043' : '#E53935';

const healthEmoji = (h) =>
  h >= 80 ? '🌸' : h >= 60 ? '🌿' : h >= 40 ? '🍃' : h >= 20 ? '🥀' : '💀';

const formatDate = (dateStr) => {
  if (!dateStr) return 'Nikdy';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return `Dnes, ${date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDays === 1) return 'Včera';
  if (diffDays < 7) return `Před ${diffDays} dny`;
  return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function PlantDetailScreen({ route, navigation }) {
  const { plantId } = route.params;
  const { plants, waterPlant, removePlant, settings } = usePlants();

  const plant = useMemo(() => plants.find((p) => p.id === plantId), [plants, plantId]);

  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);

  if (!plant) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Kytka nenalezena</Text>
      </View>
    );
  }

  const health = calculatePlantHealth(plant);
  const hColor = healthColor(health);
  const hEmoji = healthEmoji(health);
  const nextDate = getNextWateringDate(plant);

  const handleWater = () => {
    Alert.alert(
      '💧 Zalit kytku?',
      `Zaznamenat zalití "${plant.name}"?`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Zalit!',
          onPress: () => waterPlant(plant.id),
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Smazat kytku',
      `Opravdu chceš smazat "${plant.name}"? Veškerá data budou ztracena.`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: () => {
            removePlant(plant.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleAiAdvice = async () => {
    if (!plant.photoUri) {
      Alert.alert('Chybí fotka', 'Kytka nemá fotku. Uprav ji a přidej fotku.');
      return;
    }
    if (!settings.apiKey) {
      Alert.alert('Chybí API klíč', 'Nastav Anthropic API klíč v Nastavení.');
      return;
    }

    setAiLoading(true);
    setAiModalVisible(true);
    setAiAdvice('');

    try {
      const advice = await getPlantAdvice(settings.apiKey, plant.photoUri, plant.name, plant.description);
      setAiAdvice(advice);
    } catch (e) {
      setAiAdvice('Chyba: ' + (e.message || 'Nepodařilo se získat radu.'));
    } finally {
      setAiLoading(false);
    }
  };

  const scheduleText = plant.scheduleType === 'interval'
    ? `Každých ${plant.wateringInterval || 7} dní`
    : (plant.wateringDays || []).map((d) => DAY_NAMES[d]).join(', ') || 'Bez rozvrhu';

  const history = (plant.wateringHistory || []).slice().reverse().slice(0, 15);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Photo header */}
        <View style={styles.photoContainer}>
          {plant.photoUri ? (
            <Image source={{ uri: plant.photoUri }} style={styles.photo} />
          ) : (
            <LinearGradient colors={['#e8f5e9', '#c8e6c9']} style={styles.photoPlaceholder}>
              <Text style={styles.photoEmoji}>🪴</Text>
            </LinearGradient>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)']}
            style={styles.photoOverlay}
          />
          <View style={styles.photoInfo}>
            <Text style={styles.plantName}>{plant.name}</Text>
            <View style={styles.healthBadge}>
              <Text style={styles.healthBadgeEmoji}>{hEmoji}</Text>
              <Text style={[styles.healthBadgeText, { color: hColor }]}>{health}%</Text>
            </View>
          </View>
        </View>

        {/* Health bar */}
        <View style={styles.healthBar}>
          <View style={[styles.healthFill, { width: `${health}%`, backgroundColor: hColor }]} />
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.waterBtn} onPress={handleWater}>
            <Ionicons name="water" size={22} color="#fff" />
            <Text style={styles.waterBtnText}>Zalit teď!</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.aiBtn} onPress={handleAiAdvice}>
            <Ionicons name="sparkles" size={20} color="#7B1FA2" />
            <Text style={styles.aiBtnText}>AI rada</Text>
          </TouchableOpacity>
        </View>

        {/* Info cards */}
        <View style={styles.infoGrid}>
          <InfoCard icon="calendar-outline" label="Příší zalití" value={
            nextDate
              ? nextDate.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'short' })
              : '—'
          } />
          <InfoCard icon="repeat-outline" label="Rozvrh" value={scheduleText} />
          <InfoCard icon="water-outline" label="Naposledy" value={formatDate(plant.lastWatered)} />
          <InfoCard icon="stats-chart-outline" label="Celkem" value={`${(plant.wateringHistory || []).length}× zalito`} />
        </View>

        {/* Description */}
        {plant.description ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📝 Popis a péče</Text>
            <Text style={styles.descriptionText}>{plant.description}</Text>
          </View>
        ) : null}

        {/* Watering history */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💧 Historie zalévání</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyHistory}>Zatím žádné záznamy</Text>
          ) : (
            history.map((entry, i) => (
              <View key={i} style={styles.historyItem}>
                <View style={[styles.historyDot, i === 0 && styles.historyDotFirst]} />
                <View style={styles.historyInfo}>
                  <Text style={styles.historyDate}>
                    {new Date(entry.date).toLocaleDateString('cs-CZ', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                  </Text>
                  <Text style={styles.historyTime}>
                    {new Date(entry.date).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
              </View>
            ))
          )}
        </View>

        {/* Delete button */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color="#E53935" />
          <Text style={styles.deleteBtnText}>Smazat kytku</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* AI Advice Modal */}
      <Modal visible={aiModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>✨ AI Rada pro {plant.name}</Text>
            <TouchableOpacity onPress={() => setAiModalVisible(false)}>
              <Ionicons name="close" size={26} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {aiLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#7B1FA2" />
                <Text style={styles.modalLoadingText}>AI analyzuje fotku...</Text>
              </View>
            ) : (
              <Text style={styles.adviceText}>{aiAdvice}</Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <View style={styles.infoCard}>
      <Ionicons name={icon} size={20} color="#558B2F" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f8e9' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: '#666' },

  photoContainer: { height: 260, position: 'relative' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  photoEmoji: { fontSize: 80 },
  photoOverlay: { ...StyleSheet.absoluteFillObject },
  photoInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  plantName: { fontSize: 26, fontWeight: '800', color: '#fff', flex: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  healthBadgeEmoji: { fontSize: 16 },
  healthBadgeText: { fontSize: 15, fontWeight: '800' },

  healthBar: { height: 6, backgroundColor: '#E8F5E9', overflow: 'hidden' },
  healthFill: { height: '100%' },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  waterBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#42A5F5',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#42A5F5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  waterBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  aiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3E5F5',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#CE93D8',
  },
  aiBtnText: { color: '#7B1FA2', fontSize: 15, fontWeight: '700' },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  infoCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoLabel: { fontSize: 11, color: '#78909C', fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1B5E20', marginBottom: 12 },
  descriptionText: { fontSize: 14, color: '#444', lineHeight: 22 },

  emptyHistory: { fontSize: 14, color: '#B0BEC5', fontStyle: 'italic' },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F8E9',
  },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C8E6C9' },
  historyDotFirst: { backgroundColor: '#43A047' },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 13, fontWeight: '600', color: '#2E7D32' },
  historyTime: { fontSize: 11, color: '#78909C' },
  historyNote: { fontSize: 12, color: '#78909C', fontStyle: 'italic' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF5F5',
  },
  deleteBtnText: { color: '#E53935', fontWeight: '700', fontSize: 15 },

  // Modal
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E5F5',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#4A148C', flex: 1 },
  modalBody: { flex: 1, padding: 20 },
  modalLoading: { alignItems: 'center', gap: 16, paddingTop: 40 },
  modalLoadingText: { fontSize: 15, color: '#78909C' },
  adviceText: { fontSize: 15, lineHeight: 24, color: '#333' },
});
