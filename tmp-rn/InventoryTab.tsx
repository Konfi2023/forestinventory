import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { InventoryScreen } from "./inventory/InventoryScreen";
import { TreeListView } from "./inventory/TreeListView";
import { useT } from "../../i18n";
import { loadAppData, loadOrgs, type Forest, type Member } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

type SubTab = "capture" | "list";

export default function InventoryTabScreen() {
  const t = useT();
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>("capture");
  const [forests, setForests] = useState<Forest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [orgSlug, setOrgSlug] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const orgs = await loadOrgs();
        if (orgs.length > 0) {
          setOrgSlug(orgs[0].slug);
          const data = await loadAppData(orgs[0].slug);
          setForests(data.forests);
          setMembers(data.members);
        }
      } catch { /* offline */ }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sub-tab bar */}
      <View style={styles.subTabBar}>
        <Pressable
          onPress={() => setSubTab("capture")}
          style={[styles.subTab, subTab === "capture" && styles.subTabActive]}
        >
          <FontAwesome name="plus-circle" size={14} color={subTab === "capture" ? "#10b981" : "#64748b"} />
          <Text style={[styles.subTabText, subTab === "capture" && styles.subTabTextActive]}>
            {t("subCapture")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSubTab("list")}
          style={[styles.subTab, subTab === "list" && styles.subTabActive]}
        >
          <FontAwesome name="list" size={14} color={subTab === "list" ? "#10b981" : "#64748b"} />
          <Text style={[styles.subTabText, subTab === "list" && styles.subTabTextActive]}>
            {t("subList")}
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {subTab === "capture" && (
          <InventoryScreen forests={forests} orgSlug={orgSlug} members={members} />
        )}
        {subTab === "list" && (
          <TreeListView orgSlug={orgSlug} forests={forests} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#faf9f6" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#faf9f6" },
  subTabBar: {
    flexDirection: "row", backgroundColor: "#0f172a",
    borderBottomWidth: 1, borderBottomColor: "#1e293b",
  },
  subTab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10,
  },
  subTabActive: { borderBottomWidth: 2, borderBottomColor: "#10b981" },
  subTabText: { fontSize: 12, fontWeight: "500", color: "#64748b" },
  subTabTextActive: { color: "#10b981" },
  content: { flex: 1 },
});
