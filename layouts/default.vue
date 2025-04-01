<template>
    <div class="default-layout min-h-screen flex flex-col">
      <headers-StandardHeader />
      <main class="flex-grow">
        <slot />
      </main>
      <StandardFooter />
    </div>
</template>
