<template>
  <div class="w-96 h-[600px] bg-ui-overlay rounded-lg overflow-hidden flex flex-col shadow-xl border border-ui-accent">
    <div class="p-3 bg-background/90 border-b border-ui-accent">
      <h3 class="font-semibold text-heading flex items-center justify-between">
        <span class="flex items-center">
          <fa :icon="['fas', 'comments']" class="text-theme-primary mr-2"/>Live Chat
        </span>
        <button @click="clearMessages" class="text-text-muted hover:text-heading transition-colors" aria-label="Clear chat messages">
          <fa :icon="['fas', 'trash']" class="text-lg" aria-hidden="true" />
        </button>
      </h3>
    </div>
    
    <div ref="messagesContainer" class="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-ui-accent scrollbar-track-transparent flex flex-col">
      <div class="flex flex-col">
        <TransitionGroup name="message">
          <ChatMessage
            v-for="message in reversedMessages"
            :key="message.id"
            :profile-image="message.profileImage"
            :type="message.type"
            :message="message.text"
            :username="message.username"
            class="mb-4 last:mb-0"
          />
        </TransitionGroup>
      </div>
      
      <!-- Empty state when no messages -->
      <div v-if="messages.length === 0" class="flex-1 flex mb-4 items-center justify-center text-text/50 flex-col">
        <fa :icon="['fas', 'satellite']" class="mb-2 text-theme-primary/30 icon-xl" />
        <p>Waiting for good vibes...</p>
      </div>
    </div>

    <div class="p-3 border-t border-ui-accent">
      <button 
        @click="addMessage({
          profileImage: '/images/Profile_Pictures/fox_profile.webp',
          type: 'blue',
          text: 'Great work everyone!',
          username: 'Cool User'
        })"
        class="w-full bg-ui-overlay hover:bg-surface text-text px-4 py-2 rounded-md text-sm transition-colors"
        aria-label="Send message: Great work everyone!"
      >
        Great work everyone!
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue';
import ChatMessage from './ChatMessage.vue';

// Define message type for better type safety
interface ChatMessageData {
  id: number;
  profileImage: string;
  type: 'blue' | 'purple' | 'pink';
  text: string;
  username: string;
  timestamp: Date;
}

// Store for chat messages
const messages = ref<ChatMessageData[]>([]);
const messagesContainer = ref<HTMLElement | null>(null);

// Compute reversed messages to display newest at the top
const reversedMessages = computed(() => {
  return [...messages.value].reverse();
});

// List of possible message templates
const messageTemplates = [
  "Hey there! Just checking in.",
  "What do you think about this new design?",
  "I've finished that task we discussed earlier.",
  "Can someone help me with this problem?",
  "Great job on the presentation!",
  "When is our next team meeting?",
  "I shared the files you requested.",
  "Let's discuss this further tomorrow.",
  "Has anyone seen the latest updates?",
  "This looks awesome! Nice work!",
  "Ready for the sprint review?",
  "Just pushed my changes to the repo.",
  "Can we schedule a quick call?",
  "Feedback needed on the latest mockup.",
  "Don't forget about the deadline!",
  "Pushed the private key to the repo.",
  "Refactored my life in 500 lines of code.",
  "Debugged reality, now it's bug free!",
  "Accidentally deployed to production, oops?",
  "Optimized my coffee intake for maximum focus.",
  "Forked the universe into new dimensions.",
  "Merging dreams and reality in one commit.",
  "Just squashed some intergalactic bugs.",
  "Ran out of RAM, time for a break.",
  "Committed heartbreak, pushing to main.",
  "Refactoring the stars into constellations.",
  "Branching out like a cosmic cactus.",
  "Git push? More like git life!",
  "Reset my clock to coder time.",
  "Merged my playlist with the codebase.",
  "I'll see you all at the BBQ this weekend!",
  "Anyone up for a game night later?",
  "Can't wait to try the new coffee blend in the break room.",
  "Weekend plans: Netflix, pizza, and plenty of sleep.",
  "Is it just me, or has the office playlist gotten epic?",
  "Who else is excited for tomorrow's team outing?",
  "Let's swap some funny memes after lunch.",
  "Grabbed some snacks—lunch meeting just got better!",
  "FYI: The water cooler's overrun with gossip again.",
  "Lunchtime banter: who's bringing dessert?",
  "Anyone else planning a weekend hike?",
  "Office chat: did you catch last night's game?",
  "Reminder: Friday drinks at 5!",
  "I just discovered a new taco truck. Must share!",
  "Let's not talk deadlines—what are your weekend plans?",
  "Office vibes: chill day and lots of smiles.",
  "Who's up for a spontaneous karaoke session?",
  "Coffee break chatter: have you seen the latest viral video?",
  "Team update: pizza party in the break room!",
  "Catch you later—enjoy the sunshine!",
  "FYI: I've got the best BBQ recipe for our next meet-up."
];

