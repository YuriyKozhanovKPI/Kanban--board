console.log("js/script.js підключено");

// Дані варіанта 11: задачі особистої Kanban-дошки та їхні статуси
const tasks = [
  { title: "Розробити семантичну розмітку сторінки", status: "Done" },
  { title: "Налаштувати адаптивну верстку", status: "Done" },
  { title: "Перевірити контраст тексту", status: "In Progress" },
  { title: "Додати картки на дошку", status: "To Do" },
  { title: "Підключити JavaScript до сторінки", status: "In Progress" },
  { title: "Підготувати звіт до практикуму", status: "To Do" },
];

// Стрілкова функція: перевіряє, чи задача виконана
const isDone = (task) => task.status === "Done";

// Підраховує кількість задач у кожному статусі (цикл for...of + if)
function countByStatus(taskList) {
  const counts = {};

  for (const task of taskList) {
    if (counts[task.status] === undefined) {
      counts[task.status] = 0;
    }
    counts[task.status] += 1;
  }

  console.log(`Усього задач: ${taskList.length}`);
  for (const status of Object.keys(counts)) {
    console.log(`Статус «${status}»: ${counts[status]}`);
  }
}

// Позначає задачі зі статусом "Done" (умовна класифікація)
function markTasks(taskList) {
  for (const task of taskList) {
    const mark = isDone(task) ? "[x]" : "[ ]";
    const label = isDone(task) ? "виконано" : "у роботі";
    console.log(`${mark} ${task.title} — ${label}`);
  }
}

countByStatus(tasks);
markTasks(tasks);
