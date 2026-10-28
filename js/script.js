console.log("js/script.js підключено");

// Прибирає статичні картки-заглушки, залишені з практикуму 2
document.querySelectorAll(".card").forEach((card) => card.remove());

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

// Контейнери колонок дошки та підсумковий лічильник
const todoList = document.querySelector("#todo-list");
const inProgressList = document.querySelector("#inprogress-list");
const doneList = document.querySelector("#done-list");
const doneCount = document.querySelector("#done-count");

// Відповідність статусу задачі та колонки, у яку її треба додати
const columns = {
  "To Do": todoList,
  "In Progress": inProgressList,
  Done: doneList,
};

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

// Виводить задачі у колонки, що відповідають їхньому статусу
function renderTasks(taskList) {
  for (const task of taskList) {
    const card = document.createElement("article");
    const title = document.createElement("h3");

    card.classList.add("card");
    card.dataset.status = task.status;
    title.textContent = task.title;
    card.append(title);

    // Виконані задачі додатково позначаються класом done
    if (isDone(task)) {
      card.classList.add("done");
    }

    columns[task.status].append(card);
  }

  renderDoneCount(taskList);
}

// Оновлює підсумок: кількість задач у колонці Done
function renderDoneCount(taskList) {
  const doneTasks = taskList.filter(isDone);
  doneCount.textContent = `Виконано задач: ${doneTasks.length}`;
}

renderTasks(tasks);
countByStatus(tasks);
markTasks(tasks);
