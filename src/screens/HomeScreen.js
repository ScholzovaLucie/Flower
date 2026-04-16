import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlants, calculatePlantHealth, needsWateringToday } from '../context/PlantContext';
import VirtualPlant from '../components/VirtualPlant';

const getHealthStatus = (health) => {
  if (health >= 85) return { emoji: '🌸', title: 'Zahrada kvete!', subtitle: 'Všechny kytky jsou šťastné', color: '#2E7D32' };
  if (health >= 65) return { emoji: '🌿', title: 'Zahrada se daří', subtitle: 'Větší část kytek je spokojená', color: '#388E3C' };
  if (health >= 45) return { emoji: '🍃', title: 'Ujde to...', subtitle: 'Některé kytky by mohly zalít', color: '#F57F17' };
  if (health >= 25) return { emoji: '🥀', title: 'Kytky strádají!', subtitle: 'Nezapomeň zalít — ještě není pozdě', color: '#E65100' };
  return { emoji: '💀', title: 'Zahrada umírá!', subtitle: 'Okamžitě zalijte kytky!', color: '#B71C1C' };
};

const formatDayName = (plant) => {
  if (plant.scheduleType === 'interval') return `každých ${plant.wateringInterval}d`;
  const DAY_NAMES = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  return (plant.wateringDays || []).map((d) => DAY_NAMES[d]).join(', ') || '—';
};

