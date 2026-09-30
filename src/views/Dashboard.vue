<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  ArrowUpRight,
  Brain,
  LockKeyhole,
  Users,
  Sparkles,
  MessagesSquare,
  ShieldCheck,
  Cpu,
  Bot,
} from "lucide-vue-next";
import {
  action,
  api,
  ageLabel,
  date,
  defaults,
  refreshStatus,
  state,
  type Page,
  type Person,
  type Temporary,
} from "../api";
import Eyes from "../components/Eyes.vue";

const total = ref<number | null>(null);
const privateCount = ref<number | null>(null);
const peopleCount = ref<number | null>(null);
const temporaryCount = ref<number | null>(null);
const latest = ref<Page["items"]>([]);
const busy = ref(false);
const name = ref("Companion");
const nickname = ref("");
const age = ref("adulte");
const companion = computed(
  () => state.status?.owner?.preferences?.companion_name || "Companion",
);
async function load() {
  if (!state.status?.configured) return;
  await action(async () => {
    const [memories, confidential, people, temporary] = await Promise.all([
      api<Page>("/memories?limit=4"),
      api<Page>("/memories?limit=1&confidential=true"),
      api<Person[]>("/people"),
      api<Temporary[]>("/temporary"),
    ]);
    latest.value = memories.items;
    total.value = memories.total;
    privateCount.value = confidential.total;
    peopleCount.value = people.length;
    temporaryCount.value = temporary.length;
  });
}
async function setup() {
  busy.value = true;
  await action(async () => {
    await api("/setup", "POST", {
      age_profile: age.value,
      preferences: {
        ...defaults(),
        companion_name: name.value,
        nickname: nickname.value,
      },
    });
    await refreshStatus();
    await load();
  }, "Companion est configuré.");
  busy.value = false;
}
onMounted(load);
</script>

