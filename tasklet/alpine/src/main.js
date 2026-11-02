import Alpine from 'alpinejs'
import { filterBar, taskForm, taskItem } from './components.js'
import { saveTasks } from './storage.js'
import { tasklet } from './store.js'
import './tasklet.css'

Alpine.store('tasklet', tasklet)
Alpine.data('taskForm', taskForm)
Alpine.data('filterBar', filterBar)
Alpine.data('taskItem', taskItem)

// Re-runs whenever anything it read changes. saveTasks() stringifies the
// whole list, so it reads (and so depends on) every task's every field.
const store = Alpine.store('tasklet')
Alpine.effect(() => {
  if (store.ready) saveTasks(store.tasks)
})

Alpine.start()
