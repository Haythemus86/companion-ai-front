<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Save, SlidersHorizontal, ShieldCheck, Trash2 } from "lucide-vue-next";
import {
  action,
  api,
  defaults,
  refreshStatus,
  state,
  ageLabel,
  type Profile,
} from "../api";
import ConfirmDialog from "../components/ConfirmDialog.vue";
const tab = ref("personality");
const preferences = ref({ ...defaults(), ...state.status?.owner?.preferences });
const profile = ref<Profile | null>(null);
const busy = ref(false);
const deleting = ref(false);
onMounted(() =>
  action(async () => {
    profile.value = await api<Profile>("/profile");
  }),
);
async function save() {
  busy.value = true;
  await action(async () => {
    if (tab.value === "personality") {
      await api("/preferences", "PUT", preferences.value);
      await refreshStatus();
    } else await api("/profile", "PUT", profile.value);
  }, "Réglages enregistrés. Les sessions de dialogue les relisent au prochain message.");
  busy.value = false;
}
async function remove() {
  busy.value = true;
  await action(async () => {
    await api("/profile", "DELETE");
    profile.value = await api<Profile>("/profile");
    deleting.value = false;
  }, "Profil privé effacé et autorisations révoquées.");
  busy.value = false;
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">À VOTRE IMAGE</div>
      <h1>Personnalisation<span class="heading-dot">.</span></h1>
      <p>Une identité choisie. Des autorisations explicites.</p>
    </div>
    <span class="pill green"
      ><ShieldCheck :size="15" /> Profil
      {{ ageLabel(state.status?.owner?.age_profile).toLowerCase() }}</span
    >
  </div>
  <div class="tabs" role="tablist" aria-label="Réglages">
    <button
      role="tab"
      :aria-selected="tab === 'personality'"
      :class="{ selected: tab === 'personality' }"
      @click="tab = 'personality'"
    >
      <SlidersHorizontal :size="17" /> Personnalité</button
    ><button
      role="tab"
      :aria-selected="tab === 'privacy'"
      :class="{ selected: tab === 'privacy' }"
      @click="tab = 'privacy'"
    >
      <ShieldCheck :size="17" /> Profil privé & partage
    </button>
  </div>
  <form @submit.prevent="save">
    <template v-if="tab === 'personality'"
      ><section class="settings-section">
        <div>
          <h2>Identité du compagnon</h2>
          <p class="muted">Préférences locales du propriétaire.</p>
        </div>
        <div class="form-grid">
          <label
            >Nom du compagnon<input
              v-model="preferences.companion_name"
              required
              maxlength="60" /></label
          ><label
            >Votre surnom<input
              v-model="preferences.nickname"
              maxlength="60" /></label
          ><label
            >Présentation<select v-model="preferences.presentation">
              <option value="neutre">Neutre</option>
              <option value="feminine">Féminine</option>
              <option value="masculine">Masculine</option>
            </select></label
          ><label
            >Forme d’adresse<select v-model="preferences.addressing">
              <option value="tu">Tutoiement</option>
              <option value="vous">Vouvoiement</option>
            </select></label
          ><label class="full-width"
            >Centres d’intérêt<input
              v-model="preferences.interests"
              maxlength="300"
              placeholder="Lecture, dessin, musique…"
          /></label>
        </div>
      </section>
      <section class="settings-section">
        <div>
          <h2>Partage des préférences</h2>
          <p class="muted">Surnom, nom du compagnon et centres d’intérêt.</p>
        </div>
        <div class="form-stack">
          <label class="toggle-row"
            ><div>
              <strong>Modèles locaux</strong
              ><small>Ollama sur cet appareil</small>
            </div>
            <input
              v-model="preferences.share_local"
              type="checkbox"
              role="switch" /></label
          ><label class="toggle-row"
            ><div>
              <strong>Modèles en ligne</strong
              ><small>Envoi à Groq lors d’une conversation en ligne</small>
            </div>
            <input
              v-model="preferences.share_online"
              type="checkbox"
              role="switch"
          /></label>
        </div></section
    ></template>
    <template v-else-if="profile"
      ><section class="settings-section">
        <div>
          <h2>Informations privées</h2>
          <p class="muted">
            L’adresse exacte et les préférences privées ne sont jamais injectées
            dans les modèles.
          </p>
        </div>
        <div class="form-grid">
          <label class="full-width"
            >Adresse exacte<input
              v-model="profile.address"
              maxlength="200"
              autocomplete="street-address" /></label
          ><label
            >Ville<input
              v-model="profile.city"
              maxlength="80"
              autocomplete="address-level2" /></label
          ><label
            >Quartier<input v-model="profile.district" maxlength="80" /></label
          ><label class="full-width"
            >Préférences privées<input
              v-model="profile.preferences"
              maxlength="500"
          /></label>
        </div>
      </section>
      <section class="settings-section">
        <div>
          <h2>Localisation partagée</h2>
          <p class="muted">Uniquement pour les conversations adultes.</p>
        </div>
        <div class="form-grid">
          <label
            >Avec Ollama<select v-model="profile.local_sharing">
              <option value="aucun">Aucune localisation</option>
              <option value="ville">Ville seulement</option>
              <option value="quartier">Ville et quartier</option>
            </select></label
          ><label
            >Avec Groq<select v-model="profile.online_sharing">
              <option value="aucun">Aucune localisation</option>
              <option value="ville">Ville seulement</option>
              <option value="quartier">Ville et quartier</option>
            </select></label
          >
        </div>
      </section></template
    >
    <div v-else class="loading-line">Chargement du profil…</div>
    <div class="form-actions">
      <button
        v-if="tab === 'privacy' && profile"
        type="button"
        class="button danger-outline"
        :disabled="busy"
        @click="deleting = true"
      >
        <Trash2 :size="17" /> Effacer le profil privé</button
      ><button
        class="button primary"
        :disabled="busy || (tab === 'privacy' && !profile)"
      >
        <Save :size="17" />{{
          busy ? "Enregistrement…" : "Enregistrer les réglages"
        }}
      </button>
    </div>
  </form>
  <ConfirmDialog
    v-if="deleting"
    title="Effacer le profil privé ?"
    message="L’adresse, la ville, le quartier, les préférences privées et les autorisations de localisation seront supprimés. Les souvenirs et l’identité du propriétaire sont conservés."
    confirm-label="Effacer le profil"
    :busy="busy"
    @cancel="deleting = false"
    @confirm="remove"
  />
</template>
