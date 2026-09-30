<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import {
  Bot,
  Send,
  Plus,
  ShieldCheck,
  Paperclip,
  X,
  LoaderCircle,
} from "lucide-vue-next";
import { action, api, state, type Page, type Memory } from "../api";
import ConfirmDialog from "../components/ConfirmDialog.vue";
const mode = ref("local");
const message = ref("");
const session = ref<string | null>(null);
const messages = ref<{ role: string; text: string; approved?: boolean }[]>([]);
const busy = ref(false);
const attach = ref(false);
const sources = ref<Memory[]>([]);
const memory = ref<Memory | null>(null);
const confirming = ref(false);
const sourceQuery = ref("");
const transcript = ref<HTMLElement>();
async function sourceSearch() {
  await action(async () => {
    sources.value = (
      await api<Page>(
        `/memories?limit=20&query=${encodeURIComponent(sourceQuery.value)}`,
      )
    ).items;
  });
}
async function reset() {
  await action(async () => {
    if (session.value) await api(`/chat/${session.value}`, "DELETE");
    session.value = null;
    messages.value = [];
    memory.value = null;
  });
}
async function send(allowed = false) {
  if (!message.value.trim() || busy.value) return;
  if (memory.value?.confidential && !allowed) {
    confirming.value = true;
    return;
  }
  confirming.value = false;
  busy.value = true;
  const text = message.value.trim();
  const ok = await action(async () => {
    const result = await api<{
      session_id: string;
      reply: string;
      approved: boolean;
    }>("/chat", "POST", {
      message: text,
      mode: mode.value,
      session_id: session.value,
      memory_id: memory.value?.id ?? null,
      allow_confidential: allowed,
    });
    session.value = result.session_id;
    messages.value.push(
      { role: "user", text },
      { role: "assistant", text: result.reply, approved: result.approved },
    );
    message.value = "";
    memory.value = null;
    await nextTick();
    transcript.value?.scrollTo({
      top: transcript.value.scrollHeight,
      behavior: "smooth",
    });
  });
  busy.value = false;
  return ok;
}
onMounted(sourceSearch);
onBeforeRouteLeave(async () => {
  if (busy.value)
    return window.confirm(
      "Une réponse est en cours. Quitter cette conversation ?",
    );
  if (session.value)
    await api(`/chat/${session.value}`, "DELETE").catch(() => undefined);
  return true;
});
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">UN MOMENT D’ÉCHANGE</div>
      <h1>Conversation<span class="heading-dot">.</span></h1>
      <p>
        {{ state.status?.owner?.preferences?.companion_name || "Companion" }} ·
        Assistant IA
      </p>
    </div>
    <button class="button" :disabled="busy" @click="reset">
      <Plus :size="18" /> Nouvelle conversation
    </button>
  </div>
  <section class="chat-surface">
    <div class="chat-toolbar">
      <label
        >Moteur<select v-model="mode" :disabled="busy || !!session">
          <option value="local">Ollama · local</option>
          <option value="online">Groq · en ligne</option>
          <option value="auto">Groq + secours Ollama</option>
        </select></label
      ><span class="small muted"
        ><ShieldCheck :size="15" /> Modération active</span
      >
    </div>
    <div
      class="chat-disclosure"
      :class="{ 'online-disclosure': mode !== 'local' }"
    >
      {{
        mode === "local"
          ? "Messages traités par Ollama sur cet appareil."
          : "Les messages et les souvenirs sélectionnés peuvent être envoyés à Groq."
      }}
      Pas de mémorisation automatique dans cette console.
    </div>
    <div
      ref="transcript"
      class="transcript"
      role="log"
      aria-label="Messages de la conversation"
      aria-live="polite"
    >
      <div v-if="!messages.length" class="chat-empty">
        <span class="chat-bot"><Bot :size="38" /></span>
        <h2>On en parle ?</h2>
        <p>
          {{
            mode === "local" && !state.status?.providers.local
              ? "Les modèles Ollama ne sont pas configurés."
              : mode !== "local" && !state.status?.providers.online
                ? "La clé Groq n’est pas configurée."
                : "La conversation reste en mémoire pendant cette session."
          }}
        </p>
      </div>
      <article
        v-for="(item, index) in messages"
        :key="index"
        class="chat-message"
        :class="item.role"
      >
        <small
          >{{
            item.role === "user"
              ? "VOUS"
              : state.status?.owner?.preferences?.companion_name || "COMPANION"
          }}<span v-if="item.approved === false">
            · réponse non approuvée ou service indisponible</span
          ></small
        >
        <p>{{ item.text }}</p>
      </article>
      <div v-if="busy" class="thinking" role="status">
        <LoaderCircle :size="18" class="spinning" /> Réponse en cours…
      </div>
    </div>
    <div v-if="attach" class="source-picker">
      <form class="search-field" @submit.prevent="sourceSearch">
        <input
          v-model="sourceQuery"
          placeholder="Rechercher dans les souvenirs…"
          aria-label="Rechercher une source"
        /><button class="button">Rechercher</button>
      </form>
      <select
        aria-label="Choisir un souvenir"
        :value="memory?.id || ''"
        @change="
          memory =
            sources.find(
              (item) => item.id === ($event.target as HTMLSelectElement).value,
            ) || null
        "
      >
        <option value="">Aucun souvenir</option>
        <option v-for="source in sources" :key="source.id" :value="source.id">
          {{
            source.confidential
              ? `Confidentiel · ${source.id.slice(0, 8)}`
              : source.content.slice(0, 85)
          }}
        </option>
      </select>
    </div>
    <form class="composer" @submit.prevent="send()">
      <span v-if="memory" class="attached-memory"
        ><Paperclip :size="14" />{{
          memory.confidential
            ? "Souvenir confidentiel joint"
            : "Souvenir joint"
        }}<button
          type="button"
          class="icon-button"
          title="Retirer la source"
          aria-label="Retirer la source"
          @click="memory = null"
        >
          <X :size="14" /></button></span
      ><label class="sr-only" for="chat-message">Votre message</label
      ><textarea
        id="chat-message"
        v-model="message"
        placeholder="Écrivez votre message…"
        rows="2"
        maxlength="1200"
        :disabled="busy"
        required
      ></textarea>
      <div class="composer-actions">
        <button
          type="button"
          class="icon-button"
          title="Joindre un souvenir"
          aria-label="Joindre un souvenir"
          :aria-expanded="attach"
          :disabled="busy"
          @click="attach = !attach"
        >
          <Paperclip :size="19" /></button
        ><span class="small muted">{{ message.length }} / 1 200</span
        ><button class="button primary" :disabled="busy || !message.trim()">
          <Send :size="17" /> Envoyer
        </button>
      </div>
    </form>
  </section>
  <ConfirmDialog
    v-if="confirming"
    title="Utiliser ce souvenir confidentiel ?"
    :message="`Son contenu sera transmis ${mode === 'local' ? 'à Ollama sur cet appareil' : 'au fournisseur en ligne, éventuellement à Ollama en secours'} pour ce message. Le contexte sera ensuite effacé.`"
    confirm-label="Autoriser pour ce message"
    @cancel="confirming = false"
    @confirm="send(true)"
  />
</template>
