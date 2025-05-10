<template>
  <div class="dashboard-animation relative min-h-[630px] overflow-hidden rounded-lg border-border bg-surface-alt border-4 shadow-sm">
    <!-- Sidebar styled like ServerSidebar -->
    <div class="sidebar absolute left-0 top-0 h-full w-1/5 bg-surface border-r-4 border-border z-10 flex flex-col">
      <div class="p-4 flex-1">
        <!-- Server Header with Logo (merged with invite manager) -->
        <div class="mb-6">
          <div class="w-full aspect-video rounded-md border-2 border-border bg-surface-alt overflow-hidden mb-2">
            <div class="w-full h-full flex items-center justify-center">
              <img src="public/images/Logo.png" alt="Server Logo" class="w-3/4 h-3/4 object-contain" />
            </div>
          </div>
        </div>
        
        <!-- Members Section -->
        <div class="mt-6">
          <!-- Member List -->
          <div class="space-y-3">
            <div v-for="i in 4" :key="i" class="flex items-center">
              <div class="w-7 h-7 rounded-full mr-2 overflow-hidden">
                <img :src="memberImages[i-1]" alt="Member" class="w-full h-full object-cover" />
              </div>
              <div>
                <div class="w-20 h-3 bg-text rounded-md"></div>
                <div class="w-12 h-2 bg-text-muted rounded-md mt-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Back Button - Moved to bottom -->
      <div class="p-4 selection:mt-auto">
        <div class="flex items-center">
          <div class="w-5 h-5 rounded-md bg-theme-primary mr-2"></div>
          <div class="w-20 h-3 bg-text rounded-md"></div>
        </div>
      </div>
    </div>
    
    <!-- Dashboard Grid Area -->
    <div class="dashboard-grid absolute left-[20%] right-0 top-0 h-full p-2">
      <!-- Grid Container -->
      <div class="grid-container relative h-full w-full">
        <div 
          v-for="widget in widgets" 
          :key="widget.id"
          class="grid-widget absolute border-2 border-border rounded-lg bg-surface shadow-sm overflow-hidden transition-all duration-500"
          :class="widget.animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'"
          :style="{
            left: `${widget.x}%`,
            top: `${widget.y}%`,
            width: `${widget.width}%`,
            height: `${widget.height}%`,
            transitionDelay: `${widget.delay}ms`
          }"
        >
          <!-- Widget Content based on type -->
          <div class="p-3 h-full">
            <!-- Widget Header -->
            <div class="flex justify-between items-center mb-2">
              <div class="w-20 h-3 bg-text rounded-md"></div>
              <div class="flex space-x-1">
                <div class="w-3 h-3 rounded-full bg-text-muted"></div>
                <div class="w-3 h-3 rounded-full bg-text-muted"></div>
              </div>
            </div>
            
            <!-- Widget Content -->
            <div v-if="widget.type === 'chart'" class="h-[calc(100%-1.5rem)] flex items-center justify-center">
              <div class="w-full h-4/5 flex items-end space-x-1">
                <div v-for="i in 7" :key="i" 
                  class="flex-1 bg-theme-primary rounded-t-sm animate-chart-bar" 
                  :style="{ 
                    height: `${chartHeights[widget.id][i-1]}%`, 
                    opacity: 0.6 + (i/10),
                    animationDelay: `${(i * 200) + widget.delay}ms`
                  }"
                ></div>
              </div>
            </div>
            
            <div v-else-if="widget.type === 'table'" class="h-[calc(100%-1.5rem)]">
              <div v-for="i in 4" :key="i" class="flex py-1">
                <div class="w-1/3 h-3 bg-text-muted rounded-md mr-2" 
                  :class="{'animate-pulse': activeRows[widget.id] === i && widget.id === activeAnimationGroups.tables}"></div>
                <div class="w-2/3 h-3 bg-text rounded-md"
                  :class="{'animate-pulse': activeRows[widget.id] === i && widget.id === activeAnimationGroups.tables}"></div>
              </div>
            </div>
            
            <div v-else-if="widget.type === 'stats'" class="h-[calc(100%-1.5rem)] flex flex-col justify-center items-center">
              <!-- Animated stats indicator -->
              <div class="w-12 h-3 bg-theme-primary rounded-md mb-1"
                :class="{'animate-grow': widget.id === activeAnimationGroups.stats}"></div>
              <div class="w-16 h-2 bg-text-muted rounded-md"></div>
            </div>
            
            <div v-else-if="widget.type === 'custom'" class="h-[calc(100%-1.5rem)] flex items-center justify-center">
              <div 
                :class="[
                  'w-12 h-12 rounded-full bg-theme-primary opacity-50',
                  {'animate-spin-slow': widget.id === activeAnimationGroups.custom},
                  `custom-ball-${widget.id}`
                ]"
              ></div>
            </div>
            
            <!-- Calendar Widget -->
            <div v-else-if="widget.type === 'calendar'" class="h-[calc(100%-1.5rem)] flex flex-col">
              <!-- Calendar header -->
              <div class="flex justify-between items-center mb-2">
                <div class="text-xs text-text font-medium">{{ currentMonth }}</div>
                <div class="text-xs text-text-muted">{{ currentYear }}</div>
              </div>
              
              <!-- Days of week -->
              <div class="grid grid-cols-7 mb-1">
                <div v-for="day in ['S', 'M', 'T', 'W', 'T', 'F', 'S']" :key="day" 
                  class="text-[0.6rem] text-center text-text-muted">
                  {{ day }}
                </div>
              </div>
              
              <!-- Calendar grid -->
              <div class="grid grid-cols-7 gap-[2px] flex-1">
                <!-- Empty cells for start offset -->
                <div v-for="i in startDay" :key="`empty-${i}`" class="aspect-square"></div>
                
                <!-- Calendar days -->
                <div v-for="day in daysInMonth" :key="day"
                  class="aspect-square rounded-sm text-[0.65rem] relative flex items-center justify-center text-text"
                  :class="[
                    day === highlightedDay ? 'bg-surface-alt' : '',
                  ]">
                  {{ day }}
                  
                  <!-- Event indicators -->
                  <div v-for="event in calendarEvents.filter(e => e.day === day)" :key="event.id"
                    class="absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-300"
                    :class="[
                      event.color,
                      day === highlightedDay ? 'h-[4px]' : ''
                    ]">
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Chat Widget -->
            <div v-else-if="widget.type === 'chat'" class="h-[calc(100%-1.5rem)] flex flex-col">
              <!-- Chat messages container -->
              <div class="flex-1 overflow-y-auto mb-1 pr-1 chat-messages">
                <div v-for="message in chatMessages" :key="message.id" 
                  class="flex mb-1 animate-fade-in"
                  :style="{animationDelay: `${message.id * 300}ms`}">
                  <div class="w-5 h-5 rounded-full overflow-hidden mr-1 flex-shrink-0">
                    <img :src="message.avatar" alt="User avatar" class="w-full h-full object-cover" />
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center">
                      <span class="text-[0.65rem] font-semibold mr-1 text-theme-primary">{{ message.user }}</span>
                      <span class="text-[0.6rem] text-text-muted">{{ message.time }}</span>
                    </div>
                    <div class="bg-surface-alt rounded-md px-1.5 pl-0 text-[0.65rem] text-text">
                      {{ message.message }}
                    </div>
                  </div>
                </div>
                
                <!-- Typing indicator -->
                <div v-if="isTyping" class="flex mb-1 animate-fade-in">
                  <div class="w-5 h-5 rounded-full overflow-hidden mr-1 flex-shrink-0">
                    <img :src="typingAvatar" alt="User avatar" class="w-full h-full object-cover" />
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center">
                      <span class="text-[0.65rem] font-semibold mr-1 text-theme-primary">{{ typingUser }}</span>
                      <span class="text-[0.6rem] text-text-muted">typing...</span>
                    </div>
                    <div class="bg-surface-alt rounded-md px-1.5 pl-0 text-[0.65rem] flex items-center">
                      <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Chat input -->
              <div class="h-6 bg-surface-alt rounded-md flex items-center px-2">
                <div class="w-full h-2 bg-text-muted rounded-md opacity-50"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';

