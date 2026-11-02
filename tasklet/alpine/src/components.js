// The per-element components, registered with Alpine.data() and used as
// x-data="taskForm" and so on. Each one sees $store.tasklet through `this`.

export function taskForm() {
  return {
    title: '',
    submit() {
      const title = this.title.trim()
      if (title === '') return
      this.$store.tasklet.add(title)
      this.title = ''
    },
  }
}

export function filterBar() {
  return {
    filters: [
      { value: 'all', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'done', label: 'Done' },
    ],
    isCurrent(value) {
      return this.$store.tasklet.filter === value
    },
    choose(value) {
      this.$store.tasklet.filter = value
    },
  }
}

// Lives inside x-for, so `this.task` is the loop variable of that row.
export function taskItem() {
  return {
    get deleteLabel() {
      return `Delete "${this.task.title}"`
    },
    toggle() {
      this.$store.tasklet.toggle(this.task.id)
    },
    remove() {
      this.$store.tasklet.remove(this.task.id)
    },
  }
}
