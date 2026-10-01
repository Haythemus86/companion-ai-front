<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  Brain,
  Plus,
  Search,
  LockKeyhole,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  Clock,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-vue-next";
import {
  action,
  api,
  date,
  type Memory,
  type Page,
  type Temporary,
} from "../api";
import ConfirmDialog from "../components/ConfirmDialog.vue";

const route = useRoute();
const tier = ref(route.query.tier === "temporary" ? "temporary" : "durable");
const filter = ref(route.query.private === "true" ? "true" : "");
const search = ref("");
const offset = ref(0);
const page = ref<Page>({ items: [], total: 0 });
const temporary = ref<Temporary[]>([]);
const loading = ref(false);
const busy = ref(false);
const revealed = ref(new Set<string>());
const editing = ref<Memory | "new" | null>(null);
const content = ref("");
const confidential = ref(true);
const deleting = ref<Memory | Temporary | null>(null);
let sequence = 0;
const visibleTemporary = computed(() =>
  temporary.value.filter((item) =>
    item.content.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()),
  ),
);

async function load() {
  const request = ++sequence;
  loading.value = true;
  await action(async () => {
    if (tier.value === "temporary") {
      const result = await api<Temporary[]>("/temporary");
      if (request === sequence) temporary.value = result;
    } else {
      const params = new URLSearchParams({
        query: search.value,
        offset: String(offset.value),
        limit: "20",
      });
      if (filter.value) params.set("confidential", filter.value);
      const result = await api<Page>(`/memories?${params}`);
      if (request === sequence) page.value = result;
    }
  });
  if (request === sequence) loading.value = false;
}
function edit(memory: Memory | "new") {
  editing.value = memory;
  content.value = memory === "new" ? "" : memory.content;
  confidential.value = memory === "new" ? true : memory.confidential;
}
async function save() {
  busy.value = true;
  const current = editing.value;
  const ok = await action(async () => {
    await api(
      current === "new" ? "/memories" : `/memories/${(current as Memory).id}`,
      current === "new" ? "POST" : "PUT",
      {
        content: content.value,
        confidential: confidential.value,
        ...(current && current !== "new"
          ? { updated_at: current.updated_at }
          : {}),
      },
    );
    editing.value = null;
    await load();
  }, "Souvenir enregistré localement.");
  busy.value = false;
  return ok;
}
async function remove() {
  if (!deleting.value) return;
  busy.value = true;
  await action(async () => {
    const item = deleting.value!;
    await api(
      "tier" in item
        ? `/temporary/${item.id}`
        : `/memories/${item.id}?${new URLSearchParams({ updated_at: item.updated_at })}`,
      "DELETE",
    );
    deleting.value = null;
    offset.value = 0;
    await load();
  }, "Souvenir supprimé. Les anciens journaux et sauvegardes ne sont pas modifiés.");
  busy.value = false;
}
function toggle(id: string) {
  if (revealed.value.has(id)) revealed.value.delete(id);
  else revealed.value.add(id);
}
function searchNow() {
  offset.value = 0;
  load();
}
watch([tier, filter], () => {
  offset.value = 0;
  revealed.value.clear();
  load();
});
async function openLinkedMemory() {
  if (typeof route.query.edit !== "string") return;
  await action(async () => {
    edit(
      await api<Memory>(
        `/memories/${encodeURIComponent(route.query.edit as string)}`,
      ),
    );
  });
}
watch(() => route.query.edit, openLinkedMemory);
onMounted(async () => {
  await load();
  await openLinkedMemory();
});
</script>

