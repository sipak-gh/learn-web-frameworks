import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { fetchTasks, type Filter } from './api.ts'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <nav>
        <Link to="/tasks" search={{ filter: 'active' }}>
          Active tasks
        </Link>
      </nav>
      <Outlet />
    </>
  ),
})

const filters: readonly Filter[] = ['all', 'active', 'done']

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks',
  // Search params are validated and typed, like route params.
  validateSearch: (search: Record<string, unknown>): { filter: Filter } => ({
    filter: filters.find((f) => f === search.filter) ?? 'all',
  }),
  loader: () => fetchTasks(),
  component: function TaskList() {
    const { filter } = tasksRoute.useSearch()
    const tasks = tasksRoute.useLoaderData()
    const shown = tasks.filter((task) => filter === 'all' || task.done === (filter === 'done'))
    return (
      <ul>
        {shown.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    )
  },
})

const router = createRouter({ routeTree: rootRoute.addChildren([tasksRoute]) })

// Registering the router makes every <Link to> and search object type-checked.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function App() {
  return <RouterProvider router={router} />
}
