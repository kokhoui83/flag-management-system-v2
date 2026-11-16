<template>
  <div class="variant-table" data-testid="variant-table">
    <div class="variant-type-row">
      <label class="field-label" :for="typeSelectId">Value type</label>
      <n-select
        class="variant-type"
        data-testid="variant-type"
        size="small"
        :input-props="{ id: typeSelectId }"
        :value="variantType"
        :options="typeOptions"
        :disabled="disabled"
        @update:value="changeType"
      />
    </div>
    <ul class="variant-rows" aria-label="Variants">
      <li v-for="(entry, index) in entries" :key="index" class="variant-row">
        <n-input
          class="variant-name"
          data-testid="variant-name"
          size="small"
          placeholder="variant name"
          :input-props="{ 'aria-label': `Variant ${index + 1} name` }"
          :value="entry[0]"
          :disabled="disabled"
          @update:value="(name: string) => rename(index, name)"
        />
        <n-select
          v-if="variantType === 'boolean'"
          class="variant-value"
          data-testid="variant-value"
          size="small"
          :input-props="{ 'aria-label': `Variant ${index + 1} value` }"
          :value="entry[1] === true ? 'true' : 'false'"
          :options="booleanOptions"
          :disabled="disabled"
          @update:value="(raw: string) => setValue(index, raw === 'true')"
        />
        <n-input-number
          v-else-if="variantType === 'number'"
          class="variant-value"
          data-testid="variant-value"
          size="small"
          :input-props="{ 'aria-label': `Variant ${index + 1} value` }"
          :value="Number(entry[1])"
          :disabled="disabled"
          @update:value="(value: number | null) => setValue(index, value ?? 0)"
        />
        <n-input
          v-else
          class="variant-value"
          data-testid="variant-value"
          size="small"
          placeholder="value"
          :input-props="{ 'aria-label': `Variant ${index + 1} value` }"
          :value="String(entry[1])"
          :disabled="disabled"
          @update:value="(value: string) => setValue(index, value)"
        />
        <span class="variant-type-tag">{{ variantType }}</span>
        <n-button
          size="small"
          quaternary
          data-testid="variant-remove"
          :aria-label="`Remove variant ${entry[0]}`"
          :disabled="disabled"
          @click="remove(index)"
          >Remove</n-button
        >
      </li>
    </ul>
    <p v-if="renameError" class="variant-error" role="alert">
      {{ renameError }}
    </p>
    <n-button size="small" :disabled="disabled" @click="add"
      >Add variant</n-button
    >
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { NButton, NInput, NInputNumber, NSelect } from 'naive-ui';
import {
  variantTypeOfVariants,
  type VariantType,
  type VariantValue,
} from '@fms/shared';

/**
 * Variant table of a definition draft (FR-42): name, value and the value type shared by all
 * variants of a flag (FR-11). It only edits the draft — the shared validator decides validity
 * on save (ADR-0006).
 */
const props = defineProps<{
  variants: Record<string, VariantValue>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:variants', variants: Record<string, VariantValue>): void;
}>();

const typeSelectId = useId();
const renameError = ref<string | null>(null);

const entries = computed(
  () => Object.entries(props.variants) as Array<[string, VariantValue]>,
);
const variantType = computed<VariantType>(() =>
  variantTypeOfVariants(props.variants),
);

const typeOptions = [
  { label: 'boolean', value: 'boolean' },
  { label: 'string', value: 'string' },
  { label: 'number', value: 'number' },
];
const booleanOptions = [
  { label: 'true', value: 'true' },
  { label: 'false', value: 'false' },
];

function emitEntries(next: Array<[string, VariantValue]>): void {
  renameError.value = null;
  emit('update:variants', Object.fromEntries(next));
}

function rename(index: number, name: string): void {
  if (props.disabled) return;
  const collides = entries.value.some(
    ([existing], other) => other !== index && existing === name,
  );
  if (collides) {
    renameError.value = `Variant name '${name}' is already used`;
    return;
  }
  emitEntries(
    entries.value.map(([existing, value], other) =>
      other === index ? [name, value] : [existing, value],
    ),
  );
}

function setValue(index: number, value: VariantValue): void {
  if (props.disabled) return;
  emitEntries(
    entries.value.map(([name, existing], other) =>
      other === index ? [name, value] : [name, existing],
    ),
  );
}

function defaultValueOf(type: VariantType): VariantValue {
  if (type === 'boolean') return false;
  if (type === 'number') return 0;
  return '';
}

function add(): void {
  if (props.disabled) return;
  let serial = entries.value.length + 1;
  while (`variant-${serial}` in props.variants) serial += 1;
  emitEntries([
    ...entries.value,
    [`variant-${serial}`, defaultValueOf(variantType.value)],
  ]);
}

function remove(index: number): void {
  if (props.disabled) return;
  emitEntries(entries.value.filter((_, other) => other !== index));
}

function convert(value: VariantValue, type: VariantType): VariantValue {
  if (type === 'string') return String(value);
  if (type === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return value === true || value === 'true' || value === 1;
}

function changeType(type: VariantType): void {
  if (props.disabled || type === variantType.value) return;
  emitEntries(
    entries.value.map(([name, value]) => [name, convert(value, type)]),
  );
}
</script>

<style scoped>
.variant-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.variant-type-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.variant-type {
  max-width: 160px;
}
.variant-rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.variant-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.variant-name,
.variant-value {
  flex: 1 1 140px;
  min-width: 0;
}
.variant-type-tag {
  font-size: 12px;
  color: var(--ink-3);
}
.variant-error {
  margin: 0;
  color: var(--bad-700);
  font-size: 13px;
}
</style>
