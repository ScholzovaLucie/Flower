import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlants, calculatePlantHealth } from '../context/PlantContext';
import PlantCard from '../components/PlantCard';

const FILTERS = [
  { key: 'all', label: 'Vše' },
  { key: 'due', label: '💧 Dnes' },
  { key: 'overdue', label: '⚠️ Zmeškané' },
  { key: 'ok', label: '✅ V pořádku' },
];

export default function PlantsScreen({ navigation }) {
  const { plants, waterPlant, removePlant } = usePlants();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    let list = plants;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }

    if (filter === 'due') {
      list = list.filter((p) => {
        const h = calculatePlantHealth(p);
        return h < 70;
      });
    } else if (filter === 'overdue') {
      list = list.filter((p) => calculatePlantHealth(p) < 30);
    } else if (filter === 'ok') {
      list = list.filter((p) => calculatePlantHealth(p) >= 70);
    }

    return list.slice().sort((a, b) => calculatePlantHealth(a) - calculatePlantHealth(b));
  }, [plants, search, filter]);

  const handleWater = (id) => {
    const plant = plants.find((p) => p.id === id);
    if (!plant) return;
    Alert.alert(
      '💧 Zalit kytku?',
      `Zaznamenat zalití "${plant.name}"?`,
      [
        { text: 'Zrušit', style: 'cancel' },
        { text: 'Zalit!', onPress: () => waterPlant(id) },
      ]
    );
  };

  const handleDelete = (plant) => {
    Alert.alert(
      'Smazat kytku',
      `Opravdu chceš smazat "${plant.name}"? Tato akce je nevratná.`,
      [
        { text: 'Zrušit', style: 'cancel' },
        { text: 'Smazat', style: 'destructive', onPress: () => removePlant(plant.id) },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <PlantCard
      plant={item}
      onPress={() => navigation.navigate('PlantDetail', { plantId: item.id })}
      onWater={handleWater}
    />
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Moje kytky</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddPlant')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#78909C" />
        <TextInput
          style={styles.searchInput}
          placeholder="Hledat kytku..."
          placeholderTextColor="#B0BEC5"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#B0BEC5" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {plants.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>Zatím žádné kytky</Text>
          <Text style={styles.emptySubtitle}>Přidej svou první kytku!</Text>
          <TouchableOpacity
            style={styles.addFirstBtn}
            onPress={() => navigation.navigate('AddPlant')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addFirstText}>Přidat kytku</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Nic nenalezeno</Text>
          <Text style={styles.emptySubtitle}>Zkus jiný filtr nebo hledání</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f8e9' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#e8f5e9',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1B5E20' },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#43A047',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#212121',
    paddingVertical: 0,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
  },
  filterBtnActive: {
    backgroundColor: '#43A047',
  },
  filterText: { fontSize: 12, fontWeight: '600', color: '#558B2F' },
  filterTextActive: { color: '#fff' },
  list: { paddingTop: 4, paddingBottom: 20 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyEmoji: { fontSize: 56 },
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
});
