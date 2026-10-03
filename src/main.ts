import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/space-grotesk/latin-500.css";
import "@fontsource/space-grotesk/latin-600.css";
import "./style.css";
import App from "./App.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/providers", component: () => import("./views/Providers.vue"), meta: { title: "Fournisseurs IA" } },
    {
      path: "/",
      component: () => import("./views/Dashboard.vue"),
      meta: { title: "Vue d’ensemble" },
    },
    {
      path: "/memories",
      component: () => import("./views/Memories.vue"),
      meta: { title: "Mémoire" },
    },
    {
      path: "/people",
      component: () => import("./views/People.vue"),
      meta: { title: "Personnes" },
    },
    {
      path: "/chat",
      component: () => import("./views/Chat.vue"),
      meta: { title: "Conversation" },
    },
    {
      path: "/settings",
      component: () => import("./views/Settings.vue"),
      meta: { title: "Personnalisation" },
    },
    {
      path: "/schedule",
      component: () => import("./views/Schedule.vue"),
      meta: { title: "Initiatives" },
    },
    {
      path: "/system",
      component: () => import("./views/System.vue"),
      meta: { title: "Système & journaux" },
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

createApp(App).use(router).mount("#app");
