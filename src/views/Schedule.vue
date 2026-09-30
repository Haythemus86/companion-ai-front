<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Save, Moon, BriefcaseBusiness, Sparkles } from "lucide-vue-next";
import { api, action, type Schedule } from "../api";
const schedule = ref<Schedule | null>(null);
const current = ref<{
  initiatives_allowed: boolean;
  timezone: string;
  local_time: string;
} | null>(null);
const busy = ref(false);
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
    current: NonNullable<typeof current.value>;
  }>("/schedule");
  schedule.value = result.schedule;
  current.value = result.current;
}
async function save() {
  busy.value = true;
  await action(async () => {
    await api("/schedule", "PUT", schedule.value);
    await load();
  }, "Horaires enregistrés. Ils seront pris en compte à la prochaine réflexion du compagnon.");
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
        current.initiatives_allowed ? "Créneau autorisé" : "Créneau silencieux"
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
          busy ? "Enregistrement…" : "Enregistrer les horaires"
        }}
      </button>
    </div>
  </form>
  <div v-else class="loading-line">Chargement des horaires…</div>
</template>
