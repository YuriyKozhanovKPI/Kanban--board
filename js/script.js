// Обрано Vue 3: він підключається одним CDN-скриптом і дає реактивний
// стан без збірки та Node.js, що найпростіше для навчального проєкту.
console.log("js/script.js підключено");

// JSONPlaceholder API: 20 задач користувача 3 для особистої Kanban-дошки (варіант 11)
const API_URL = "https://jsonplaceholder.typicode.com/todos?userId=3";

// Порядок колонок для переміщення задачі кліком
const statusOrder = ["To Do", "In Progress", "Done"];

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

// -------------------------------------------------------------------
// Локальні сховища даних (практикум 11)
// Модель запису варіанта 11: { id, title, column }, де column має
// значення "todo" | "doing" | "done". Інтерфейс показує людські назви
// колонок, тому між станом Vue і записом сховища є перетворення.
// -------------------------------------------------------------------
const DB_NAME = "KanbanDB";
const DB_VERSION = 1;
const STORE_NAME = "cards";
const STORAGE_KEY = "kanbanCards";
const MIGRATION_KEY = "kanbanMigrated";

const COLUMN_BY_STATUS = {
  "To Do": "todo",
  "In Progress": "doing",
  Done: "done",
};

const STATUS_BY_COLUMN = {
  todo: "To Do",
  doing: "In Progress",
  done: "Done",
};

// CSS-модифікатор колонки для людської назви статусу
const COLUMN_CLASS = {
  "To Do": "todo",
  "In Progress": "progress",
  Done: "done",
};

// Задача для рендеру → запис для сховища
const toRecord = (task) => ({
  id: task.id,
  title: task.title,
  column: COLUMN_BY_STATUS[task.status],
});

// Запис зі сховища → задача для рендеру
const fromRecord = (record) => ({
  id: record.id,
  title: record.title,
  status: STATUS_BY_COLUMN[record.column] ?? "To Do",
});

// localStorage зберігає лише рядки, тому масив карток серіалізуємо
// через JSON.stringify після кожної зміни стану
function saveToLocalStorage(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("Не вдалося зберегти дані в localStorage:", error);
  }
}

// JSON.parse кидає виняток на пошкоджених даних, тому читання
// загорнуте в try/catch — у разі помилки починаємо з порожнього списку
function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Пошкоджені дані в localStorage:", error);
    return [];
  }
}

