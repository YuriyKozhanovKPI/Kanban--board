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
  // Повторний рендер починається з порожніх списків, щоб не дублювати картки
  Object.values(columns).forEach((list) => list.replaceChildren());

  taskList.forEach((task, index) => {
    const card = document.createElement("article");
    const title = document.createElement("h3");

    card.classList.add("card");
    card.dataset.status = task.status;
    card.dataset.index = index;
    card.title = "Натисніть, щоб перемістити до наступної колонки";
    title.textContent = task.title;
    card.append(title);

    // Виконані задачі додатково позначаються класом done
    if (isDone(task)) {
      card.classList.add("done");
    }

    columns[task.status].append(card);
  });

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

// Форма додавання нової задачі
const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#task-title");
const columnSelect = document.querySelector("#task-column");

// Додаткова валідація: заголовок має містити щонайменше 3 символи
titleInput.addEventListener("input", () => {
  if (titleInput.value !== "" && titleInput.value.trim().length < 3) {
    titleInput.setCustomValidity("Заголовок має містити щонайменше 3 символи");
  } else {
    titleInput.setCustomValidity("");
  }
});

// Повідомлення про помилку валідації в консолі
titleInput.addEventListener("invalid", () => {
  console.log(
    `Помилка валідації: заголовок «${titleInput.value}» має містити щонайменше 3 символи`,
  );
});

// Надсилання форми без перезавантаження сторінки
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const status = columnSelect.value;

  tasks.push({ title, status });
  renderTasks(tasks);
  form.reset();
  titleInput.setCustomValidity("");

  console.log(`Додано задачу: «${title}» → ${status}`);
});

// Переміщення задачі до наступної колонки кліком по картці
const statusOrder = ["To Do", "In Progress", "Done"];
const board = document.querySelector(".kanban-board");

board.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (!card) {
    return;
  }

  const task = tasks[card.dataset.index];
  const currentIndex = statusOrder.indexOf(task.status);
  if (currentIndex === statusOrder.length - 1) {
    return;
  }

  const nextStatus = statusOrder[currentIndex + 1];
  console.log(
    `Задачу «${task.title}» переміщено: ${task.status} → ${nextStatus}`,
  );
  task.status = nextStatus;
  renderTasks(tasks);
});
