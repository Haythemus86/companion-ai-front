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
import { action, api, date, type Person, type Memory } from "../api";
import ConfirmDialog from "../components/ConfirmDialog.vue";
const people = ref<Person[]>([]);
const search = ref("");
const selected = ref<Person | null>(null);
const loading = ref(true);
const detailLoading = ref(false);
const busy = ref(false);
const offset = ref(0);
const revealed = ref(new Set<string>());
const association = ref<Person["sources"][number] | null>(null);
const target = ref("new");
const confirming = ref(false);
let sequence = 0;
const identities = computed(() =>
  people.value.filter((person) => person.person_id),
);
const filtered = computed(() =>
  people.value.filter((person) =>
    [person.personne, ...person.alias, person.person_id ?? ""].some((value) =>
      value.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()),
    ),
  ),
);
const confirmation = computed(() => {
  const destination = identities.value.find(
    (person) => person.person_id === target.value,
  );
  const operation =
    target.value === "new"
      ? "Créer une nouvelle identité pour ce souvenir"
      : target.value === "none"
        ? "Retirer l’identité de ce souvenir"
        : `Associer ce souvenir à ${destination?.personne} (${target.value})`;
  return `${operation} ? Cette attribution concerne uniquement cette source et peut être annulée par une nouvelle association. Aucun envoi à une IA.`;
});
async function fetchPeople() {
  people.value = await api<Person[]>("/people");
}
async function selectPerson(key: string, start = 0) {
  const request = ++sequence;
  detailLoading.value = true;
  selected.value = null;
  association.value = null;
  revealed.value.clear();
  await action(async () => {
    const result = await api<Person>(
      `/people/${encodeURIComponent(key)}?offset=${start}`,
    );
    if (request === sequence) {
      selected.value = result;
      offset.value = start;
    }
  });
  if (request === sequence) detailLoading.value = false;
}
async function refresh() {
  loading.value = true;
  const key = selected.value?.cle;
  ++sequence;
  selected.value = null;
  association.value = null;
  revealed.value.clear();
  const ok = await action(fetchPeople);
  loading.value = false;
  if (ok && key && people.value.some((person) => person.cle === key))
    await selectPerson(key);
}
function beginAssociation(source: Person["sources"][number]) {
  association.value = source;
  target.value = selected.value?.person_id ?? "new";
}
async function associate() {
  if (!association.value || busy.value) return;
  busy.value = true;
  const source = association.value;
  const ok = await action(async () => {
    const updated = await api<Memory>(`/memories/${source.id}/person`, "PUT", {
      updated_at: source.modifie_le,
      target: target.value,
    });
    confirming.value = false;
    association.value = null;
    selected.value = null;
    revealed.value.clear();
    await fetchPeople();
    const destination =
      updated.person_id ??
      people.value.find((person) =>
        person.sources.some((item) => item.id === source.id),
      )?.cle;
    if (destination) await selectPerson(destination);
  }, "Association enregistrée localement.");
  if (!ok) confirming.value = false;
  busy.value = false;
}
function reveal(id: string) {
  revealed.value.has(id) ? revealed.value.delete(id) : revealed.value.add(id);
}
onMounted(refresh);
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
        placeholder="Prénom, alias ou identifiant…"
        aria-label="Rechercher une personne"
    /></label>
    <button
      class="button"
      :disabled="loading || busy || detailLoading"
      @click="refresh"
    >
      Actualiser les personnes
    </button>
  </div>
  <div v-if="loading" class="loading-line" role="status">
    Chargement des fiches…
  </div>
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
        :disabled="busy"
        :class="{ selected: selected?.cle === person.cle }"
        @click="selectPerson(person.cle)"
      >
        <span class="avatar">{{ person.personne[0] }}</span>
        <span
          ><strong>{{ person.personne }}</strong>
          <small>{{
            person.person_id
              ? `Identité ${person.person_id.slice(0, 8)}`
              : "Regroupement par prénom"
          }}</small> </span
        ><ArrowUpRight :size="17" />
      </button>
    </div>
    <div v-if="detailLoading" class="loading-line" role="status">
      Chargement des sources…
    </div>
    <section v-else-if="selected" class="person-detail">
      <div class="section-heading">
        <h2>{{ selected.personne }}</h2>
        <span class="pill">{{ selected.total_sources }} sources</span>
      </div>
      <p class="person-identity">
        {{
          selected.person_id
            ? `Identité : ${selected.person_id}`
            : "Identité non attribuée : regroupement par prénom."
        }}
      </p>
      <p class="small muted">
        Alias présents dans les sources : {{ selected.alias.join(", ") }}
      </p>
      <div v-if="selected.identite_a_confirmer" class="notice warning">
        Identité à confirmer : plusieurs déclarations de relation portent ce
        prénom. Attribuez chaque source à la bonne personne.
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
          <time>Enregistré le {{ date(source.enregistre_le) }}</time>
          <button
            v-if="source.confidentiel"
            class="icon-button"
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
        <small v-if="source.modifie_le !== source.enregistre_le" class="muted"
          >Modifié le {{ date(source.modifie_le) }}</small
        >
        <p v-if="source.confidentiel && !revealed.has(source.id)" class="muted">
          <LockKeyhole :size="15" /> Source confidentielle masquée
        </p>
        <template v-else>
          <p>{{ source.contenu }}</p>
          <small
            v-for="link in selected.relations.filter(
              (item) => item.source === source.id,
            )"
            :key="link.relation"
            class="muted"
            >Relation déclarée : {{ link.relation }}</small
          >
          <ul v-if="source.faits.length" class="source-facts">
            <li v-for="(fact, index) in source.faits" :key="index">
              {{
                fact.attribut === "age" ? "Âge déclaré" : "Préférence déclarée"
              }}
              : {{ fact.valeur }}{{ fact.attribut === "age" ? " ans" : "" }}
              {{
                fact.polarite === "negative"
                  ? fact.cessation
                    ? "(cessation déclarée)"
                    : "(négative)"
                  : ""
              }}
            </li>
          </ul>
          <small v-if="source.faits.length" class="muted"
            >Extraction du texte, à vérifier ; la date de saisie ne date pas le
            fait.</small
          >
        </template>
        <div class="source-actions">
          <RouterLink
            :to="{ path: '/memories', query: { edit: source.id } }"
            class="text-link"
            >Modifier le souvenir <ArrowUpRight :size="16"
          /></RouterLink>
          <button
            class="button"
            :disabled="busy"
            @click="beginAssociation(source)"
          >
            Attribuer une identité
          </button>
        </div>
        <form
          v-if="association?.id === source.id"
          class="association-editor"
          @submit.prevent="confirming = true"
        >
          <label
            >Identité à attribuer<select v-model="target" :disabled="busy">
              <option value="new">Créer une nouvelle identité</option>
              <option
                v-for="person in identities"
                :key="person.cle"
                :value="person.person_id!"
              >
                {{ person.personne }} · {{ person.person_id }}
              </option>
              <option v-if="selected.person_id" value="none">
                Retirer l’association
              </option>
            </select></label
          >
          <p class="small muted">
            Une source attribuée doit nommer une seule personne. Les autres
            sources ne seront pas déplacées.
          </p>
          <div class="form-actions">
            <button
              type="button"
              class="button"
              :disabled="busy"
              @click="association = null"
            >
              Annuler
            </button>
            <button
              class="button primary"
              :disabled="busy || target === selected.person_id"
            >
              Vérifier l’association
            </button>
          </div>
        </form>
      </article>
      <div v-if="(selected.total_sources ?? 0) > 20" class="pagination">
        <span
          >{{ offset + 1 }}–{{ offset + selected.sources.length }} sur
          {{ selected.total_sources }}</span
        >
        <button
          class="button"
          :disabled="offset === 0 || busy"
          @click="selectPerson(selected.cle, Math.max(0, offset - 20))"
        >
          Sources précédentes
        </button>
        <button
          class="button"
          :disabled="selected.suite === null || busy"
          @click="selectPerson(selected.cle, selected.suite!)"
        >
          Sources suivantes
        </button>
      </div>
    </section>
    <div v-else class="empty-state">
      <Users :size="32" />
      <h2>Aucune fiche sélectionnée</h2>
    </div>
  </div>
  <ConfirmDialog
    v-if="confirming"
    title="Confirmer l’attribution"
    :message="confirmation"
    confirm-label="Confirmer l’association"
    :busy="busy"
    @cancel="confirming = false"
    @confirm="associate"
  />
</template>
