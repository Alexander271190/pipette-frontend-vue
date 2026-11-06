import { createRouter, createWebHistory } from 'vue-router';

const Home = {
  template: `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#f5f7fb;color:#1a1a2e;text-align:center;padding:20px;">
      <div style="font-size:4rem;margin-bottom:16px;">🚀</div>
      <h1 style="color:#16a34a;margin:0 0 8px;">Фундамент работает</h1>
      <p style="color:#64748b;">Vue 3 + TS + Vite + Pinia + Router + FontAwesome</p>
    </div>
  `,
};

const router = createRouter({
  history: createWebHistory('/'),
  routes: [{ path: '/', name: 'home', component: Home }],
});

export default router;
