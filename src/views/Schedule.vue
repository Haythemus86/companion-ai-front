<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Save, Moon, BriefcaseBusiness, Sparkles } from "lucide-vue-next";
import {
  api,
  action,
  type Schedule,
  type InitiativeLevel,
  type InitiativePolicy,
} from "../api";
const schedule = ref<Schedule | null>(null);
const current = ref<{
  initiatives_allowed: boolean;
  timezone: string;
  local_time: string;
} | null>(null);
const busy = ref(false);
const levels = ref<Record<InitiativeLevel, InitiativePolicy> | null>(null);
const savedLevel = ref<InitiativeLevel>("balanced");
const selectedPolicy = computed(
  () => levels.value?.[schedule.value?.initiative_level ?? "balanced"],
);
const levelOrder: InitiativeLevel[] = ["off", "discreet", "balanced", "chatty"];
const days = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];
const hours = Array.from({ length: 24 }, (_, hour) => hour);
async function load() {
  const result = await api<{
    schedule: Schedule;
    initiative_levels: Record<InitiativeLevel, InitiativePolicy>;
    current: NonNullable<typeof current.value>;
  }>("/schedule");
  savedLevel.value = result.schedule.initiative_level ?? "balanced";
  schedule.value = { ...result.schedule, initiative_level: savedLevel.value };
  levels.value = result.initiative_levels;
  current.value = result.current;
}
async function save() {
  busy.value = true;
  await action(async () => {
    await api("/schedule", "PUT", schedule.value);
    await load();
  }, "Réglages d’initiative enregistrés. Le dialogue actif les applique à sa prochaine attente, sans redémarrage.");
  busy.value = false;
}
onMounted(() => action(load));
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">LE BON MOMENT</div>
      <h1>Initiatives<span class="heading-dot">.</span></h1>
      <p>Un rythme qui respecte le vôtre.</p>
    </div>
    <span
      v-if="current"
      class="pill"
      :class="{ green: current.initiatives_allowed }"
      >{{
        savedLevel === "off"
          ? "Initiatives désactivées"
          : current.initiatives_allowed
            ? "Créneau autorisé"
            : "Créneau silencieux"
      }}</span
    >
  </div>
  <div class="notice info">
    <Sparkles :size="20" /><span
      >Les horaires n’activent pas les initiatives. Elles nécessitent un
      dialogue terminal lancé avec la présence et les initiatives IA
      activées.</span
    >
  </div>
  <form v-if="schedule" @submit.prevent="save">
    <section class="settings-section">
      <div>
        <h2><Sparkles :size="21" /> Envie de discuter</h2>
        <p class="muted">
          Choisissez combien d’occasions de conversation le compagnon recherche.
        </p>
      </div>
      <div class="form-stack">
        <label
          >Niveau d’initiative
          <select
            v-model="schedule.initiative_level"
            :disabled="busy"
            aria-describedby="initiative-policy"
          >
            <option v-for="level in levelOrder" :key="level" :value="level">
              {{ levels?.[level].label }}
            </option>
          </select>
        </label>
        <div id="initiative-policy" class="notice info" aria-live="polite">
          <span v-if="schedule.initiative_level === 'off'"
            >Aucun sujet lancé spontanément. Les salutations et les réponses à
            vos questions restent disponibles.</span
          >
          <span v-else-if="selectedPolicy">
            Une réflexion possible après au moins
            <strong>{{ selectedPolicy.interval / 60 }} minutes</strong> de
            disponibilité, puis au maximum
            <strong
              >{{ selectedPolicy.max_utterances }} proposition{{
                selectedPolicy.max_utterances > 1 ? "s" : ""
              }}
              par heure</strong
            >. Il attend toujours votre réponse avant de proposer autre chose.
          </span>
        </div>
        <p class="muted small">
          Bavard favorise aussi les questions légères liées à vos goûts. Ces
          délais sont des occasions de réfléchir, pas une obligation de parler.
          Plus d’initiatives peut augmenter les appels à l’IA.
        </p>
      </div>
    </section>
    <section class="settings-section">
      <div>
        <h2>Quand prend-il la parole ?</h2>
        <p class="muted">Le niveau s’applique après enregistrement.</p>
      </div>
      <div class="form-stack">
        <p>
          Le propriétaire doit être reconnu, le chat doit être disponible, sans
          capture ni réponse en cours, et le créneau doit être autorisé. Le
          compagnon choisit alors un sujet pertinent dans son contexte.
        </p>
        <p class="muted">
          Il reste silencieux si vous êtes absent, si le lieu détecté est le
          bureau, pendant les heures calmes ou de travail, après « plus tard »,
          en attendant votre réponse ou lorsque le quota est atteint. Il peut
          aussi ne trouver aucun sujet pertinent.
        </p>
        <p class="muted small">
          Le badge ci-dessus indique seulement le créneau enregistré, pas l’état
          en direct de la caméra ou du dialogue. Ce réglage ne démarre ni le
          chat ni le microphone.
        </p>
      </div>
    </section>
    <section class="settings-section">
      <div>
        <h2><BriefcaseBusiness :size="21" /> Temps de travail</h2>
        <p class="muted">Pas d’initiative pendant ces plages.</p>
      </div>
      <div class="form-stack">
        <fieldset class="days">
          <legend>Jours de travail</legend>
          <label v-for="(day, index) in days" :key="day" :title="day"
            ><input
              v-model="schedule.work_days"
              type="checkbox"
              :value="index"
            /><span>{{ day.slice(0, 3) }}</span></label
          >
        </fieldset>
        <div class="form-grid">
          <label
            >Début<select v-model="schedule.work_start">
              <option v-for="hour in hours" :key="hour" :value="hour">
                {{ String(hour).padStart(2, "0") }}:00
              </option>
            </select></label
          ><label
            >Fin<select v-model="schedule.work_end">
              <option v-for="hour in hours" :key="hour" :value="hour">
                {{ String(hour).padStart(2, "0") }}:00
              </option>
            </select></label
          >
        </div>
      </div>
    </section>
    <section class="settings-section">
      <div>
        <h2><Moon :size="21" /> Heures calmes</h2>
        <p class="muted">Silence chaque jour, y compris la nuit.</p>
      </div>
      <div class="form-grid">
        <label
          >Début du silence<select v-model="schedule.quiet_start">
            <option v-for="hour in hours" :key="hour" :value="hour">
              {{ String(hour).padStart(2, "0") }}:00
            </option>
          </select></label
        ><label
          >Fin du silence<select v-model="schedule.quiet_end">
            <option v-for="hour in hours" :key="hour" :value="hour">
              {{ String(hour).padStart(2, "0") }}:00
            </option>
          </select></label
        >
      </div>
    </section>
    <section class="settings-section">
      <div>
        <h2><Sparkles :size="21" /> Temps libre</h2>
        <p class="muted">
          Les propositions de loisirs restent soumises aux heures calmes et de
          travail.
        </p>
      </div>
      <div class="form-stack">
        <fieldset class="days">
          <legend>Jours de loisirs</legend>
          <label v-for="(day, index) in days" :key="day" :title="day"
            ><input
              v-model="schedule.leisure_days"
              type="checkbox"
              :value="index"
            /><span>{{ day.slice(0, 3) }}</span></label
          >
        </fieldset>
        <div class="form-grid">
          <label
            >Début des loisirs<select v-model="schedule.leisure_start">
              <option v-for="hour in hours" :key="hour" :value="hour">
                {{ String(hour).padStart(2, "0") }}:00
              </option>
            </select></label
          ><label
            >Fin des loisirs<select v-model="schedule.leisure_end">
              <option v-for="hour in hours" :key="hour" :value="hour">
                {{ String(hour).padStart(2, "0") }}:00
              </option>
            </select></label
          >
        </div>
      </div>
    </section>
    <div class="form-actions spread">
      <span class="muted small"
        >Fuseau de l’appareil : {{ current?.timezone }}</span
      ><button class="button primary" :disabled="busy">
        <Save :size="17" />{{
          busy ? "Enregistrement…" : "Enregistrer les réglages"
        }}
      </button>
    </div>
  </form>
  <div v-else class="loading-line">Chargement des horaires…</div>
</template>