// Widget data
interface Widget {
  id: number;
  type: 'chart' | 'table' | 'stats' | 'custom' | 'chat' | 'calendar';
  x: number;
  y: number;
  width: number;
  height: number;
  animateIn: boolean;
  delay: number;
}

// Dynamic widgets for the grid
const widgets = ref<Widget[]>([
  // 2x2 widgets - top row
  { id: 1, type: 'chart', x: 1, y: 1, width: 23, height: 23, animateIn: false, delay: 100 },
  { id: 2, type: 'stats', x: 25, y: 1, width: 23, height: 23, animateIn: false, delay: 200 },
  { id: 3, type: 'table', x: 49, y: 1, width: 23, height: 23, animateIn: false, delay: 300 },
  { id: 4, type: 'chart', x: 73, y: 1, width: 26, height: 23, animateIn: false, delay: 400 },
  
  // 1x1 widgets - first column
  { id: 5, type: 'stats', x: 1, y: 25, width: 11, height: 11, animateIn: false, delay: 500 },
  { id: 6, type: 'custom', x: 13, y: 25, width: 11, height: 11, animateIn: false, delay: 550 },
  
  // Calendar in column 3
  { id: 8, type: 'calendar', x: 49, y: 25, width: 23, height: 35, animateIn: false, delay: 700 },
  { id: 9, type: 'stats', x: 73, y: 25, width: 26, height: 11, animateIn: false, delay: 800 },
  
  { id: 10, type: 'chart', x: 1, y: 37, width: 23, height: 23, animateIn: false, delay: 900 },
  // Expanded table component
  { id: 11, type: 'table', x: 25, y: 25, width: 23, height: 35, animateIn: false, delay: 1000 },
  { id: 12, type: 'custom', x: 73, y: 37, width: 26, height: 23, animateIn: false, delay: 1100 },
  
  // Chat widget
  { id: 13, type: 'chat', x: 1, y: 61, width: 47, height: 38, animateIn: false, delay: 1200 },
  { id: 14, type: 'chart', x: 49, y: 61, width: 50, height: 38, animateIn: false, delay: 1300 },
]);

