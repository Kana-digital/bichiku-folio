import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { COLORS } from './src/constants/colors';
import { REGION_PROFILES } from './src/constants/regions';
import { useStore } from './src/storage/useStore';
import { useItemActions } from './src/hooks/useItemActions';
import { useTabSwipe } from './src/hooks/useTabSwipe';

import { HomeScreen } from './src/screens/HomeScreen';
import { ListScreen } from './src/screens/ListScreen';
import { AnalysisScreen } from './src/screens/AnalysisScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

import { AddModal } from './src/components/AddModal';
import { EditModal } from './src/components/EditModal';
import { ConsumeModal } from './src/components/ConsumeModal';
import { MessageInbox } from './src/components/MessageInbox';
import { SwipeWrapper } from './src/components/SwipeWrapper';
import { HeaderRight } from './src/components/HeaderRight';
import { ErrorBoundary } from './src/components/ErrorBoundary';

const Tab = createBottomTabNavigator();

const TAB_SCREEN_OPTIONS = {
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
    fontWeight: '600' as const,
  },
};

export default function App() {
  const { items, members, regionId, isLoaded, saveItems, saveMembers, saveRegion } =
    useStore();
  const {
    addModalVisible, setAddModalVisible,
    consumeModalVisible, setConsumeModalVisible,
    editItem, setEditItem,
    handleAddSubmit, handleConsume, handleEditSave, handleEditDelete,
  } = useItemActions(items, saveItems);
  const { navigationRef, navigateToTab } = useTabSwipe();
  const [inboxVisible, setInboxVisible] = useState(false);

  const openInbox = useCallback(() => setInboxVisible(true), []);
  const closeInbox = useCallback(() => setInboxVisible(false), []);

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
  const headerRight = () => <HeaderRight badgeCount={3} onPress={openInbox} />;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer ref={navigationRef}>
          <Tab.Navigator screenOptions={TAB_SCREEN_OPTIONS}>
            <Tab.Screen
              name="Home"
              options={{
                headerTitle: () => (
                  <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitleText}>🛡️ ビチクフォリオ</Text>
                    <Text style={styles.headerSubText}>{members.length}人世帯</Text>
                  </View>
                ),
                headerTitleAlign: 'left',
                headerRight,
                tabBarLabel: 'ホーム',
                tabBarIcon: () => <Text style={styles.tabIcon}>🏠</Text>,
              }}
            >
              {() => (
                <SwipeWrapper onSwipeLeft={() => navigateToTab('left')} canSwipeRight={false}>
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
                tabBarIcon: () => <Text style={styles.tabIcon}>📋</Text>,
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
                tabBarIcon: () => <Text style={styles.tabIcon}>📊</Text>,
              }}
            >
              {() => (
                <SwipeWrapper
                  onSwipeLeft={() => navigateToTab('left')}
                  onSwipeRight={() => navigateToTab('right')}
                >
                  <AnalysisScreen items={items} members={members} regionDays={regionDays} />
                </SwipeWrapper>
              )}
            </Tab.Screen>

            <Tab.Screen
              name="Settings"
              options={{
                title: '設定',
                headerRight,
                tabBarLabel: '設定',
                tabBarIcon: () => <Text style={styles.tabIcon}>⚙️</Text>,
              }}
            >
              {() => (
                <SwipeWrapper onSwipeRight={() => navigateToTab('right')} canSwipeLeft={false}>
                  <SettingsScreen
                    members={members}
                    regionId={regionId}
                    onMembersChange={saveMembers}
                    onRegionChange={saveRegion}
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
        <MessageInbox visible={inboxVisible} onClose={closeInbox} />
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
  headerTitleContainer: {
    alignItems: 'flex-start',
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  headerSubText: {
    fontSize: 9,
    color: COLORS.textSub,
  },
  tabIcon: {
    fontSize: 20,
  },
});
