import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { getAllPendingTrees, type PendingTree } from "../../../lib/offline-store";
import { getSpeciesLabel, getSpeciesColor } from "../../../lib/tree-species";
import { useT } from "../../../i18n";

interface Forest { id: string; name: string; }

interface Props {
  orgSlug: string;
  forests: Forest[];
}

export function TreeListView({ orgSlug, forests }: Props) {
  const t = useT();
  const [trees, setTrees] = useState<PendingTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadTrees() {
    const all = await getAllPendingTrees();
    // Sort newest first
    setTrees(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }

  useEffect(() => {
    loadTrees().finally(() => setLoading(false));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadTrees();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (trees.length === 0) {
    return (
      <View style={styles.empty}>
        <FontAwesome name="tree" size={48} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>{t("noTreesYet")}</Text>
        <Text style={styles.emptySub}>{t("noTreesDesc")}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={trees}
      keyExtractor={item => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
      contentContainerStyle={{ paddingBottom: 20 }}
      renderItem={({ item }) => {
        const speciesLabel = getSpeciesLabel(item.species);
        const speciesColor = getSpeciesColor(item.species);
        const date = new Date(item.createdAt);
        const dateStr = `${date.getDate().toString().padStart(2, "0")}.${(date.getMonth() + 1).toString().padStart(2, "0")}.${date.getFullYear()}`;
        const timeStr = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.dot, { backgroundColor: speciesColor }]} />
              <Text style={styles.cardSpecies}>{speciesLabel}</Text>
              <View style={{ flex: 1 }} />
              {item.synced ? (
                <View style={styles.syncBadge}>
                  <FontAwesome name="cloud" size={10} color="#10b981" />
                  <Text style={styles.syncText}>{t("synced")}</Text>
                </View>
              ) : (
                <View style={[styles.syncBadge, { backgroundColor: "#fef3c7" }]}>
                  <FontAwesome name="clock-o" size={10} color="#f59e0b" />
                  <Text style={[styles.syncText, { color: "#92400e" }]}>{t("pending")}</Text>
                </View>
              )}
            </View>

            <View style={styles.cardBody}>
              {item.diameter != null && (
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>{t("bhd")}</Text>
                  <Text style={styles.metricValue}>{item.diameter} cm</Text>
                </View>
              )}
              {item.height != null && (
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>{t("height")}</Text>
                  <Text style={styles.metricValue}>{item.height} m</Text>
                </View>
              )}
              {item.age != null && (
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>{t("age")}</Text>
                  <Text style={styles.metricValue}>{item.age} {t("years")}</Text>
                </View>
              )}
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>{item.forestName}</Text>
              <Text style={styles.footerDate}>{dateStr} {timeStr}</Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#faf9f6" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12, backgroundColor: "#faf9f6" },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#475569" },
  emptySub: { fontSize: 13, color: "#94a3b8", textAlign: "center" },

  card: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardSpecies: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  syncBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: "#f0fdf4",
  },
  syncText: { fontSize: 10, fontWeight: "600", color: "#10b981" },

  cardBody: {
    flexDirection: "row", gap: 16, paddingHorizontal: 14, paddingVertical: 10,
  },
  metric: { alignItems: "center" },
  metricLabel: { fontSize: 10, color: "#94a3b8", fontWeight: "500", textTransform: "uppercase" },
  metricValue: { fontSize: 15, fontWeight: "600", color: "#1e293b", marginTop: 2 },

  cardFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: "#f1f5f9",
  },
  footerText: { fontSize: 12, color: "#64748b" },
  footerDate: { fontSize: 11, color: "#94a3b8" },
});
