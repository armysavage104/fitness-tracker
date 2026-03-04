import { initDB, saveDay, getDay, getAllDays } from "./storage.js";

// ======================
// STATE
// ======================

let currentDay = null;
let exercises = [];
let historyMode = false;
let historySelectedDate = null;
// ======================
// HELPERS
// ======================

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function isExerciseCompleted(ex) {
    const done = currentDay.progress[ex.id] || { w0: 0, w5: 0, w12: 0 };
    const p = ex.plan;

    return (
        p.total > 0 &&
        done.w0 >= p.w0 &&
        done.w5 >= p.w5 &&
        done.w12 >= p.w12
    );
}

function clearZero(input) {
    if (input.value === "0") input.value = "";
}

function clearDefaultName(input) {
    if (input.value === "Новое упражнение") input.value = "";
}

// theme

function renderHeader({ title, back = null, right = null }) {
    return `
        <div class="app-header">
            <div class="header-left">
                ${back ? `<button class="header-back" onclick="${back}">← Назад</button>` : ""}
            </div>

            <div class="header-title">
                ${title}
            </div>

            <div class="header-right">
                ${right || ""}
            </div>
        </div>
    `;
}
// ======================
// SCREEN SWITCH
// ======================

function openEditor() {

    historyMode = false;   // ← ДОБАВЬ ЭТУ СТРОКУ

    document.getElementById("screen-today").style.display = "none";
    document.getElementById("screen-editor").style.display = "block";

    renderEditor();
}

function openToday() {
    document.getElementById("screen-editor").style.display = "none";
    document.getElementById("screen-today").style.display = "block";
    renderToday();
}

// ======================
// CREATE
// ======================

async function addExercise() {

    let savedDate = null;

    // если мы в режиме истории — сохраняем выбранную дату
    if (historyMode) {
        const dateInput = document.getElementById("history-date");
        savedDate = dateInput?.value || null;
    }

    const ex = {
        id: "ex" + Date.now(),
        name: "Новое упражнение",
        collapsed: false,
        weight5: 5,
        completedAt: null,
        plan: { total: 0, w0: 0, w5: 0, w12: 0 }
    };

    exercises.unshift(ex);

    if (!historyMode) {
        await saveDay(currentDay);
    }

    renderEditor();

    // 👉 возвращаем дату обратно
    if (historyMode && savedDate) {
        const newDateInput = document.getElementById("history-date");
        if (newDateInput) newDateInput.value = savedDate;
    }

    setTimeout(() => {
        document.querySelector(`[data-step="name-${ex.id}"]`)?.focus();
    }, 0);
}

// ======================
// EDITOR
// ======================

