<template>
  <div v-if="password" class="mt-1">
    <div class="h-1 w-full bg-border rounded-full overflow-hidden" role="progressbar" :aria-valuenow="strength" aria-valuemin="0" aria-valuemax="100">
      <div :class="['h-full', strengthColorClass]" :style="{ width: strength + '%' }"></div>
    </div>
    <p class="text-xs mt-1 flex items-center" :class="strengthTextColorClass">
      <fa :icon="strengthIcon" class="mr-1" aria-hidden="true"/>
      {{ strengthText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { calculatePasswordStrength, getStrengthClasses, getStrengthText } from '~/utils/passwordUtils';

const props = defineProps({
  password: {
    type: String,
    required: true
  }
});

// Password strength values
const strength = computed(() => calculatePasswordStrength(props.password));
const strengthClasses = computed(() => getStrengthClasses(strength.value));
const strengthText = computed(() => getStrengthText(strength.value));

// CSS classes for display
const strengthColorClass = computed(() => strengthClasses.value.bar);
const strengthTextColorClass = computed(() => strengthClasses.value.text);
const strengthIcon = computed(() => strengthClasses.value.icon);
</script>