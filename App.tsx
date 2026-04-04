import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { COLORS } from './src/constants/colors';
import { REGION_PROFILES } from './src/constants/regions';
import { useStore } from './src/storage/useStore';
import { HomeScreen } from './src/screens/HomeScreen';
import { ListScreen } from './src/screens/ListScreen';
import { AnalysisScreen } from './src/screens/AnalysisScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AddModal } from './src/components/AddModal';
import { EditModal } from './src/components/EditModal';
import { ConsumeModal } from './src/components/ConsumeModal';
import { MessageInbox } from './src/components/MessageInbox';
import { SwipeWrapper } from './src/components/SwipeWrapper';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { StockItem } from './src/types';

const Tab = createBottomTabNavigator();

const TAB_ORDER = ['Home', 'List', 'Analysis', 'Settings'];

export default function App() {
  const { items, members, regionId, isLoaded, saveItems, saveMembers, saveRegion } =
    useStore();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [consumeModalVisible, setConsumeModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [inboxVisible, setInboxVisible] = useState(false);
  const navigationRef = useNavigationContainerRef();

  const navigateToTab = useCallback(
    (direction: 'left' | 'right') => {
      const state = navigationRef.current?.getRootState();
      if (!state) return;
      const currentIndex = state.index;
      const nextIndex =
        direction === 'left'
          ? Math.min(currentIndex + 1, TAB_ORDER.length - 1)
          : Math.max(currentIndex - 1, 0);
      if (nextIndex !== currentIndex) {
        navigationRef.current?.navigate(TAB_ORDER[nextIndex] as never);
      }
    },
    [navigationRef]
  );

  if (!isLoaded) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaProvider>
    );
  }

  const region = REGION_PROFILES.find((r) => r.id === regionId);
  const regionDays = region?.days ?? 7;

  const handleAddSubmit = (
    name: string,
    sec: string,
    qty: number,
    kcal: number,
    waterL: number,
    expiry: string,
    loc: string
  ) => {
    const newItem: StockItem = {
      id: Date.now(),
      name,
      sec,
      qty,
      kcal,
      waterL,
      expiry,
      loc,
    };
    const newItems = [...items, newItem];
    saveItems(newItems);
    setAddModalVisible(false);
  };

  const handleConsume = (id: number, qty: number) => {
    const newItems = items
      .map((i) => {
        if (i.id !== id) return i;
        const newQty = i.qty - qty;
        return newQty <= 0 ? null : { ...i, qty: newQty };
      })
      .filter((i): i is StockItem => i !== null);
    saveItems(newItems);
    setConsumeModalVisible(false);
  };

  const handleEditSave = (updated: StockItem) => {
    const newItems = items.map((i) => (i.id === updated.id ? updated : i));
    saveItems(newItems);
    setEditItem(null);
  };

  const handleEditDelete = (id: number) => {
    const newItems = items.filter((i) => i.id !== id);
    saveItems(newItems);
    setEditItem(null);
  };

  const handleMembersChange = (newMembers: any[]) => {
    saveMembers(newMembers);
  };

  const handleRegionChange = (newRegionId: string) => {
    saveRegion(newRegionId);
  };

  const headerRight = () => (
    <TouchableOpacity
      onPress={() => setInboxVisible(true)}
      style={styles.mailButton}
    >
      <Text style={styles.mailIcon}>✉️</Text>
      <View style={styles.mailBadge}>
        <Text style={styles.mailBadgeText}>3</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer ref={navigationRef}>
        <Tab.Navigator
          screenOptions={{
            headerShown: true,
            tabBarActiveTintColor: COLORS.accent,
            tabBarInactiveTintColor: COLORS.textSub,
            tabBarStyle: {
              backgroundColor: COLORS.card,
              borderTopColor: COLORS.border,
              borderTopWidth: 1,
            },
            headerStyle: {
              backgroundColor: COLORS.card,
              borderBottomColor: COLORS.border,
              borderBottomWidth: 1,
            },
            headerTintColor: COLORS.text,
            headerTitleStyle: {
              fontSize: 16,
              fontWeight: '600',
            },
          }}
        >
          <Tab.Screen
            name="Home"
            options={{
              headerTitle: () => (
                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5 }}>
                    🛡️ ビチクフォリオ
                  </Text>
                  <Text style={{ fontSize: 9, color: COLORS.textSub }}>
                    {members.length}人世帯
                  </Text>
                </View>
              ),
              headerTitleAlign: 'left',
              headerRight,
              tabBarLabel: 'ホーム',
              tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
            }}
          >
            {() => (
              <SwipeWrapper
                onSwipeLeft={() => navigateToTab('left')}
                canSwipeRight={false}
              >
                <HomeScreen
                  items={items}
                  members={members}
                  regionDays={regionDays}
                  onAddPress={() => setAddModalVisible(true)}
                  onConsumePress={() => setConsumeModalVisible(true)}
                />
              </SwipeWrapper>
            )}
          </Tab.Screen>

          <Tab.Screen
            name="List"
            options={{
              title: '在庫一覧',
              headerRight,
              tabBarLabel: '一覧',
              tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text>,
            }}
          >
            {() => (
              <SwipeWrapper
                onSwipeLeft={() => navigateToTab('left')}
                onSwipeRight={() => navigateToTab('right')}
              >
                <ListScreen items={items} onConsume={handleConsume} onEdit={setEditItem} />
              </SwipeWrapper>
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Analysis"
            options={{
              title: '分析',
              headerRight,
              tabBarLabel: '分析',
              tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>,
            }}
          >
            {() => (
              <SwipeWrapper
                onSwipeLeft={() => navigateToTab('left')}
                onSwipeRight={() => navigateToTab('right')}
              >
                <AnalysisScreen
                  items={items}
                  members={members}
                  regionDays={regionDays}
                />
              </SwipeWrapper>
            )}
          </Tab.Screen>

          <Tab.Screen
            name="Settings"
            options={{
              title: '設定',
              headerRight,
              tabBarLabel: '設定',
              tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text>,
            }}
          >
            {() => (
              <SwipeWrapper
                onSwipeRight={() => navigateToTab('right')}
                canSwipeLeft={false}
              >
                <SettingsScreen
                  members={members}
                  regionId={regionId}
                  onMembersChange={handleMembersChange}
                  onRegionChange={handleRegionChange}
                />
              </SwipeWrapper>
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>

      <AddModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSubmit={handleAddSubmit}
      />

      <EditModal
        visible={!!editItem}
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={handleEditSave}
        onDelete={handleEditDelete}
      />

      <ConsumeModal
        visible={consumeModalVisible}
        items={items}
        onClose={() => setConsumeModalVisible(false)}
        onSubmit={handleConsume}
      />

      <MessageInbox
        visible={inboxVisible}
        onClose={() => setInboxVisible(false)}
      />
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  mailButton: {
    marginRight: 14,
    position: 'relative',
  },
  mailIcon: {
    fontSize: 20,
  },
  mailBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: COLORS.red,
    borderRadius: 7,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mailBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },
});
