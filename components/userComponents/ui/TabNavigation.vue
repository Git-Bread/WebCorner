<template>
  <div class="mb-6 border-b border-border">
    <div 
      role="tablist" 
      class="flex flex-wrap gap-2"
      @keydown.right="navigateTabsWithKeyboard(1)"
      @keydown.left="navigateTabsWithKeyboard(-1)"
      @keydown.home="selectFirstTab"
      @keydown.end="selectLastTab">
      <button 
        v-for="(tab, index) in tabs" 
        :key="tab.id" 
        role="tab"
        :id="`tab-${tab.id}`"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`panel-${tab.id}`"
        :tabindex="activeTab === tab.id ? 0 : -1"
        @click="selectTab(tab.id)"
        @keydown.space.prevent="selectTab(tab.id)"
        @keydown.enter.prevent="selectTab(tab.id)"
        ref="tabRefs"
        :class="['px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-link whitespace-nowrap border-b-2', 
        activeTab === tab.id ? 'text-theme-primary border-theme-primary' : 'text-text hover:text-heading border-transparent']">
        <fa :icon="['fas', tab.icon]" class="mr-1" aria-hidden="true" />{{ tab.name }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Tab {
  id: string;
  name: string;
  icon: string;
  modes?: string[];
}

const props = defineProps<{
  tabs: Tab[];
  activeTab: string;
}>();

const emit = defineEmits(['update:active-tab']);

// For keyboard navigation
const tabRefs = ref<HTMLElement[]>([]);

// Select tab and emit update event
const selectTab = (tabId: string) => {
  emit('update:active-tab', tabId);
};

// Navigate through tabs with keyboard
const navigateTabsWithKeyboard = (direction: number) => {
  if (tabRefs.value.length === 0) return;
  
  const currentIndex = props.tabs.findIndex(tab => tab.id === props.activeTab);
  if (currentIndex === -1) return;
  
  let newIndex = currentIndex + direction;
  
  // Handle wrapping around at boundaries
  if (newIndex < 0) newIndex = props.tabs.length - 1;
  if (newIndex >= props.tabs.length) newIndex = 0;
  
  // Select the new tab
  selectTab(props.tabs[newIndex].id);
  
  // Focus the new tab button
  setTimeout(() => {
    tabRefs.value[newIndex]?.focus();
  }, 10);
};

// Select first/last tab helpers
const selectFirstTab = () => {
  if (props.tabs.length > 0) {
    selectTab(props.tabs[0].id);
    setTimeout(() => tabRefs.value[0]?.focus(), 10);
  }
};

const selectLastTab = () => {
  if (props.tabs.length > 0) {
    const lastIndex = props.tabs.length - 1;
    selectTab(props.tabs[lastIndex].id);
    setTimeout(() => tabRefs.value[lastIndex]?.focus(), 10);
  }
};
</script>