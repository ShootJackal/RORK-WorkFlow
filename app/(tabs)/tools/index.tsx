import React, { useCallback, useRef, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Animated,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MessageSquare,
  Clock,
  AlertTriangle,
  Moon,
  Sun,
  User,
  Cpu,
  Check,
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  ExternalLink,
  Database,
  Zap,
  Timer,
  Shield,
  Activity,
  FileText,
  ChevronDown,
  ClipboardList,
  Lock,
  LogOut,
  Users,
  Star,
} from "lucide-react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useTheme } from "@/providers/ThemeProvider";
import { useCollection } from "@/providers/CollectionProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminDashboardData, fetchTaskActualsData, clearAllCaches } from "@/services/googleSheets";
import { AdminDashboardData, CollectorSummary, TaskActualRow } from "@/types";
import SelectPicker from "@/components/SelectPicker";

const FONT_MONO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });
const LOGO_URI = require("@/assets/images/taskflow-logo.png");

const COMPLETED_TASK_STATUSES = new Set(["DONE", "COMPLETED", "COMPLETE", "FINISHED", "CLOSED"]);
const RECOLLECT_TASK_STATUSES = new Set(["RECOLLECT", "NEEDS_RECOLLECTION", "NEEDS_RECOLLECT", "RECOLLECTION"]);
const OPEN_TASK_STATUSES = new Set(["IN_PROGRESS", "INPROGRESS", "ACTIVE", "IP", "OPEN", "PARTIAL", "ASSIGNED", "IN_QUEUE"]);

