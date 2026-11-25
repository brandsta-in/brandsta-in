<!-- app/layouts/default.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#imports'
import BrandstaHeader from '~/components/launch/BrandstaHeader.vue'

const route = useRoute()
const showGlobalHeader = computed(() => !route.path.startsWith('/formation'))
</script>

<template>
  <div class="relative min-h-dvh">
    <BrandstaHeader v-if="showGlobalHeader" />
    <slot />
  </div>
</template>