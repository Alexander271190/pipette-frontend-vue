<template>
  <router-view />
  <ToastHost />
  <ConfirmHost />
  <PromptHost />
  <RowActionsMenu />
  <!-- Глобальные модалки -->
  <PipetteFormModal />
  <HistoryModal />
  <QuickCalModal />
  <TransferModal />
  <ChangePasswordModal />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { setUnauthorizedHandler, setPasswordRequiredHandler } from '@/api/client';
import { useRouter } from 'vue-router';
import { useUiStore } from '@/stores/ui';
import ToastHost from '@/components/ui/ToastHost.vue';
import ConfirmHost from '@/components/ui/ConfirmHost.vue';
import PromptHost from '@/components/ui/PromptHost.vue';
import RowActionsMenu from '@/components/ui/RowActionsMenu.vue';
import PipetteFormModal from '@/components/modals/PipetteFormModal.vue';
import HistoryModal from '@/components/modals/HistoryModal.vue';
import QuickCalModal from '@/components/modals/QuickCalModal.vue';
import TransferModal from '@/components/modals/TransferModal.vue';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal.vue';

const auth = useAuthStore();
const router = useRouter();
const ui = useUiStore();

onMounted(() => {
  auth.initFromStorage();

  setUnauthorizedHandler(() => {
    auth.logout();
    if (router.currentRoute.value.path !== '/login') router.push('/login');
  });

  setPasswordRequiredHandler((mode) => {
    ui.open('changePassword', mode);
  });
});
</script>
