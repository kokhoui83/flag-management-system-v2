<template>
  <div class="rule-editor" data-testid="rule-editor">
    <div v-if="localRules.length === 0" class="rule-editor-empty">
      <n-text depth="2"
        >No targeting rules — the default variant applies to every
        request.</n-text
      >
    </div>
    <ol v-else class="rule-list">
      <li
        v-for="(rule, index) in localRules"
        :key="index"
        class="rule-item"
        data-testid="rule-item"
      >
        <div class="rule-header">
          <n-text strong>Rule {{ index + 1 }}</n-text>
          <n-tag v-if="rule.type === 'percentage'" size="small" type="warning"
            >percentage</n-tag
          >
          <n-tag v-else size="small">attribute</n-tag>
          <span class="rule-header-actions">
            <n-button
              size="tiny"
              quaternary
              :aria-label="`Move rule ${index + 1} up`"
              :disabled="disabled || index === 0"
              @click="moveRule(index, index - 1)"
              >↑</n-button
            >
            <n-button
              size="tiny"
              quaternary
              :aria-label="`Move rule ${index + 1} down`"
              :disabled="disabled || index === localRules.length - 1"
              @click="moveRule(index, index + 1)"
              >↓</n-button
            >
            <n-button
              size="tiny"
              quaternary
              :aria-label="`Remove rule ${index + 1}`"
              :disabled="disabled"
              @click="removeRule(index)"
              >Remove</n-button
            >
          </span>
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
              :input-props="{ 'aria-label': 'Condition attribute' }"
              data-testid="condition-attribute"
              @update:value="
                (value: string) =>
                  updateCondition(index, conditionIndex, { attribute: value })
              "
            />
            <n-select
              size="small"
              class="condition-op"
              :value="condition.op"
              :options="attributeOpOptions"
              :disabled="disabled"
              data-testid="condition-op"
              @update:value="
                (value: AttributeOp) => changeOp(index, conditionIndex, value)
              "
            />
            <n-input
              v-if="condition.op !== 'exists'"
              size="small"
              :value="displayValue(condition)"
              :disabled="disabled"
              :placeholder="
                condition.op === 'in' ? 'values, comma-separated' : 'value'
              "
              :input-props="{ 'aria-label': 'Condition value' }"
              data-testid="condition-value"
              @update:value="
                (value: string) =>
                  updateCondition(index, conditionIndex, {
                    value: coerceValue(condition.op, value),
                  })
              "
            />
            <n-button
              size="tiny"
              quaternary
              aria-label="Remove condition"
              :disabled="disabled"
              @click="removeCondition(index, conditionIndex)"
              >Remove</n-button
            >
          </div>
          <n-button
            size="tiny"
            :disabled="disabled"
            @click="addCondition(index)"
            >Add condition</n-button
          >
          <div class="serve-row">
            <span class="field-label">Serve variant</span>
            <n-select
              size="small"
              class="serve-variant"
              :value="rule.variant"
              :options="variantItems"
              :disabled="disabled"
              data-testid="rule-variant"
              @update:value="
                (value: string) => updateRule(index, { variant: value })
              "
            />
          </div>
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
              data-testid="split-variant"
              @update:value="
                (value: string) =>
                  updateSplit(index, splitIndex, { variant: value })
              "
            />
            <n-input-number
              size="small"
              :min="1"
              :max="100"
              :value="split.weight"
              :disabled="disabled"
              :input-props="{ 'aria-label': 'Split weight' }"
              data-testid="split-weight"
              @update:value="
                (value: number | null) =>
                  updateSplit(index, splitIndex, { weight: value ?? 1 })
              "
            />
            <n-button
              size="tiny"
              quaternary
              aria-label="Remove split"
              :disabled="disabled"
              @click="removeSplit(index, splitIndex)"
              >Remove</n-button
            >
          </div>
          <n-button size="tiny" :disabled="disabled" @click="addSplit(index)"
            >Add split</n-button
          >
        </div>
      </li>
    </ol>
    <div class="rule-editor-actions">
      <n-button size="small" :disabled="disabled" @click="addRule"
        >Add rule</n-button
      >
      <n-button
        size="small"
        :disabled="disabled || hasPercentageRule"
        @click="addPercentageRule"
        >Add percentage rule</n-button
      >
    </div>
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

const hasPercentageRule = computed(() =>
  localRules.value.some((rule) => rule.type === 'percentage'),
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

/** A percentage rule is terminal and unique (FR-18): append it as the last rule. */
function addPercentageRule(): void {
  if (props.disabled || hasPercentageRule.value) return;
  const names = Object.keys(props.variants);
  localRules.value = [
    ...localRules.value,
    {
      type: 'percentage',
      splits: names.slice(0, 2).map((variant) => ({ variant, weight: 50 })),
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

/** Switching operator re-shapes the value: `exists` carries none, `in` a list, the rest a scalar. */
function changeOp(
  ruleIndex: number,
  conditionIndex: number,
  op: AttributeOp,
): void {
  if (props.disabled) return;
  localRules.value = localRules.value.map((rule, i) => {
    if (i !== ruleIndex || rule.type !== 'attribute') return rule;
    const conditions = rule.conditions.map((condition, ci) => {
      if (ci !== conditionIndex) return condition;
      if (op === 'exists') return { attribute: condition.attribute, op };
      return {
        attribute: condition.attribute,
        op,
        value: coerceValue(op, displayValue(condition)),
      };
    });
    return { ...rule, conditions };
  });
  emit('update:rules', localRules.value);
}

function displayValue(condition: AttributeCondition): string {
  if (Array.isArray(condition.value)) return condition.value.join(', ');
  return String(condition.value ?? '');
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
  if (op === 'in') {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
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
  border: 1px solid var(--border-default);
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
  flex-wrap: wrap;
}
.rule-header-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}
.rule-editor-actions,
.serve-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.serve-variant {
  max-width: 220px;
}
.condition-op {
  max-width: 150px;
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
  flex-wrap: wrap;
}
.condition-row > *,
.split-row > * {
  flex: 1 1 140px;
  min-width: 0;
}
.condition-row > .n-button,
.split-row > .n-button {
  flex: 0 0 auto;
}
</style>
