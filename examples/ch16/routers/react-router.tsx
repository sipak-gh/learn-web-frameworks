import { createBrowserRouter, Link, Outlet, useLoaderData } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { fetchTask, fetchTasks } from './api.ts'

function Layout() {
  return (
    <>
      <nav>
        <Link to="/">Home</Link> <Link to="/tasks">Tasks</Link>
      </nav>
      <Outlet />
    </>
  )
}

function TaskList() {
  const tasks = useLoaderData<typeof tasksLoader>()
  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.id}>
          <Link to={task.id}>{task.title}</Link>
        </li>
      ))}
    </ul>
  )
}

function TaskPage() {
  const task = useLoaderData<typeof taskLoader>()
  return <h1>{task.title}</h1>
}

const tasksLoader = () => fetchTasks()

async function taskLoader({ params }: { params: { id?: string } }) {
  const task = await fetchTask(params.id ?? '')
  if (!task) throw new Response('Not found', { status: 404 })
  return task
}

// Data mode: the router owns the URL *and* loads each page's data
// before rendering it.
const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, element: <h1>Home</h1> },
      { path: 'tasks', loader: tasksLoader, Component: TaskList },
      { path: 'tasks/:id', loader: taskLoader, Component: TaskPage },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
