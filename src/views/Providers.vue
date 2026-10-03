<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { api, action, refreshStatus } from "../api";
type Profile = { label: string; kind: string; chat_model: string; guard_model: string; base_url: string; has_key: boolean };
type Settings = { profiles: Record<string, Profile>; online: string | null; local: string | null };
const data = ref<Settings>({ profiles: {}, online: null, local: null });
const busy = ref(false);
const editing = ref(false);
const empty = () => ({ id: "", label: "", kind: "groq", chat_model: "openai/gpt-oss-20b", guard_model: "openai/gpt-oss-safeguard-20b", base_url: "", api_key: "" });
const form = reactive(empty());
const local = (kind: string) => ["llama_cpp", "ollama"].includes(kind);
async function load() { data.value = await api<Settings>("/providers"); }
onMounted(() => action(load));
function edit(id: string, item: Profile) { Object.assign(form, item, { id, api_key: "" }); editing.value = true; }
function reset() { Object.assign(form, empty()); editing.value = false; }
function changeKind() {
  form.api_key = "";
  form.chat_model = ""; form.guard_model = "";
  form.base_url = form.kind === "llama_cpp" ? "http://127.0.0.1:8080" : form.kind === "ollama" ? "http://127.0.0.1:11434" : "";
}
async function perform(task: () => Promise<void>, message: string) {
  busy.value = true;
  try { await action(task, message); } finally { busy.value = false; }
}
async function save() {
  await perform(async () => {
    const { id, label, kind, chat_model, guard_model, base_url, api_key } = form;
    try {
      await api(`/providers/${encodeURIComponent(id)}`, "PUT", { label, kind, chat_model, guard_model, base_url, api_key: api_key || null });
    } finally { form.api_key = ""; }
    reset(); await load();
  }, "Configuration enregistrée. Les échanges suivants utiliseront les nouveaux réglages si elle est sélectionnée.");
}
async function select() {
  await perform(async () => {
    data.value = await api<Settings>("/providers/selection", "PUT", { online: data.value.online || null, local: data.value.local || null });
    await refreshStatus();
  }, "Sélection enregistrée.");
}
async function remove(id: string) {
  await perform(async () => { await api(`/providers/${encodeURIComponent(id)}`, "DELETE"); await load(); }, "Configuration et clé supprimées.");
}
async function test(id: string) {
  await perform(async () => { await api(`/providers/${encodeURIComponent(id)}/test`, "POST"); }, "Les modèles répondent. Aucun souvenir transmis ; qualité de modération à évaluer séparément.");
}
</script>
<template>
  <div class="page-heading"><div><h1>Fournisseurs IA</h1><p>Choisissez vos moteurs en ligne et locaux. Les souvenirs restent gérés par Companion.</p></div></div>
  <div class="notice warning">Ces réglages concernent le dialogue et sa modération. La transcription Groq et la voix actuelle restent configurées séparément ; la chaîne vocale hors connexion reste à installer.</div>
  <section class="panel provider-panel">
    <h2>Configurations actives</h2>
    <p>Le mode du chat reste local, en ligne ou automatique. En automatique, un moteur local est nécessaire.</p>
    <form @submit.prevent="select" class="provider-form">
      <label>En ligne<select v-model="data.online"><option :value="null">Aucune</option><option v-for="(p, id) in data.profiles" :key="id" :value="id" :disabled="local(p.kind)">{{ p.label }}</option></select></label>
      <label>Local<select v-model="data.local"><option :value="null">Aucune</option><option v-for="(p, id) in data.profiles" :key="id" :value="id" :disabled="!local(p.kind)">{{ p.label }}</option></select></label>
      <p>Sans aucune sélection, les anciennes variables d’environnement restent utilisées.</p>
      <button class="button primary" :disabled="busy">Appliquer la sélection</button>
    </form>
  </section>
  <section class="panel provider-panel">
    <h2>{{ editing ? "Modifier une configuration" : "Ajouter une configuration" }}</h2>
    <form @submit.prevent="save" class="provider-form" autocomplete="off">
      <label>Identifiant<input v-model="form.id" required pattern="[a-zA-Z0-9_-]{1,64}" :disabled="editing" placeholder="pi-bonsai" /></label>
      <label>Nom affiché<input v-model="form.label" required maxlength="80" placeholder="Mon Raspberry Pi" /></label>
      <label>Fournisseur<select v-model="form.kind" :disabled="editing" @change="changeKind"><option value="groq">Groq</option><option value="deepseek">DeepSeek</option><option value="llama_cpp">llama.cpp — local</option><option value="ollama">Ollama — local</option></select></label>
      <label>Modèle de dialogue<input v-model="form.chat_model" required /></label>
      <label>Modèle de modération<input v-model="form.guard_model" required /></label>
      <p>Les deux rôles peuvent utiliser le même modèle. Un petit modèle local nécessite une évaluation des protections enfant avant usage.</p>
      <label v-if="local(form.kind)">Adresse du serveur local<input v-model="form.base_url" required placeholder="http://127.0.0.1:8080" /></label>
      <label v-else>Nouvelle clé API<input v-model="form.api_key" type="password" autocomplete="new-password" :required="!editing" placeholder="Laisser vide pour conserver la clé enregistrée" /></label>
      <p>La clé est conservée sur cet appareil et n’est jamais renvoyée au navigateur. Le remplacement s’applique au prochain tour de dialogue.</p>
      <div><button class="button primary" :disabled="busy">Enregistrer</button> <button class="button" type="button" @click="reset" :disabled="busy">Annuler</button></div>
    </form>
  </section>
  <section class="panel provider-panel"><h2>Configurations enregistrées</h2>
    <p v-if="!Object.keys(data.profiles).length">Aucune configuration enregistrée.</p>
    <article v-for="(p, id) in data.profiles" :key="id" class="provider-item">
      <h3>{{ p.label }}</h3><p>{{ p.kind }} · {{ p.chat_model }} · {{ p.has_key ? "Clé enregistrée" : "Sans clé" }}</p>
      <button class="button" :disabled="busy" @click="edit(String(id), p)">Modifier / remplacer la clé</button>
      <button class="button" :disabled="busy" @click="test(String(id))">Tester les modèles</button>
      <button class="button" :disabled="busy || id === data.online || id === data.local" @click="remove(String(id))">Supprimer</button>
    </article>
    <p>Le test envoie seulement « Réponds uniquement OK » aux modèles configurés. Un appel en ligne peut être facturé.</p>
  </section>
</template>
<style scoped>
.provider-panel { padding: 1.5rem; margin-bottom: 1.5rem; }
.provider-form { display: grid; gap: 1rem; max-width: 680px; }
.provider-form label { display: grid; gap: .4rem; }
.provider-form input, .provider-form select { padding: .7rem; width: 100%; min-width: 0; }
.provider-item { padding: 1rem 0; border-bottom: 1px solid #ddd; overflow-wrap: anywhere; }
.provider-item button { margin: .3rem; }
</style>
