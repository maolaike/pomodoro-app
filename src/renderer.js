// 状态管理
let state = {
  mode: 'work', // work, shortBreak, longBreak
  timeLeft: 25 * 60,
  isRunning: false,
  pomodoros: 0,
  currentTaskId: null,
  timerInterval: null,
  settings: null,
  tasks: [],
  history: []
};

// DOM 元素
const elements = {
  timerMinutes: document.getElementById('timer-minutes'),
  timerSeconds: document.getElementById('timer-seconds'),
  pomodoroCount: document.getElementById('pomodoro-count'),
  btnStart: document.getElementById('btn-start'),
  btnPause: document.getElementById('btn-pause'),
  btnReset: document.getElementById('btn-reset'),
  modeTabs: document.querySelectorAll('.mode-tab'),
  taskList: document.getElementById('task-list'),
  emptyTask: document.getElementById('empty-task'),
  taskInputArea: document.getElementById('task-input-area'),
  taskInput: document.getElementById('task-input'),
  taskPomodoros: document.getElementById('task-pomodoros'),
  btnAddTask: document.getElementById('btn-add-task'),
  btnSaveTask: document.getElementById('btn-save-task'),
  btnCancelTask: document.getElementById('btn-cancel-task'),
  statToday: document.getElementById('stat-today'),
  statWeek: document.getElementById('stat-week'),
  statMonth: document.getElementById('stat-month'),
  btnSettings: document.getElementById('btn-settings'),
  settingsModal: document.getElementById('settings-modal'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  settingWork: document.getElementById('setting-work'),
  settingShortBreak: document.getElementById('setting-short-break'),
  settingLongBreak: document.getElementById('setting-long-break'),
  settingInterval: document.getElementById('setting-interval'),
  settingAutoStart: document.getElementById('setting-auto-start')
};

// 初始化
async function init() {
  await loadSettings();
  await loadTasks();
  await loadHistory();
  updateDisplay();
  updateStats();
  renderTasks();
  setupEventListeners();

  // 监听托盘切换
  window.electronAPI.onToggleTimer(() => {
    if (state.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });
}

// 加载设置
async function loadSettings() {
  state.settings = await window.electronAPI.getSettings();
  state.timeLeft = state.settings.workDuration * 60;
  updateSettingsInputs();
}

// 加载任务
async function loadTasks() {
  state.tasks = await window.electronAPI.getTasks();
}

// 加载历史
async function loadHistory() {
  state.history = await window.electronAPI.getHistory();
}

// 更新显示
function updateDisplay() {
  const minutes = Math.floor(state.timeLeft / 60);
  const seconds = state.timeLeft % 60;
  elements.timerMinutes.textContent = minutes.toString().padStart(2, '0');
  elements.timerSeconds.textContent = seconds.toString().padStart(2, '0');
  elements.pomodoroCount.textContent = state.pomodoros;

  // 更新模式标签
  elements.modeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === state.mode);
  });
}

// 更新设置输入框
function updateSettingsInputs() {
  elements.settingWork.value = state.settings.workDuration;
  elements.settingShortBreak.value = state.settings.shortBreakDuration;
  elements.settingLongBreak.value = state.settings.longBreakDuration;
  elements.settingInterval.value = state.settings.longBreakInterval;
  elements.settingAutoStart.checked = state.settings.autoStartBreaks;
}

// 开始计时
function startTimer() {
  if (state.isRunning) return;

  state.isRunning = true;
  elements.btnStart.style.display = 'none';
  elements.btnPause.style.display = 'inline-block';

  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    updateDisplay();

    if (state.timeLeft <= 0) {
      timerComplete();
    }
  }, 1000);
}

