import React, { useState, useCallback, useEffect } from 'react';
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
import { useSubscription } from './src/hooks/useSubscription';

import { HomeScreen } from './src/screens/HomeScreen';
import { ListScreen } from './src/screens/ListScreen';
import { AnalysisScreen } from './src/screens/AnalysisScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';

import { AddModal } from './src/components/AddModal';
import { EditModal } from './src/components/EditModal';
import { ConsumeModal } from './src/components/ConsumeModal';
import { MessageInbox } from './src/components/MessageInbox';
import { PaywallModal } from './src/components/PaywallModal';
import { AdModal } from './src/components/AdModal';
import { SwipeWrapper } from './src/components/SwipeWrapper';
import { HeaderRight } from './src/components/HeaderRight';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { initAdMob } from './src/services/admob';

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
  const {
    items, members, regionId, isLoaded, isOnboarded,
    saveItems, saveMembers, saveRegion, completeOnboarding,
    uid, family, isSyncing,
    createFamily, joinFamily, leaveFamily,
  } = useStore();
  const {
    addModalVisible, setAddModalVisible,
    consumeModalVisible, setConsumeModalVisible,
    editItem, setEditItem,
    handleAddSubmit, handleConsume, handleEditSave, handleEditDelete,
  } = useItemActions(items, saveItems);
  const { navigationRef, navigateToTab } = useTabSwipe();
  const { isPremium, purchase, restore, recordAction } = useSubscription();

  // AdMob SDK 初期化（1回のみ）
  useEffect(() => {
    if (!isPremium) {
      initAdMob();
    }
  }, []);

  const [inboxVisible, setInboxVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // 広告モーダル制御
  const [adVisible, setAdVisible] = useState(false);
  const [adType, setAdType] = useState<'image' | 'video'>('image');
  // 広告が閉じた後に実行するコールバック
  const [adCallback, setAdCallback] = useState<(() => void) | null>(null);

  const openInbox = useCallback(() => setInboxVisible(true), []);
  const closeInbox = useCallback(() => setInboxVisible(false), []);
  const openPaywall = useCallback(() => setPaywallVisible(true), []);
  const closePaywall = useCallback(() => setPaywallVisible(false), []);

  // ── 広告付きアクション実行 ──
  // アクション(追加/削除/編集)後に広告を表示し、広告が閉じたらUIを更新
  const showAdAfterAction = useCallback(async (afterCallback?: () => void) => {
    const type = await recordAction();
    if (!type) {
      // プレミアム → 広告なし
      afterCallback?.();
      return;
    }
    setAdType(type);
    setAdCallback(() => () => afterCallback?.());
    setAdVisible(true);
  }, [recordAction]);

  const handleAdClose = useCallback(() => {
    setAdVisible(false);
    adCallback?.();
    setAdCallback(null);
  }, [adCallback]);

  // ── ラップされたハンドラー ──
  const handleAddPress = useCallback(() => {
    setAddModalVisible(true);
  }, [setAddModalVisible]);

  // 追加完了後に広告表示
  const handleAddSubmitWithAd = useCallback(
    async (
      name: string,
      sec: string,
      qty: number,
      kcal: number,
      waterL: number,
      expiry: string,
      loc: string,
    ) => {
      handleAddSubmit(name, sec, qty, kcal, waterL, expiry, loc);
      await showAdAfterAction();
    },
    [handleAddSubmit, showAdAfterAction],
  );

  // 編集保存後に広告表示
  const handleEditSaveWithAd = useCallback(
    async (item: any) => {
      handleEditSave(item);
      await showAdAfterAction();
    },
    [handleEditSave, showAdAfterAction],
  );

  // 削除後に広告表示
  const handleEditDeleteWithAd = useCallback(
    async (id: number) => {
      handleEditDelete(id);
      await showAdAfterAction();
    },
    [handleEditDelete, showAdAfterAction],
  );

  // 消費後に広告表示
  const handleConsumeWithAd = useCallback(
    async (id: number, qty: number) => {
      handleConsume(id, qty);
      await showAdAfterAction();
    },
    [handleConsume, showAdAfterAction],
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

  // ── 初回起動: オンボーディング画面 ──
  if (!isOnboarded) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <OnboardingScreen
            members={members}
            regionId={regionId}
            onMembersChange={saveMembers}
            onRegionChange={saveRegion}
            onComplete={completeOnboarding}
            isPremium={isPremium}
            onUpgrade={openPaywall}
            uid={uid}
            family={family}
            onCreateFamily={createFamily}
            onJoinFamily={joinFamily}
            onLinkEmail={async (email: string, password: string) => {
              const { linkEmail } = require('./src/services/authService');
              return linkEmail(email, password);
            }}
          />
          <PaywallModal
            visible={paywallVisible}
            onClose={closePaywall}
            onPurchase={purchase}
            onRestore={restore}
          />
        </SafeAreaProvider>
      </ErrorBoundary>
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
                    onAddPress={handleAddPress}
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
                    isPremium={isPremium}
                    onUpgrade={openPaywall}
                    uid={uid}
                    family={family}
                    isSyncing={isSyncing}
                    onCreateFamily={createFamily}
                    onJoinFamily={joinFamily}
                    onLeaveFamily={leaveFamily}
                  />
                </SwipeWrapper>
              )}
            </Tab.Screen>
          </Tab.Navigator>
        </NavigationContainer>

        <AddModal
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          onSubmit={handleAddSubmitWithAd}
        />
        <EditModal
          visible={!!editItem}
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={handleEditSaveWithAd}
          onDelete={handleEditDeleteWithAd}
        />
        <ConsumeModal
          visible={consumeModalVisible}
          items={items}
          onClose={() => setConsumeModalVisible(false)}
          onSubmit={handleConsumeWithAd}
        />
        <MessageInbox visible={inboxVisible} onClose={closeInbox} />
        <PaywallModal
          visible={paywallVisible}
          onClose={closePaywall}
          onPurchase={purchase}
          onRestore={restore}
        />
        <AdModal
          visible={adVisible}
          adType={adType}
          onClose={handleAdClose}
          onRemoveAds={() => { setAdVisible(false); openPaywall(); }}
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