// Member profile images from randomImageUtil
const memberImages = [
  '/images/Profile_Pictures/fox_profile.webp',
  '/images/Profile_Pictures/eagle_profile.webp',
  '/images/Profile_Pictures/bear_profile.webp',
  '/images/Profile_Pictures/owl_profile.webp',
];

// Chat messages for chat widget
interface ChatMessage {
  id: number;
  user: string;
  avatar: string;
  message: string;
  time: string;
}

const chatMessages = ref<ChatMessage[]>([
  { id: 1, user: "Fox", avatar: memberImages[0], message: "Hey everyone! How's the new dashboard looking?", time: "10:23" },
  { id: 2, user: "Eagle", avatar: memberImages[1], message: "Looking great! I love the animations.", time: "10:24" },
  { id: 3, user: "Bear", avatar: memberImages[2], message: "The charts are really helpful for tracking our metrics.", time: "10:26" },
]);

// Typing message queue
interface TypingMessage {
  user: string;
  avatar: string;
  message: string;
  typingTime: number; // ms to show typing indicator
  time: string;
}

const typingQueue = ref<TypingMessage[]>([
  { user: "Owl", avatar: memberImages[3], message: "I think we should add more widgets to the bottom row.", typingTime: 4500, time: "10:30" },
  { user: "Fox", avatar: memberImages[0], message: "Good idea! I'll work on that next sprint.", typingTime: 5000, time: "10:32" },
  { user: "Eagle", avatar: memberImages[1], message: "Can we also add a notifications widget?", typingTime: 4000, time: "10:33" },
  { user: "Bear", avatar: memberImages[2], message: "I'll help with the design for that.", typingTime: 3500, time: "10:35" }
]);

// Calendar data
interface CalendarEvent {
  id: number;
  title: string;
  day: number;
  color: string;
}

const currentMonth = ref("October");
const currentYear = ref("2023");
const daysInMonth = ref(31);
const startDay = ref(0); // Sunday
const calendarEvents = ref<CalendarEvent[]>([
  { id: 1, title: "Team Meeting", day: 8, color: "bg-theme-primary" },
  { id: 2, title: "Release v1.2", day: 15, color: "bg-green-500" },
  { id: 3, title: "Planning", day: 22, color: "bg-amber-500" }
]);

// Generate random chart heights for each chart widget
interface ChartData {
  [key: number]: number[];
}

const chartHeights = reactive<ChartData>({});
widgets.value.forEach(widget => {
  if (widget.type === 'chart') {
    chartHeights[widget.id] = Array.from({length: 7}, () => 30 + Math.floor(Math.random() * 70));
  }
});

// Track active rows for table widgets
interface TableData {
  [key: number]: number;
}

const activeRows = reactive<TableData>({});

// Track which widget is currently animating
const activeAnimationGroups = reactive({
  charts: 1,
  stats: 2,
  tables: 3,
  custom: 6
});

// Calendar animation
const highlightedDay = ref(8);

