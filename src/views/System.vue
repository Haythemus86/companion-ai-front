<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  Download,
  FileText,
  Cpu,
  Camera,
  AudioLines,
  ShieldCheck,
  RefreshCw,
} from "lucide-vue-next";
import { action, api, state, refreshStatus } from "../api";
import ConfirmDialog from "../components/ConfirmDialog.vue";
const logs = ref<{ name: string; bytes: number }[]>([]);
const selected = ref("");
const content = ref("");
const truncated = ref(false);
const confirmation = ref<"backup" | "log" | null>(null);
const busy = ref(false);
async function load() {
  await action(async () => {
    await refreshStatus();
    logs.value = await api<typeof logs.value>("/logs");
  });
}
async function confirm() {
  busy.value = true;
  await action(async () => {
    if (confirmation.value === "backup") {
      const data = await api("/backup");
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `companion-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      const result = await api<{ content: string; truncated: boolean }>(
        `/logs/${encodeURIComponent(selected.value)}`,
      );
      content.value = result.content;
      truncated.value = result.truncated;
    }
    confirmation.value = null;
  });
  busy.value = false;
}
onMounted(load);
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">SOUS LE CAPOT</div>
      <h1>Système & journaux<span class="heading-dot">.</span></h1>
      <p>Configuration locale, diagnostics et sauvegarde.</p>
    </div>
    <button class="button" @click="load">
      <RefreshCw :size="17" /> Actualiser
    </button>
  </div>
  <section>
    <div class="section-heading">
      <h2>Services</h2>
      <span class="pill green"
        >API {{ state.online ? "connectée" : "déconnectée" }}</span
      >
    </div>
    <div class="service-grid">
      <article class="service-tile">
        <Cpu :size="23" />
        <h3>Groq</h3>
        <span class="pill" :class="{ green: state.status?.providers.online }">{{
          state.status?.providers.online ? "Clé présente" : "Non configuré"
        }}</span>
        <p>
          La présence de la clé ne garantit pas la disponibilité du service.
        </p>
        <code>GROQ_API_KEY</code>
      </article>
      <article class="service-tile">
        <Cpu :size="23" />
        <h3>Ollama</h3>
        <span class="pill" :class="{ green: state.status?.providers.local }">{{
          state.status?.providers.local ? "Modèles définis" : "Non configuré"
        }}</span>
        <p>
          Les modèles de dialogue et de modération sont tous deux nécessaires.
        </p>
        <code>COMPANION_LOCAL_CHAT_MODEL<br />COMPANION_LOCAL_GUARD_MODEL</code>
      </article>
      <article class="service-tile">
        <Camera :size="23" />
        <h3>Vision & robot</h3>
        <span class="pill">Non supervisé</span>
        <p>
          Aucune télémétrie matérielle ni commande de processus exposée par
          cette console.
        </p>
      </article>
      <article class="service-tile">
        <AudioLines :size="23" />
        <h3>Microphone & voix</h3>
        <span class="pill">Non activés ici</span>
        <p>Les périphériques audio restent gérés par le client terminal.</p>
      </article>
    </div>
  </section>
  <section class="settings-section">
    <div>
      <h2><ShieldCheck :size="20" /> Sauvegarde privée</h2>
      <p class="muted">
        Propriétaire, profil et souvenirs durables. Sans journaux, mémoire
        temporaire ni réglages des initiatives.
      </p>
    </div>
    <div class="backup-action">
      <p>Le fichier contient les souvenirs confidentiels en clair.</p>
      <button class="button" @click="confirmation = 'backup'">
        <Download :size="18" /> Exporter la sauvegarde
      </button>
    </div>
  </section>
  <section>
    <div class="section-heading">
      <h2><FileText :size="20" /> Journaux de conversation</h2>
      <span class="small muted"
        >{{ logs.length }} fichier{{ logs.length > 1 ? "s" : "" }} · 100 plus
        récents</span
      >
    </div>
    <div class="notice warning">
      Ces diagnostics peuvent contenir des échanges et des souvenirs
      confidentiels. Leur consultation reste locale.
    </div>
    <div v-if="!logs.length" class="empty-inline">
      <FileText :size="28" />
      <h3>Aucun journal enregistré</h3>
    </div>
    <div v-else class="toolbar">
      <select
        v-model="selected"
        aria-label="Journal à consulter"
        @change="content = ''"
      >
        <option value="">Choisir un journal</option>
        <option v-for="log in logs" :key="log.name" :value="log.name">
          {{ log.name }} · {{ Math.ceil(log.bytes / 1024) }} Ko
        </option></select
      ><button
        class="button"
        :disabled="!selected"
        @click="confirmation = 'log'"
      >
        <FileText :size="17" /> Consulter
      </button>
    </div>
    <p v-if="truncated && content" class="muted small">
      Affichage limité aux derniers 256 Kio du journal.
    </p>
    <pre v-if="content" class="log-view" tabindex="0">{{ content }}</pre>
  </section>
  <ConfirmDialog
    v-if="confirmation"
    :title="
      confirmation === 'backup'
        ? 'Exporter les données privées ?'
        : 'Ouvrir ce journal privé ?'
    "
    :message="
      confirmation === 'backup'
        ? 'La sauvegarde contient votre profil et tous les souvenirs durables, y compris confidentiels, sans chiffrement. Conservez-la dans un emplacement protégé.'
        : 'Le contenu du journal, y compris les éventuels souvenirs confidentiels, sera affiché dans ce navigateur.'
    "
    :confirm-label="
      confirmation === 'backup' ? 'Exporter' : 'Afficher le journal'
    "
    :busy="busy"
    @cancel="confirmation = null"
    @confirm="confirm"
  />
</template>
