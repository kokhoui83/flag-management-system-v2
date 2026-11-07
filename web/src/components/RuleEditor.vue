<template>
  <div class="rule-editor" data-testid="rule-editor">
    <div v-if="localRules.length === 0" class="rule-editor-empty">
      <n-text depth="2"
        >No targeting rules — the default variant applies to every
        request.</n-text
      >
    </div>
    <ul v-else class="rule-list">
      <li v-for="(rule, index) in localRules" :key="index" class="rule-item">
        <div class="rule-header">
          <n-text strong>Rule {{ index + 1 }}</n-text>
          <n-tag v-if="rule.type === 'percentage'" size="small" type="warning"
            >percentage</n-tag
          >
          <n-button
            size="tiny"
            quaternary
            :disabled="disabled"
            @click="moveRule(index, index - 1)"
            >↑</n-button
          >
          <n-button
            size="tiny"
            quaternary
            :disabled="disabled"
            @click="moveRule(index, index + 1)"
            >↓</n-button
          >
          <n-button
            size="tiny"
            quaternary
            :disabled="disabled"
            @click="removeRule(index)"
            >Remove</n-button
          >
        </div>
        <div v-if="rule.type === 'attribute'" class="rule-body">
          <div
            v-for="(condition, conditionIndex) in conditionsOf(rule)"
            :key="conditionIndex"
            class="condition-row"
          >
            <n-input
              size="small"
              :value="condition.attribute"
              :disabled="disabled"
              placeholder="attribute (e.g. email)"
              data-testid="condition-attribute"
            />
            <n-select
              size="small"
              :value="condition.op"
              :options="attributeOpOptions"
              :disabled="disabled"
              @update:model-value="
                (value: string) =>
                  updateCondition(index, conditionIndex, {
                    op: value as AttributeOp,
                  })
              "
            />
            <n-input
              v-if="condition.op !== 'exists'"
              size="small"
              :value="String(condition.value ?? '')"
              :disabled="disabled"
              @update:model-value="
                (value: string) =>
                  updateCondition(index, conditionIndex, {
                    value: coerceValue(condition.op, value),
                  })
              "
            />
            <n-select
              size="small"
              :value="rule.variant"
              :options="variantItems"
              :disabled="disabled"
              @update:model-value="
                (value: string) =>
                  updateRule(index, { ...rule, variant: value })
              "
            />
            <n-button
              size="tiny"
              quaternary
              :disabled="disabled"
              @click="removeCondition(index, conditionIndex)"
              >Remove</n-button
            >
          </div>
          <n-button
            size="tiny"
            quaternary
            :disabled="disabled"
            @click="addCondition(index)"
            >Add condition</n-button
          >
        </div>
        <div v-if="rule.type === 'percentage'" class="rule-body">
          <div
            v-for="(split, splitIndex) in splitsOf(rule)"
            :key="splitIndex"
            class="split-row"
          >
            <n-select
              size="small"
              :value="split.variant"
              :options="variantItems"
              :disabled="disabled"
              @update:model-value="
                (value: string) =>
                  updateSplit(index, splitIndex, {
                    variant: value,
                    weight: split.weight,
                  })
              "
            />
            <n-input-number
              size="small"
              :min="1"
              :max="100"
              :value="split.weight"
              :disabled="disabled"
              @update:model-value="
                (value: number) =>
                  updateSplit(index, splitIndex, {
                    variant: split.variant,
                    weight: value ?? 1,
                  })
              "
            />
            <n-button
              size="tiny"
              quaternary
              :disabled="disabled"
              @click="removeSplit(index, splitIndex)"
              >Remove</n-button
            >
          </div>
          <n-button
            size="tiny"
            quaternary
            :disabled="disabled"
            @click="addSplit(index)"
            >Add split</n-button
          >
        </div>
      </li>
    </ul>
    <n-button size="small" quaternary :disabled="disabled" @click="addRule"
      >Add rule</n-button
    >
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NButton, NInput, NInputNumber, NSelect, NTag, NText } from 'naive-ui';
import {
  ATTRIBUTE_OPS,
  type AttributeCondition,
  type AttributeOp,
  type FlagRule,
  type PercentageRule,
  type PercentageSplit,
  type VariantValue,
} from '@fms/shared';
import type { ObservedEnvironmentStatus } from '../api/types';

const props = defineProps<{
  rules: FlagRule[];
  variants: Record<string, VariantValue>;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:rules', rules: FlagRule[]): void;
}>();

const localRules = ref<FlagRule[]>([]);

watch(
  () => props.rules,
  (next) => {
    // Plain-object clone: the incoming rules arrive as reactive proxies, which structuredClone cannot handle.
    localRules.value = JSON.parse(JSON.stringify(next)) as FlagRule[];
  },
  { immediate: true, deep: true },
);

