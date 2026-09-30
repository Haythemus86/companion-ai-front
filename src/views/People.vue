<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Users,
  Search,
  ArrowUpRight,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-vue-next";
import { action, api, date, type Person } from "../api";
const people = ref<Person[]>([]);
const search = ref("");
const selected = ref<Person | null>(null);
const loading = ref(true);
const revealed = ref(new Set<string>());
const filtered = computed(() =>
  people.value.filter((person) =>
    person.personne
      .toLocaleLowerCase()
      .includes(search.value.toLocaleLowerCase()),
  ),
);
onMounted(async () => {
  await action(async () => {
    people.value = await api<Person[]>("/people");
  });
  loading.value = false;
});
function reveal(id: string) {
  revealed.value.has(id) ? revealed.value.delete(id) : revealed.value.add(id);
}
</script>
<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">LES LIENS QUI COMPTENT</div>
      <h1>Personnes<span class="heading-dot">.</span></h1>
      <p>Fiches locales, construites à partir des souvenirs existants.</p>
    </div>
    <span class="pill"
      >{{ people.length }} fiche{{ people.length > 1 ? "s" : "" }}</span
    >
  </div>
  <div class="toolbar">
    <label class="search-field"
      ><Search :size="18" /><input
        v-model="search"
        placeholder="Rechercher une personne…"
        aria-label="Rechercher une personne"
    /></label>
  </div>
  <div v-if="loading" class="loading-line">Chargement des fiches…</div>
  <div v-else-if="!filtered.length" class="empty-state">
    <Users :size="38" />
    <h2>Aucune personne trouvée</h2>
    <RouterLink to="/memories" class="text-link"
      >Voir les souvenirs <ArrowUpRight :size="16"
    /></RouterLink>
  </div>
  <div v-else class="people-layout">
    <div class="people-list">
      <button
        v-for="person in filtered"
        :key="person.cle"
        class="person-item"
        :class="{ selected: selected?.cle === person.cle }"
        @click="
          selected = person;
          revealed.clear();
        "
      >
        <span class="avatar">{{ person.personne[0] }}</span
        ><span
          ><strong>{{ person.personne }}</strong
          ><small>{{
            [...new Set(person.relations.map((item) => item.relation))].join(
              ", ",
            ) || "Lien non précisé"
          }}</small></span
        ><ArrowUpRight :size="17" />
      </button>
    </div>
    <section v-if="selected" class="person-detail">
      <div class="section-heading">
        <h2>{{ selected.personne }}</h2>
        <span class="pill"
          >{{ selected.sources.length }} source{{
            selected.sources.length > 1 ? "s" : ""
          }}</span
        >
      </div>
      <div v-if="selected.identite_a_confirmer" class="notice warning">
        Identité à confirmer : plusieurs relations portent ce prénom.
      </div>
      <div
        v-for="point in selected.points_a_verifier"
        :key="point.sujet"
        class="notice warning"
      >
        {{ point.sujet }} : {{ point.statut }}
      </div>
      <article
        v-for="source in selected.sources"
        :key="source.id"
        class="source-item"
      >
        <div>
          <time>{{ date(source.enregistre_le) }}</time
          ><button
            v-if="source.confidentiel"
            class="icon-button"
            :title="
              revealed.has(source.id)
                ? 'Masquer la source'
                : 'Afficher la source'
            "
            :aria-label="
              revealed.has(source.id)
                ? 'Masquer la source'
                : 'Afficher la source'
            "
            @click="reveal(source.id)"
          >
            <EyeOff v-if="revealed.has(source.id)" :size="16" /><Eye
              v-else
              :size="16"
            />
          </button>
        </div>
        <p v-if="source.confidentiel && !revealed.has(source.id)" class="muted">
          <LockKeyhole :size="15" /> Source confidentielle masquée
        </p>
        <p v-else>{{ source.contenu }}</p>
      </article>
      <RouterLink v-if="selected.suite" to="/memories" class="text-link"
        >Autres sources dans la mémoire <ArrowUpRight :size="16"
      /></RouterLink>
    </section>
    <div v-else class="empty-state">
      <Users :size="32" />
      <h2>Aucune fiche sélectionnée</h2>
    </div>
  </div>
</template>