<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">CE QUI RESTE</div>
      <h1>Mémoire<span class="heading-dot">.</span></h1>
      <p>Les souvenirs de votre compagnon, sous votre contrôle.</p>
    </div>
    <button class="button primary" :disabled="!!editing" @click="edit('new')">
      <Plus :size="18" /> Ajouter un souvenir
    </button>
  </div>
  <div class="tabs" role="tablist" aria-label="Niveau de mémoire">
    <button
      role="tab"
      :aria-selected="tier === 'durable'"
      :class="{ selected: tier === 'durable' }"
      @click="tier = 'durable'"
    >
      <Brain :size="17" /> Durable</button
    ><button
      role="tab"
      :aria-selected="tier === 'temporary'"
      :class="{ selected: tier === 'temporary' }"
      @click="tier = 'temporary'"
    >
      <Clock :size="17" /> Court & moyen terme
    </button>
  </div>
  <form v-if="editing" class="editor" @submit.prevent="save">
    <div class="section-heading">
      <h2>
        {{ editing === "new" ? "Nouveau souvenir" : "Modifier le souvenir" }}
      </h2>
      <button
        type="button"
        class="icon-button"
        title="Annuler la modification"
        aria-label="Annuler la modification"
        :disabled="busy"
        @click="editing = null"
      >
        <X :size="20" />
      </button>
    </div>
    <label
      >Contenu<textarea
        v-model="content"
        rows="4"
        required
        maxlength="4000"
        autofocus
      ></textarea>
    </label>
    <div class="form-actions spread">
      <label class="check-label"
        ><input v-model="confidential" type="checkbox" /> Confidentiel</label
      ><span class="muted small">{{ content.length }} / 4 000</span
      ><button class="button primary" :disabled="busy || !content.trim()">
        <Save :size="17" />{{ busy ? "Enregistrement…" : "Enregistrer" }}
      </button>
    </div>
    <p v-if="!confidential" class="small muted">
      Un souvenir ordinaire peut être sélectionné automatiquement par les
      clients de dialogue.
    </p>
  </form>
  <div class="toolbar">
    <form class="search-field" role="search" @submit.prevent="searchNow">
      <Search :size="18" /><input
        v-model="search"
        aria-label="Rechercher un souvenir"
        placeholder="Rechercher un souvenir…"
        maxlength="1200"
      /><button class="icon-button" title="Rechercher" aria-label="Rechercher">
        <ChevronRight :size="18" />
      </button>
    </form>
    <select
      v-if="tier === 'durable'"
      v-model="filter"
      aria-label="Filtrer par confidentialité"
    >
      <option value="">Tous les souvenirs</option>
      <option value="true">Confidentiels</option>
      <option value="false">Ordinaires</option></select
    ><button
      class="icon-button"
      title="Actualiser les souvenirs"
      aria-label="Actualiser les souvenirs"
      :disabled="loading"
      @click="load"
    >
      <RefreshCw :size="18" :class="{ spinning: loading }" />
    </button>
  </div>
  <div v-if="loading" role="status" class="loading-line">
    Chargement des souvenirs…
  </div>
  <template v-else-if="tier === 'durable'"
    ><div class="list-caption">
      {{ page.total }} souvenir{{ page.total > 1 ? "s" : "" }}
      <span>DU PLUS RÉCENT AU PLUS ANCIEN</span>
    </div>
    <div v-if="!page.items.length" class="empty-state">
      <Brain :size="38" />
      <h2>{{ search ? "Aucun résultat" : "Une mémoire encore vierge" }}</h2>
      <button v-if="!search" class="button" @click="edit('new')">
        <Plus :size="17" /> Ajouter un souvenir
      </button>
    </div>
    <article v-for="memory in page.items" :key="memory.id" class="memory-row">
      <div class="memory-row-heading">
        <span class="pill" :class="{ private: memory.confidential }"
          ><LockKeyhole v-if="memory.confidential" :size="13" />{{
            memory.confidential ? "Confidentiel" : "Ordinaire"
          }}</span
        ><time>{{ date(memory.created_at) }}</time>
        <div class="row-actions">
          <button
            v-if="memory.confidential"
            class="icon-button"
            :title="
              revealed.has(memory.id)
                ? 'Masquer le souvenir'
                : 'Afficher le souvenir'
            "
            :aria-label="
              revealed.has(memory.id)
                ? 'Masquer le souvenir'
                : 'Afficher le souvenir'
            "
            @click="toggle(memory.id)"
          >
            <EyeOff v-if="revealed.has(memory.id)" :size="17" /><Eye
              v-else
              :size="17"
            /></button
          ><button
            class="icon-button"
            title="Modifier le souvenir"
            aria-label="Modifier le souvenir"
            :disabled="!!editing"
            @click="edit(memory)"
          >
            <Pencil :size="17" /></button
          ><button
            class="icon-button danger-icon"
            title="Supprimer le souvenir"
            aria-label="Supprimer le souvenir"
            @click="deleting = memory"
          >
            <Trash2 :size="17" />
          </button>
        </div>
      </div>
      <p
        :class="{
          'muted private-placeholder':
            memory.confidential && !revealed.has(memory.id),
        }"
      >
        {{
          memory.confidential && !revealed.has(memory.id)
            ? "Contenu confidentiel masqué"
            : memory.content
        }}
      </p>
      <small class="mono muted">{{ memory.id }}</small>
    </article>
    <div v-if="page.total > 20" class="pagination">
      <span
        >{{ offset + 1 }}–{{ Math.min(offset + 20, page.total) }} sur
        {{ page.total }}</span
      ><button
        class="icon-button"
        title="Page précédente"
        aria-label="Page précédente"
        :disabled="offset === 0"
        @click="
          offset -= 20;
          load();
        "
      >
        <ChevronLeft /></button
      ><button
        class="icon-button"
        title="Page suivante"
        aria-label="Page suivante"
        :disabled="offset + 20 >= page.total"
        @click="
          offset += 20;
          load();
        "
      >
        <ChevronRight />
      </button></div
  ></template>
  <template v-else
    ><div class="list-caption">
      {{ visibleTemporary.length }} citation{{
        visibleTemporary.length > 1 ? "s" : ""
      }}
      <span>COURT TERME 24 H · MOYEN TERME 7 JOURS</span>
    </div>
    <div v-if="!visibleTemporary.length" class="empty-state">
      <Clock :size="38" />
      <h2>Aucune mémoire temporaire</h2>
    </div>
    <article
      v-for="memory in visibleTemporary"
      :key="memory.id"
      class="memory-row"
    >
      <div class="memory-row-heading">
        <span class="pill">{{
          memory.tier === "court" ? "Court terme" : "Moyen terme"
        }}</span
        ><time>Expire le {{ date(memory.expires) }}</time
        ><button
          class="icon-button danger-icon row-actions"
          title="Supprimer la citation"
          aria-label="Supprimer la citation"
          @click="deleting = memory"
        >
          <Trash2 :size="17" />
        </button>
      </div>
      <p>{{ memory.content }}</p>
    </article></template
  >
  <ConfirmDialog
    v-if="deleting"
    title="Supprimer ce souvenir ?"
    message="Cette suppression est définitive dans la mémoire active. Les copies dans les anciens journaux ou sauvegardes restent inchangées."
    confirm-label="Supprimer"
    :busy="busy"
    @cancel="deleting = null"
    @confirm="remove"
  />
</template>
