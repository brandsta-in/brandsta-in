<!-- app/app.vue -->
<script setup lang="ts">
import ResonantCursor from '~/components/ResonantCursor.vue'
</script>

<template>
  <div class="min-h-dvh bg-[#02050e] text-white antialiased">
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <ResonantCursor />
  </div>
</template>