// 暂停计时
function pauseTimer() {
  if (!state.isRunning) return;

  state.isRunning = false;
  elements.btnStart.style.display = 'inline-block';
  elements.btnPause.style.display = 'none';

  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

// 重置计时
function resetTimer() {
  pauseTimer();

  switch (state.mode) {
    case 'work':
      state.timeLeft = state.settings.workDuration * 60;
      break;
    case 'shortBreak':
      state.timeLeft = state.settings.shortBreakDuration * 60;
      break;
    case 'longBreak':
      state.timeLeft = state.settings.longBreakDuration * 60;
      break;
  }

  updateDisplay();
}

// 计时完成
async function timerComplete() {
  pauseTimer();

  if (state.mode === 'work') {
    state.pomodoros++;

    // 记录历史
    const record = {
      type: 'pomodoro',
      taskId: state.currentTaskId,
      completedAt: new Date().toISOString()
    };
    await window.electronAPI.addHistory(record);
    state.history.push(record);

    // 更新任务完成数
    if (state.currentTaskId) {
      const task = state.tasks.find(t => t.id === state.currentTaskId);
      if (task) {
        task.completedPomodoros = (task.completedPomodoros || 0) + 1;
        await window.electronAPI.updateTask(task);
      }
    }

    updateStats();
    renderTasks();

    // 通知
    await window.electronAPI.showNotification('番茄钟完成！', '工作辛苦了，休息一下吧！🍅');

    // 切换到休息
    if (state.pomodoros % state.settings.longBreakInterval === 0) {
      setMode('longBreak');
    } else {
      setMode('shortBreak');
    }

    if (state.settings.autoStartBreaks) {
      setTimeout(startTimer, 1000);
    }
  } else {
    await window.electronAPI.showNotification('休息结束！', '准备开始下一个番茄钟！');
    setMode('work');

    if (state.settings.autoStartPomodoros) {
      setTimeout(startTimer, 1000);
    }
  }
}

// 切换模式
function setMode(mode) {
  state.mode = mode;
  pauseTimer();

  switch (mode) {
    case 'work':
      state.timeLeft = state.settings.workDuration * 60;
      break;
    case 'shortBreak':
      state.timeLeft = state.settings.shortBreakDuration * 60;
      break;
    case 'longBreak':
      state.timeLeft = state.settings.longBreakDuration * 60;
      break;
  }

  updateDisplay();
}

// 任务相关
function showTaskInput() {
  elements.taskInputArea.style.display = 'flex';
  elements.taskInput.value = '';
  elements.taskPomodoros.value = 1;
  elements.taskInput.focus();
}

function hideTaskInput() {
  elements.taskInputArea.style.display = 'none';
}

async function saveTask() {
  const name = elements.taskInput.value.trim();
  if (!name) return;

  const task = {
    name,
    estimatedPomodoros: parseInt(elements.taskPomodoros.value) || 1,
    completedPomodoros: 0,
    completed: false
  };

  const savedTask = await window.electronAPI.addTask(task);
  state.tasks.push(savedTask);

  hideTaskInput();
  renderTasks();
}

async function toggleTaskComplete(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  await window.electronAPI.updateTask(task);
  state.currentTaskId = task.completed ? null : id;
  renderTasks();
}

function selectTask(id) {
  state.currentTaskId = id;
  renderTasks();
}

async function deleteTask(id) {
  await window.electronAPI.deleteTask(id);
  state.tasks = state.tasks.filter(t => t.id !== id);
  if (state.currentTaskId === id) {
    state.currentTaskId = null;
  }
  renderTasks();
}

async function editTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  // 取消其他编辑状态
  document.querySelectorAll('.task-item.editing').forEach(el => {
    el.classList.remove('editing');
  });

  const taskEl = document.querySelector(`[data-task-id="${id}"]`);
  taskEl.classList.add('editing');
  taskEl.innerHTML = `
    <input type="text" class="edit-name" value="${task.name}" />
    <input type="number" class="edit-estimated" min="1" max="10" value="${task.estimatedPomodoros}" />
    <div class="task-actions">
      <button onclick="saveEdit('${id}')">✓</button>
      <button onclick="cancelEdit('${id}')">✗</button>
    </div>
  `;
}

