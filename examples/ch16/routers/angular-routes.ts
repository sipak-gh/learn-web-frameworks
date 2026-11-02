import type { ActivatedRouteSnapshot, Routes } from '@angular/router'
import { fetchTask } from './api.ts'

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/angular-pages.ts').then((m) => m.HomePage) },
  {
    path: 'tasks/:id',
    loadComponent: () => import('./pages/angular-pages.ts').then((m) => m.TaskPage),
    // A resolver loads data before the route activates.
    resolve: { task: (route: ActivatedRouteSnapshot) => fetchTask(route.paramMap.get('id') ?? '') },
  },
  { path: '**', redirectTo: '' },
]

// app.config.ts: providers: [provideRouter(routes, withComponentInputBinding())]
// With component input binding, TaskPage receives `id` and `task` as inputs.
