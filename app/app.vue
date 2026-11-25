<!-- app/app.vue -->
<script setup lang="ts">
import ResonantCursor from '~/components/ResonantCursor.vue'
</script>

<template>
  <div class="min-h-dvh bg-brand-obsidian text-white antialiased">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ResonantCursor />
  </div>
</template>