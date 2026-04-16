import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calculatePlantHealth, getNextWateringDate } from '../context/PlantContext';

const DAY_NAMES = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

const getHealthColor = (health) => {
  if (health >= 75) return '#43A047';
  if (health >= 50) return '#8BC34A';
  if (health >= 30) return '#FFC107';
  if (health >= 15) return '#FF7043';
  return '#E53935';
};

const getHealthLabel = (health) => {
  if (health >= 80) return 'Skvělá';
  if (health >= 60) return 'Dobrá';
  if (health >= 40) return 'Ujde';
  if (health >= 20) return 'Stres';
  return 'Kritická';
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Nikdy';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Dnes';
  if (diffDays === 1) return 'Včera';
  if (diffDays < 7) return `Před ${diffDays} dny`;
  return date.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
};

const formatNextDate = (date) => {
  if (!date) return '—';
  const now = new Date();
  const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Dnes!';
  if (diffDays === 1) return 'Zítra';
  return `Za ${diffDays} dní`;
};

const getScheduleText = (plant) => {
  if (plant.scheduleType === 'interval') {
    return `Každých ${plant.wateringInterval || 7} dní`;
  }
  const days = (plant.wateringDays || []).map((d) => DAY_NAMES[d]).join(', ');
  return days || 'Bez rozvrhu';
};

export default function PlantCard({ plant, onPress, onWater }) {
  const health = calculatePlantHealth(plant);
  const healthColor = getHealthColor(health);
  const nextWatering = getNextWateringDate(plant);
  const isOverdue = health < 40;

  return (
    <TouchableOpacity style={[styles.card, isOverdue && styles.cardOverdue]} onPress={onPress} activeOpacity={0.85}>
      {/* Photo */}
      <View style={styles.photoContainer}>
        {plant.photoUri ? (
          <Image source={{ uri: plant.photoUri }} style={styles.photo} />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: healthColor + '22' }]}>
            <Text style={styles.photoEmoji}>🪴</Text>
          </View>
        )}
        {isOverdue && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>!</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{plant.name}</Text>
        <Text style={styles.schedule} numberOfLines={1}>{getScheduleText(plant)}</Text>

        <View style={styles.row}>
          <Ionicons name="water-outline" size={12} color="#78909C" />
          <Text style={styles.meta}> Nalit: {formatDate(plant.lastWatered)}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={12} color="#78909C" />
          <Text style={[styles.meta, isOverdue && styles.metaOverdue]}>
            {' '}Příště: {formatNextDate(nextWatering)}
          </Text>
        </View>
      </View>

      {/* Health + Water button */}
      <View style={styles.right}>
        {/* Health bar */}
        <View style={styles.healthContainer}>
          <View style={[styles.healthBar, { height: `${health}%`, backgroundColor: healthColor }]} />
        </View>
        <Text style={[styles.healthLabel, { color: healthColor }]}>{getHealthLabel(health)}</Text>

        {/* Water button */}
        <TouchableOpacity
          style={[styles.waterBtn, { backgroundColor: healthColor }]}
          onPress={() => onWater(plant.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="water" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardOverdue: {
    borderLeftWidth: 3,
    borderLeftColor: '#E53935',
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmoji: {
    fontSize: 32,
  },
  urgentBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
  },
  schedule: {
    fontSize: 12,
    color: '#558B2F',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: 11,
    color: '#78909C',
  },
  metaOverdue: {
    color: '#E53935',
    fontWeight: '600',
  },
  right: {
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  healthContainer: {
    width: 8,
    height: 50,
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  healthBar: {
    width: '100%',
    borderRadius: 4,
  },
  healthLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  waterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