async function saveEdit(id) {
  const taskEl = document.querySelector(`[data-task-id="${id}"]`);
  const name = taskEl.querySelector('.edit-name').value.trim();
  const estimated = parseInt(taskEl.querySelector('.edit-estimated').value) || 1;

  if (!name) return;

  const task = state.tasks.find(t => t.id === id);
  task.name = name;
  task.estimatedPomodoros = estimated;

  await window.electronAPI.updateTask(task);
  renderTasks();
}

async function cancelEdit(id) {
  renderTasks();
}

function renderTasks() {
  if (state.tasks.length === 0) {
    elements.taskList.innerHTML = '';
    elements.emptyTask.style.display = 'block';
    return;
  }

  elements.emptyTask.style.display = 'none';
  elements.taskList.innerHTML = state.tasks.map(task => `
    <li class="task-item ${task.id === state.currentTaskId ? 'selected' : ''}" data-task-id="${task.id}">
      <input
        type="checkbox"
        class="task-checkbox"
        ${task.completed ? 'checked' : ''}
        onchange="toggleTaskComplete('${task.id}')"
      />
      <span class="task-name ${task.completed ? 'completed' : ''}" onclick="selectTask('${task.id}')">${task.name}</span>
      <span class="task-pomodoros">${task.completedPomodoros || 0}/${task.estimatedPomodoros}</span>
      <div class="task-actions">
        <button onclick="editTask('${task.id}')">✏️</button>
        <button onclick="deleteTask('${task.id}')">🗑️</button>
      </div>
    </li>
  `).join('');
}

// 统计
function updateStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayCount = state.history.filter(r => {
    const date = new Date(r.completedAt);
    return date >= today;
  }).length;

  const weekCount = state.history.filter(r => {
    const date = new Date(r.completedAt);
    return date >= weekStart;
  }).length;

  const monthCount = state.history.filter(r => {
    const date = new Date(r.completedAt);
    return date >= monthStart;
  }).length;

  elements.statToday.textContent = todayCount;
  elements.statWeek.textContent = weekCount;
  elements.statMonth.textContent = monthCount;
}

// 设置弹窗
function showSettings() {
  elements.settingsModal.style.display = 'flex';
  updateSettingsInputs();
}

function hideSettings() {
  elements.settingsModal.style.display = 'none';
}

async function saveSettings() {
  state.settings = {
    workDuration: parseInt(elements.settingWork.value) || 25,
    shortBreakDuration: parseInt(elements.settingShortBreak.value) || 5,
    longBreakDuration: parseInt(elements.settingLongBreak.value) || 15,
    longBreakInterval: parseInt(elements.settingInterval.value) || 4,
    autoStartBreaks: elements.settingAutoStart.checked,
    autoStartPomodoros: false
  };

  await window.electronAPI.saveSettings(state.settings);
  setMode(state.mode);
  hideSettings();
}

// 事件监听
function setupEventListeners() {
  // 计时器控制
  elements.btnStart.addEventListener('click', startTimer);
  elements.btnPause.addEventListener('click', pauseTimer);
  elements.btnReset.addEventListener('click', resetTimer);

  // 模式切换
  elements.modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      setMode(tab.dataset.mode);
    });
  });

  // 任务
  elements.btnAddTask.addEventListener('click', showTaskInput);
  elements.btnSaveTask.addEventListener('click', saveTask);
  elements.btnCancelTask.addEventListener('click', hideTaskInput);
  elements.taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveTask();
  });

  // 设置
  elements.btnSettings.addEventListener('click', showSettings);
  elements.btnCloseSettings.addEventListener('click', hideSettings);
  elements.btnSaveSettings.addEventListener('click', saveSettings);
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) hideSettings();
  });
}

// 暴露给全局
window.toggleTaskComplete = toggleTaskComplete;
window.selectTask = selectTask;
window.deleteTask = deleteTask;
window.editTask = editTask;
window.saveEdit = saveEdit;
window.cancelEdit = cancelEdit;

// 启动
init();
