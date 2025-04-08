<template>
    <div class="flex flex-col min-h-screen">
        <HeadersStandardHeader />
        <main class="flex-grow">
            <slot />
        </main>
        <StandardFooter />
    </div>
</template>

<script setup lang="ts">
import { HeadersStandardHeader } from '#components'
</script>