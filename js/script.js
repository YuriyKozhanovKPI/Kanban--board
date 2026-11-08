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
      title="Натисніть, щоб перемістити до наступної колонки"
      @click="$emit('move-next', taskId)"
    >
      <h3>{{ title }}</h3>
    </article>
  `,
};

const { createApp } = Vue;

createApp({
  components: { TaskCard },

  data() {
    return {
      // Масив задач живе в реактивному стані Vue, а не в зовнішній змінній
      tasks: [],
      newTitle: "",
      newColumn: "To Do",
      isLoading: false,
      errorMessage: "",
      storageError: "",
    };
  },

  computed: {
    // Похідне значення: кількість задач у колонці Done
    doneCount() {
      return this.tasks.filter(isDone).length;
    },
  },

  methods: {
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
      task.status = nextStatus;
      this.persistToLocalStorage();

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
  },
}).mount("#app");