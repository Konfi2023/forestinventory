import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, Image, Alert, FlatList, Dimensions,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import { RotaryTuner } from "../../../components/RotaryTuner";
import { TREE_SPECIES, getSpeciesLabel, getSpeciesColor } from "../../../lib/tree-species";
import { addPendingTree, getPendingTreeCount, getUnsyncedTrees, markTreeSynced, getCachedSpecies, setCachedSpecies } from "../../../lib/offline-store";
import { estimateHeight, calcCo2Storage } from "../../../lib/forest-mensuration";
import {
  saveTree as apiSaveTree, uploadTreeImage,
  searchSpecies as apiSearchSpecies, analyzeTree as apiAnalyzeTree,
  analyzeCrown as apiAnalyzeCrown,
  type Forest, type Member, type Species,
} from "../../../lib/api";
import { useT, useLocale } from "../../../i18n";

// ── Enum option lists ────────────────────────────────────────────────────────

const SOIL_CONDITIONS = [
  { id: "SANDY", tKey: "soilSandy" }, { id: "LOAMY", tKey: "soilLoamy" },
  { id: "CLAY", tKey: "soilClay" }, { id: "HUMUS", tKey: "soilHumus" },
  { id: "ROCKY", tKey: "soilRocky" }, { id: "MIXED", tKey: "soilMixed" },
];

const SOIL_MOISTURE = [
  { id: "DRY", tKey: "moistDry" }, { id: "FRESH", tKey: "moistFresh" },
  { id: "MOIST", tKey: "moistMoist" }, { id: "WET", tKey: "moistWet" },
  { id: "WATERLOGGED", tKey: "moistWaterlogged" },
];

const EXPOSITIONS = [
  { id: "N", tKey: "expN" }, { id: "NE", tKey: "expNE" }, { id: "E", tKey: "expE" },
  { id: "SE", tKey: "expSE" }, { id: "S", tKey: "expS" }, { id: "SW", tKey: "expSW" },
  { id: "W", tKey: "expW" }, { id: "NW", tKey: "expNW" }, { id: "FLAT", tKey: "expFlat" },
];

const SLOPE_CLASSES = [
  { id: "FLAT", tKey: "slopeFlat" }, { id: "MODERATE", tKey: "slopeModerate" },
  { id: "STEEP", tKey: "slopeSteep" }, { id: "VERY_STEEP", tKey: "slopeVerySteep" },
];

const SLOPE_POSITIONS = [
  { id: "SUMMIT", tKey: "positionSummit" }, { id: "UPPER_SLOPE", tKey: "positionUpperSlope" },
  { id: "MID_SLOPE", tKey: "positionMidSlope" }, { id: "LOWER_SLOPE", tKey: "positionLowerSlope" },
  { id: "VALLEY", tKey: "positionValley" },
];

const STAND_TYPES = [
  { id: "PURE_CONIFER", tKey: "standPureConifer" }, { id: "PURE_DECIDUOUS", tKey: "standPureDeciduous" },
  { id: "MIXED", tKey: "standMixed" }, { id: "EDGE", tKey: "standEdge" },
  { id: "CLEARCUT", tKey: "standClearcut" }, { id: "YOUNG_GROWTH", tKey: "standYoungGrowth" },
];

const STOCKING_DEGREES = [
  { id: "OPEN", tKey: "stockingOpen" }, { id: "SPARSE", tKey: "stockingSparse" },
  { id: "MEDIUM", tKey: "stockingMedium" }, { id: "DENSE", tKey: "stockingDense" },
  { id: "VERY_DENSE", tKey: "stockingVeryDense" },
];

const DAMAGE_TYPES = [
  { id: "BARK_BEETLE", tKey: "damageBarkBeetle" }, { id: "DROUGHT", tKey: "damageDrought" },
  { id: "STORM", tKey: "damageStorm" }, { id: "FUNGAL", tKey: "damageFungal" },
  { id: "BROWSING", tKey: "damageBrowsing" }, { id: "SNOW_BREAK", tKey: "damageSnowBreak" },
  { id: "OTHER", tKey: "damageOther" },
];

const HEALTH_OPTIONS = [
  { id: "HEALTHY", tKey: "healthHealthy", color: "#22c55e" },
  { id: "WEAKENED", tKey: "healthWeakened", color: "#f59e0b" },
  { id: "DAMAGED", tKey: "healthDamaged", color: "#ef4444" },
  { id: "DEAD", tKey: "healthDead", color: "#64748b" },
];

// ── Types ────────────────────────────────────────────────────────────────────

type Step =
  | "mode" | "camera" | "bhd" | "species" | "height" | "age"
  | "crown" | "crown-vitality" | "health" | "stand" | "soil"
  | "exposition" | "notes" | "review" | "saved";