// New message typing animation
const isTyping = ref(false);
const typingUser = ref("");
const typingAvatar = ref("");
const typingMessage = ref<TypingMessage | null>(null);
const currentTypingIndex = ref(0);
const chatAnimationActive = ref(false);

// Process the next typing message in the queue
const processNextTypingMessage = () => {
  if (currentTypingIndex.value >= typingQueue.value.length) {
    currentTypingIndex.value = 0;
    setTimeout(() => {
      if (!chatAnimationActive.value) return;
      processNextTypingMessage();
    }, 8000);
    return;
  }
  
  typingMessage.value = typingQueue.value[currentTypingIndex.value];
  
  isTyping.value = true;
  typingUser.value = typingMessage.value.user;
  typingAvatar.value = typingMessage.value.avatar;
  
  setTimeout(() => {
    if (!chatAnimationActive.value) return;
    
    chatMessages.value.push({
      id: chatMessages.value.length + 1,
      user: typingMessage.value!.user,
      avatar: typingMessage.value!.avatar,
      message: typingMessage.value!.message,
      time: typingMessage.value!.time
    });
    
    setTimeout(() => {
      isTyping.value = false;
      
      setTimeout(() => {
        if (!chatAnimationActive.value) return;
        currentTypingIndex.value++;
        processNextTypingMessage();
      }, 1000);
    }, 500);
  }, typingMessage.value.typingTime);
};

// Animate widgets in on mount
onMounted(() => {
  widgets.value.forEach((widget) => {
    setTimeout(() => {
      widget.animateIn = true;
    }, widget.delay);
  });
  
  // Get widget groups by type
  const chartWidgets = widgets.value.filter(w => w.type === 'chart');
  const tableWidgets = widgets.value.filter(w => w.type === 'table');
  const statsWidgets = widgets.value.filter(w => w.type === 'stats');
  const customWidgets = widgets.value.filter(w => w.type === 'custom');
  
  // Stagger chart animations
  setInterval(() => {
    const nextChartIndex = (chartWidgets.findIndex(w => w.id === activeAnimationGroups.charts) + 1) % chartWidgets.length;
    activeAnimationGroups.charts = chartWidgets[nextChartIndex].id;
    
    chartHeights[activeAnimationGroups.charts] = chartHeights[activeAnimationGroups.charts].map(() => 
      30 + Math.floor(Math.random() * 70)
    );
  }, 2000);
  
  // Stagger table animations
  setInterval(() => {
    const nextTableIndex = (tableWidgets.findIndex(w => w.id === activeAnimationGroups.tables) + 1) % tableWidgets.length;
    activeAnimationGroups.tables = tableWidgets[nextTableIndex].id;
    
    activeRows[activeAnimationGroups.tables] = (activeRows[activeAnimationGroups.tables] || 0) % 4 + 1;
  }, 1500);
  
  // Stagger stats animations
  setInterval(() => {
    const nextStatsIndex = (statsWidgets.findIndex(w => w.id === activeAnimationGroups.stats) + 1) % statsWidgets.length;
    activeAnimationGroups.stats = statsWidgets[nextStatsIndex].id;
  }, 3000);
  
  // Stagger custom widget animations
  setInterval(() => {
    const nextCustomIndex = (customWidgets.findIndex(w => w.id === activeAnimationGroups.custom) + 1) % customWidgets.length;
    activeAnimationGroups.custom = customWidgets[nextCustomIndex].id;
  }, 4000);
  
  // Calendar animation
  setInterval(() => {
    const availableDays = [8, 15, 22];
    const currentIndex = availableDays.indexOf(highlightedDay.value);
    const nextIndex = (currentIndex + 1) % availableDays.length;
    highlightedDay.value = availableDays[nextIndex];
  }, 3000);
  
  // Chat animation
  setTimeout(() => {
    chatAnimationActive.value = true;
    processNextTypingMessage();
  }, 4000);
  
  // Animate custom widgets' balls
  customWidgets.forEach(widget => {
    const pulseAnimation = () => {
      if (widget.id === activeAnimationGroups.custom) {
        const ballElement = document.querySelector(`.custom-ball-${widget.id}`);
        if (ballElement) {
          ballElement.classList.add('animate-ball-pulse');
          
          setTimeout(() => {
            ballElement.classList.remove('animate-ball-pulse');
          }, 3000);
        }
      }
      
      setTimeout(pulseAnimation, 8000);
    };
    
    setTimeout(pulseAnimation, widget.delay + 2000);
  });
});
</script>

<style>
@import "~/assets/css/animations/dashboard.css";
</style> 