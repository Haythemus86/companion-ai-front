<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import {
  LayoutDashboard,
  Brain,
  Users,
  MessagesSquare,
  SlidersHorizontal,
  Sparkles,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Menu,
  X,
  ShieldCheck,
  Bot,
} from "lucide-vue-next";
import { state, action, refreshStatus, ageLabel } from "./api";

const route = useRoute();
const menu = ref(false);
const links = [
  { to: "/providers", label: "Fournisseurs IA", icon: Bot },
  { to: "/", label: "Vue d’ensemble", icon: LayoutDashboard },
  { to: "/chat", label: "Conversation", icon: MessagesSquare },
  { to: "/memories", label: "Mémoire", icon: Brain },
  { to: "/people", label: "Personnes", icon: Users },
  { to: "/settings", label: "Personnalisation", icon: SlidersHorizontal },
  { to: "/schedule", label: "Initiatives", icon: Sparkles },
  { to: "/system", label: "Système & journaux", icon: Activity },
];
onMounted(() => action(refreshStatus));
function focusContent() {
  document.getElementById("main")?.focus();
}
</script>

<template>
  <a class="skip-link" href="#main" @click.prevent="focusContent">Aller au contenu</a>
  <div v-if="menu" class="nav-scrim" @click="menu = false"></div>
  <aside class="sidebar" :class="{ open: menu }">
    <RouterLink to="/" class="brand" @click="menu = false"
      ><span class="brand-mark"><Bot :size="25" /></span
      ><span
        >companion<span class="brand-sub">ESPACE D’ADMINISTRATION</span></span
      ></RouterLink
    >
    <button
      class="icon-button close-nav"
      title="Fermer le menu"
      aria-label="Fermer le menu"
      @click="menu = false"
    >
      <X />
    </button>
    <div class="workspace-label">MON COMPANION <span>01</span></div>
    <nav aria-label="Navigation principale">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="nav-link"
        active-class="active"
        :exact-active-class="'active'"
        @click="menu = false"
        ><component :is="link.icon" :size="19" /><span>{{ link.label }}</span
        ><span v-if="link.to === '/'" class="nav-dot"></span
      ></RouterLink>
    </nav>
    <div class="sidebar-bottom">
      <ShieldCheck :size="20" />
      <div>
        <strong>Votre espace local</strong
        ><small>Données sur cet appareil</small>
      </div>
    </div>
    <RouterLink to="/settings" class="owner-link" @click="menu = false"
      ><span class="avatar">{{
        (state.status?.owner?.preferences?.nickname || "P")
          .slice(0, 1)
          .toUpperCase()
      }}</span>
      <div>
        <strong>{{
          state.status?.owner?.preferences?.nickname || "Propriétaire"
        }}</strong
        ><small>{{ ageLabel(state.status?.owner?.age_profile) }}</small>
      </div>
      <ArrowUpRight :size="16"
    /></RouterLink>
  </aside>
  <div class="workspace">
    <header class="topbar">
      <div class="breadcrumb">
        <button
          class="icon-button mobile-menu"
          title="Ouvrir le menu"
          aria-label="Ouvrir le menu"
          @click="menu = true"
        >
          <Menu /></button
        ><span>Companion AI</span><span class="separator">/</span
        ><strong>{{ route.meta.title }}</strong>
      </div>
      <div class="header-status">
        <span class="status-dot" :class="{ off: !state.online }"></span
        >{{
          state.loading
            ? "Connexion…"
            : state.online
              ? "API locale connectée"
              : "API déconnectée"
        }}<button
          class="icon-button"
          title="Actualiser la connexion"
          aria-label="Actualiser la connexion"
          :disabled="state.loading"
          @click="action(refreshStatus)"
        >
          <RefreshCw :size="16" :class="{ spinning: state.loading }" />
        </button>
      </div>
    </header>
    <main id="main" tabindex="-1">
      <div v-if="state.error" role="alert" class="notice error">
        <span>{{ state.error }}</span
        ><button
          class="icon-button"
          title="Fermer l’erreur"
          aria-label="Fermer l’erreur"
          @click="state.error = ''"
        >
          <X :size="18" />
        </button>
      </div>
      <div v-if="state.notice" role="status" class="notice success">
        <span>{{ state.notice }}</span
        ><button
          class="icon-button"
          title="Fermer la notification"
          aria-label="Fermer la notification"
          @click="state.notice = ''"
        >
          <X :size="18" />
        </button>
      </div>
      <div v-if="!state.status" class="empty-state">
        <Activity :size="36" />
        <h1>
          {{
            state.loading ? "Connexion à Companion" : "Companion est hors ligne"
          }}
        </h1>
        <button
          class="button primary"
          :disabled="state.loading"
          @click="action(refreshStatus)"
        >
          <RefreshCw :size="17" /> Réessayer
        </button>
      </div>
      <template v-else
        ><div
          v-if="!state.status.configured && route.path !== '/'"
          class="notice warning"
        >
          Aucun propriétaire configuré.<RouterLink to="/"
            >Configurer Companion</RouterLink
          >
        </div>
        <RouterView v-else
      /></template>
    </main>
    <footer>
      <span>COMPANION AI <span class="footer-dot">·</span> CONSOLE LOCALE</span
      ><span>Prototype supervisé <span class="footer-dot">·</span> v0.1</span>
    </footer>
  </div>
</template>
