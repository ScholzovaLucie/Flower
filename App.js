import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Platform } from 'react-native';

import { PlantProvider } from './src/context/PlantContext';
import { requestNotificationPermissions } from './src/services/notifications';

import HomeScreen from './src/screens/HomeScreen';
import PlantsScreen from './src/screens/PlantsScreen';
import AddPlantScreen from './src/screens/AddPlantScreen';
import PlantDetailScreen from './src/screens/PlantDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const PlantsStack = createNativeStackNavigator();

function PlantsStackNavigator() {
  return (
    <PlantsStack.Navigator>
      <PlantsStack.Screen
        name="PlantsList"
        component={PlantsScreen}
        options={{ headerShown: false }}
      />
      <PlantsStack.Screen
        name="PlantDetail"
        component={PlantDetailScreen}
        options={{
          headerTitle: 'Detail kytky',
          headerStyle: { backgroundColor: '#e8f5e9' },
          headerTintColor: '#2e7d32',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <PlantsStack.Screen
        name="AddPlant"
        component={AddPlantScreen}
        options={{
          headerTitle: 'Přidat kytku',
          headerStyle: { backgroundColor: '#e8f5e9' },
          headerTintColor: '#2e7d32',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </PlantsStack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <PlantProvider>
      <NavigationContainer>
        <StatusBar style="dark" backgroundColor="#e8f5e9" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Domů') iconName = focused ? 'leaf' : 'leaf-outline';
              else if (route.name === 'Kytky') iconName = focused ? 'flower' : 'flower-outline';
              else if (route.name === 'Přidat') iconName = focused ? 'add-circle' : 'add-circle-outline';
              else if (route.name === 'Nastavení') iconName = focused ? 'settings' : 'settings-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#2e7d32',
            tabBarInactiveTintColor: '#a5d6a7',
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopColor: '#c8e6c9',
              borderTopWidth: 1,
              paddingBottom: Platform.OS === 'ios' ? 4 : 6,
              paddingTop: 6,
              height: Platform.OS === 'ios' ? 80 : 60,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
            headerShown: false,
          })}
        >
          <Tab.Screen name="Domů" component={HomeScreen} />
          <Tab.Screen name="Kytky" component={PlantsStackNavigator} />
          <Tab.Screen
            name="Přidat"
            component={AddPlantScreen}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                e.preventDefault();
                navigation.navigate('Kytky', { screen: 'AddPlant' });
              },
            })}
          />
          <Tab.Screen name="Nastavení" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </PlantProvider>
  );
}
