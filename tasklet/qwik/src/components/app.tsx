import {
  $,
  component$,
  isServer,
  useComputed$,
  useSignal,
  useStore,
  useTask$,
  useVisibleTask$,
} from "@builder.io/qwik";
import { fetchTasks, loadSavedTasks, saveTasks } from "../storage";
import {
  addTask,
  clearDone,
  countLabel,
  removeTask,
  toggleTask,
  visibleTasks,
  type Filter,
  type Task,
} from "../tasks";
import { FilterBar } from "./filter-bar";
import { TaskForm } from "./task-form";
import { TaskItem } from "./task-item";

interface AppState {
  status: "loading" | "error" | "ready";
  tasks: Task[];
}

export const App = component$(() => {
  const state = useStore<AppState>({ status: "loading", tasks: [] });
  const filter = useSignal<Filter>("all");

  const visible = useComputed$(() => visibleTasks(state.tasks, filter.value));
  const count = useComputed$(() => countLabel(state.tasks));
  const anyDone = useComputed$(() => state.tasks.some((task) => task.done));

  // $() makes the function a QRL: a lazy-loadable reference that handlers
  // and tasks can capture and that survives serialization.
  const load = $(async () => {
    state.status = "loading";
    try {
      state.tasks = await fetchTasks();
      state.status = "ready";
    } catch {
      state.status = "error";
    }
  });

  // The page is rendered at build time, where there is no localStorage, so
  // start-up is browser-only work: Qwik's escape hatch, a visible task.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(
    () => {
      const saved = loadSavedTasks();
      if (saved) {
        state.tasks = saved;
        state.status = "ready";
      } else {
        load();
      }
    },
    { strategy: "document-ready" },
  );

  // Runs once at build time (and stops at the guard); after that, in the
  // browser, whenever state.tasks changes: save every change.
  useTask$(({ track }) => {
    const tasks = track(() => state.tasks);
    if (isServer || state.status !== "ready") return;
    saveTasks(tasks);
  });

  return (
    <main class="tasklet">
      <h1>Tasklet</h1>
      <TaskForm
        onAdd$={(title) => {
          state.tasks = addTask(state.tasks, title);
        }}
      />
      <FilterBar
        filter={filter.value}
        onChange$={(next) => {
          filter.value = next;
        }}
      />
      {state.status === "loading" && <p role="status">Loading tasks…</p>}
      {state.status === "error" && (
        <>
          <p role="alert">Couldn't load tasks.</p>
          <button type="button" onClick$={load}>
            Retry
          </button>
        </>
      )}
      {state.status === "ready" &&
        (visible.value.length === 0 ? (
          <p class="empty">Nothing to show.</p>
        ) : (
          <ul class="tasks" aria-label="Tasks">
            {visible.value.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle$={() => {
                  state.tasks = toggleTask(state.tasks, task.id);
                }}
                onRemove$={() => {
                  state.tasks = removeTask(state.tasks, task.id);
                }}
              />
            ))}
          </ul>
        ))}
      {state.status === "ready" && (
        <footer class="footer">
          <p class="count" aria-live="polite">
            {count.value}
          </p>
          <button
            type="button"
            class="clear"
            disabled={!anyDone.value}
            onClick$={() => {
              state.tasks = clearDone(state.tasks);
            }}
          >
            Clear done
          </button>
        </footer>
      )}
    </main>
  );
});
