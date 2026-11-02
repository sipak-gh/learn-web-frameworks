import { createMemo, createSignal, For, Match, Show, Switch, type Component } from 'solid-js';
import { FilterBar } from './components/FilterBar';
import { TaskForm } from './components/TaskForm';
import { TaskItem } from './components/TaskItem';
import { createTaskStore } from './taskStore';
import { countLabel, visibleTasks, type Filter } from './tasks';

const App: Component = () => {
  const store = createTaskStore();
  const [filter, setFilter] = createSignal<Filter>('all');
  const visible = createMemo(() => visibleTasks(store.tasks, filter()));

  return (
    <main class="tasklet">
      <h1>Tasklet</h1>
      <TaskForm onAdd={store.add} />
      <FilterBar filter={filter()} onChange={setFilter} />
      <Switch>
        <Match when={store.failed()}>
          <p role="alert">Couldn't load tasks.</p>
          <button type="button" onClick={store.retry}>
            Retry
          </button>
        </Match>
        <Match when={!store.ready()}>
          <p role="status">Loading tasks…</p>
        </Match>
        <Match when={visible().length === 0}>
          <p class="empty">Nothing to show.</p>
        </Match>
        <Match when={visible().length > 0}>
          <ul class="tasks" aria-label="Tasks">
            <For each={visible()}>
              {(task) => (
                <TaskItem
                  task={task}
                  onToggle={() => store.toggle(task.id)}
                  onRemove={() => store.remove(task.id)}
                />
              )}
            </For>
          </ul>
        </Match>
      </Switch>
      <Show when={store.ready()}>
        <footer class="footer">
          <p class="count" aria-live="polite">
            {countLabel(store.tasks)}
          </p>
          <button
            type="button"
            class="clear"
            disabled={!store.tasks.some((task) => task.done)}
            onClick={() => store.clearDone()}
          >
            Clear done
          </button>
        </footer>
      </Show>
    </main>
  );
};

export default App;
