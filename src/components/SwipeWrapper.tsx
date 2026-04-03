import React, { useRef } from 'react';
import { PanResponder, Animated, StyleSheet, Dimensions, View } from 'react-native';
import { COLORS } from '../constants/colors';

interface SwipeWrapperProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  canSwipeLeft?: boolean;
  canSwipeRight?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;

export const SwipeWrapper = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft = true,
  canSwipeRight = true,
}: SwipeWrapperProps) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panRef = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => {
        if (!canSwipeLeft && gs.dx < 0) return false;
        if (!canSwipeRight && gs.dx > 0) return false;
        return Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5 && Math.abs(gs.dx) > 12;
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderMove: (_, gs) => {
        if (!canSwipeLeft && gs.dx < 0) return;
        if (!canSwipeRight && gs.dx > 0) return;
        translateX.setValue(gs.dx * 0.4);
      },
      onPanResponderRelease: (_, gs) => {
        const triggered =
          gs.dx < -SWIPE_THRESHOLD || gs.vx < -0.5
            ? 'left'
            : gs.dx > SWIPE_THRESHOLD || gs.vx > 0.5
            ? 'right'
            : null;

        if (triggered === 'left' && onSwipeLeft) {
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH * 0.35,
            duration: 80,
            useNativeDriver: true,
          }).start(() => {
            onSwipeLeft();
            translateX.setValue(SCREEN_WIDTH * 0.25);
            Animated.spring(translateX, {
              toValue: 0,
              friction: 10,
              tension: 120,
              useNativeDriver: true,
            }).start();
          });
        } else if (triggered === 'right' && onSwipeRight) {
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH * 0.35,
            duration: 80,
            useNativeDriver: true,
          }).start(() => {
            onSwipeRight();
            translateX.setValue(-SCREEN_WIDTH * 0.25);
            Animated.spring(translateX, {
              toValue: 0,
              friction: 10,
              tension: 120,
              useNativeDriver: true,
            }).start();
          });
        } else {
          // 閾値未満 → 元に戻す
          Animated.spring(translateX, {
            toValue: 0,
            friction: 10,
            tension: 100,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          friction: 10,
          tension: 100,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <View style={styles.outer}>
      <Animated.View
        style={[styles.container, { transform: [{ translateX }] }]}
        {...panRef.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});
