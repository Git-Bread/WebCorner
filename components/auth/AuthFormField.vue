<template>
  <div :class="fieldClass">
    <label :for="id" class="block font-medium text-text">{{ label }}</label>
    <div class="flex items-center relative">
      <fa :icon="['fas', icon]" class="text-text-muted absolute left-3 z-20" aria-hidden="true" />
      <input 
        :id="id" 
        :name="name" 
        :type="type" 
        :autocomplete="autocomplete"
        required
        :placeholder="placeholder"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @blur="$emit('blur', $event)"
        class="pl-10"
        :class="[baseInputClass, hasError ? errorClass : normalClass]"
        :aria-invalid="hasError"
        :aria-describedby="hasError && errorMessage ? `${id}-error` : undefined"
      />
    </div>
    <p v-if="errorMessage" :id="`${id}-error`" class="mt-1 text-error" role="alert">{{ errorMessage }}</p>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
defineProps({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, default: 'text' },
  label: { type: String, required: true },
  icon: { type: String, required: true },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: '' },
  modelValue: { type: String, required: true },
  errorMessage: { type: String, default: '' },
  hasError: { type: Boolean, default: false },
  fieldClass: { type: String, default: '' },
  baseInputClass: {
    type: String,
    default: 'appearance-none rounded relative block w-full px-3 py-2 border text-text focus:outline-none focus:z-10'
  },
  errorClass: {
    type: String,
    default: 'border-error focus:ring-error focus:border-error'
  },
  normalClass: {
    type: String,
    default: 'border-border placeholder-text-muted focus:ring-link focus:border-link'
  }
});

defineEmits(['update:modelValue', 'blur']);
</script>