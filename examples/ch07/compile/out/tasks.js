export function isTaskList(value) {
    return (Array.isArray(value) &&
        value.every((task) => typeof task?.id === 'string' &&
            typeof task?.title === 'string' &&
            typeof task?.done === 'boolean'));
}
export function visibleTasks(tasks, filter) {
    if (filter === 'active')
        return tasks.filter((task) => !task.done);
    if (filter === 'done')
        return tasks.filter((task) => task.done);
    return tasks;
}
export function countLabel(tasks) {
    const left = tasks.filter((task) => !task.done).length;
    return `${left} ${left === 1 ? 'task' : 'tasks'} left`;
}
