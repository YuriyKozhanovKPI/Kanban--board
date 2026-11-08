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
      nextId: 1000,
      isLoading: false,
      errorMessage: "",
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

    // Додає задачу з форми у реактивний масив
    addTask() {
      const title = this.newTitle.trim();
      if (title === "") {
        return;
      }

      this.tasks.push({
        id: `local-${this.nextId}`,
        title,
        status: this.newColumn,
      });
      this.nextId += 1;

      console.log(`Додано задачу: «${title}» → ${this.newColumn}`);

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
    moveNext(id) {
      const task = this.tasks.find((item) => item.id === id);
      if (!task) {
        return;
      }

      const currentIndex = statusOrder.indexOf(task.status);
      if (currentIndex === -1 || currentIndex === statusOrder.length - 1) {
        return;
      }

      const nextStatus = statusOrder[currentIndex + 1];
      console.log(
        `Задачу «${task.title}» переміщено: ${task.status} → ${nextStatus}`,
      );
      task.status = nextStatus;
    },

    // -------------------------------------------------------------------
    // Клієнт JSONPlaceholder API (практикум 9)
    // GET https://jsonplaceholder.typicode.com/todos?userId=3 повертає
    // 20 задач користувача 3; поле completed визначає колонку To Do / Done.
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

        this.tasks = data.map((item) => ({
          id: item.id,
          title: item.title,
          status: item.completed ? "Done" : "To Do",
        }));

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
    this.loadData();
  },
}).mount("#app");