// List of possible usernames
const usernames = [
  "Alex", "Taylor", "Jordan", "Casey", "Morgan", "Riley", "Jamie", "Avery", "Quinn", "Parker",
  "Skyler", "Dakota", "Robin", "Oakley", "Finley", "Neo", "Trinity", "Morpheus", "Cypher", "Switch",
  "Mouse", "Oracle", "Seraph", "Spooner", "Caleb", "Zed", "Fox", "Pixel", "Echo", "Nimbus"
];

// Maximum number of messages to keep
const MAX_MESSAGES = 8;

// Basic validation for text inputs
const validateText = (text: string): string => {
  return text ? text.trim().slice(0, 250) : '';
};

// method to add new messages with improved typing
const addMessage = (data: { 
  profileImage: string, 
  type: 'blue' | 'purple' | 'pink', 
  text?: string, 
  username?: string 
}) => {
  let messageText = data.text;
  let messageUsername = data.username;

  // If no specific text provided, use random one
  if (!messageText) {
    let attempts = 0;
    do {
      const randomMessageIndex = Math.floor(Math.random() * messageTemplates.length);
      messageText = messageTemplates[randomMessageIndex];
      attempts++;
    } while (messages.value.some(m => m.text === messageText) && attempts < 10);
  }

  // If no specific username provided, use random one
  if (!messageUsername) {
    const randomUsernameIndex = Math.floor(Math.random() * usernames.length);
    messageUsername = usernames[randomUsernameIndex];
  }

  // Basic validation (instead of strict sanitization)
  const validatedText = validateText(messageText!);
  const validatedUsername = validateText(messageUsername!);
  
  // Validate image URL to ensure it comes from the expected directory
  const profileImage = data.profileImage.startsWith('/images/') ? 
    data.profileImage : '/images/Profile_Pictures/fox_profile.webp';

  const message: ChatMessageData = {
    id: Date.now(),
    profileImage,
    type: data.type,
    text: validatedText,
    username: validatedUsername,
    timestamp: new Date()
  };

  // Add message to array
  messages.value.push(message);

  // Keep only the last X messages
  if (messages.value.length > MAX_MESSAGES) {
    messages.value = messages.value.slice(-MAX_MESSAGES);
  }
};

const clearMessages = () => {
  messages.value = [];
};

// Watch for changes to messages and scroll to top
watch(messages, async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = 0;
  }
});

defineExpose({
  addMessage
});
</script>

<style scoped>
/* Some css that cant be easy tailwind */
.message-enter-active, .message-leave-active {
  transition: all 0.5s ease;
}

.message-enter-from, .message-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}

.message-move {
  transition: transform 0.5s ease;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thumb-ui-accent::-webkit-scrollbar-thumb {
  background-color: var(--color-ui-accent);
  border-radius: 3px;
}

.scrollbar-track-transparent::-webkit-scrollbar-track {
  background-color: transparent;
}
</style>