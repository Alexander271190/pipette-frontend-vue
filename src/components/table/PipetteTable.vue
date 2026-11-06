<template>
  <div class="table-wrapper">
    <table id="pipettes-table" :style="tableStyle">
      <colgroup>
        <col v-for="colId in ['__checkbox', ...columns, '__actions']" :key="colId" :style="colStyle(colId)">
      </colgroup>
      <thead>
        <tr>
          <th class="col-checkbox">
            <input
              type="checkbox"
              id="select-all-checkbox"
              :checked="allChecked"
              :indeterminate.prop="someChecked"
              :disabled="pip.items.length === 0"
              @change="onSelectAll"
              title="Выбрать все"
            />
          </th>
          <th
            v-for="colId in columns"
            :key="colId"
            :class="`col-${colId}`"
            :data-col-id="colId"
            :style="thStyle(colId)"
            @click="onHeaderClick(colId)"
          >
            {{ labelFor(colId) }}
            <span v-if="isSortable(colId)" class="sort-arrow">{{ sortArrow(colId) }}</span>
          </th>
          <th id="actions-header" data-col-id="__actions">Действия</th>
        </tr>
      </thead>
      <tbody>
        <PipetteRow
          v-for="p in pip.items"
          :key="p.id"
          :p="p"
          :columns="columns"
          :is-selected="pip.selected.has(p.id)"
          :all-columns="allColumns"
          @toggle-select="onToggleSelect"
          @actions="onRowActions"
        />
      </tbody>
    </table>

    <div v-if="pip.items.length === 0 && !pip.loading" class="empty-state" style="display:block;padding:40px 20px;">
      <div class="icon" style="font-size:3rem;margin-bottom:10px;">
        <i class="fa-solid fa-flask-vial"></i>
      </div>
      <p>{{ emptyText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePipettesStore } from '@/stores/pipettes';
import { usePrefsStore } from '@/stores/prefs';
import { useSettingsStore } from '@/stores/settings';
import { SYSTEM_TABLE_COLUMNS, DEFAULT_TABLE_COLUMNS, SYSTEM_FIELD_IDS_IN_CONFIG } from '@/constants';
import type { TableColumn } from '@/constants';
import PipetteRow from './PipetteRow.vue';
import { useToastStore } from '@/stores/toast';

const pip = usePipettesStore();
const prefs = usePrefsStore();
const settings = useSettingsStore();
const toast = useToastStore();

// Все доступные колонки (системные + кастомные)
const allColumns = computed<TableColumn[]>(() => {
  const result: TableColumn[] = [];
  const added = new Set<string>();

  const fields = [...(settings.fields || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const f of fields) {
    if (!f.enabled) continue;
    const tableId = f.id === 'equipmentType' ? 'type' : f.id;
    const sys = SYSTEM_TABLE_COLUMNS.find(c => c.id === tableId);
    if (sys) { result.push(sys); added.add(tableId); }
    else if (!SYSTEM_FIELD_IDS_IN_CONFIG.has(f.id)) {
      result.push({ id: f.id, label: f.label, sortable: true, field: f.id });
      added.add(f.id);
    }
  }
  const extras: TableColumn[] = [
    { id: 'interval', label: 'МПИ', sortable: true, field: 'interval' },
    { id: 'notes',    label: 'Примечание', sortable: false, field: 'notes' },
    { id: 'result',   label: 'Результат', sortable: false, field: 'last_result' },
    { id: 'active',   label: 'Активность', sortable: false, field: 'active' },
    { id: 'nextCalibration', label: 'Следующая', sortable: true, field: 'nextCalibration' },
  ];
  for (const sys of [...SYSTEM_TABLE_COLUMNS, ...extras]) {
    if (!added.has(sys.id)) { result.push(sys); added.add(sys.id); }
  }
  return result;
});

// Видимые колонки в порядке columnOrder (или по умолчанию)
const columns = computed<string[]>(() => {
  const visible = new Set(prefs.visibleFields.length > 0 ? prefs.visibleFields : DEFAULT_TABLE_COLUMNS);
  const TABLE_ID_MAP: Record<string, string> = { equipmentType: 'type' };

  const cols: string[] = [];
  const added = new Set<string>();

  // 1) Порядок из prefs.columnOrder
  if (Array.isArray(prefs.columnOrder) && prefs.columnOrder.length > 0) {
    for (const id of prefs.columnOrder) {
      if (added.has(id)) continue;
      let isVisible = visible.has(id);
      if (!isVisible) {
        const f = settings.fields.find(x => x.id === id || (TABLE_ID_MAP[x.id] || x.id) === id);
        if (f && visible.has(f.id)) isVisible = true;
      }
      if (!isVisible) continue;
      const def = allColumns.value.find(c => c.id === id);
      if (def) { cols.push(id); added.add(id); }
    }
  }

  // 2) Видимые из fields, которых нет в columnOrder
  for (const f of settings.fields) {
    if (!f.enabled) continue;
    if (!visible.has(f.id)) continue;
    const tableId = TABLE_ID_MAP[f.id] || f.id;
    if (added.has(tableId)) continue;
    const def = allColumns.value.find(c => c.id === tableId);
    if (def) { cols.push(tableId); added.add(tableId); }
  }

  // 3) Виртуальные (status, nextCalibration)
  for (const vid of ['status', 'nextCalibration']) {
    if (!visible.has(vid)) continue;
    if (added.has(vid)) continue;
    if (vid === 'nextCalibration') {
      const lastIdx = cols.indexOf('lastCalibration');
      if (lastIdx !== -1) cols.splice(lastIdx + 1, 0, vid);
      else cols.push(vid);
    } else cols.push(vid);
    added.add(vid);
  }

  if (cols.length === 0) return [...DEFAULT_TABLE_COLUMNS];
  return cols;
});

const allChecked = computed(() => pip.items.length > 0 && pip.items.every(p => pip.selected.has(p.id)));
const someChecked = computed(() => pip.selected.size > 0 && !allChecked.value);

const emptyText = computed(() => {
  if (pip.total > 0) return 'Ничего не найдено по фильтру.';
  if (!pip.search && Object.keys(pip.filterState).length === 0) {
    return 'Оборудования пока нет. Нажмите «Создать оборудование», чтобы начать.';
  }
  return 'Ничего не найдено по фильтру.';
});

const hasWidths = computed(() => Object.keys(prefs.columnWidths).length > 0);
const tableStyle = computed(() => ({
  tableLayout: hasWidths.value ? ('fixed' as const) : ('auto' as const),
}));

function colStyle(colId: string) {
  const w = prefs.columnWidths[colId];
  return w ? { width: w + 'px' } : {};
}

function thStyle(colId: string) {
  const w = prefs.columnWidths[colId];
  return w ? { width: w + 'px' } : {};
}

function labelFor(colId: string): string {
  const def = allColumns.value.find(c => c.id === colId);
  return def?.label || colId;
}

function isSortable(colId: string): boolean {
  return !!allColumns.value.find(c => c.id === colId)?.sortable;
}

function sortArrow(colId: string): string {
  const def = allColumns.value.find(c => c.id === colId);
  if (!def || def.field !== pip.sortField) return '';
  return pip.sortDir > 0 ? '▲' : '▼';
}

async function onHeaderClick(colId: string) {
  const def = allColumns.value.find(c => c.id === colId);
  if (!def?.sortable) return;
  await pip.sortBy(def.field);
}

function onSelectAll(e: Event) {
  pip.selectAllOnPage((e.target as HTMLInputElement).checked);
}

function onToggleSelect(id: string, checked: boolean) {
  pip.toggleSelected(id, checked);
}

fimport { useModals } from '@/composables/useModals';
const modals = useModals();

function onRowActions(id: string, event: MouseEvent) {
  modals.onRowActions(id, event);
}
</script>
