<script setup lang="ts">
defineProps<{ modelValue: Record<string, string> }>();
const emit = defineEmits<{
  "update:modelValue": [value: Record<string, string>];
}>();
const questions = [
  ["first_name", "Quel est ton prénom ?"],
  ["family_name", "Quel est ton nom de famille ?"],
  ["age", "Quel âge as-tu ? (0 à 12 ans)"],
  ["gender", "Comment souhaites-tu te présenter : fille, garçon, autrement ?"],
  ["birthday", "Quelle est ta date de naissance ? (JJ/MM ou JJ/MM/AAAA)"],
  [
    "parents",
    "Comment appelles-tu tes parents ou les adultes qui prennent soin de toi ?",
  ],
  ["siblings", "As-tu des frères et sœurs ? Comment s’appellent-ils ?"],
  ["cousins", "Quels cousins ou cousines souhaites-tu présenter ?"],
  ["manga", "Aimes-tu les mangas ? Lesquels ?"],
  ["cartoons", "Quels dessins animés aimes-tu ?"],
  ["reading", "Aimes-tu lire ? Quels livres ?"],
  ["cinema", "Aimes-tu le cinéma ? Quels films ?"],
  ["sports", "Quels sports aimes-tu ?"],
  ["games", "Quels jeux et autres activités aimes-tu ?"],
];
function update(values: Record<string, string>, key: string, event: Event) {
  const next = { ...values };
  const value = (event.target as HTMLInputElement).value;
  if (value) next[key] = value;
  else delete next[key];
  emit("update:modelValue", next);
}
</script>
<template>
  <fieldset class="form-stack">
    <legend>Faisons connaissance</legend>
    <p class="muted">
      À remplir avec un parent ou responsable adulte. Toutes les questions sont
      facultatives : laissez vide pour passer. Le nom de famille et l’année de
      naissance ne sont pas nécessaires.
    </p>
    <label v-for="[key, question] in questions" :key="key">
      {{ question }}
      <input
        :value="modelValue[key] || ''"
        maxlength="160"
        :aria-label="question"
        @input="update(modelValue, key!, $event)"
      />
    </label>
    <p class="muted small">
      Ces réponses constituent la base personnelle du dialogue. Leur utilisation
      par une IA dépend des autorisations de partage ci-dessous.
    </p>
  </fieldset>
</template>