<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">VOTRE ESPACE COMPANION</div>
      <h1>Vue d’ensemble<span class="heading-dot">.</span></h1>
      <p>
        {{
          new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(
            new Date(),
          )
        }}
      </p>
    </div>
    <RouterLink
      v-if="state.status?.configured"
      to="/chat"
      class="button primary"
      ><MessagesSquare :size="18" /> Ouvrir une conversation<ArrowUpRight
        :size="17"
    /></RouterLink>
  </div>
  <section v-if="!state.status?.configured" class="setup-section">
    <div>
      <span class="badge">PREMIER DÉMARRAGE</span>
      <h2>Faisons connaissance.</h2>
      <Eyes />
      <p class="muted">Aucun propriétaire enregistré sur cet appareil.</p>
    </div>
    <form class="form-stack" @submit.prevent="setup">
      <label
        >Nom du compagnon<input v-model="name" required maxlength="60" /></label
      ><label
        >Votre surnom<input
          v-model="nickname"
          maxlength="60"
          autocomplete="nickname" /></label
      ><label
        >Profil d’âge<select v-model="age">
          <option value="adulte">Adulte</option>
          <option value="ado">Adolescent</option>
          <option value="enfant">Enfant</option>
        </select></label
      >
      <p class="muted small">
        Le profil d’âge fixe les protections du dialogue. La configuration d’un
        mineur est réservée à un adulte.
      </p>
      <button class="button primary" :disabled="busy">
        <Bot :size="18" />{{ busy ? "Configuration…" : "Créer le compagnon" }}
      </button>
    </form>
  </section>
  <template v-else>
    <section class="companion-overview">
      <div class="companion-identity">
        <span class="badge"><span class="status-dot"></span> CONFIGURÉ</span>
        <h2>{{ companion }}</h2>
        <p>Un peu de mémoire.<br />Beaucoup de personnalité.</p>
        <RouterLink to="/settings" class="text-link"
          >Personnaliser <ArrowUpRight :size="16"
        /></RouterLink>
      </div>
      <div class="eyes-wrap">
        <Eyes /><span class="eyebrow"
          >APERÇU DES YEUX · NON CONNECTÉ AU ROBOT</span
        >
      </div>
      <div class="identity-facts">
        <div>
          <span>Profil du propriétaire</span
          ><strong>{{ ageLabel(state.status?.owner?.age_profile) }}</strong>
        </div>
        <div>
          <span>Stockage</span
          ><strong><ShieldCheck :size="15" /> Local & privé</strong>
        </div>
        <div>
          <span>Matériel</span><strong class="muted">Non supervisé</strong>
        </div>
      </div>
    </section>
    <section class="stats-grid" aria-label="Résumé des données">
      <RouterLink to="/memories" class="stat"
        ><div><Brain :size="20" /><ArrowUpRight :size="16" /></div>
        <strong>{{ total ?? "—" }}</strong
        ><span>Souvenirs durables</span></RouterLink
      ><RouterLink to="/memories?private=true" class="stat"
        ><div><LockKeyhole :size="20" /><ArrowUpRight :size="16" /></div>
        <strong>{{ privateCount ?? "—" }}</strong
        ><span>Souvenirs confidentiels</span></RouterLink
      ><RouterLink to="/people" class="stat"
        ><div><Users :size="20" /><ArrowUpRight :size="16" /></div>
        <strong>{{ peopleCount ?? "—" }}</strong
        ><span>Fiches de personnes</span></RouterLink
      ><RouterLink to="/memories?tier=temporary" class="stat"
        ><div><Sparkles :size="20" /><ArrowUpRight :size="16" /></div>
        <strong>{{ temporaryCount ?? "—" }}</strong
        ><span>Mémoires temporaires</span></RouterLink
      >
    </section>
    <div class="dashboard-columns">
      <section>
        <div class="section-heading">
          <h2>Derniers souvenirs</h2>
          <RouterLink to="/memories" class="text-link"
            >Tout voir <ArrowUpRight :size="16"
          /></RouterLink>
        </div>
        <div v-if="!latest.length" class="empty-inline">
          <Brain :size="28" />
          <h3>Aucun souvenir pour l’instant</h3>
          <RouterLink to="/memories" class="text-link"
            >Ajouter un souvenir <ArrowUpRight :size="16"
          /></RouterLink>
        </div>
        <RouterLink
          v-for="memory in latest"
          :key="memory.id"
          to="/memories"
          class="memory-preview"
          ><span class="mini-icon"
            ><LockKeyhole v-if="memory.confidential" :size="17" /><Brain
              v-else
              :size="17"
          /></span>
          <div>
            <p>
              {{
                memory.confidential ? "Souvenir confidentiel" : memory.content
              }}
            </p>
            <small>{{ date(memory.created_at) }}</small>
          </div>
          <ArrowUpRight :size="17"
        /></RouterLink>
      </section>
      <section class="system-summary">
        <div class="section-heading">
          <h2>Moteurs & services</h2>
          <Cpu :size="19" />
        </div>
        <div class="service-line">
          <span class="service-symbol">G</span>
          <div><strong>Groq</strong><small>Inférence en ligne</small></div>
          <span
            class="pill"
            :class="{ green: state.status.providers.online }"
            >{{
              state.status.providers.online ? "Clé présente" : "Non configuré"
            }}</span
          >
        </div>
        <div class="service-line">
          <span class="service-symbol">O</span>
          <div><strong>Ollama</strong><small>Inférence locale</small></div>
          <span class="pill" :class="{ green: state.status.providers.local }">{{
            state.status.providers.local ? "Modèles définis" : "Non configuré"
          }}</span>
        </div>
        <RouterLink to="/system" class="text-link"
          >Voir le système <ArrowUpRight :size="16"
        /></RouterLink>
        <div class="privacy-note">
          <ShieldCheck :size="21" /><span
            >Les souvenirs confidentiels nécessitent un accord explicite avant
            leur utilisation par une IA.</span
          >
        </div>
      </section>
    </div>
  </template>
</template>
