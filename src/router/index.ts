import { createRouter, createWebHistory } from 'vue-router';

const Placeholder = {
  template: '<div style="padding:40px;font-family:sans-serif;">Заглушка — Этап 1 прошёл успешно</div>',
};

const router = createRouter({
  history: createWebHistory('/v2/'),
  routes: [
    { path: '/', name: 'home', component: Placeholder },
  ],
});

export default router;
