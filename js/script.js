console.log("js/script.js підключено");

// Прибирає статичні картки-заглушки, залишені з практикуму 2
document.querySelectorAll(".card").forEach((card) => card.remove());

// JSONPlaceholder API: 20 задач користувача 3 для особистої Kanban-дошки (варіант 11)
const API_URL = "https://jsonplaceholder.typicode.com/todos?userId=3";

// Дані варіанта 11: задачі з API, доповнені формою та кліком по картці
const tasks = [];

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

// -------------------------------------------------------------------
// Клієнт JSONPlaceholder API (практикум 9)
// GET https://jsonplaceholder.typicode.com/todos?userId=3 повертає
// 20 задач користувача 3; поле completed визначає колонку To Do / Done.
// -------------------------------------------------------------------
const refreshButton = document.querySelector("#refresh-button");
const loadingStatus = document.querySelector("#loading-status");
const errorStatus = document.querySelector("#error-status");

// Стан завантаження: видимий текст і заблокована кнопка «Оновити»
function showLoading(isLoading) {
  loadingStatus.hidden = !isLoading;
  refreshButton.disabled = isLoading;
}

// Повідомлення про помилку; порожній рядок ховає блок
function showError(message) {
  errorStatus.textContent = message;
  errorStatus.hidden = message === "";
}

// Запитує задачі та виводить їх у колонки через renderTasks (практикум 7)
async function loadData() {
  showLoading(true);
  showError("");

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Сервер відповів кодом ${response.status}`);
    }

    const data = await response.json();
    console.log("Відповідь API:", data);

    tasks.length = 0;
    data.forEach((item) => {
      tasks.push({
        title: item.title,
        status: item.completed ? "Done" : "To Do",
      });
    });

    renderTasks(tasks);
    countByStatus(tasks);
    markTasks(tasks);
  } catch (error) {
    showError("Дошку тимчасово не вдалося завантажити.");
    console.error("Помилка завантаження дошки:", error);
  } finally {
    showLoading(false);
  }
}

// Кнопка «Оновити» повторює запит без перезавантаження сторінки
refreshButton.addEventListener("click", loadData);

loadData();

