<template>
  <AppModal :visible="ui.activeModal === 'form'" @close="close" modal-class="modal-xl">
    <h2>
      <i class="fa-solid" :class="isEdit ? 'fa-pen' : 'fa-plus'"></i>
      {{ isEdit ? 'Редактировать оборудование' : 'Добавить оборудование' }}
    </h2>

    <div v-if="loadingData" style="text-align:center;padding:30px;color:#94a3b8;">
      <i class="fa-solid fa-spinner fa-spin"></i> Загрузка…
    </div>

    <form v-else @submit.prevent="onSubmit" novalidate>
      <div v-for="f in visibleFields" :key="f.id" class="form-group">
        <label>{{ f.label }}<span v-if="f.required"> *</span></label>

        <!-- ID -->
        <input
          v-if="f.id === 'id'"
          v-model="form[f.id]"
          type="text"
          :readonly="isEdit"
          :disabled="isEdit"
          :style="isEdit ? { background: '#f1f5f9', cursor: 'not-allowed' } : {}"
          :title="isEdit ? 'ID присваивается автоматически' : ''"
        />

        <!-- select -->
        <select
          v-else-if="f.type === 'select'"
          v-model="form[f.id]"
          :disabled="isFieldDisabled(f.id)"
          :style="isFieldDisabled(f.id) ? { background: '#f1f5f9', cursor: 'not-allowed' } : {}"
          @change="onSelectChange(f.id, $event)"
        >
          <option v-for="opt in getOptions(f)" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
        </select>

        <!-- textarea -->
        <textarea
          v-else-if="f.type === 'textarea'"
          v-model="form[f.id]"
          rows="2"
          :placeholder="f.label"
        ></textarea>

        <!-- date -->
        <input
          v-else-if="f.type === 'date'"
          v-model="form[f.id]"
          type="date"
        />

        <!-- number -->
        <input
          v-else-if="f.type === 'number'"
          v-model="form[f.id]"
          type="number"
        />

        <!-- text (default) -->
        <input
          v-else
          v-model="form[f.id]"
          type="text"
          :placeholder="f.label"
          :disabled="isFieldDisabled(f.id)"
          :style="isFieldDisabled(f.id) ? { background: '#f1f5f9', cursor: 'not-allowed' } : {}"
        />
      </div>

      <div v-if="error" class="auth-error" style="margin-top:8px;visibility:visible;opacity:1;">{{ error }}</div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
        <button type="submit" class="btn btn-success" :disabled="saving">
          <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
          {{ saving ? 'Сохранение…' : 'Сохранить' }}
        </button>
      </div>
    </form>
  </AppModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import AppModal from '@/components/ui/AppModal.vue';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { usePipettesStore } from '@/stores/pipettes';
import { useStatsStore } from '@/stores/stats';
import { useToastStore } from '@/stores/toast';
import { showLockWarning } from '@/composables/useLockWarning';
import { todayStr } from '@/utils/format';
import * as api from '@/api/pipettes';
import type { FieldConfig } from '@/api/settings';
import type { Pipette } from '@/types';

const ui = useUiStore();
const auth = useAuthStore();
const settings = useSettingsStore();
const pip = usePipettesStore();
const stats = useStatsStore();
const toast = useToastStore();

const form = ref<Record<string, string>>({});
const loadingData = ref(false);
const saving = ref(false);
const error = ref('');
const editId = ref<string | null>(null);

let _heartbeat: number | null = null;
let _skipUnlock = false;

const isEdit = computed(() => !!editId.value);
const visibleFields = computed<FieldConfig[]>(() => {
  return settings.fields.filter(f => f.enabled).sort((a, b) => (a.order || 0) - (b.order || 0));
});

// Спецобработчики для select-полей
function getOptions(f: FieldConfig): { value: string; label: string }[] {
  if (f.id === 'equipmentType') {
    return settings.equipmentTypes.map(t => ({ value: t.value, label: t.label }));
  }
  if (f.id === 'result') {
    return [
      { value: 'pass', label: '✅ Годен' },
      { value: 'fail', label: '❌ Брак' },
      { value: 'wip',  label: '⏳ В процессе' },
    ];
  }
  if (f.id === 'active') {
    return [
      { value: 'true',  label: '✅ В работе' },
      { value: 'false', label: '⛔ Не используется' },
    ];
  }
  if (f.id === 'department') {
    return [
      { value: '', label: '— не указан —' },
      ...settings.departments.map(d => ({ value: d, label: d })),
    ];
  }
  if (f.id === 'responsible') {
    const opts: { value: string; label: string }[] = [];
    if (!f.required) opts.push({ value: '', label: '— не указан —' });
    const self = auth.user?.fullName || '';
    if (auth.isAdmin) {
      // TODO: загрузить responsibles, показываем только себя и тех, что уже есть
      if (self) opts.push({ value: self, label: self });
      const current = form.value.responsible;
      if (current && current !== self) opts.push({ value: current, label: current });
    } else if (auth.user?.isActing && auth.user?.actingForName) {
      opts.push({ value: auth.user.actingForName, label: `${auth.user.actingForName} (основной)` });
    } else if (self) {
      opts.push({ value: self, label: self });
    }
    return opts;
  }
  // Кастомный select — из options
  const raw = Array.isArray(f.options) ? f.options : [];
  const opts = raw.map(o => ({ value: o, label: o }));
  if (!f.required && !opts.some(o => o.value === '')) {
    return [{ value: '', label: '—' }, ...opts];
  }
  return opts;
}