function renderEditor() {

    const ed = document.getElementById("screen-editor");

    // ===== Верхняя часть =====
    ed.innerHTML = `
        ${renderHeader({
        title: historyMode ? "Добавить тренировку" : "Редактор",
        back: "openToday()",
        right: historyMode ? `<button onclick="saveHistoryDay()">💾</button>` : ""
    })}

        ${historyMode ? `
            <div class="date-block" style="margin-bottom:15px;">
                <label>Дата тренировки:</label><br>
                <input 
                    type="date" 
                    id="history-date"
                    value="${historySelectedDate || ''}"
                    onchange="setHistoryDate(this.value)">
            </div>
        ` : ""}

        <div style="text-align:center; margin-bottom:20px;">
            <button class="btn-main" onclick="addExercise()">
                ➕ Добавить упражнение
            </button>
        </div>
    `;

    // ===== Список упражнений =====
    exercises.forEach((ex, i) => {

        const block = document.createElement("div");
        block.className = "editor-block";
        block.setAttribute("data-ex-id", ex.id);

        if (ex.collapsed) {

            const isActive = currentDay.active.includes(ex.id);
            const isDone = isExerciseCompleted(ex);

            const done = currentDay.progress[ex.id] || { w0: 0, w5: 0, w12: 0 };
            const totalDone = done.w0 + done.w5 + done.w12;

            let status = "";
            if (isActive && !isDone) status = "⏳ Выполняется";
            if (isActive && isDone) status = "✅ Выполнено";

            block.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">

            <div>

                <div style="font-size:20px; font-weight:600; margin-bottom:8px; color:white;">
                    ${ex.name && ex.name.trim() !== "" ? ex.name : "Упражнение"}
                </div>

                <div style="font-size:14px; color:white;">
                    Прогресс: ${totalDone} / ${ex.plan.total}
                </div>

                <div style="font-size:13px; color:#bbb; margin-top:6px;">
                    Без веса: ${done.w0}/${ex.plan.w0} |
                    ${ex.weight5} кг: ${done.w5}/${ex.plan.w5} |
                    12 кг: ${done.w12}/${ex.plan.w12}
                </div>

                ${status ? `
                    <div style="margin-top:10px; font-size:13px; color:${isDone ? '#4cd964' : '#ffcc00'};">
                        ${status}
                    </div>
                ` : ""}

            </div>

            <button onclick="toggleCollapse(${i})"
                style="background:#222;
                       color:white;
                       border:none;
                       padding:8px 14px;
                       border-radius:16px;
                       cursor:pointer;">
                Редактировать
            </button>

        </div>
    `;
        } else {

            const thirdLabel = ex.name.toLowerCase().includes("пресс")
                ? "Боковые"
                : "12 кг";

            block.innerHTML = `
            <input data-step="name-${ex.id}"
                value="${ex.name}"
                onfocus="clearDefaultName(this)"
                oninput="handleNameInput(${i}, '${ex.id}', this.value)"
                onkeydown="handleKey(event,'${ex.id}','name')">

            <label>Всего повторений</label>
            <input type="number"
                data-step="total-${ex.id}"
                value="${ex.plan.total}"
                onfocus="clearZero(this)"
                onkeydown="handleKey(event,'${ex.id}','total')"
                onchange="updatePlan(${i},'total',this.value)">

            <label>Без веса</label>
            <input type="number"
                data-step="w0-${ex.id}"
                value="${ex.plan.w0}"
                onfocus="clearZero(this)"
                onkeydown="handleKey(event,'${ex.id}','w0')"
                onchange="updatePlan(${i},'w0',this.value)">

            <label>Средний вес</label>
            <div>
                <button data-step="weight-${ex.id}"
                    onkeydown="handleKey(event,'${ex.id}','weight')"
                    onclick="setWeight(${i},5)"
                    class="${ex.weight5 == 5 ? 'btn-main' : 'btn-secondary'}">5 кг</button>

                <button data-step="weight-${ex.id}"
                    onkeydown="handleKey(event,'${ex.id}','weight')"
                    onclick="setWeight(${i},7)"
                    class="${ex.weight5 == 7 ? 'btn-main' : 'btn-secondary'}">7 кг</button>
            </div>

            <input type="number"
                data-step="w5-${ex.id}"
                value="${ex.plan.w5}"
                onfocus="clearZero(this)"
                onkeydown="handleKey(event,'${ex.id}','w5')"
                onchange="updatePlan(${i},'w5',this.value)">

            <label class="third-label">${thirdLabel}</label>

            <input type="number"
                data-step="w12-${ex.id}"
                value="${ex.plan.w12}"
                readonly
                style="background:#222; font-weight:600; color:white; border:none;">

            <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center;">

                <div style="display:flex; gap:10px;">
                    <button class="btn-main"
                        data-step="add-${ex.id}"
                        onkeydown="handleKey(event,'${ex.id}','add')"
                        onclick="confirmAdd('${ex.id}')">
                        + Добавить в занятие
                    </button>

                    <button
                        data-step="collapse-${ex.id}"
                        onkeydown="handleKey(event,'${ex.id}','collapse')"
                        onclick="toggleCollapse(${i})">
                        Свернуть
                    </button>
                </div>

                <button
                    style="background:#ff3b30;color:white;border:none;padding:8px 12px;border-radius:14px;"
                    onclick="removeExercise(${i})">
                    🗑 Удалить
                </button>

            </div>
        `;
        }

        ed.appendChild(block);
    });
}
async function toggleCollapse(i) {
    exercises[i].collapsed = !exercises[i].collapsed;
    await saveDay(currentDay);
    renderEditor();
}

async function updatePlan(i, key, value) {

    const ex = exercises[i];
    const plan = ex.plan;

    plan[key] = Number(value) || 0;

    const total = plan.total || 0;
    const w0 = plan.w0 || 0;
    const w5 = plan.w5 || 0;

    if (w0 + w5 > total) {
        plan.w12 = 0;
    } else {
        plan.w12 = total - w0 - w5;
    }

    const w12Input = document.querySelector(`[data-step="w12-${ex.id}"]`);
    if (w12Input) w12Input.value = plan.w12;

    await saveDay(currentDay);
}

async function setWeight(i, weight) {
    exercises[i].weight5 = weight;
    await saveDay(currentDay);
    renderEditor();
}

// ======================
// KEYBOARD
// ======================

function handleKey(e, id, step) {

    const order = ["name", "total", "w0", "weight", "w5", "add", "collapse"];

    const block = document.querySelector(`[data-ex-id="${id}"]`);
    if (!block) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {

        e.preventDefault();

        let index = order.indexOf(step);
        if (e.key === "ArrowDown") index++;
        if (e.key === "ArrowUp") index--;

        if (index < 0 || index >= order.length) return;

        const nextElement = block.querySelector(
            `[data-step="${order[index]}-${id}"]`
        );

        if (nextElement) nextElement.focus();
        return;
    }

    if (step === "weight" &&
        (e.key === "ArrowLeft" || e.key === "ArrowRight")) {

        e.preventDefault();

        const ex = exercises.find(x => x.id === id);

        if (e.key === "ArrowRight") ex.weight5 = 7;
        if (e.key === "ArrowLeft") ex.weight5 = 5;

        const buttons = block.querySelectorAll(
            `[data-step="weight-${id}"]`
        );

        buttons.forEach(btn => {
            const isActive = btn.innerText.includes(ex.weight5);
            btn.classList.toggle("btn-main", isActive);
            btn.classList.toggle("btn-secondary", !isActive);
        });

        saveDay(currentDay);
        return;
    }

    if (e.key === "Enter") {

        e.preventDefault();

        if (step === "w5") {
            block.querySelector(`[data-step="add-${id}"]`)?.focus();
            return;
        }

        if (step === "add") {
            confirmAdd(id);
            return;
        }

        const index = order.indexOf(step);
        const next = order[index + 1];
        if (!next) return;

        block.querySelector(`[data-step="${next}-${id}"]`)?.focus();
    }
}

// ======================
// TODAY
// ======================

function renderToday() {

    const list = document.getElementById("screen-today");

    // очищаем экран
    list.innerHTML = "";

    // сортируем активные упражнения
    const sorted = currentDay.active
        .map(id => exercises.find(e => e.id === id))
        .filter(Boolean)
        .reverse();

    // проверяем завершены ли все
    const allCompleted =
        sorted.length > 0 &&
        sorted.every(ex => isExerciseCompleted(ex));

    // ===== Верхний блок =====
    list.innerHTML += `
        <div class="top-block">

            <h1>
                ${new Date(currentDay.date).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long"
    })}
            </h1>

            <div class="top-subtitle">
                ${currentDay.isRestDay
            ? "День восстановления"
            : allCompleted
                ? "Твоя тренировка сегодня выполнена"
                : "Твоя тренировка сегодня"
        }
            </div>

            <div>
                <button onclick="toggleRestDay()" class="apple-btn-primary">
                    ${currentDay.isRestDay ? 'Отменить выходной' : 'Сегодня выходной'}
                </button>

                <button onclick="openHistory()" class="apple-btn-secondary">
                    История
                </button>
                <button onclick="exportHistory()" class="apple-btn-secondary">
Экспорт истории
</button>
<button onclick="importHistory()" class="apple-btn-secondary">
Импорт истории
</button>
            </div>

        </div>
    `;

    // если выходной — дальше ничего не рендерим
    if (currentDay.isRestDay) return;

    // ===== Карточки упражнений =====
    sorted.forEach(ex => {

        const done = currentDay.progress[ex.id] || { w0: 0, w5: 0, w12: 0 };
        const p = ex.plan;

        const totalDone = done.w0 + done.w5 + done.w12;
        const percent = p.total ? totalDone / p.total : 0;
        const completed = isExerciseCompleted(ex);

        function row(label, key) {
            return `
                <div class="weight-row">
                    <div>${label}</div>
                    <div>${done[key]} / ${p[key]}</div>
                    <div class="action-buttons">
                        <button class="btn-ios btn-ios-green"
                            onclick="addDone('${ex.id}','${key}',1)">+1</button>
                        <button class="btn-ios btn-ios-contrast"
                            onclick="addDone('${ex.id}','${key}',10)">+10</button>
                        <button class="btn-ios btn-ios-red"
                            onclick="addDone('${ex.id}','${key}',-1)">−1</button>
                    </div>
                </div>
            `;
        }

        let rows = "";

        if (!completed) {
            if (p.w0 > 0) rows += row("Без веса", "w0");
            if (p.w5 > 0) rows += row(ex.weight5 + " кг", "w5");
            if (p.w12 > 0) rows += row("12 кг", "w12");
        }

        list.innerHTML += `
            <div class="exercise">
                <b>${ex.name}</b>
                ${rows}
                ${completed ? "" : `<div class="reps">${totalDone}/${p.total}</div>`}
                <div class="bar">
                    <div class="bar-fill ${percent >= 1 ? 'bar-complete' : ''}"
                        style="
                            width:${percent * 100}%;
                            background: linear-gradient(
                                90deg,
                                hsl(${percent * 120 - 10}, 60%, 60%),
                                hsl(${percent * 120}, 60%, 55%)
                            );
                        ">
                    </div>
                </div>
            </div>
        `;
    });
}
async function confirmAdd(id) {

    if (!confirm("Добавить упражнение в занятие?")) return;

    if (!currentDay.active.includes(id))
        currentDay.active.push(id);

    if (!currentDay.progress[id])
        currentDay.progress[id] = { w0: 0, w5: 0, w12: 0 };

    const ex = exercises.find(x => x.id === id);
    if (!ex.name || ex.name.trim() === "") {
        ex.name = "Упражнение";
    }
    ex.collapsed = true;

    await saveDay(currentDay);
    renderEditor();
}

async function addDone(id, key, delta) {

    if (!currentDay.progress[id])
        currentDay.progress[id] = { w0: 0, w5: 0, w12: 0 };

    const ex = exercises.find(e => e.id === id);
    const plan = ex.plan;

    currentDay.progress[id][key] += delta;

    if (currentDay.progress[id][key] < 0)
        currentDay.progress[id][key] = 0;

    if (currentDay.progress[id][key] > plan[key])
        currentDay.progress[id][key] = plan[key];

    const completed = isExerciseCompleted(ex);

    if (completed && !ex.completedAt)
        ex.completedAt = Date.now();

    if (!completed && ex.completedAt)
        ex.completedAt = null;

    await saveDay(currentDay);

    // заново загружаем день из баз

    renderToday();
}

// ======================
// REMOVE
// ======================
// ======================
// REST DAY
// ======================

// ======================
// TOGGLE REST DAY
// ======================

async function toggleRestDay() {

    if (!currentDay.isRestDay) {

        // ставим выходной
        if (!confirm("Отметить сегодняшний день как выходной?")) return;

        currentDay.isRestDay = true;

        // сохраняем текущие активные упражнения,
        // чтобы можно было вернуть при отмене
        currentDay._backupActive = [...currentDay.active];
        currentDay._backupProgress = { ...currentDay.progress };

        currentDay.active = [];
        currentDay.progress = {};

    } else {

        // отменяем выходной
        if (!confirm("Отменить выходной день?")) return;

        currentDay.isRestDay = false;

        // возвращаем сохранённые данные
        currentDay.active = currentDay._backupActive || [];
        currentDay.progress = currentDay._backupProgress || {};

        delete currentDay._backupActive;
        delete currentDay._backupProgress;
    }

    await saveDay(currentDay);
    renderToday();
}
async function removeExercise(i) {

    const ex = exercises[i];
    if (!confirm(`Удалить "${ex.name}"?`)) return;

    currentDay.active = currentDay.active.filter(id => id !== ex.id);
    delete currentDay.progress[ex.id];

    exercises.splice(i, 1);

    await saveDay(currentDay);
    renderEditor();
}
async function openHistory() {

    const list = document.getElementById("screen-today");

    list.innerHTML = `
        ${renderHeader({
        title: "История",
        back: "openToday()"
    })}

        <div style="margin:15px 0;">
            <button onclick="openAddHistoryEditor()" class="btn-main">
                ➕ Добавить в историю
            </button>
        </div>
    `;

    const all = await getAllDays();

    const sorted = all.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );

    sorted.forEach(day => {

        list.innerHTML += `
            <div 
                onclick="openHistoryDay('${day.date}')"
                style="
    margin-bottom:15px;
    padding:18px;
    border-radius:18px;
    cursor:pointer;
    background:#111;
    color:white;
    border:1px solid #222;
">
                <b>${day.date}</b><br>
                ${day.isRestDay ? "💤 Выходной" : day.exercises.length + " упражнений"}
            </div>
        `;
    });
}
function openAddHistory() {

    const list = document.getElementById("screen-today");

    list.innerHTML = `
        <h2>Добавить тренировку</h2>

        <div class="date-block" style="margin-bottom:15px;">
            <label>:</label><br>
            <input type="date" id="history-date">
        </div>

        <div style="margin-bottom:15px;">
            <label>Название упражнения:</label><br>
            <input type="text" id="history-name">
        </div>

        <div style="margin-bottom:15px;">
            <label>Количество повторений:</label><br>
            <input type="number" id="history-reps">
        </div>

        <button onclick="saveHistoryEntry()"
            style="background:#007aff;color:white;border:none;padding:10px 14px;border-radius:12px;">
            💾 Сохранить
        </button>

        <div style="margin-top:20px;">
            <button onclick="openHistory()">← Назад</button>
        </div>
    `;
}
async function saveHistoryEntry() {

    const date = document.getElementById("history-date").value;
    const name = document.getElementById("history-name").value;
    const reps = Number(document.getElementById("history-reps").value);

    if (!date || !name || !reps) {
        alert("Заполни все поля");
        return;
    }

    const exercise = {
        id: "hist-" + Date.now(),
        name: name,
        collapsed: true,
        weight5: 5,
        completedAt: Date.now(),
        plan: {
            total: reps,
            w0: reps,
            w5: 0,
            w12: 0
        }
    };

    const day = {
        date: date,
        exercises: [exercise],
        active: [exercise.id],
        progress: {
            [exercise.id]: {
                w0: reps,
                w5: 0,
                w12: 0
            }
        },
        isRestDay: false
    };

    await saveDay(day);

    alert("Тренировка добавлена в историю");

    openHistory();
}
// ======================
// OPEN HISTORY EDITOR
// ======================

function openAddHistoryEditor() {

    historyMode = true;

    const todayScreen = document.getElementById("screen-today");
    const editorScreen = document.getElementById("screen-editor");

    todayScreen.style.display = "none";
    editorScreen.style.display = "block";

    exercises = []; // временно пустой список

    renderEditor();
    setTimeout(async () => {

        const all = await getAllDays();

        if (all.length === 0) return;

        const sorted = all.sort((a, b) => new Date(b.date) - new Date(a.date));

        const lastDate = sorted[0].date;

        const nextDate = new Date(lastDate);
        nextDate.setDate(nextDate.getDate() + 1);

        document.getElementById("history-date").value =
            nextDate.toISOString().slice(0, 10);

    }, 0);
}

window.openAddHistoryEditor = openAddHistoryEditor;
// ======================
// SAVE HISTORY DAY
// ======================

async function saveHistoryDay() {

    const date = historySelectedDate;

    if (!date) {
        alert("Выбери дату");
        return;
    }

    if (exercises.length === 0) {
        alert("Добавь хотя бы одно упражнение");
        return;
    }

    const newDay = {
        date: date,
        exercises: JSON.parse(JSON.stringify(exercises)),
        active: exercises.map(e => e.id),
        progress: {},
        isRestDay: false
    };

    exercises.forEach(ex => {
        newDay.progress[ex.id] = {
            w0: ex.plan.w0,
            w5: ex.plan.w5,
            w12: ex.plan.w12
        };
        ex.completedAt = Date.now();
    });

    await saveDay(newDay);

    // 👉 очищаем упражнения
    exercises = [];



    const nextDate = new Date(historySelectedDate);
    nextDate.setDate(nextDate.getDate() + 1);

    historySelectedDate = nextDate.toISOString().slice(0, 10);

    renderEditor();
}
function cancelHistoryMode() {

    historyMode = false;

    // очищаем временные данные
    historySelectedDate = null;
    exercises = currentDay.exercises;

    // переключаем экран обратно
    document.getElementById("screen-editor").style.display = "none";
    document.getElementById("screen-today").style.display = "block";

    // открываем список истории
    openHistory();
}
// ======================
// OPEN SPECIFIC HISTORY DAY
// ======================

async function openHistoryDay(date) {

    const day = await getDay(date);

    const list = document.getElementById("screen-today");

    list.innerHTML = `
        <h2>${date}</h2>
        <button onclick="openHistory()">← Назад</button>
        <hr style="margin:15px 0;">
    `;

    if (day.isRestDay) {
        list.innerHTML += `
            <div style="font-size:18px;font-weight:600;">
                💤 Выходной день
            </div>
        `;
        return;
    }

    day.exercises.forEach(ex => {

        const done = day.progress[ex.id] || { w0: 0, w5: 0, w12: 0 };
        const p = ex.plan;

        const totalDone = done.w0 + done.w5 + done.w12;

        const label12 = ex.name.toLowerCase().includes("пресс")
            ? "Боковые"
            : "12 кг";

        list.innerHTML += `
        <div style="
            margin-bottom:12px;
            padding:12px;
            border:1px solid #eee;
            border-radius:12px;
        ">
            <b>${ex.name}</b><br>

            <div style="margin-top:6px;">
                ${p.w0 > 0 ? `Без веса: ${done.w0} / ${p.w0}<br>` : ""}
                ${p.w5 > 0 ? `${ex.weight5} кг: ${done.w5} / ${p.w5}<br>` : ""}
                ${p.w12 > 0 ? `${label12}: ${done.w12} / ${p.w12}<br>` : ""}
            </div>

            <div style="margin-top:6px;font-weight:600;">
                Всего: ${totalDone} / ${p.total}
            </div>
        </div>
    `;
    });
}

window.openHistoryDay = openHistoryDay;
// ======================
// INIT
// ======================

document.addEventListener("DOMContentLoaded", async () => {

    await initDB();

    const today = todayISO();
    let day = await getDay(today);

    if (!day) {

        const all = await getAllDays();
        const sorted = all.sort((a, b) => new Date(b.date) - new Date(a.date));
        const last = sorted.find(d => !d.isRestDay);

        let baseExercises = [];

        if (last) {
            baseExercises = last.exercises.map(ex => ({
                ...ex,
                completedAt: null
            }));
        }

        day = {
            date: today,
            exercises: baseExercises,
            active: [],
            progress: {},
            isRestDay: false
        };

        await saveDay(day);
    }

    currentDay = day;
    exercises = currentDay.exercises;

    const dateEl = document.getElementById("date");
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long"
        });
    }

    renderToday();
});
// ======================
// RESET DATABASE
// ======================

async function resetAllData() {

    if (!confirm("Удалить ВСЮ историю тренировок? Это действие нельзя отменить.")) return;

    // Закрываем соединение с базой
    indexedDB.deleteDatabase("fitProgressDB");

    // Перезагружаем страницу
    location.reload();
}
// ======================
// GLOBAL EXPORTS
// ======================

window.openEditor = openEditor;
window.openToday = openToday;
window.addExercise = addExercise;
window.toggleCollapse = toggleCollapse;
window.updatePlan = updatePlan;
window.setWeight = setWeight;
window.confirmAdd = confirmAdd;
window.addDone = addDone;
window.removeExercise = removeExercise;
window.handleNameInput = handleNameInput;
window.handleKey = handleKey;
window.clearZero = clearZero;
window.clearDefaultName = clearDefaultName;
window.resetAllData = resetAllData;
window.toggleRestDay = toggleRestDay;
window.openHistory = openHistory;
window.openAddHistory = openAddHistory;
window.saveHistoryEntry = saveHistoryEntry;
window.setHistoryDate = setHistoryDate;
window.saveHistoryDay = saveHistoryDay;
window.cancelHistoryMode = cancelHistoryMode;
window.exportHistory = exportHistory;
window.importHistory = importHistory;

async function handleNameInput(i, id, value) {

    exercises[i].name = value;
    await saveDay(currentDay);

    const block = document.querySelector(`[data-ex-id="${id}"]`);
    if (!block) return;

    const label = block.querySelector(".third-label");
    if (!label) return;

    label.innerText = value.toLowerCase().includes("пресс")
        ? "Боковые"
        : "12 кг";
}
function setHistoryDate(value) {
    historySelectedDate = value;
}
async function exportHistory() {

    const allDays = await getAllDays();

    const data = JSON.stringify(allDays, null, 2);

    const blob = new Blob([data], { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "fitness-history.json";
    a.click();

    URL.revokeObjectURL(url);
}
async function importHistory() {

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = async (e) => {

        const file = e.target.files[0];
        if (!file) return;

        const text = await file.text();
        const data = JSON.parse(text);

        for (const day of data) {
            await saveDay(day);
        }

        alert("История успешно импортирована");

        location.reload();
    };

    input.click();
} 
