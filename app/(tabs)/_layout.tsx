import { Tabs } from "expo-router";
import { Send, Wrench, BarChart3, Radio } from "lucide-react-native";
import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/providers/ThemeProvider";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TAB_ORDER = ["live", "index", "stats", "tools"] as const;
type TabName = (typeof TAB_ORDER)[number];

const TAB_CONFIG: Record<TabName, { title: string; icon: (color: string, size: number) => React.ReactNode }> = {
  live: { title: "LIVE", icon: (color, size) => <Radio size={size} color={color} /> },
  index: { title: "Collect", icon: (color, size) => <Send size={size} color={color} /> },
  stats: { title: "Stats", icon: (color, size) => <BarChart3 size={size} color={color} /> },
  tools: { title: "Tools", icon: (color, size) => <Wrench size={size} color={color} /> },
};

function CustomTabBar({ state, navigation }: { state: any; navigation: any }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const sliderAnim = useRef(new Animated.Value(0)).current;

  const TAB_COUNT = TAB_ORDER.length;
  const ISLAND_MARGIN = 16;
  const ISLAND_WIDTH = SCREEN_WIDTH - ISLAND_MARGIN * 2;
  const TAB_WIDTH = ISLAND_WIDTH / TAB_COUNT;

  const currentIndex = state.index;

  React.useEffect(() => {
    Animated.spring(sliderAnim, {
      toValue: currentIndex * TAB_WIDTH,
      useNativeDriver: true, speed: 28, bounciness: 5,
    }).start();
  }, [currentIndex, TAB_WIDTH, sliderAnim]);

  const handlePress = useCallback(
    (tabName: string, index: number) => {
      const route = state.routes[index];
      const isFocused = state.index === index;
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate(route.name);
      }
    },
    [state, navigation]
  );

  const BOTTOM_PAD = insets.bottom > 0 ? insets.bottom : 10;
  const fadeBg = isDark ? '#0F0E13' : '#F5F3F0';

  return (
    <View style={[barStyles.outerWrap, { paddingBottom: BOTTOM_PAD }]}>
      {/* Gradient fade layers - transparent at top, solid at bottom */}
      <View style={[barStyles.fadeLayer1, { backgroundColor: fadeBg, opacity: 0 }]} pointerEvents="none" />
      <View style={[barStyles.fadeLayer2, { backgroundColor: fadeBg, opacity: 0.4 }]} pointerEvents="none" />
      <View style={[barStyles.fadeLayer3, { backgroundColor: fadeBg, opacity: 0.75 }]} pointerEvents="none" />
      <View style={[barStyles.fadeLayer4, { backgroundColor: fadeBg, opacity: 0.95 }]} pointerEvents="none" />

      <View style={[barStyles.island, {
        backgroundColor: isDark ? '#1B1A21' : '#FFFFFF',
        shadowColor: isDark ? '#A78BFA' : '#3D2B6B',
        borderColor: isDark ? '#2A2933' : '#DDD9D3',
      }]}>
        <Animated.View style={[barStyles.slider, {
          backgroundColor: colors.accent,
          width: TAB_WIDTH * 0.5,
          left: TAB_WIDTH * 0.25,
          transform: [{ translateX: sliderAnim }],
        }]} />

        {TAB_ORDER.map((tabName, index) => {
          const isFocused = state.index === index;
          const cfg = TAB_CONFIG[tabName];
          const isLive = tabName === "live";
          const iconColor = isFocused ? (isLive ? colors.complete : colors.accent) : colors.textMuted;

          return (
            <TouchableOpacity
              key={tabName}
              style={[barStyles.tab, { width: TAB_WIDTH }]}
              onPress={() => handlePress(tabName, index)}
              activeOpacity={0.7}
              testID={`tab-${tabName}`}
            >
              <View style={[barStyles.iconWrap, isFocused && {
                backgroundColor: isLive ? colors.complete + "15" : colors.accent + "12",
                borderRadius: 14,
              }]}>
                {cfg.icon(iconColor, 19)}
                {isLive && <View style={[barStyles.liveBlip, { backgroundColor: colors.complete }]} />}
              </View>
              <Text style={[barStyles.label, {
                color: iconColor,
                fontWeight: isFocused ? "600" as const : "400" as const,
                fontSize: isLive ? 8 : 9,
                letterSpacing: isLive ? 1.5 : 0.5,
                fontFamily: isFocused ? "Lexend_600SemiBold" : "Lexend_400Regular",
              }]}>{cfg.title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      initialRouteName="live"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.textMuted }}
    >
      <Tabs.Screen name="live" options={{ title: "LIVE" }} />
      <Tabs.Screen name="index" options={{ title: "Collect", headerShown: false }} />
      <Tabs.Screen name="stats" options={{ title: "Stats" }} />
      <Tabs.Screen name="tools" options={{ title: "Tools" }} />
    </Tabs>
  );
}

const barStyles = StyleSheet.create({
  outerWrap: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    alignItems: "center", paddingHorizontal: 16,
  },
  fadeLayer1: { position: "absolute", bottom: -10, left: 0, right: 0, height: 150 },
  fadeLayer2: { position: "absolute", bottom: -10, left: 0, right: 0, height: 110 },
  fadeLayer3: { position: "absolute", bottom: -10, left: 0, right: 0, height: 80 },
  fadeLayer4: { position: "absolute", bottom: -10, left: 0, right: 0, height: 55 },
  island: {
    flexDirection: "row", borderRadius: 28, borderWidth: 1, paddingVertical: 6,
    shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.15, shadowRadius: 28, elevation: 24,
    position: "relative", overflow: "hidden", width: "100%",
  },
  slider: { position: "absolute", bottom: 0, height: 2.5, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  tab: { alignItems: "center", justifyContent: "center", paddingVertical: 6, gap: 3 },
  iconWrap: { width: 40, height: 32, alignItems: "center", justifyContent: "center", position: "relative" },
  liveBlip: { position: "absolute", top: 3, right: 5, width: 5, height: 5, borderRadius: 3 },
  label: { textTransform: "uppercase" },
});
