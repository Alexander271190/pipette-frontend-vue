<template>
  <div style="min-height:100vh;padding:40px;font-family:system-ui,sans-serif;background:#f5f7fb;">
    <div style="max-width:700px;margin:0 auto;background:#fff;padding:32px;border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,.06);">
      <h1 style="color:#16a34a;margin:0 0 12px;">✓ Вход выполнен</h1>
      <p style="color:#475569;margin-bottom:8px;">
        <strong>{{ auth.user?.fullName }}</strong> — {{ auth.user?.position }}
      </p>
      <p style="color:#94a3b8;font-size:.9rem;">
        Роль: {{ auth.user?.roleName || auth.user?.role }}<br>
        Отдел: {{ auth.user?.department || '—' }}<br>
        Админ: {{ auth.isAdmin ? 'да' : 'нет' }}
      </p>
      <div style="margin-top:24px;">
        <button class="btn btn-secondary" @click="onLogout">
          <i class="fa-solid fa-right-from-bracket"></i> Выйти
        </button>
      </div>
      <p style="color:#94a3b8;font-size:.8rem;margin-top:24px;">
        Блок 3: здесь будет Header + Toolbar + Таблица с данными из API.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';

const auth = useAuthStore();
const toast = useToastStore();
const router = useRouter();

function onLogout() {
  auth.logout();
  toast.success('Вы вышли из системы');
  router.push('/login');
}
</script>
