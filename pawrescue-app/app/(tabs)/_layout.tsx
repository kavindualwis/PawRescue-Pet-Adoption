import { Tabs } from 'expo-router';
import React from 'react';
import { CustomTabBar } from '@/components/custom-tab-bar';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Pets',
        }}
      />
      <Tabs.Screen
        name="shelters"
        options={{
          title: 'Shelters',
        }}
      />
      <Tabs.Screen
        name="rescue"
        options={{
          title: 'Rescue',
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: 'Donations',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