function isFieldDisabled(fid: string): boolean {
  if (fid === 'department' && auth.user?.isActing) return true;
  if (fid === 'responsible' && !auth.isAdmin) return true;
  return false;
}

async function onSelectChange(fid: string, e: Event) {
  if (fid === 'equipmentType') {
    // Обновить interval
    const typeVal = (e.target as HTMLSelectElement).value;
    const t = settings.equipmentTypes.find(x => x.value === typeVal);
    const interval = t?.interval && t.interval > 0 ? t.interval : 12;
    if ('interval' in form.value) form.value.interval = String(interval);

    // Обновить ID (только при создании)
    if (!isEdit.value) {
      try {
        const res = await api.getNextId(typeVal);
        form.value.id = res.nextId;
      } catch { /* ignore */ }
    }
  }
}

async function openForm() {
  const data = ui.modalData as string | null;
  editId.value = data || null;
  error.value = '';
  form.value = {};
  _skipUnlock = false;

  loadingData.value = true;

  try {
    // 1) Проверка блокировки при edit
    if (editId.value) {
      try {
        const lockRes = await api.getLock(editId.value);
        if (lockRes.locked && !lockRes.mine) {
          const proceed = await showLockWarning(lockRes, 'Редактирование');
          if (!proceed) { ui.close(); return; }
        }
        await api.setLock(editId.value);

        // Heartbeat
        _heartbeat = window.setInterval(async () => {
          if (!editId.value) return;
          try {
            const r = await api.getLock(editId.value);
            if (!r.locked || !r.mine) {
              if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
              _skipUnlock = true;
              toast.warn(`Сессия завершена. Прибор забрал ${r.lockedBy || 'другой пользователь'}`);
              ui.close();
            }
          } catch { /* ignore */ }
        }, 3000);
      } catch (e) {
        toast.error('Ошибка проверки блокировки');
        ui.close();
        return;
      }
    }

    // 2) Загрузить данные
    if (editId.value) {
      let p: Pipette | null = pip.items.find(x => x.id === editId.value) || null;
      try {
        const fresh = await api.getById(editId.value);
        if (fresh) p = fresh;
      } catch { /* ignore */ }
      if (!p) { toast.error('Оборудование не найдено'); ui.close(); return; }

      // Заполнить form
      const f: Record<string, string> = {};
      for (const field of visibleFields.value) {
        let v: unknown = (p as Record<string, unknown>)[field.id];
        if (field.id === 'equipmentType') v = p.equipment_type || 'pipette';
        if (field.id === 'lastCalibration') {
          const m = String(p.last_calibration || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
          v = m ? `${m[1]}-${m[2]}-${m[3]}` : '';
        }
        if (field.id === 'result') v = p.last_result || 'pass';
        if (field.id === 'active') v = p.active ? 'true' : 'false';
        f[field.id] = v == null ? '' : String(v);
      }
      form.value = f;
    } else {
      // Создание — defaults
      let nextId = '';
      try {
        const res = await api.getNextId('pipette');
        nextId = res.nextId;
      } catch { /* ignore */ }

      const defaults: Record<string, string> = {
        id: nextId,
        lastCalibration: todayStr(),
        interval: '12',
        result: 'pass',
        active: 'true',
      };
      if (isFieldVisible('equipmentType')) defaults.equipmentType = 'pipette';
      if (!auth.isAdmin) {
        if (auth.user?.isActing && auth.user?.actingForName) {
          defaults.responsible = auth.user.actingForName;
          if (auth.user.actingDepartment) defaults.department = auth.user.actingDepartment;
        } else {
          defaults.responsible = auth.user?.fullName || '';
          if (auth.user?.onlyOwnDepartment && auth.user?.department) {
            defaults.department = auth.user.department;
          }
        }
      }
      form.value = defaults;
    }
  } finally {
    loadingData.value = false;
  }
}

function isFieldVisible(fid: string): boolean {
  return visibleFields.value.some(f => f.id === fid);
}

watch(() => ui.activeModal, (v) => {
  if (v === 'form') openForm();
});

onUnmounted(async () => {
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  if (editId.value && !_skipUnlock) {
    try { await api.releaseLock(editId.value); } catch { /* ignore */ }
  }
});

async function onSubmit() {
  error.value = '';
  const payload: Record<string, string> = { ...form.value };

  // Проверка обязательных
  const missing: string[] = [];
  for (const f of visibleFields.value) {
    if (!f.required) continue;
    if (!String(payload[f.id] || '').trim()) missing.push(f.label);
  }
  if (missing.length) {
    error.value = 'Заполните: ' + missing.join(', ');
    return;
  }

  saving.value = true;
  try {
    if (isEdit.value && editId.value) {
      await api.updatePipette(editId.value, payload);
      toast.success('Оборудование обновлено');
    } else {
      const res = await api.createPipette(payload);
      toast.success(`Оборудование создано (${res.id || payload.id})`);
    }
    _skipUnlock = true;
    ui.close();
    await pip.loadPaged();
    await stats.load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

async function close() {
  if (_heartbeat) { clearInterval(_heartbeat); _heartbeat = null; }
  if (editId.value && !_skipUnlock) {
    try { await api.releaseLock(editId.value); } catch { /* ignore */ }
  }
  ui.close();
}
</script>