// Відкриває IndexedDB і створює object store "cards" з keyPath "id"
// під час першого запуску або підвищення версії бази
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Створює новий запис або оновлює наявний із тим самим id
async function addItem(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// put() з тим самим id перезаписує запис — окрема функція для
// читабельності сценарію «переміщення картки»
async function updateItem(record) {
  return addItem(record);
}

// Повертає всі картки зі сховища для рендеру списку
async function getAllItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Видаляє картку за ключем id (повний CRUD зі сховищем)
async function deleteItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Одноразова міграція: якщо store порожній, а в localStorage вже є
// картки, переносимо їх і ставимо прапорець, щоб не дублювати
async function migrateFromLocalStorage() {
  if (localStorage.getItem(MIGRATION_KEY) === "true") {
    return 0;
  }

  const legacyItems = loadFromLocalStorage();
  if (legacyItems.length === 0) {
    return 0;
  }

  const storedItems = await getAllItems();
  if (storedItems.length > 0) {
    localStorage.setItem(MIGRATION_KEY, "true");
    return 0;
  }

  for (const item of legacyItems) {
    await addItem(item);
  }
  localStorage.setItem(MIGRATION_KEY, "true");
  console.log(`Міграція: перенесено ${legacyItems.length} карток у IndexedDB`);
  return legacyItems.length;
}

// Компонент картки (варіант 11): дані отримує лише через props,
// а клік повідомляє батьківський компонент подією moveNext(id) —
// у шаблоні Vue її ім'я записано в kebab-case: move-next.
const TaskCard = {
  name: "TaskCard",
  props: {
    taskId: { type: [Number, String], required: true },
    title: { type: String, required: true },
    column: { type: String, required: true },
  },
  // kebab-case відповідає стилю Vue і коректно розпізнається Vue DevTools
  emits: ["move-next"],
  template: `
    <article
      class="card"
      :class="{ done: column === 'Done' }"
      :data-status="column"
      :data-task-id="taskId"
      title="Натисніть, щоб перемістити до наступної колонки"
      @click="handleClick"
    >
      <h3>
        <a class="card__link" :href="'#/card/' + taskId" data-link>{{ title }}</a>
      </h3>
    </article>
  `,
  methods: {
    // Клік по назві — це посилання на маршрут /card/:id, тому картку
    // не переміщуємо; решта площі картки, як і раніше, рухає її далі.
    handleClick(event) {
      if (event.target.closest("a[data-link]")) {
        return;
      }
      this.$emit("move-next", this.taskId);
    },
  },
};

// Колонка дошки як окремий компонент: використовується і на повній
// дошці (маршрут "/"), і на сторінці однієї колонки ("/column/:column"),
// тому розмітка й логіка не дублюються.
const KanbanColumn = {
  name: "KanbanColumn",
  props: {
    status: { type: String, required: true },
    tasks: { type: Array, required: true },
  },
  emits: ["move-next"],
  template: `
    <section
      class="kanban-column"
      :class="'kanban-column--' + columnClass"
      :data-status="status"
    >
      <h2>{{ status }}</h2>

      <div class="horizontal_border"></div>

      <div class="cards-list">
        <task-card
          v-for="task in tasks"
          :key="task.id"
          :task-id="task.id"
          :title="task.title"
          :column="task.status"
          @move-next="$emit('move-next', $event)"
        ></task-card>
      </div>

      <p class="column-summary" v-if="status === 'Done'">
        Виконано задач: {{ tasks.length }}
      </p>
    </section>
  `,
  computed: {
    columnClass() {
      return COLUMN_CLASS[this.status];
    },
  },
};

// -------------------------------------------------------------------
// Клієнтська маршрутизація (практикум 13): hash-based, без бібліотек
// і без перезавантаження документа. Таблиця маршрутів зіставляє
// патерн із view-функцією; патерн може містити параметр (:column, :id).
// -------------------------------------------------------------------
const routes = [
  { path: "/", view: "showBoard" },
  { path: "/column/:column", view: "showColumn" },
  { path: "/card/:id", view: "showCard" },
];

// Порівнює поточний шлях із патернами й повертає
// { view, params } або null, якщо маршрут не знайдено
function matchRoute(path) {
  const pathParts = path.split("/").filter(Boolean);

  for (const route of routes) {
    const routeParts = route.path.split("/").filter(Boolean);
    if (routeParts.length !== pathParts.length) {
      continue;
    }

    const params = {};
    const isMatch = routeParts.every((part, index) => {
      if (part.startsWith(":")) {
        params[part.slice(1)] = decodeURIComponent(pathParts[index]);
        return true;
      }
      return part === pathParts[index];
    });

    if (isMatch) {
      return { view: route.view, params };
    }
  }

  return null;
}

const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      // Масив задач живе в реактивному стані Vue, а не в зовнішній змінній
      tasks: [],
      newTitle: "",
      newColumn: "To Do",
      isLoading: false,
      errorMessage: "",
      storageError: "",
      dropHighlightTimer: null,

      // Стан клієнтського роутера
      statuses: statusOrder,
      currentView: "board",
      currentPath: "/",
      columnStatus: "",
      activeCardId: null,
    };
  },

  computed: {
    // Картка, яку показує маршрут /card/:id (id може бути числом або рядком)
    activeCard() {
      return this.tasks.find(
        (task) => String(task.id) === String(this.activeCardId),
      );
    },

    // Колонка для посилання зі сторінки картки
    cardColumn() {
      return COLUMN_BY_STATUS[this.activeCard?.status] ?? "todo";
    },
  },

  methods: {
    // -----------------------------------------------------------------
    // Клієнтська навігація: клік по <a data-link> не перезавантажує
    // сторінку, а лише змінює hash і викликає рендер.
    // -----------------------------------------------------------------
    navigate(path) {
      if (location.hash === `#${path}`) {
        this.render();
        return;
      }
      location.hash = path;
    },

    handleLinkClick(event) {
      const link = event.target.closest("a[data-link]");
      if (!link) {
        return;
      }
      event.preventDefault();
      this.navigate(link.getAttribute("href").replace(/^#/, ""));
    },

    // Поточний шлях → view-функція; якщо збігу немає — сторінка 404
    render() {
      const path = location.hash.slice(1) || "/";
      this.currentPath = path;
      console.log(`Маршрут: ${path}`);

      const match = matchRoute(path);

      if (!match) {
        this.showNotFound();
        return;
      }

      this[match.view](match.params);
    },

    // View-функції: готують дані свого маршруту. Vue очищує контейнер
    // #view і рендерить у нього потрібний блок, тому innerHTML не потрібен.
    showBoard() {
      this.currentView = "board";
    },

    showColumn({ column }) {
      const status = STATUS_BY_COLUMN[column];
      if (!status) {
        this.showNotFound();
        return;
      }
      this.currentView = "column";
      this.columnStatus = status;
    },

    showCard({ id }) {
      const task = this.tasks.find((item) => String(item.id) === String(id));
      if (!task) {
        this.showNotFound();
        return;
      }
      this.currentView = "card";
      this.activeCardId = task.id;
    },

    showNotFound() {
      this.currentView = "notFound";
    },

    // Задачі для конкретної колонки — основа декларативного v-for
    tasksByStatus(status) {
      return this.tasks.filter((task) => task.status === status);
    },

    // Синхронне дзеркало в localStorage після кожної зміни стану
    persistToLocalStorage() {
      saveToLocalStorage(this.tasks.map(toRecord));
    },

    // Зрозуміле користувачу повідомлення, якщо IndexedDB недоступна
    showStorageError(error) {
      this.storageError =
        "Локальне сховище недоступне: зміни не збережуться після перезавантаження сторінки.";
      console.error("Помилка IndexedDB:", error);
    },

    // Початкове завантаження: міграція з localStorage → читання з
    // IndexedDB. Якщо сховище порожнє (перший запуск), підтягуємо
    // задачі з API, як у практикумі 9.
    async initStorage() {
      try {
        await migrateFromLocalStorage();
        const records = await getAllItems();

        if (records.length === 0) {
          await this.loadData();
          return;
        }

        this.tasks = records.map(fromRecord);
        this.persistToLocalStorage();
        console.log(`З IndexedDB прочитано карток: ${records.length}`);
      } catch (error) {
        this.showStorageError(error);
        // Резервний показ даних, якщо IndexedDB не відкривається
        this.tasks = loadFromLocalStorage().map(fromRecord);
      } finally {
        // Дані готові — повторно застосовуємо поточний маршрут, щоб
        // прямий перехід на /card/:id одразу показав картку
        this.render();
      }
    },

    // Додає задачу з форми у реактивний масив і в обидва сховища
    async addTask() {
      const title = this.newTitle.trim();
      if (title === "") {
        return;
      }

      const task = {
        id: `local-${Date.now()}`,
        title,
        status: this.newColumn,
      };
      this.tasks.push(task);
      this.persistToLocalStorage();

      try {
        await addItem(toRecord(task));
        console.log(
          `Додано задачу: «${title}» → ${this.newColumn} (IndexedDB)`,
        );
      } catch (error) {
        this.showStorageError(error);
      }

      this.newTitle = "";
      this.newColumn = "To Do";
      this.$refs.titleInput.setCustomValidity("");
    },

    // Додаткова валідація: заголовок має містити щонайменше 3 символи
    validateTitle(event) {
      const input = event.target;
      if (input.value !== "" && input.value.trim().length < 3) {
        input.setCustomValidity("Заголовок має містити щонайменше 3 символи");
      } else {
        input.setCustomValidity("");
      }
    },

    // Повідомлення про помилку валідації в консолі
    logInvalidTitle() {
      const input = this.$refs.titleInput;
      console.log(
        `Помилка валідації: заголовок «${input.value}» має містити щонайменше 3 символи`,
      );
    },

    // FLIP-анімація (практикум 12): перед зміною стану запам'ятовуємо
    // екранні позиції всіх карток, щоб після перемальовування показати
    // переміщення через transform і плавно повернути картку на місце.
    captureCardPositions() {
      const positions = new Map();
      document.querySelectorAll(".card[data-task-id]").forEach((card) => {
        positions.set(card.dataset.taskId, card.getBoundingClientRect());
      });
      return positions;
    },

    async animateCardMove(positions, movedId) {
      await this.$nextTick();

      const cards = document.querySelectorAll(".card[data-task-id]");
      const movedCard = document.querySelector(
        `.card[data-task-id="${String(movedId)}"]`,
      );
      const targetColumn = movedCard?.closest(".kanban-column");
      targetColumn?.classList.add("kanban-column--animating");

      cards.forEach((card) => {
        const previous = positions.get(card.dataset.taskId);
        if (!previous) {
          return;
        }

        const current = card.getBoundingClientRect();
        const dx = previous.left - current.left;
        const dy = previous.top - current.top;
        if (dx === 0 && dy === 0) {
          return;
        }

        // Ставимо картку в попередню позицію без переходу,
        // а в наступному кадрі відпускаємо — CSS transition transform
        // анімує повернення до нової позиції в колонці.
        card.style.transition = "none";
        card.style.transform = `translate(${dx}px, ${dy}px)`;

        if (card.dataset.taskId === String(movedId)) {
          card.classList.add("card--moving");
        }
      });

      requestAnimationFrame(() => {
        cards.forEach((card) => {
          card.style.transition = "";
          card.style.transform = "";
        });
      });

      setTimeout(() => {
        cards.forEach((card) => card.classList.remove("card--moving"));
        targetColumn?.classList.remove("kanban-column--animating");
      }, 500);
    },

    // Підсвічування колонки, до якої перенесено картку.
    // Клас знімається після завершення CSS-анімації, щоб наступний
    // клік міг запустити її повторно.
    highlightDropZone(status) {
      const column = document.querySelector(
        `.kanban-column[data-status="${status}"]`,
      );
      if (!column) {
        return;
      }

      column.classList.remove("kanban-column--drop-target");
      void column.offsetWidth; // перезапуск CSS-анімації
      column.classList.add("kanban-column--drop-target");

      clearTimeout(this.dropHighlightTimer);
      this.dropHighlightTimer = setTimeout(() => {
        column.classList.remove("kanban-column--drop-target");
      }, 900);
    },

    // Отримує id від TaskCard і змінює реактивний стан.
    // Vue сам перемальовує список: функцію ручного рендеру renderTasks
    // з практикуму 7 видалено, querySelector/innerHTML тут не потрібні.
    async moveNext(id) {
      const task = this.tasks.find((item) => item.id === id);
      if (!task) {
        return;
      }

      const currentIndex = statusOrder.indexOf(task.status);
      if (currentIndex === -1 || currentIndex === statusOrder.length - 1) {
        return;
      }

      const nextStatus = statusOrder[currentIndex + 1];
      const previousStatus = task.status;

      // Запам'ятовуємо позиції карток до зміни колонки
      const positions = this.captureCardPositions();

      task.status = nextStatus;
      this.persistToLocalStorage();
      this.highlightDropZone(nextStatus);
      this.animateCardMove(positions, id);

      try {
        // Сценарій варіанта 11: put з оновленим полем column для того
        // самого id, без створення дубліката картки
        await updateItem(toRecord(task));
        console.log(
          `Задачу «${task.title}» переміщено: ${previousStatus} → ${nextStatus} (IndexedDB)`,
        );
      } catch (error) {
        this.showStorageError(error);
      }
    },

    // -------------------------------------------------------------------
    // Клієнт JSONPlaceholder API (практикум 9)
    // GET https://jsonplaceholder.typicode.com/todos?userId=3 повертає
    // 20 задач користувача 3; поле completed визначає колонку To Do / Done.
    // Отримані задачі зберігаються в IndexedDB, після чого список
    // рендериться з результатів getAllItems().
    // -------------------------------------------------------------------
    async loadData() {
      this.isLoading = true;
      this.errorMessage = "";

      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`Сервер відповів кодом ${response.status}`);
        }

        const data = await response.json();
        console.log("Відповідь API:", data);

        const apiTasks = data.map((item) => ({
          id: item.id,
          title: item.title,
          status: item.completed ? "Done" : "To Do",
        }));

        let records;
        try {
          for (const task of apiTasks) {
            await updateItem(toRecord(task));
          }
          records = await getAllItems();
        } catch (error) {
          this.showStorageError(error);
          records = apiTasks.map(toRecord);
        }

        this.tasks = records.map(fromRecord);
        this.persistToLocalStorage();

        countByStatus(this.tasks);
        markTasks(this.tasks);
      } catch (error) {
        this.errorMessage = "Дошку тимчасово не вдалося завантажити.";
        console.error("Помилка завантаження дошки:", error);
      } finally {
        this.isLoading = false;
      }
    },
  },

  mounted() {
    this.initStorage();

    // Кнопки «назад»/«вперед» змінюють hash → hashchange → render
    window.addEventListener("hashchange", this.render);
    document.addEventListener("click", this.handleLinkClick);
    this.render();
  },

  beforeUnmount() {
    window.removeEventListener("hashchange", this.render);
    document.removeEventListener("click", this.handleLinkClick);
  },
});

// Компоненти потрібні і всередині інших компонентів, тому реєструємо
// їх глобально, а не лише в кореневому екземплярі
app.component("task-card", TaskCard);
app.component("kanban-column", KanbanColumn);
app.mount("#app");