export default function HomeScreen({ navigation }) {
  const { plants, gardenHealth, waterPlant } = usePlants();

  const status = getHealthStatus(gardenHealth);

  const dueToday = useMemo(() =>
    plants.filter((p) => needsWateringToday(p)),
    [plants]
  );

  const overdue = useMemo(() =>
    plants.filter((p) => calculatePlantHealth(p) < 30 && !needsWateringToday(p)),
    [plants]
  );

  const handleWater = (plant) => {
    Alert.alert(
      '💧 Zalít kytku?',
      `Zaznamenat zalití "${plant.name}"?`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Zalit!',
          onPress: () => waterPlant(plant.id),
          style: 'default',
        },
      ]
    );
  };

  const handleWaterAll = () => {
    if (dueToday.length === 0) return;
    Alert.alert(
      '💧 Zalit vše?',
      `Zaznamenat zalití všech ${dueToday.length} kytek?`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Zalit vše!',
          onPress: () => dueToday.forEach((p) => waterPlant(p.id)),
        },
      ]
    );
  };

  const gradientColors =
    gardenHealth >= 65 ? ['#e8f5e9', '#c8e6c9', '#f1f8e9'] :
    gardenHealth >= 40 ? ['#fff8e1', '#fff3e0', '#f1f8e9'] :
    ['#fce4ec', '#fff3e0', '#f1f8e9'];

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={gradientColors} style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appTitle}>Moje Zahrada</Text>
            <Text style={styles.appEmoji}>{status.emoji}</Text>
          </View>

          {/* Virtual Plant */}
          <View style={styles.plantSection}>
            <VirtualPlant health={gardenHealth} size={220} />

            {/* Health meter */}
            <View style={styles.meterContainer}>
              <View style={styles.meterTrack}>
                <View
                  style={[
                    styles.meterFill,
                    { width: `${gardenHealth}%`, backgroundColor: status.color },
                  ]}
                />
              </View>
              <Text style={[styles.meterText, { color: status.color }]}>{gardenHealth}%</Text>
            </View>

            <Text style={[styles.statusTitle, { color: status.color }]}>{status.title}</Text>
            <Text style={styles.statusSubtitle}>{status.subtitle}</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatBox icon="flower-outline" value={plants.length} label="Kytek" color="#4CAF50" />
            <StatBox icon="alert-circle-outline" value={dueToday.length} label="Dnes zalit" color="#FF9800" />
            <StatBox icon="warning-outline" value={overdue.length} label="Nestihnuté" color="#F44336" />
          </View>

          {/* Due today section */}
          {dueToday.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>💧 Dnes zalit ({dueToday.length})</Text>
                {dueToday.length > 1 && (
                  <TouchableOpacity onPress={handleWaterAll} style={styles.waterAllBtn}>
                    <Text style={styles.waterAllText}>Vše</Text>
                    <Ionicons name="water" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>

              {dueToday.map((plant) => (
                <DueItem key={plant.id} plant={plant} onWater={() => handleWater(plant)} />
              ))}
            </View>
          )}

          {/* Empty state */}
          {plants.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyTitle}>Zatím žádné kytky</Text>
              <Text style={styles.emptySubtitle}>Přidej svou první kytku klepnutím na + níže</Text>
              <TouchableOpacity
                style={styles.addFirstBtn}
                onPress={() => navigation.navigate('Kytky', { screen: 'AddPlant' })}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addFirstText}>Přidat kytku</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* All good state */}
          {plants.length > 0 && dueToday.length === 0 && gardenHealth >= 65 && (
            <View style={styles.allGoodCard}>
              <Text style={styles.allGoodEmoji}>✅</Text>
              <Text style={styles.allGoodText}>Všechny kytky jsou v pořádku!</Text>
              <Text style={styles.allGoodSub}>Vrať se zalít až přijde čas</Text>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function StatBox({ icon, value, label, color }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DueItem({ plant, onWater }) {
  const health = calculatePlantHealth(plant);
  const isOverdue = health < 30;

  return (
    <View style={[styles.dueItem, isOverdue && styles.dueItemOverdue]}>
      <Text style={styles.dueEmoji}>🪴</Text>
      <View style={styles.dueInfo}>
        <Text style={styles.dueName}>{plant.name}</Text>
        <Text style={styles.dueMeta}>
          {isOverdue ? '⚠️ Nestihnuté!' : '💧 Dnes na řadě'}
        </Text>
      </View>
      <TouchableOpacity style={[styles.waterBtn, isOverdue && styles.waterBtnOverdue]} onPress={onWater}>
        <Ionicons name="water" size={16} color="#fff" />
        <Text style={styles.waterBtnText}>Zalit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#e8f5e9' },
  container: { flex: 1 },
  scroll: { paddingBottom: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  appTitle: { fontSize: 26, fontWeight: '800', color: '#1B5E20' },
  appEmoji: { fontSize: 28 },

  plantSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  meterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingHorizontal: 32,
    width: '100%',
  },
  meterTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#C8E6C9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 5,
  },
  meterText: { fontSize: 14, fontWeight: '700', minWidth: 36 },
  statusTitle: { fontSize: 20, fontWeight: '800', marginTop: 8 },
  statusSubtitle: { fontSize: 14, color: '#555', marginTop: 2, textAlign: 'center', paddingHorizontal: 32 },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statBox: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#78909C', fontWeight: '600' },

  section: { marginHorizontal: 16, marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1B5E20' },
  waterAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#43A047',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  waterAllText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  dueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dueItemOverdue: { borderLeftWidth: 3, borderLeftColor: '#E53935' },
  dueEmoji: { fontSize: 26, marginRight: 12 },
  dueInfo: { flex: 1 },
  dueName: { fontSize: 15, fontWeight: '700', color: '#1B5E20' },
  dueMeta: { fontSize: 12, color: '#78909C', marginTop: 2 },
  waterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#42A5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  waterBtnOverdue: { backgroundColor: '#E53935' },
  waterBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  emptyState: { alignItems: 'center', padding: 32, gap: 8 },
  emptyEmoji: { fontSize: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#2E7D32' },
  emptySubtitle: { fontSize: 14, color: '#78909C', textAlign: 'center' },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#43A047',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  addFirstText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  allGoodCard: {
    margin: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  allGoodEmoji: { fontSize: 36 },
  allGoodText: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
  allGoodSub: { fontSize: 13, color: '#558B2F' },
});