const CAPTURE_STEPS: Step[] = [
  "camera", "bhd", "species", "height", "age", "crown", "crown-vitality",
  "health", "stand", "soil", "exposition", "notes", "review",
];

interface TreeForm {
  forestId: string; forestName: string; compartmentId: string;
  lat: number | null; lng: number | null;
  species: string; diameter: string; height: string; age: string;
  soilCondition: string; soilMoisture: string;
  exposition: string; slopeClass: string; slopePosition: string;
  standType: string; stockingDegree: string; notes: string;
}

const EMPTY_FORM: TreeForm = {
  forestId: "", forestName: "", compartmentId: "",
  lat: null, lng: null,
  species: "", diameter: "", height: "", age: "",
  soilCondition: "", soilMoisture: "", exposition: "", slopeClass: "",
  slopePosition: "", standType: "", stockingDegree: "", notes: "",
};

interface Props {
  forests: Forest[];
  orgSlug: string;
  members?: Member[];
  onCapturingChange?: (capturing: boolean) => void;
}

export function InventoryScreen({ forests, orgSlug, members = [], onCapturingChange }: Props) {
  const t = useT();
  const locale = useLocale();
  const scrollRef = useRef<ScrollView>(null);

  const [step, _setStep] = useState<Step>("mode");
  const setStep = useCallback((s: Step) => {
    _setStep(s);
    onCapturingChange?.(!["mode", "saved"].includes(s));
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [onCapturingChange]);

  const [form, setForm] = useState<TreeForm>(EMPTY_FORM);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [crownPhotoUri, setCrownPhotoUri] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isSavingTree, setIsSavingTree] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [speciesFavorites, setSpeciesFavorites] = useState<Species[]>([]);
  const [speciesResults, setSpeciesResults] = useState<Species[]>([]);
  const [selectedSpeciesLabel, setSelectedSpeciesLabel] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [aiResult, setAiResult] = useState<any>(null);
  const [crownAiStatus, setCrownAiStatus] = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [crownAiResult, setCrownAiResult] = useState<any>(null);
  const [formHealth, setFormHealth] = useState("HEALTHY");
  const [formDamageType, setFormDamageType] = useState("");
  const [formDamageSeverity, setFormDamageSeverity] = useState("");
  const [formCrownCondition, setFormCrownCondition] = useState("");
  const [forestPickerOpen, setForestPickerOpen] = useState(false);

  // ── Network + pending count ───────────────────────────────────────────────
  useEffect(() => { loadPendingCount(); }, []);
  async function loadPendingCount() { setPendingCount(await getPendingTreeCount()); }

  // ── Load species ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const cached = await getCachedSpecies();
      if (cached.length > 0) {
        setSpeciesFavorites(cached.filter((s: Species) => s.isFavorite));
        setSpeciesResults(cached);
      }
      try {
        const data = await apiSearchSpecies(orgSlug, locale);
        setSpeciesFavorites(data.favorites ?? []);
        setSpeciesResults(data.results ?? []);
        const all = [...(data.results ?? [])];
        for (const fav of (data.favorites ?? [])) {
          if (!all.find((s: Species) => s.id === fav.id)) all.push(fav);
        }
        await setCachedSpecies(all);
      } catch {}
    })();
  }, [orgSlug, locale]);

  // ── AI result -> form ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!aiResult) return;
    setForm(f => ({
      ...f,
      species: aiResult.speciesId ?? aiResult.species ?? f.species,
      height: aiResult.heightM != null ? String(aiResult.heightM) : f.height,
    }));
    if (aiResult.speciesLabel) setSelectedSpeciesLabel(aiResult.speciesLabel);
  }, [aiResult]);

  useEffect(() => {
    if (!crownAiResult) return;
    if (crownAiResult.crownCondition != null) setFormCrownCondition(String(crownAiResult.crownCondition));
    if (crownAiResult.damageSeverity != null) setFormDamageSeverity(String(crownAiResult.damageSeverity));
    if (crownAiResult.damageType) setFormDamageType(crownAiResult.damageType);
    if (crownAiResult.health) setFormHealth(crownAiResult.health);
  }, [crownAiResult]);

  // ── GPS ────────────────────────────────────────────────────────────────────
  async function captureGps() {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setGpsLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setForm(f => ({ ...f, lat: loc.coords.latitude, lng: loc.coords.longitude }));
      try {
        const { getValidToken } = await import("../../../lib/auth");
        const token = await getValidToken();
        const res = await fetch(
          `https://forest-manager.eu/api/app/locate?lat=${loc.coords.latitude}&lng=${loc.coords.longitude}&orgSlug=${orgSlug}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        const data = await res.json();
        if (data.forestId) {
          setForm(f => ({ ...f, forestId: data.forestId, forestName: data.forestName, compartmentId: data.compartmentId ?? "" }));
        }
      } catch {}
    } catch {}
    setGpsLoading(false);
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("cameraAccess"), t("cameraAccessDesc"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.75 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      captureGps();
      if (isOnline) analyzePhoto(result.assets[0].uri);
      setStep("bhd");
    }
  }

  async function takeCrownPhoto() {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.75 });
    if (!result.canceled && result.assets[0]) {
      setCrownPhotoUri(result.assets[0].uri);
      if (isOnline) analyzeCrownPhoto(result.assets[0].uri);
    }
  }

  async function analyzePhoto(uri: string) {
    setAiStatus("analyzing");
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      setAiResult(await apiAnalyzeTree(base64, "image/jpeg", locale));
      setAiStatus("done");
    } catch { setAiStatus("error"); }
  }

  async function analyzeCrownPhoto(uri: string) {
    setCrownAiStatus("analyzing");
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      setCrownAiResult(await apiAnalyzeCrown(base64, "image/jpeg", locale));
      setCrownAiStatus("done");
    } catch { setCrownAiStatus("error"); }
  }

  // ── Save tree ─────────────────────────────────────────────────────────────
  async function handleSaveTree() {
    setIsSavingTree(true);
    try {
      await addPendingTree({
        orgSlug, forestId: form.forestId, forestName: form.forestName,
        compartmentId: form.compartmentId || undefined,
        lat: form.lat ?? 0, lng: form.lng ?? 0,
        species: form.species || "OTHER",
        diameter: form.diameter ? parseFloat(form.diameter) : null,
        height: form.height ? parseFloat(form.height) : null,
        age: form.age ? parseInt(form.age) : null,
        soilCondition: form.soilCondition || null, soilMoisture: form.soilMoisture || null,
        exposition: form.exposition || null, slopeClass: form.slopeClass || null,
        slopePosition: form.slopePosition || null, standType: form.standType || null,
        stockingDegree: form.stockingDegree || null, damageType: formDamageType || null,
        damageSeverity: formDamageSeverity ? parseInt(formDamageSeverity) : null,
        crownCondition: formCrownCondition ? parseInt(formCrownCondition) : null,
        health: formHealth, notes: form.notes || null,
        photoUri, crownPhotoUri, createdAt: new Date().toISOString(),
      });
      setSavedCount(c => c + 1);
      await loadPendingCount();
      // Try immediate sync
      if (isOnline) {
        try {
          const trees = await getUnsyncedTrees();
          const last = trees[trees.length - 1];
          if (last) {
            const res = await apiSaveTree({
              forestId: last.forestId, lat: last.lat, lng: last.lng,
              species: last.species, diameter: last.diameter, height: last.height,
              age: last.age, soilCondition: last.soilCondition, soilMoisture: last.soilMoisture,
              exposition: last.exposition, slopeClass: last.slopeClass, slopePosition: last.slopePosition,
              standType: last.standType, stockingDegree: last.stockingDegree,
              damageType: last.damageType, damageSeverity: last.damageSeverity,
              crownCondition: last.crownCondition, notes: last.notes, orgSlug,
            });
            if (res.poiId) {
              if (last.photoUri) try { await uploadTreeImage(res.poiId, "trunk", last.photoUri); } catch {}
              if (last.crownPhotoUri) try { await uploadTreeImage(res.poiId, "crown", last.crownPhotoUri); } catch {}
            }
            await markTreeSynced(last.id);
            await loadPendingCount();
          }
        } catch {}
      }
      setStep("saved");
    } catch (e: any) {
      Alert.alert("Fehler", e.message || "Baum konnte nicht gespeichert werden.");
    }
    setIsSavingTree(false);
  }

  function resetForm() {
    setForm(EMPTY_FORM); setPhotoUri(null); setCrownPhotoUri(null);
    setAiStatus("idle"); setAiResult(null); setCrownAiStatus("idle"); setCrownAiResult(null);
    setFormHealth("HEALTHY"); setFormDamageType(""); setFormDamageSeverity("");
    setFormCrownCondition(""); setSelectedSpeciesLabel(""); setSpeciesSearch("");
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const stepIndex = CAPTURE_STEPS.indexOf(step);
  const progress = stepIndex >= 0 ? (stepIndex + 1) / CAPTURE_STEPS.length : 0;

  function goNext() {
    const idx = CAPTURE_STEPS.indexOf(step);
    if (idx >= 0 && idx < CAPTURE_STEPS.length - 1) setStep(CAPTURE_STEPS[idx + 1]);
  }
  function goBack() {
    const idx = CAPTURE_STEPS.indexOf(step);
    if (idx > 0) setStep(CAPTURE_STEPS[idx - 1]);
    else setStep("mode");
  }

  const filteredSpecies = speciesSearch.length > 0
    ? speciesResults.filter(s =>
        (s.label ?? "").toLowerCase().includes(speciesSearch.toLowerCase()) ||
        (s.scientificName ?? "").toLowerCase().includes(speciesSearch.toLowerCase())
      )
    : speciesResults;

  // ── Shared UI helpers ─────────────────────────────────────────────────────

  function OptionButton({ label, selected, onPress, color }: {
    label: string; selected: boolean; onPress: () => void; color?: string;
  }) {
    return (
      <Pressable onPress={onPress}
        style={[s.optBtn, selected && { backgroundColor: color ?? "#10b981", borderColor: color ?? "#10b981" }]}>
        <Text style={[s.optBtnTxt, selected && { color: "#fff" }]}>{label}</Text>
      </Pressable>
    );
  }

  function NavRow({ showSkip, onSkip }: { showSkip?: boolean; onSkip?: () => void }) {
    return (
      <View style={s.navRow}>
        <Pressable onPress={goBack} style={s.backBtn}>
          <FontAwesome name="chevron-left" size={14} color="#64748b" />
          <Text style={s.backTxt}>{t("back")}</Text>
        </Pressable>
        {showSkip && (
          <Pressable onPress={onSkip ?? goNext} style={s.skipBtn}>
            <Text style={s.skipTxt}>{t("skip")}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  function Header() {
    if (step === "mode" || step === "saved") return null;
    return (
      <View style={s.header}>
        <Pressable onPress={goBack} style={s.hBtn}><FontAwesome name="chevron-left" size={16} color="#94a3b8" /></Pressable>
        <View style={s.progBg}><View style={[s.progFill, { width: `${progress * 100}%` }]} /></View>
        <Pressable onPress={() => Alert.alert(t("cancelConfirmTitle"), t("cancelConfirmDesc"), [
          { text: t("continueCapture"), style: "cancel" },
          { text: t("cancel"), style: "destructive", onPress: () => { resetForm(); setStep("mode"); } },
        ])} style={s.hBtn}><FontAwesome name="times" size={18} color="#94a3b8" /></Pressable>
      </View>
    );
  }

  // ── Step renders ──────────────────────────────────────────────────────────

  if (step === "mode") return (
    <View style={s.modeCtr}>
      {pendingCount > 0 && (
        <View style={s.pendBanner}>
          <FontAwesome name="cloud-upload" size={14} color="#f59e0b" />
          <Text style={s.pendTxt}>{pendingCount} {t("pendingSync")}</Text>
        </View>
      )}
      <Pressable onPress={() => setForestPickerOpen(!forestPickerOpen)} style={s.fSelect}>
        <FontAwesome name="tree" size={16} color="#10b981" />
        <Text style={s.fSelTxt}>{form.forestName || t("selectForest")}</Text>
        <FontAwesome name="chevron-down" size={12} color="#94a3b8" />
      </Pressable>
      {forestPickerOpen && (
        <View style={s.fList}>
          {forests.map(f => (
            <Pressable key={f.id} onPress={() => { setForm(p => ({ ...p, forestId: f.id, forestName: f.name })); setForestPickerOpen(false); }}
              style={[s.fItem, form.forestId === f.id && s.fItemAct]}>
              <Text style={[s.fItemTxt, form.forestId === f.id && { color: "#10b981" }]}>{f.name}</Text>
              {form.forestId === f.id && <FontAwesome name="check" size={14} color="#10b981" />}
            </Pressable>
          ))}
        </View>
      )}
      <Pressable onPress={() => {
        if (!form.forestId && forests.length > 0) setForm(f => ({ ...f, forestId: forests[0].id, forestName: forests[0].name }));
        setStep("camera");
      }} style={s.startBtn}>
        <FontAwesome name="camera" size={20} color="#fff" />
        <Text style={s.startTxt}>{t("startCapture")}</Text>
      </Pressable>
      {!isOnline && (
        <View style={s.offBanner}><FontAwesome name="wifi" size={14} color="#ef4444" /><Text style={s.offTxt}>{t("offlineMode")}</Text></View>
      )}
    </View>
  );

  return (
    <View style={s.ctr}>
      <Header />
      <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.scrollC} keyboardShouldPersistTaps="handled">

        {step === "camera" && (
          <View style={s.stepCtr}>
            <Text style={s.title}>{t("takePhoto")}</Text>
            <Text style={s.sub}>{t("takePhotoDesc")}</Text>
            {photoUri ? (
              <View style={s.photoPrev}>
                <Image source={{ uri: photoUri }} style={s.photoImg} />
                {aiStatus === "analyzing" && (
                  <View style={s.aiOvl}><ActivityIndicator color="#10b981" size="small" /><Text style={s.aiTxt}>{t("aiAnalyzing")}</Text></View>
                )}
                {aiStatus === "done" && aiResult?.speciesLabel && (
                  <View style={[s.aiOvl, { backgroundColor: "rgba(16,185,129,0.9)" }]}>
                    <FontAwesome name="magic" size={14} color="#fff" />
                    <Text style={[s.aiTxt, { color: "#fff" }]}>{aiResult.speciesLabel}</Text>
                  </View>
                )}
                <Pressable onPress={takePhoto} style={s.retakeBtn}>
                  <FontAwesome name="refresh" size={14} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={takePhoto} style={s.camBtn}>
                <FontAwesome name="camera" size={48} color="#10b981" />
                <Text style={s.camTxt}>{t("openCamera")}</Text>
              </Pressable>
            )}
            {photoUri && (
              <View style={s.navRow}>
                <Pressable onPress={goBack} style={s.backBtn}><FontAwesome name="chevron-left" size={14} color="#64748b" /><Text style={s.backTxt}>{t("back")}</Text></Pressable>
                <Pressable onPress={goNext} style={s.nextBtn}><Text style={s.nextTxt}>{t("next")}</Text><FontAwesome name="chevron-right" size={14} color="#fff" /></Pressable>
              </View>
            )}
          </View>
        )}

        {step === "bhd" && (
          <View style={s.stepCtr}>
            <Text style={s.title}>{t("bhdTitle")}</Text>
            <RotaryTuner value={form.diameter ? parseFloat(form.diameter) : 30}
              onChange={(v) => setForm(f => ({ ...f, diameter: String(v) }))}
              onConfirm={goNext} min={1} max={200} step={1} unit="cm" label={t("bhd")} color="#3b82f6" />
            <NavRow showSkip onSkip={() => { setForm(f => ({ ...f, diameter: "" })); goNext(); }} />
          </View>
        )}

        {step === "species" && (
          <View style={s.stepFull}>
            <Text style={s.title}>{t("selectSpecies")}</Text>
            <TextInput style={s.searchInp} placeholder={t("searchSpecies")} placeholderTextColor="#94a3b8"
              value={speciesSearch} onChangeText={setSpeciesSearch} autoCorrect={false} />
            {speciesFavorites.length > 0 && speciesSearch.length === 0 && (
              <View style={s.favRow}>
                {speciesFavorites.slice(0, 6).map(sp => (
                  <Pressable key={sp.id} onPress={() => { setForm(f => ({ ...f, species: sp.id })); setSelectedSpeciesLabel(sp.label); goNext(); }}
                    style={[s.favChip, form.species === sp.id && { backgroundColor: sp.color || "#10b981", borderColor: sp.color || "#10b981" }]}>
                    <View style={[s.favDot, { backgroundColor: sp.color || "#10b981" }]} />
                    <Text style={[s.favChipTxt, form.species === sp.id && { color: "#fff" }]}>{sp.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            <FlatList data={filteredSpecies.length > 0 ? filteredSpecies : TREE_SPECIES.filter(sp => !speciesSearch || sp.label.toLowerCase().includes(speciesSearch.toLowerCase()))}
              keyExtractor={sp => sp.id} style={s.spList}
              renderItem={({ item: sp }) => (
                <Pressable onPress={() => { setForm(f => ({ ...f, species: sp.id })); setSelectedSpeciesLabel(sp.label); goNext(); }}
                  style={[s.spItem, form.species === sp.id && s.spItemAct]}>
                  <View style={[s.spDot, { backgroundColor: sp.color || "#10b981" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.spLabel}>{sp.label}</Text>
                    {"scientificName" in sp && sp.scientificName ? <Text style={s.spSci}>{(sp as any).scientificName}</Text> : null}
                  </View>
                  {form.species === sp.id && <FontAwesome name="check" size={14} color="#10b981" />}
                </Pressable>
              )} />
            <NavRow showSkip />
          </View>
        )}

        {step === "height" && (
          <View style={s.stepCtr}>
            <Text style={s.title}>{t("heightTitle")}</Text>
            <RotaryTuner
              value={form.height ? parseFloat(form.height) : (form.diameter && form.species ? estimateHeight(form.species, parseFloat(form.diameter)) ?? 15 : 15)}
              onChange={(v) => setForm(f => ({ ...f, height: String(v) }))}
              onConfirm={goNext} min={1} max={60} step={0.5} unit="m" label={t("height")} color="#22c55e" decimals={1} />
            <NavRow showSkip onSkip={() => { setForm(f => ({ ...f, height: "" })); goNext(); }} />
          </View>
        )}

        {step === "age" && (
          <View style={s.stepCtr}>
            <Text style={s.title}>{t("ageTitle")}</Text>
            <RotaryTuner value={form.age ? parseInt(form.age) : 50}
              onChange={(v) => setForm(f => ({ ...f, age: String(v) }))}
              onConfirm={goNext} min={1} max={500} step={5} unit={t("years")} label={t("age")} color="#f59e0b" />
            <NavRow showSkip onSkip={() => { setForm(f => ({ ...f, age: "" })); goNext(); }} />
          </View>
        )}

        {step === "crown" && (
          <View style={s.stepCtr}>
            <Text style={s.title}>{t("crownPhoto")}</Text>
            <Text style={s.sub}>{t("crownPhotoDesc")}</Text>
            {crownPhotoUri ? (
              <View style={s.photoPrev}>
                <Image source={{ uri: crownPhotoUri }} style={s.photoImg} />
                {crownAiStatus === "analyzing" && (
                  <View style={s.aiOvl}><ActivityIndicator color="#10b981" size="small" /><Text style={s.aiTxt}>{t("aiAnalyzing")}</Text></View>
                )}
                <Pressable onPress={takeCrownPhoto} style={s.retakeBtn}><FontAwesome name="refresh" size={14} color="#fff" /></Pressable>
              </View>
            ) : (
              <Pressable onPress={takeCrownPhoto} style={s.camBtn}>
                <FontAwesome name="leaf" size={40} color="#22c55e" />
                <Text style={s.camTxt}>{t("takeCrownPhoto")}</Text>
              </Pressable>
            )}
            <View style={s.navRow}>
              <Pressable onPress={goBack} style={s.backBtn}><FontAwesome name="chevron-left" size={14} color="#64748b" /><Text style={s.backTxt}>{t("back")}</Text></Pressable>
              <Pressable onPress={goNext} style={s.nextBtn}><Text style={s.nextTxt}>{crownPhotoUri ? t("next") : t("skip")}</Text><FontAwesome name="chevron-right" size={14} color="#fff" /></Pressable>
            </View>
          </View>
        )}

        {step === "crown-vitality" && (
          <View style={s.stepCtr}>
            <Text style={s.title}>{t("crownVitality")}</Text>
            <RotaryTuner value={formCrownCondition ? parseInt(formCrownCondition) : 80}
              onChange={(v) => setFormCrownCondition(String(v))}
              onConfirm={goNext} min={0} max={100} step={5} unit="%" label={t("crownCondition")} color="#22c55e" />
            <NavRow showSkip onSkip={() => { setFormCrownCondition(""); goNext(); }} />
          </View>
        )}

        {step === "health" && (
          <View style={s.stepCtr}>
            <Text style={s.title}>{t("healthTitle")}</Text>
            <View style={s.optGrid}>
              {HEALTH_OPTIONS.map(h => (
                <OptionButton key={h.id} label={t(h.tKey)} selected={formHealth === h.id}
                  onPress={() => { setFormHealth(h.id); goNext(); }} color={h.color} />
              ))}
            </View>
            <NavRow />
          </View>
        )}

        {step === "stand" && (
          <View style={s.stepCtr}>
            <Text style={s.title}>{t("standTitle")}</Text>
            <Text style={s.secLabel}>{t("standType")}</Text>
            <View style={s.optGrid}>
              {STAND_TYPES.map(o => <OptionButton key={o.id} label={t(o.tKey)} selected={form.standType === o.id} onPress={() => setForm(f => ({ ...f, standType: o.id }))} />)}
            </View>
            <Text style={[s.secLabel, { marginTop: 16 }]}>{t("stockingDegree")}</Text>
            <View style={s.optGrid}>
              {STOCKING_DEGREES.map(o => <OptionButton key={o.id} label={t(o.tKey)} selected={form.stockingDegree === o.id} onPress={() => { setForm(f => ({ ...f, stockingDegree: o.id })); goNext(); }} />)}
            </View>
            <NavRow showSkip />
          </View>
        )}

        {step === "soil" && (
          <View style={s.stepCtr}>
            <Text style={s.title}>{t("soilTitle")}</Text>
            <Text style={s.secLabel}>{t("soilCondition")}</Text>
            <View style={s.optGrid}>
              {SOIL_CONDITIONS.map(o => <OptionButton key={o.id} label={t(o.tKey)} selected={form.soilCondition === o.id} onPress={() => setForm(f => ({ ...f, soilCondition: o.id }))} />)}
            </View>
            <Text style={[s.secLabel, { marginTop: 16 }]}>{t("soilMoisture")}</Text>
            <View style={s.optGrid}>
              {SOIL_MOISTURE.map(o => <OptionButton key={o.id} label={t(o.tKey)} selected={form.soilMoisture === o.id} onPress={() => { setForm(f => ({ ...f, soilMoisture: o.id })); goNext(); }} />)}
            </View>
            <NavRow showSkip />
          </View>
        )}

        {step === "exposition" && (
          <View style={s.stepCtr}>
            <Text style={s.title}>{t("expositionTitle")}</Text>
            <Text style={s.secLabel}>{t("exposition")}</Text>
            <View style={s.optGrid}>
              {EXPOSITIONS.map(o => <OptionButton key={o.id} label={t(o.tKey)} selected={form.exposition === o.id} onPress={() => setForm(f => ({ ...f, exposition: o.id }))} />)}
            </View>
            <Text style={[s.secLabel, { marginTop: 16 }]}>{t("slopeClass")}</Text>
            <View style={s.optGrid}>
              {SLOPE_CLASSES.map(o => <OptionButton key={o.id} label={t(o.tKey)} selected={form.slopeClass === o.id} onPress={() => setForm(f => ({ ...f, slopeClass: o.id }))} />)}
            </View>
            <Text style={[s.secLabel, { marginTop: 16 }]}>{t("slopePosition")}</Text>
            <View style={s.optGrid}>
              {SLOPE_POSITIONS.map(o => <OptionButton key={o.id} label={t(o.tKey)} selected={form.slopePosition === o.id} onPress={() => { setForm(f => ({ ...f, slopePosition: o.id })); goNext(); }} />)}
            </View>
            <NavRow showSkip />
          </View>
        )}

        {step === "notes" && (
          <View style={s.stepCtr}>
            <Text style={s.title}>{t("notesTitle")}</Text>
            <TextInput style={s.notesInp} multiline numberOfLines={4} placeholder={t("notesPlaceholder")}
              placeholderTextColor="#94a3b8" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} textAlignVertical="top" />
            <View style={s.navRow}>
              <Pressable onPress={goBack} style={s.backBtn}><FontAwesome name="chevron-left" size={14} color="#64748b" /><Text style={s.backTxt}>{t("back")}</Text></Pressable>
              <Pressable onPress={goNext} style={s.nextBtn}><Text style={s.nextTxt}>{t("next")}</Text><FontAwesome name="chevron-right" size={14} color="#fff" /></Pressable>
            </View>
          </View>
        )}

        {step === "review" && (
          <View style={{ padding: 16 }}>
            <Text style={s.title}>{t("reviewTitle")}</Text>
            {photoUri && <Image source={{ uri: photoUri }} style={s.revPhoto} />}
            <View style={s.revCard}>
              <RR label={t("species")} value={selectedSpeciesLabel || getSpeciesLabel(form.species)} />
              <RR label={t("bhd")} value={form.diameter ? `${form.diameter} cm` : "—"} />
              <RR label={t("height")} value={form.height ? `${form.height} m` : "—"} />
              <RR label={t("age")} value={form.age ? `${form.age} ${t("years")}` : "—"} />
              <RR label={t("health")} value={t(HEALTH_OPTIONS.find(h => h.id === formHealth)?.tKey ?? "healthHealthy")} />
              <RR label={t("forest")} value={form.forestName || "—"} />
              <RR label="GPS" value={form.lat ? `${form.lat.toFixed(5)}, ${form.lng?.toFixed(5)}` : "—"} />
              {form.diameter && form.height && form.species && (
                <RR label="CO₂" value={`${calcCo2Storage(form.species, parseFloat(form.diameter), parseFloat(form.height))} kg`} />
              )}
            </View>
            <Pressable onPress={handleSaveTree} disabled={isSavingTree} style={[s.saveBtn, isSavingTree && { opacity: 0.5 }]}>
              {isSavingTree ? <ActivityIndicator color="#fff" /> : <><FontAwesome name="check" size={18} color="#fff" /><Text style={s.saveTxt}>{t("saveTree")}</Text></>}
            </Pressable>
            <Pressable onPress={goBack} style={[s.backBtn, { alignSelf: "center", marginTop: 12 }]}>
              <FontAwesome name="chevron-left" size={14} color="#64748b" /><Text style={s.backTxt}>{t("back")}</Text>
            </Pressable>
          </View>
        )}

        {step === "saved" && (
          <View style={s.savedCtr}>
            <View style={s.savedCircle}><FontAwesome name="check" size={40} color="#22c55e" /></View>
            <Text style={s.savedTitle}>{t("treeSaved")}</Text>
            <Text style={s.savedSub}>{isOnline ? t("syncedToServer") : t("savedOffline")}</Text>
            <Text style={s.savedCnt}>{savedCount} {t("treesCaptured")}</Text>
            <View style={s.savedActs}>
              <Pressable onPress={() => { resetForm(); setStep("camera"); }} style={s.nxtTreeBtn}>
                <FontAwesome name="plus" size={16} color="#fff" /><Text style={s.nxtTreeTxt}>{t("nextTree")}</Text>
              </Pressable>
              <Pressable onPress={() => { resetForm(); setStep("mode"); }} style={s.doneBtn}>
                <Text style={s.doneTxt}>{t("done")}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function RR({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.revRow}>
      <Text style={s.revLabel}>{label}</Text>
      <Text style={s.revValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  ctr: { flex: 1, backgroundColor: "#faf9f6" },
  scroll: { flex: 1 },
  scrollC: { flexGrow: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  hBtn: { padding: 8 },
  progBg: { flex: 1, height: 4, backgroundColor: "#e2e8f0", borderRadius: 2, marginHorizontal: 12 },
  progFill: { height: 4, backgroundColor: "#10b981", borderRadius: 2 },
  modeCtr: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  pendBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fef3c7", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  pendTxt: { fontSize: 13, color: "#92400e", fontWeight: "500" },
  fSelect: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", width: "100%" },
  fSelTxt: { flex: 1, fontSize: 15, color: "#1e293b" },
  fList: { width: "100%", backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden" },
  fItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  fItemAct: { backgroundColor: "#f0fdf4" },
  fItemTxt: { fontSize: 14, color: "#334155" },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#10b981", paddingVertical: 18, borderRadius: 16, width: "100%", marginTop: 8 },
  startTxt: { color: "#fff", fontSize: 18, fontWeight: "700" },
  offBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  offTxt: { fontSize: 12, color: "#ef4444" },
  stepCtr: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", gap: 20 },
  stepFull: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  sub: { fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 8 },
  secLabel: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 8 },
  camBtn: { width: "100%", aspectRatio: 1, maxWidth: 280, backgroundColor: "#f1f5f9", borderRadius: 24, borderWidth: 2, borderColor: "#e2e8f0", borderStyle: "dashed", justifyContent: "center", alignItems: "center", gap: 12 },
  camTxt: { fontSize: 14, color: "#64748b", fontWeight: "500" },
  photoPrev: { width: "100%", aspectRatio: 3/4, borderRadius: 16, overflow: "hidden", position: "relative" },
  photoImg: { width: "100%", height: "100%", borderRadius: 16 },
  retakeBtn: { position: "absolute", bottom: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  aiOvl: { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.9)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  aiTxt: { fontSize: 12, color: "#1e293b", fontWeight: "500", flex: 1 },
  optGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  optBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff", minWidth: 100, alignItems: "center" },
  optBtnTxt: { fontSize: 13, fontWeight: "600", color: "#334155" },
  searchInp: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: "#1e293b" },
  favRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  favChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff" },
  favDot: { width: 8, height: 8, borderRadius: 4 },
  favChipTxt: { fontSize: 12, fontWeight: "600", color: "#334155" },
  spList: { flex: 1, maxHeight: 400 },
  spItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  spItemAct: { backgroundColor: "#f0fdf4" },
  spDot: { width: 10, height: 10, borderRadius: 5 },
  spLabel: { fontSize: 14, fontWeight: "500", color: "#1e293b" },
  spSci: { fontSize: 11, color: "#94a3b8", fontStyle: "italic" },
  notesInp: { width: "100%", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#1e293b", minHeight: 120 },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: 16, gap: 12 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: "#f1f5f9" },
  backTxt: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  nextBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, backgroundColor: "#10b981", flex: 1, justifyContent: "center" },
  nextTxt: { fontSize: 15, fontWeight: "700", color: "#fff" },
  skipBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  skipTxt: { fontSize: 13, color: "#94a3b8", fontWeight: "500" },
  revPhoto: { width: "100%", height: 200, borderRadius: 16, marginVertical: 12 },
  revCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden", marginBottom: 16 },
  revRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  revLabel: { fontSize: 13, color: "#64748b" },
  revValue: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#10b981", paddingVertical: 18, borderRadius: 16, width: "100%" },
  saveTxt: { color: "#fff", fontSize: 17, fontWeight: "700" },
  savedCtr: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  savedCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#f0fdf4", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  savedTitle: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  savedSub: { fontSize: 14, color: "#64748b", textAlign: "center" },
  savedCnt: { fontSize: 16, fontWeight: "600", color: "#10b981", marginTop: 8 },
  savedActs: { width: "100%", gap: 12, marginTop: 24 },
  nxtTreeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#10b981", paddingVertical: 16, borderRadius: 14, width: "100%" },
  nxtTreeTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
  doneBtn: { paddingVertical: 14, borderRadius: 14, width: "100%", alignItems: "center", backgroundColor: "#f1f5f9" },
  doneTxt: { fontSize: 14, fontWeight: "600", color: "#64748b" },
});
