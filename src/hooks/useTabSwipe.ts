import { useCallback } from 'react';
import { useNavigationContainerRef } from '@react-navigation/native';

const TAB_ORDER = ['Home', 'List', 'Analysis', 'Settings'];

/**
 * タブ間スワイプナビゲーションを管理するカスタムフック
 */
export function useTabSwipe() {
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

  return { navigationRef, navigateToTab };
}