const attributeOpOptions = computed(() =>
  ATTRIBUTE_OPS.map((op) => ({ label: op, value: op })),
);
const variantItems = computed(() =>
  Object.keys(props.variants).map((name) => ({ label: name, value: name })),
);

function conditionsOf(rule: FlagRule): AttributeCondition[] {
  if (rule.type !== 'attribute') return [];
  return rule.conditions;
}

function splitsOf(rule: FlagRule): PercentageSplit[] {
  if (rule.type !== 'percentage') return [];
  return rule.splits;
}

function addRule(): void {
  if (props.disabled) return;
  localRules.value = [
    ...localRules.value,
    {
      type: 'attribute',
      conditions: [],
      variant: Object.keys(props.variants)[0] ?? '',
    },
  ];
  emit('update:rules', localRules.value);
}

function removeRule(index: number): void {
  if (props.disabled) return;
  localRules.value = localRules.value.filter((_, i) => i !== index);
  emit('update:rules', localRules.value);
}

function moveRule(from: number, to: number): void {
  if (props.disabled || to < 0 || to >= localRules.value.length) return;
  const next = [...localRules.value];
  const item = next.splice(from, 1)[0];
  if (item === undefined) return;
  next.splice(to, 0, item);
  localRules.value = next;
  emit('update:rules', localRules.value);
}

function addCondition(ruleIndex: number): void {
  if (props.disabled) return;
  localRules.value = localRules.value.map((rule, i) => {
    if (i !== ruleIndex || rule.type !== 'attribute') return rule;
    const conditions = [
      ...rule.conditions,
      { attribute: '', op: 'eq' as AttributeOp, value: '' },
    ];
    return { ...rule, conditions };
  });
  emit('update:rules', localRules.value);
}

function removeCondition(ruleIndex: number, conditionIndex: number): void {
  if (props.disabled) return;
  localRules.value = localRules.value.map((rule, i) => {
    if (i !== ruleIndex || rule.type !== 'attribute') return rule;
    const conditions = rule.conditions.filter((_, ci) => ci !== conditionIndex);
    return { ...rule, conditions };
  });
  emit('update:rules', localRules.value);
}

function updateCondition(
  ruleIndex: number,
  conditionIndex: number,
  patch: Partial<AttributeCondition>,
): void {
  if (props.disabled) return;
  localRules.value = localRules.value.map((rule, i) => {
    if (i !== ruleIndex || rule.type !== 'attribute') return rule;
    const conditions = rule.conditions.map((condition, ci) =>
      ci === conditionIndex ? { ...condition, ...patch } : condition,
    );
    return { ...rule, conditions };
  });
  emit('update:rules', localRules.value);
}

function updateRule(ruleIndex: number, patch: { variant?: string }): void {
  if (props.disabled) return;
  localRules.value = localRules.value.map((rule, i) => {
    if (i !== ruleIndex) return rule;
    const variant = patch.variant ?? Object.keys(props.variants)[0] ?? '';
    return { ...rule, variant } as FlagRule;
  });
  emit('update:rules', localRules.value);
}

function addSplit(ruleIndex: number): void {
  if (props.disabled) return;
  localRules.value = localRules.value.map((rule, i) => {
    if (i !== ruleIndex || rule.type !== 'percentage') return rule;
    const splits = [
      ...rule.splits,
      { variant: Object.keys(props.variants)[0] ?? '', weight: 50 },
    ];
    return { ...rule, splits };
  });
  emit('update:rules', localRules.value);
}

function removeSplit(ruleIndex: number, splitIndex: number): void {
  if (props.disabled) return;
  localRules.value = localRules.value.map((rule, i) => {
    if (i !== ruleIndex || rule.type !== 'percentage') return rule;
    const splits = rule.splits.filter((_, si) => si !== splitIndex);
    return { ...rule, splits };
  });
  emit('update:rules', localRules.value);
}

function updateSplit(
  ruleIndex: number,
  splitIndex: number,
  patch: Partial<PercentageSplit>,
): void {
  if (props.disabled) return;
  localRules.value = localRules.value.map((rule, i) => {
    if (i !== ruleIndex || rule.type !== 'percentage') return rule;
    const splits = rule.splits.map((split, si) =>
      si === splitIndex ? { ...split, ...patch } : split,
    );
    return { ...rule, splits };
  });
  emit('update:rules', localRules.value);
}

function coerceValue(
  op: AttributeOp,
  raw: string,
): VariantValue | VariantValue[] {
  if (op === 'in') return [raw];
  if (op === 'gt' || op === 'gte' || op === 'lt' || op === 'lte') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return raw;
}
</script>

<style scoped>
.rule-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rule-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rule-item {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rule-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rule-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.condition-row,
.split-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