function normalizeTaskStatus(status: string): string {
  return String(status ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

const SHEET_PAGES = [
  { id: "log", label: "Assignment Log", icon: ClipboardList, desc: "View task assignment history" },
  { id: "taskActuals", label: "Task Actuals", icon: BarChart3, desc: "Collection progress by task" },
];

const TIMER_OPTIONS = [
  { mins: 5, label: "5 min", color: "#5EBD8A" },
  { mins: 10, label: "10 min", color: "#4A6FA5" },
  { mins: 15, label: "15 min", color: "#7C3AED" },
  { mins: 20, label: "20 min", color: "#D4A843" },
  { mins: 25, label: "25 min", color: "#C47A3A" },
  { mins: 30, label: "30 min", color: "#C53030" },
  { mins: 45, label: "45 min", color: "#6B21A8" },
  { mins: 60, label: "60 min", color: "#1D4ED8" },
];

function SectionHeader({ label, icon }: { label: string; icon?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={sectionStyles.row}>
      {icon}
      <Text style={[sectionStyles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 4, paddingHorizontal: 2 },
  label: { fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: "700" as const },
});

function CompactTimer() {
  const { colors, isDark } = useTheme();
  const [selectedMinutes, setSelectedMinutes] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pickerFade = useRef(new Animated.Value(0)).current;

  const totalSeconds = selectedMinutes * 60;
  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress * 100, duration: 250, useNativeDriver: false }).start();
  }, [progress, progressAnim]);

  const start = useCallback(() => {
    if (finished) { setFinished(false); setSecondsLeft(selectedMinutes * 60); }
    setRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [finished, selectedMinutes]);

  const pause = useCallback(() => { setRunning(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }, []);

  const reset = useCallback(() => {
    setRunning(false); setFinished(false); setSecondsLeft(selectedMinutes * 60);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [selectedMinutes]);

  const selectDuration = useCallback((mins: number) => {
    setSelectedMinutes(mins);
    setSecondsLeft(mins * 60);
    setRunning(false);
    setFinished(false);
    setShowPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const togglePicker = useCallback(() => {
    if (running) return;
    const next = !showPicker;
    setShowPicker(next);
    Animated.timing(pickerFade, { toValue: next ? 1 : 0, duration: 200, useNativeDriver: false }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [running, showPicker, pickerFade]);

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            setRunning(false);
            setFinished(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else if (intervalRef.current) { clearInterval(intervalRef.current); }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, secondsLeft]);

  const activeOption = TIMER_OPTIONS.find(p => p.mins === selectedMinutes);
  const ringColor = finished ? colors.cancel : running ? (activeOption?.color ?? colors.accent) : colors.textMuted;

  return (
    <View style={[timerStyles.bar, {
      backgroundColor: colors.bgCard,
      borderColor: finished ? colors.cancel + '30' : colors.border,
      shadowColor: colors.shadow,
    }]}>
      <View style={timerStyles.topRow}>
        <Text style={[timerStyles.time, {
          color: finished ? colors.cancel : running ? colors.textPrimary : colors.textSecondary,
          fontFamily: FONT_MONO,
        }]}>
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </Text>
        {finished && <Text style={[timerStyles.doneTag, { color: colors.cancel, fontFamily: FONT_MONO }]}>DONE</Text>}

        <TouchableOpacity
          style={[timerStyles.durationBtn, {
            backgroundColor: isDark ? (activeOption?.color ?? colors.accent) + '18' : (activeOption?.color ?? colors.accent) + '10',
            borderColor: (activeOption?.color ?? colors.accent) + '40',
            opacity: running ? 0.5 : 1,
          }]}
          onPress={togglePicker}
          activeOpacity={0.7}
          disabled={running}
        >
          <Text style={[timerStyles.durationText, {
            color: activeOption?.color ?? colors.accent,
            fontFamily: FONT_MONO,
          }]}>
            {activeOption?.label ?? `${selectedMinutes}m`}
          </Text>
          <ChevronDown size={12} color={activeOption?.color ?? colors.accent} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[timerStyles.resetBtn, { backgroundColor: colors.bgInput }]}
          onPress={reset}
          activeOpacity={0.75}
        >
          <RotateCcw size={13} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[timerStyles.playBtn, {
            backgroundColor: finished ? colors.cancel : (activeOption?.color ?? colors.accent),
          }]}
          onPress={running ? pause : start}
          activeOpacity={0.85}
        >
          {running ? <Pause size={14} color={colors.white} /> : <Play size={14} color={colors.white} />}
        </TouchableOpacity>
      </View>

      {showPicker && !running && (
        <Animated.View style={[timerStyles.pickerWrap, {
          opacity: pickerFade,
          maxHeight: pickerFade.interpolate({ inputRange: [0, 1], outputRange: [0, 120] }),
        }]}>
          <View style={timerStyles.pickerGrid}>
            {TIMER_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.mins}
                style={[timerStyles.pickerChip, {
                  backgroundColor: opt.mins === selectedMinutes ? opt.color + '20' : colors.bgInput,
                  borderColor: opt.mins === selectedMinutes ? opt.color + '50' : 'transparent',
                }]}
                onPress={() => selectDuration(opt.mins)}
                activeOpacity={0.7}
              >
                <Text style={[timerStyles.pickerLabel, {
                  color: opt.mins === selectedMinutes ? opt.color : colors.textMuted,
                  fontWeight: opt.mins === selectedMinutes ? "700" as const : "400" as const,
                }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      <View style={[timerStyles.progressTrack, { backgroundColor: colors.bgInput }]}>
        <Animated.View style={[timerStyles.progressFill, {
          backgroundColor: ringColor,
          width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }]} />
      </View>
    </View>
  );
}

function AdminPasswordModal({ visible, onClose, onAuthenticate }: {
  visible: boolean;
  onClose: () => void;
  onAuthenticate: (password: string) => Promise<boolean>;
}) {
  const { colors } = useTheme();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!password.trim()) return;
    setLoading(true);
    setError(false);
    const success = await onAuthenticate(password.trim());
    setLoading(false);
    if (success) {
      setPassword("");
      onClose();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [password, onAuthenticate, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={adminModalStyles.overlay}>
        <View style={[adminModalStyles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={adminModalStyles.header}>
            <View style={[adminModalStyles.iconWrap, { backgroundColor: colors.accentSoft }]}>
              <Lock size={20} color={colors.accent} />
            </View>
            <Text style={[adminModalStyles.title, { color: colors.textPrimary }]}>Admin Access</Text>
            <Text style={[adminModalStyles.subtitle, { color: colors.textMuted }]}>Enter admin password to continue</Text>
          </View>
          <TextInput
            style={[adminModalStyles.input, {
              backgroundColor: colors.bgInput,
              borderColor: error ? colors.cancel : colors.border,
              color: colors.textPrimary,
            }]}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(false); }}
            placeholder="Enter password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            keyboardType="number-pad"
            autoFocus
            testID="admin-password-input"
          />
          {error && (
            <Text style={[adminModalStyles.errorText, { color: colors.cancel }]}>Incorrect password</Text>
          )}
          <View style={adminModalStyles.actions}>
            <TouchableOpacity
              style={[adminModalStyles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => { setPassword(""); setError(false); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[adminModalStyles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[adminModalStyles.submitBtn, { backgroundColor: colors.accent }]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[adminModalStyles.submitText, { color: colors.white }]}>Unlock</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const adminModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 340, borderRadius: 20, borderWidth: 1, padding: 24 },
  header: { alignItems: "center", marginBottom: 20 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700" as const, marginBottom: 4 },
  subtitle: { fontSize: 13, textAlign: "center" },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: "600" as const, borderWidth: 1, textAlign: "center", letterSpacing: 4 },
  errorText: { fontSize: 12, textAlign: "center", marginTop: 8, fontWeight: "500" as const },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "500" as const },
  submitBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  submitText: { fontSize: 14, fontWeight: "700" as const },
});

function AdminOverview({ colors, isAdmin }: { colors: ReturnType<typeof useTheme>["colors"]; isAdmin: boolean }) {
  const { configured } = useCollection();

  const adminQuery = useQuery<AdminDashboardData>({
    queryKey: ["adminDashboard"],
    queryFn: fetchAdminDashboardData,
    enabled: configured,
    staleTime: 60000,
    retry: 1,
  });

  const taskActualsQuery = useQuery<TaskActualRow[]>({
    queryKey: ["adminTaskActualsOverview"],
    queryFn: fetchTaskActualsData,
    enabled: configured,
    staleTime: 60000,
    retry: 1,
  });

  const data = adminQuery.data;
  const taskActuals = useMemo(() => taskActualsQuery.data ?? [], [taskActualsQuery.data]);

  const derivedCounts = useMemo(() => {
    if (taskActuals.length === 0) return null;
    let totalTasks = 0;
    let completedTasks = 0;
    let recollectTasks = 0;
    let inProgressTasks = 0;

    for (const task of taskActuals) {
      totalTasks += 1;
      const status = normalizeTaskStatus(task.status);
      const remainingHours = Number(task.remainingHours) || 0;

      if (COMPLETED_TASK_STATUSES.has(status)) {
        completedTasks += 1;
        continue;
      }
      if (RECOLLECT_TASK_STATUSES.has(status)) {
        recollectTasks += 1;
        continue;
      }
      if (OPEN_TASK_STATUSES.has(status) || remainingHours > 0) {
        inProgressTasks += 1;
      }
    }

    return { totalTasks, completedTasks, recollectTasks, inProgressTasks };
  }, [taskActuals]);

  if (adminQuery.isLoading) {
    return (
      <View style={adminStyles.loadingWrap}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[adminStyles.loadingText, { color: colors.textMuted }]}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!data) return null;

  const totalTasks = derivedCounts?.totalTasks ?? data.totalTasks;
  const completedTasks = derivedCounts?.completedTasks ?? data.completedTasks;
  const recollectTasks = derivedCounts?.recollectTasks ?? data.recollectTasks;
  const inProgressTasks = derivedCounts?.inProgressTasks ?? data.inProgressTasks;

  const items = [
    { label: "Total Tasks", value: String(totalTasks), color: colors.textPrimary, icon: <FileText size={14} color={colors.accent} /> },
    { label: "Completed", value: String(completedTasks), color: colors.complete, icon: <Check size={14} color={colors.complete} /> },
    { label: "In Progress", value: String(inProgressTasks), color: colors.accent, icon: <Activity size={14} color={colors.accent} /> },
    { label: "Recollect", value: String(recollectTasks), color: colors.cancel, icon: <AlertTriangle size={14} color={colors.cancel} /> },
  ];

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <View style={[adminStyles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <View style={adminStyles.headerRow}>
        <View style={adminStyles.headerLeft}>
          <Shield size={14} color={colors.accent} />
          <Text style={[adminStyles.headerText, { color: colors.accent }]}>SYSTEM OVERVIEW</Text>
        </View>
        <Text style={[adminStyles.rateText, { color: colors.complete }]}>{completionRate}%</Text>
      </View>

      <View style={adminStyles.grid}>
        {items.map((item, idx) => (
          <View key={idx} style={[adminStyles.gridItem, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
            <View style={adminStyles.gridItemIcon}>{item.icon}</View>
            <Text style={[adminStyles.gridValue, { color: item.color }]}>{item.value}</Text>
            <Text style={[adminStyles.gridLabel, { color: colors.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      {data.recollections && data.recollections.length > 0 && (
        <View style={[adminStyles.recollectSection, { borderTopColor: colors.border }]}>
          <Text style={[adminStyles.recollectTitle, { color: colors.cancel }]}>
            PENDING RECOLLECTIONS ({data.recollections.length})
          </Text>
          {data.recollections.slice(0, 5).map((item, idx) => (
            <Text key={idx} style={[adminStyles.recollectItem, { color: colors.textSecondary }]} numberOfLines={1}>
              {item}
            </Text>
          ))}
          {data.recollections.length > 5 && (
            <Text style={[adminStyles.recollectMore, { color: colors.textMuted }]}>
              + {data.recollections.length - 5} more
            </Text>
          )}
        </View>
      )}

      {isAdmin && data.collectorSummary && data.collectorSummary.length > 0 && (
        <View style={[adminStyles.collectorSection, { borderTopColor: colors.border }]}>
          <View style={adminStyles.collectorHeader}>
            <Users size={12} color={colors.accent} />
            <Text style={[adminStyles.collectorTitle, { color: colors.accent }]}>
              ALL COLLECTORS ({data.totalCollectors ?? data.collectorSummary.length})
            </Text>
            <Text style={[adminStyles.totalHours, { color: colors.complete }]}>
              {(data.totalHoursUploaded ?? 0).toFixed(2)}h total
            </Text>
          </View>
          {data.collectorSummary.map((c: CollectorSummary, idx: number) => (
            <View key={idx} style={[adminStyles.collectorRow, { borderBottomColor: colors.border }]}>
              <View style={adminStyles.collectorInfo}>
                <Text style={[adminStyles.collectorName, { color: colors.textPrimary }]} numberOfLines={1}>{c.name}</Text>
                <Text style={[adminStyles.collectorRig, { color: colors.textMuted }]}>{c.rig}</Text>
              </View>
              <View style={adminStyles.collectorStats}>
                <Text style={[adminStyles.collectorHours, { color: colors.accent }]}>{c.hoursUploaded.toFixed(2)}h</Text>
                {c.rating ? (
                  <View style={adminStyles.ratingRow}>
                    <Star size={9} color={colors.gold} />
                    <Text style={[adminStyles.ratingText, { color: colors.gold }]}>{c.rating}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {isAdmin && data.taskRequirements && data.taskRequirements.length > 0 && (
        <View style={[adminStyles.reqSection, { borderTopColor: colors.border }]}>
          <Text style={[adminStyles.reqTitle, { color: colors.mxOrange }]}>
            TASK REQUIREMENTS ({data.taskRequirements.length})
          </Text>
          {data.taskRequirements.slice(0, 10).map((req, idx) => (
            <View key={idx} style={[adminStyles.reqRow, { borderBottomColor: colors.border }]}>
              <Text style={[adminStyles.reqName, { color: colors.textSecondary }]} numberOfLines={1}>{req.taskName}</Text>
              <Text style={[adminStyles.reqHours, { color: colors.mxOrange }]}>{Number(req.requiredGoodHours).toFixed(2)}h req</Text>
            </View>
          ))}
          {data.taskRequirements.length > 10 && (
            <Text style={[adminStyles.recollectMore, { color: colors.textMuted }]}>
              + {data.taskRequirements.length - 10} more tasks
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const adminStyles = StyleSheet.create({
  card: {
    borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 2,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 5,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerText: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 1.2 },
  rateText: { fontSize: 16, fontWeight: "700" as const },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  gridItem: {
    flex: 1, minWidth: "44%" as unknown as number, borderRadius: 10, padding: 10, borderWidth: 1, alignItems: "center",
  },
  gridItemIcon: { marginBottom: 4 },
  gridValue: { fontSize: 18, fontWeight: "700" as const },
  gridLabel: { fontSize: 9, fontWeight: "500" as const, marginTop: 2, letterSpacing: 0.3 },
  recollectSection: { borderTopWidth: 1, marginTop: 10, paddingTop: 10 },
  recollectTitle: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 1, marginBottom: 6 },
  recollectItem: { fontSize: 11, lineHeight: 18, paddingLeft: 8 },
  recollectMore: { fontSize: 10, marginTop: 4, fontStyle: "italic" as const },
  collectorSection: { borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  collectorHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  collectorTitle: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 1, flex: 1 },
  totalHours: { fontSize: 11, fontWeight: "600" as const },
  collectorRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1 },
  collectorInfo: { flex: 1 },
  collectorName: { fontSize: 12, fontWeight: "600" as const },
  collectorRig: { fontSize: 10, marginTop: 1 },
  collectorStats: { alignItems: "flex-end" },
  collectorHours: { fontSize: 12, fontWeight: "700" as const },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 },
  ratingText: { fontSize: 9 },
  reqSection: { borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  reqTitle: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 1, marginBottom: 8 },
  reqRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1 },
  reqName: { flex: 1, fontSize: 11 },
  reqHours: { fontSize: 11, fontWeight: "600" as const },
  loadingWrap: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 12 },
});

function QuickCard({ title, subtitle, icon, iconBg, onPress, testID, colors }: {
  title: string; subtitle: string; icon: React.ReactNode; iconBg: string;
  onPress: () => void; testID: string; colors: ReturnType<typeof useTheme>["colors"];
}) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <View style={styles.quickCardWrap}>
      <TouchableOpacity
        style={[styles.quickCard, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: colors.shadow }]}
        onPress={handlePress} activeOpacity={0.85} testID={testID}
      >
        <View style={[styles.quickIcon, { backgroundColor: iconBg }]}>{icon}</View>
        <Text style={[styles.quickTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.quickSub, { color: colors.textMuted }]}>{subtitle}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ToolsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    collectors, selectedCollectorName, selectedCollector, selectedRig,
    selectCollector, setSelectedRig, configured, isAdmin, authenticateAdmin, logoutAdmin,
  } = useCollection();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const collectorOptions = useMemo(() => {
    const opts = collectors.map(c => ({ value: c.name, label: c.name }));
    opts.push({ value: "__admin__", label: "Admin" });
    return opts;
  }, [collectors]);

  const rigOptions = useMemo(() => {
    if (!selectedCollector || !selectedCollector.rigs.length) return [];
    return selectedCollector.rigs.map(r => ({ value: r, label: r }));
  }, [selectedCollector]);

  const handleSelectCollector = useCallback((name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (name === "__admin__") {
      if (isAdmin) {
        Alert.alert("Admin already unlocked", "Admin mode is already active on this device.");
        return;
      }
      // Allow the picker modal to close before opening the password modal.
      setTimeout(() => setShowAdminModal(true), 220);
      return;
    }
    selectCollector(name);
  }, [selectCollector, isAdmin]);

  const handleAdminAuth = useCallback(async (password: string) => {
    return authenticateAdmin(password);
  }, [authenticateAdmin]);

  const handleAdminLogout = useCallback(() => {
    Alert.alert("Logout Admin", "Remove admin access?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => {
        logoutAdmin();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }},
    ]);
  }, [logoutAdmin]);

  const handleSelectRig = useCallback((rig: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRig(rig);
  }, [setSelectedRig]);

  const openSlack = useCallback(() => {
    const slackDeepLink = "slack://open";
    const slackWeb = "https://slack.com/";
    if (Platform.OS === "web") { Linking.openURL(slackWeb); }
    else { Linking.canOpenURL(slackDeepLink).then(s => Linking.openURL(s ? slackDeepLink : slackWeb)).catch(() => Linking.openURL(slackWeb)); }
  }, []);

  const openHubstaff = useCallback(() => {
    const hubstaffDeepLink = "hubstaff://";
    const hubstaffWeb = "https://app.hubstaff.com/";
    if (Platform.OS === "web") { Linking.openURL(hubstaffWeb); }
    else { Linking.canOpenURL(hubstaffDeepLink).then(s => Linking.openURL(s ? hubstaffDeepLink : hubstaffWeb)).catch(() => Linking.openURL(hubstaffWeb)); }
  }, []);

  const openAirtableRigIssue = useCallback(() => {
    Linking.openURL("https://airtable.com/appvGgqeLbTxT4ld4/paghR1Qfi3cwZQtWZ/form");
  }, []);

  const openSheetPage = useCallback((sheetId: string, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/tools/sheet-viewer" as any, params: { sheetId, title: label } });
  }, []);

  const handleToggleTheme = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTheme();
  }, [toggleTheme]);

  const handleClearCache = useCallback(async () => {
    Alert.alert("Clear Cache", "Clear all locally cached data? The app will re-fetch from the server.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
        await clearAllCaches();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Done", "Cache cleared. Pull to refresh any screen.");
      }},
    ]);
  }, []);

  const cardStyle = [styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: colors.shadow }];

  return (
    <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.pageHeader, { borderBottomColor: colors.border }]}>
          <View>
            <View style={[styles.headerTag, { backgroundColor: colors.accentSoft, borderColor: colors.accentDim }]}>
              <Text style={[styles.headerTagText, { color: colors.accent }]}>SETTINGS</Text>
            </View>
            <Text style={[styles.brandText, { color: colors.accent, fontFamily: "Lexend_700Bold" }]}>Tools</Text>
            <Text style={[styles.brandSub, { color: colors.textSecondary, fontFamily: "Lexend_400Regular" }]}>Settings & Utilities</Text>
          </View>
          <View style={styles.pageHeaderRight}>
            <Image source={LOGO_URI} style={styles.headerLogo} contentFit="contain" />
            {isAdmin && (
              <View style={[styles.adminBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentDim }]}>
                <Shield size={9} color={colors.accent} />
                <Text style={[styles.adminBadgeText, { color: colors.accent, fontFamily: FONT_MONO }]}>ADMIN</Text>
              </View>
            )}
          </View>
        </View>

        <SectionHeader label="My Profile" icon={<User size={11} color={colors.textMuted} />} />

        <View style={cardStyle}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIconWrap, { backgroundColor: colors.accentSoft }]}>
              <User size={16} color={colors.accent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.textMuted }]}>Who are you?</Text>
              <SelectPicker
                label="" options={collectorOptions} selectedValue={selectedCollectorName}
                onValueChange={handleSelectCollector} placeholder="Select your name..." testID="settings-collector-picker"
              />
            </View>
          </View>

          {selectedCollectorName !== "" && (
            <>
              <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
              <View style={styles.settingRow}>
                <View style={[styles.settingIconWrap, { backgroundColor: colors.completeBg }]}>
                  <Cpu size={16} color={colors.complete} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingLabel, { color: colors.textMuted }]}>Your Rig</Text>
                  {rigOptions.length > 0 ? (
                    <SelectPicker
                      label="" options={rigOptions} selectedValue={selectedRig}
                      onValueChange={handleSelectRig} placeholder="Select your rig..." testID="rig-picker"
                    />
                  ) : (
                    <Text style={[styles.noRigText, { color: colors.textMuted }]}>No rigs assigned</Text>
                  )}
                </View>
              </View>
            </>
          )}
        </View>

        {selectedCollectorName !== "" && selectedRig !== "" && (
          <View style={[styles.profileBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentDim }]}>
            <Check size={12} color={colors.accent} />
            <Text style={[styles.profileBadgeText, { color: colors.accent }]}>
              {selectedCollectorName} · {selectedRig}
            </Text>
          </View>
        )}

        {isAdmin && (
          <TouchableOpacity
            style={[styles.adminLogoutRow, { borderColor: colors.cancel + '30' }]}
            onPress={handleAdminLogout}
            activeOpacity={0.7}
          >
            <LogOut size={14} color={colors.cancel} />
            <Text style={[styles.adminLogoutText, { color: colors.cancel }]}>Logout Admin</Text>
          </TouchableOpacity>
        )}

        <View style={styles.hiddenTimer}>
          <SectionHeader label="Collection Timer" icon={<Timer size={11} color={colors.textMuted} />} />
          <CompactTimer />
        </View>

        <View style={styles.sectionGap} />
        <View
          style={[...cardStyle, styles.themeRow]}
          testID="theme-toggle"
        >
          <View style={[styles.settingIconWrap, { backgroundColor: isDark ? "#1A1510" : colors.bgElevated }]}>
            {isDark ? <Sun size={16} color={colors.alertYellow} /> : <Moon size={16} color={colors.textSecondary} />}
          </View>
          <View style={styles.themeContent}>
            <Text style={[styles.themeLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
            <Text style={[styles.themeSub, { color: colors.textMuted }]}>
              Switch app appearance
            </Text>
          </View>
          <View style={styles.themeSwitchWrap}>
            <Switch
              value={isDark}
              onValueChange={handleToggleTheme}
              trackColor={{ false: colors.border, true: colors.accentDim }}
              thumbColor={isDark ? colors.accent : colors.white}
              ios_backgroundColor={colors.border}
            />
          </View>
        </View>

        <View style={styles.sectionGap} />
        <SectionHeader label="Quick Actions" icon={<Zap size={11} color={colors.textMuted} />} />

        <View style={styles.quickGrid}>
          <QuickCard title="Slack" subtitle="Team chat" icon={<MessageSquare size={18} color={colors.slack} />} iconBg={colors.slackBg} onPress={openSlack} testID="slack-link" colors={colors} />
          <QuickCard title="Hubstaff" subtitle="Time track" icon={<Clock size={18} color={colors.hubstaff} />} iconBg={colors.hubstaffBg} onPress={openHubstaff} testID="hubstaff-link" colors={colors} />
          <QuickCard title="Report" subtitle="Rig issue" icon={<AlertTriangle size={18} color={colors.airtable} />} iconBg={colors.airtableBg} onPress={openAirtableRigIssue} testID="airtable-link" colors={colors} />
        </View>

        {configured && (
          <>
            <View style={styles.sectionGap} />
            <SectionHeader label={isAdmin ? "Admin Dashboard" : "System Overview"} icon={<Shield size={11} color={colors.textMuted} />} />
            <AdminOverview colors={colors} isAdmin={isAdmin} />
          </>
        )}

        {configured && (
          <>
            <View style={styles.sectionGap} />
            <SectionHeader label="Data Viewer" icon={<Database size={11} color={colors.textMuted} />} />
            <View style={cardStyle}>
              {SHEET_PAGES.map((page, idx) => {
                const IconComp = page.icon;
                return (
                  <View key={page.id}>
                    {idx > 0 && <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />}
                    <TouchableOpacity
                      style={styles.sheetRow}
                      onPress={() => openSheetPage(page.id, page.label)}
                      activeOpacity={0.7}
                      testID={`sheet-${page.id}`}
                    >
                      <View style={[styles.sheetIcon, { backgroundColor: colors.sheetsBg }]}>
                        <IconComp size={15} color={colors.sheets} />
                      </View>
                      <View style={styles.sheetInfo}>
                        <Text style={[styles.sheetRowText, { color: colors.textPrimary }]}>{page.label}</Text>
                        <Text style={[styles.sheetDesc, { color: colors.textMuted }]}>{page.desc}</Text>
                      </View>
                      <ExternalLink size={13} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.sectionGap} />
        <TouchableOpacity
          style={[styles.clearCacheBtn, { borderColor: colors.border }]}
          onPress={handleClearCache}
          activeOpacity={0.7}
        >
          <RotateCcw size={13} color={colors.textMuted} />
          <Text style={[styles.clearCacheText, { color: colors.textMuted }]}>Clear Local Cache</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <AdminPasswordModal
        visible={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onAuthenticate={handleAdminAuth}
      />
    </Animated.View>
  );
}

const timerStyles = StyleSheet.create({
  bar: {
    borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 2,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 5,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  time: { fontSize: 20, fontWeight: "900" as const, letterSpacing: 1, minWidth: 62 },
  doneTag: { fontSize: 7, fontWeight: "800" as const, letterSpacing: 2 },
  durationBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1,
  },
  durationText: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.5 },
  resetBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  playBtn: { width: 34, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  pickerWrap: { marginTop: 8, overflow: "hidden" },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pickerChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
    minWidth: 60, alignItems: "center",
  },
  pickerLabel: { fontSize: 11 },
  progressTrack: { height: 2, borderRadius: 1, overflow: "hidden", marginTop: 8 },
  progressFill: { height: 2, borderRadius: 1 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 100 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1 },
  pageHeaderRight: { alignItems: "flex-end", gap: 4 },
  headerTag: {
    alignSelf: "flex-start",
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 2,
  },
  headerTagText: { fontSize: 9, fontWeight: "800" as const, letterSpacing: 1.1 },
  brandText: { fontSize: 34, fontWeight: "700" as const, letterSpacing: 0.2 },
  brandSub: { fontSize: 12, fontWeight: "500" as const, letterSpacing: 0.7, marginTop: 2, textTransform: "uppercase" },
  headerLogo: {
    width: 34, height: 34, borderRadius: 10,
    shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8,
  },
  adminBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1,
  },
  adminBadgeText: { fontSize: 8, fontWeight: "800" as const, letterSpacing: 1.2 },
  hiddenTimer: { display: "none" },
  sectionGap: { height: 20 },
  card: {
    borderRadius: 20, borderWidth: 1, overflow: "hidden", marginBottom: 2,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
  },
  settingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  settingIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 10, letterSpacing: 0.4, marginBottom: 4, textTransform: "uppercase", fontWeight: "600" as const },
  settingDivider: { height: 1, marginLeft: 60 },
  noRigText: { fontSize: 12, fontStyle: "italic" as const, paddingVertical: 4 },
  profileBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, alignSelf: "flex-start",
  },
  profileBadgeText: { fontSize: 11, fontWeight: "600" as const },
  adminLogoutRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignSelf: "flex-start",
  },
  adminLogoutText: { fontSize: 12, fontWeight: "600" as const },
  themeRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  themeContent: { flex: 1 },
  themeLabel: { fontSize: 14, fontWeight: "700" as const },
  themeSub: { fontSize: 10, marginTop: 2 },
  themeSwitchWrap: { marginLeft: 6 },
  quickGrid: { flexDirection: "row", gap: 10 },
  quickCardWrap: { flex: 1 },
  quickCard: {
    borderRadius: 18, borderWidth: 1, padding: 14, aspectRatio: 1,
    alignItems: "center", justifyContent: "center",
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 5,
  },
  quickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  quickTitle: { fontSize: 11, marginBottom: 1, textAlign: "center", fontWeight: "700" as const },
  quickSub: { fontSize: 9, textAlign: "center" },
  sheetRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  sheetDivider: { height: 1, marginLeft: 58 },
  sheetIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sheetInfo: { flex: 1 },
  sheetRowText: { fontSize: 13, fontWeight: "500" as const },
  sheetDesc: { fontSize: 10, marginTop: 2 },
  clearCacheBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  clearCacheText: { fontSize: 12, fontWeight: "500" as const },
  bottomSpacer: { height: 20 },
});
