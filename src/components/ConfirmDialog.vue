<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { X, AlertTriangle } from "lucide-vue-next";
defineProps<{
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
}>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
const dialog = ref<HTMLDialogElement>();
const previous = document.activeElement as HTMLElement | null;
onMounted(() => dialog.value?.showModal());
onUnmounted(() => previous?.focus());
</script>
<template>
  <dialog ref="dialog" class="dialog" @cancel.prevent="!busy && emit('cancel')">
    <div class="dialog-heading">
      <AlertTriangle :size="22" />
      <h2>{{ title }}</h2>
      <button
        class="icon-button"
        title="Fermer"
        aria-label="Fermer"
        :disabled="busy"
        @click="emit('cancel')"
      >
        <X :size="20" />
      </button>
    </div>
    <p class="dialog-message">{{ message }}</p>
    <div class="form-actions">
      <button class="button" :disabled="busy" autofocus @click="emit('cancel')">
        Annuler</button
      ><button class="button danger" :disabled="busy" @click="emit('confirm')">
        {{ busy ? "En cours…" : confirmLabel || "Confirmer" }}
      </button>
    </div>
  </dialog>
</template>
