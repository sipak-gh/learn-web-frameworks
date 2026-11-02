import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./pages/HomePage.vue') },
    { path: '/tasks', component: () => import('./pages/TaskList.vue') },
    // props: true passes :id to the component as a prop.
    { path: '/tasks/:id', component: () => import('./pages/TaskPage.vue'), props: true },
    { path: '/:pathMatch(.*)*', component: () => import('./pages/NotFound.vue') },
  ],
})

// main.ts: createApp(App).use(router).mount('#app')
// App.vue: <RouterLink to="/tasks">Tasks</RouterLink> <RouterView />
