import {
  api,
  getUser,
  clearSession,
  requireAuth
} from "./api.js";

import { initPomodoro } from "./pomodoro.js";

console.log("Token:", localStorage.getItem("ssp_token"));
console.log("User:", localStorage.getItem("ssp_user"));
console.log("Dashboard JS loaded");

// ---------------- MAIN WRAPPER ----------------

document.addEventListener("DOMContentLoaded", () => {

  requireAuth();

  const user = getUser();

  let tasks = [];
  let notes = [];

  // ---------------- SAFE DOM HELPER ----------------
  const getEl = (id) => document.getElementById(id);

  // ---------------- PROFILE PHOTO ----------------

  async function loadProfilePhoto() {
    try {
      const profile = await api("/profile");

      const avatar = getEl("user-avatar");
      if (avatar) {
        avatar.src = profile.profile_image
          ? profile.profile_image
          : "images/default-user.png";
      }

      const sidebarName = getEl("sidebar-user-name");
      if (sidebarName && profile.name) {
        sidebarName.textContent = profile.name;
      }

    } catch (error) {
      console.log("Profile photo error", error);
    }
  }

  loadProfilePhoto();

  // ---------------- HEADER ----------------

  const firstName =
    user && user.name
      ? user.name.split(" ")[0]
      : "there";

  const greetingEl = getEl("greeting");
  if (greetingEl) {
    greetingEl.textContent = `Welcome back, ${firstName}`;
  }

  const userNameEl = getEl("user-name");
  if (userNameEl && user) {
    userNameEl.textContent = user.name;
  }

  const todayLabelEl = getEl("today-label");
  if (todayLabelEl) {
    todayLabelEl.textContent =
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
  }

  // ---------------- LOGOUT ----------------

  const logoutBtn = getEl("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearSession();
      window.location.href = "login.html";
    });
  }

  // ---------------- TASKS ----------------

  function renderTasks() {
    const taskList = getEl("task-list");
    if (!taskList) return;

    if (tasks.length === 0) {
      taskList.innerHTML = `<div class="empty">No study tasks yet.</div>`;
      return;
    }

    taskList.innerHTML = tasks.map(task => {

      const priorityClass =
        task.priority === "High"
          ? "chip-high"
          : task.priority === "Medium"
          ? "chip-medium"
          : "chip-low";

      return `
        <div class="task-item ${task.completed ? "done" : ""}">
          <div class="task-main">
            <div class="task-title">
              ${task.subject} - ${task.topic}
            </div>

            <div class="task-meta">
              <span class="chip ${priorityClass}">
                ${task.priority}
              </span>

              <span>📅 ${task.deadline || "No deadline"}</span>

              <span>
                ${task.completed ? "✅ Completed" : "⏳ Pending"}
              </span>
            </div>
          </div>

          <div class="task-actions">
            <button class="icon-btn" onclick="toggleTask(${task.id})">✓</button>
            <button class="icon-btn" onclick="deleteTask(${task.id})">🗑</button>
          </div>
        </div>
      `;
    }).join("");
  }

  async function loadTasks() {
    try {
      tasks = await api("/tasks");
      renderTasks();
      renderSchedule();
    } catch (error) {
      console.error("Tasks Error:", error);
    }
  }

  async function toggleTask(id) {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      await api(`/tasks/${id}`, {
        method: "PUT",
        body: { completed: !task.completed }
      });

      await loadTasks();
      await loadProgress();

    } catch (error) {
      console.error("Toggle Error:", error);
    }
  }

  window.toggleTask = toggleTask;

  async function deleteTask(id) {
    try {
      await api(`/tasks/${id}`, { method: "DELETE" });
      await loadTasks();
      await loadProgress();
    } catch (error) {
      console.error("Delete Error:", error);
    }
  }

  window.deleteTask = deleteTask;

  // ---------------- ADD TASK ----------------

  const taskForm = getEl("task-form");

  if (taskForm) {
    taskForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        await api("/tasks", {
          method: "POST",
          body: {
            subject: getEl("t-subject")?.value || "",
            topic: getEl("t-topic")?.value || "",
            deadline: getEl("t-deadline")?.value || "",
            priority: getEl("t-priority")?.value || "Low",
            completed: false
          }
        });

        taskForm.reset();
        await loadTasks();
        await loadProgress();

      } catch (error) {
        console.error("Add Task Error:", error);
      }
    });
  }

  // ---------------- NOTES ----------------

  function renderNotes() {
    const notesList = getEl("notes-list");
    if (!notesList) return;

    notesList.innerHTML = notes.map(note => `
      <div class="note-item">
        <div class="note-header">
          <h4>${note.title}</h4>
          <button class="icon-btn delete-note" onclick="deleteNote(${note.id})">🗑</button>
        </div>
        <p>${note.content}</p>
      </div>
    `).join("");
  }

  async function loadNotes() {
    try {
      notes = await api("/notes");
      renderNotes();
    } catch (error) {
      console.error("Notes Error:", error);
    }
  }

  const noteForm = getEl("note-form");

  if (noteForm) {
    noteForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        await api("/notes", {
          method: "POST",
          body: {
            title: getEl("n-title")?.value || "",
            content: getEl("n-content")?.value || ""
          }
        });

        noteForm.reset();
        loadNotes();

      } catch (error) {
        console.error("Add Note Error:", error);
      }
    });
  }

  async function deleteNote(id) {
    try {
      await api(`/notes/${id}`, { method: "DELETE" });
      await loadNotes();
    } catch (error) {
      console.error("Delete Note Error:", error);
    }
  }

  window.deleteNote = deleteNote;

  // ---------------- PROGRESS ----------------

  async function loadProgress() {
    try {
      const progress = await api("/progress");

      const totalEl = getEl("stat-total");
      const doneEl = getEl("stat-done");
      const pendingEl = getEl("stat-pending");
      const fillEl = getEl("progress-fill");
      const percentEl = getEl("progress-percent");

      if (totalEl) totalEl.textContent = progress.total;
      if (doneEl) doneEl.textContent = progress.completed;
      if (pendingEl) pendingEl.textContent = progress.pending;

      if (fillEl) fillEl.style.width = progress.percent + "%";
      if (percentEl) percentEl.textContent = progress.percent + "%";

    } catch (error) {
      console.error("Progress Error:", error);
    }
  }

  // ---------------- SCHEDULE ----------------

  function renderSchedule() {
    const scheduleList = getEl("schedule-list");
    if (!scheduleList) return;

    scheduleList.innerHTML = tasks.map(task => `
      <div class="schedule-item">
        ${task.subject} - ${task.topic}
      </div>
    `).join("");
  }

  // ---------------- INIT ----------------

  initPomodoro();

  loadTasks();
  loadNotes();
  loadProgress();

});