(function () {
  "use strict";

  var STORAGE_KEY = "habitTracker.v1";
  var DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  var MONTH_LABELS = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ];

  var state = loadState();
  var currentWeekStart = getWeekStart(new Date());

  // ---------- persistence ----------

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { habits: [], completions: {}, objectives: { weekly: {}, monthly: {} } };
      var parsed = JSON.parse(raw);
      if (!parsed.habits) parsed.habits = [];
      if (!parsed.completions) parsed.completions = {};
      if (!parsed.objectives) parsed.objectives = { weekly: {}, monthly: {} };
      if (!parsed.objectives.weekly) parsed.objectives.weekly = {};
      if (!parsed.objectives.monthly) parsed.objectives.monthly = {};
      parsed.habits.forEach(function (h) {
        if (!h.frequency || h.frequency < 1 || h.frequency > 7) h.frequency = 7;
      });
      return parsed;
    } catch (e) {
      return { habits: [], completions: {}, objectives: { weekly: {}, monthly: {} } };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ---------- date helpers ----------

  function stripTime(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function getWeekStart(date) {
    var d = stripTime(date);
    var day = d.getDay(); // 0 = Sunday
    var diff = day === 0 ? -6 : 1 - day; // shift to Monday
    d.setDate(d.getDate() + diff);
    return d;
  }

  function addDays(date, n) {
    var d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  function formatKey(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function isFuture(date) {
    var today = stripTime(new Date());
    return stripTime(date) > today;
  }

  function monthKey(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  }

  // ---------- habit data helpers ----------

  function makeId() {
    return "h_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function isDone(habitId, dateKey) {
    return !!(state.completions[habitId] && state.completions[habitId][dateKey]);
  }

  function toggleDone(habitId, dateKey) {
    if (!state.completions[habitId]) state.completions[habitId] = {};
    state.completions[habitId][dateKey] = !state.completions[habitId][dateKey];
    saveState();
    render();
  }

  function addHabit(name, frequency) {
    name = name.trim();
    if (!name) return;
    frequency = parseInt(frequency, 10);
    if (!frequency || frequency < 1 || frequency > 7) frequency = 7;
    state.habits.push({ id: makeId(), name: name, frequency: frequency });
    saveState();
    render();
  }

  function setHabitFrequency(habitId, frequency) {
    frequency = parseInt(frequency, 10);
    if (!frequency || frequency < 1 || frequency > 7) frequency = 7;
    var habit = state.habits.find(function (h) { return h.id === habitId; });
    if (!habit) return;
    habit.frequency = frequency;
    saveState();
    render();
  }

  function removeHabit(habitId) {
    var habit = state.habits.find(function (h) { return h.id === habitId; });
    var label = habit ? habit.name : "cette habitude";
    if (!confirm('Supprimer "' + label + '" ? Cette action est définitive.')) return;
    state.habits = state.habits.filter(function (h) { return h.id !== habitId; });
    delete state.completions[habitId];
    saveState();
    render();
  }

  // ---------- objectives (goals unrelated to habits) ----------

  function readObjectives(scope, periodKey) {
    var buckets = scope === "weekly" ? state.objectives.weekly : state.objectives.monthly;
    return buckets[periodKey] || [];
  }

  function objectiveBucket(scope, periodKey) {
    var buckets = scope === "weekly" ? state.objectives.weekly : state.objectives.monthly;
    if (!buckets[periodKey]) buckets[periodKey] = [];
    return buckets[periodKey];
  }

  function addObjective(scope, periodKey, text) {
    text = text.trim();
    if (!text) return;
    objectiveBucket(scope, periodKey).push({ id: makeId(), text: text, done: false });
    saveState();
    render();
  }

  function toggleObjective(scope, periodKey, objectiveId) {
    var list = readObjectives(scope, periodKey);
    var obj = list.find(function (o) { return o.id === objectiveId; });
    if (!obj) return;
    obj.done = !obj.done;
    saveState();
    render();
  }

  function removeObjective(scope, periodKey, objectiveId) {
    var buckets = scope === "weekly" ? state.objectives.weekly : state.objectives.monthly;
    if (!buckets[periodKey]) return;
    buckets[periodKey] = buckets[periodKey].filter(function (o) { return o.id !== objectiveId; });
    saveState();
    render();
  }

  // ---------- stats ----------

  // Average over an arbitrary list of Date objects, counting only
  // days that are not in the future (so partial weeks/months are fair).
  // For habits with a target below 7x/week, the expected count is scaled
  // down proportionally (frequency/7) instead of requiring every day,
  // so a 3x/week habit hits 100% once it reaches its own goal.
  function computeAverage(habitId, dates, frequency) {
    var applicable = dates.filter(function (d) { return !isFuture(d); });
    if (applicable.length === 0) return null;
    var done = applicable.filter(function (d) {
      return isDone(habitId, formatKey(d));
    }).length;
    var expected = applicable.length * (frequency / 7);
    if (expected <= 0) return null;
    return Math.min(done / expected, 1);
  }

  function computeTotalAverage(dates) {
    if (state.habits.length === 0) return null;
    var applicable = dates.filter(function (d) { return !isFuture(d); });
    if (applicable.length === 0) return null;
    var totalExpected = 0, doneSlots = 0;
    state.habits.forEach(function (h) {
      var rate = h.frequency / 7;
      applicable.forEach(function (d) {
        totalExpected += rate;
        if (isDone(h.id, formatKey(d))) doneSlots++;
      });
    });
    if (totalExpected <= 0) return null;
    return Math.min(doneSlots / totalExpected, 1);
  }

  function getWeekDates(weekStart) {
    var out = [];
    for (var i = 0; i < 7; i++) out.push(addDays(weekStart, i));
    return out;
  }

  function getMonthDates(anyDateInMonth) {
    var year = anyDateInMonth.getFullYear();
    var month = anyDateInMonth.getMonth();
    var lastDay = new Date(year, month + 1, 0).getDate();
    var out = [];
    for (var i = 1; i <= lastDay; i++) out.push(new Date(year, month, i));
    return out;
  }

  function formatPercent(ratio) {
    if (ratio === null) return "-";
    return Math.round(ratio * 100) + "%";
  }

  function avgClass(ratio) {
    if (ratio === null) return "avg-none";
    if (ratio >= 0.7) return "avg-good";
    if (ratio >= 0.4) return "avg-mid";
    return "avg-bad";
  }

  // ---------- rendering ----------

  var els = {};

  function cacheEls() {
    els.newHabitInput = document.getElementById("new-habit-input");
    els.newHabitFreq = document.getElementById("new-habit-freq");
    els.addHabitBtn = document.getElementById("add-habit-btn");
    els.prevWeekBtn = document.getElementById("prev-week-btn");
    els.nextWeekBtn = document.getElementById("next-week-btn");
    els.todayBtn = document.getElementById("today-btn");
    els.weekLabel = document.getElementById("week-label");
    els.tableHeadRow = document.getElementById("table-head-row");
    els.tbody = document.getElementById("habit-tbody");
    els.totalRow = document.getElementById("total-row");
    els.totalWeekAvg = document.getElementById("total-week-avg");
    els.totalMonthAvg = document.getElementById("total-month-avg");
    els.emptyState = document.getElementById("empty-state");
    els.table = document.getElementById("habit-table");

    els.weekObjectiveLabel = document.getElementById("week-objective-label");
    els.weekObjectiveForm = document.getElementById("week-objective-form");
    els.weekObjectiveInput = document.getElementById("week-objective-input");
    els.weekObjectiveList = document.getElementById("week-objective-list");
    els.weekObjectiveEmpty = document.getElementById("week-objective-empty");

    els.monthObjectiveLabel = document.getElementById("month-objective-label");
    els.monthObjectiveForm = document.getElementById("month-objective-form");
    els.monthObjectiveInput = document.getElementById("month-objective-input");
    els.monthObjectiveList = document.getElementById("month-objective-list");
    els.monthObjectiveEmpty = document.getElementById("month-objective-empty");
  }

  function renderObjectiveList(listEl, emptyEl, scope, periodKey, items) {
    listEl.innerHTML = "";
    items.forEach(function (obj) {
      var li = document.createElement("li");

      var check = document.createElement("span");
      check.className = "objective-check" + (obj.done ? " done" : "");
      check.textContent = obj.done ? "✓" : "";
      check.addEventListener("click", function () { toggleObjective(scope, periodKey, obj.id); });
      li.appendChild(check);

      var text = document.createElement("span");
      text.className = "objective-text" + (obj.done ? " done" : "");
      text.textContent = obj.text;
      text.addEventListener("click", function () { toggleObjective(scope, periodKey, obj.id); });
      li.appendChild(text);

      var delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.title = "Supprimer";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", function () { removeObjective(scope, periodKey, obj.id); });
      li.appendChild(delBtn);

      listEl.appendChild(li);
    });
    emptyEl.hidden = items.length > 0;
  }

  function renderObjectives(weekDates) {
    var weekKey = formatKey(weekDates[0]);
    var monthAnchor = weekDates[0];
    var mKey = monthKey(monthAnchor);

    var start = weekDates[0], end = weekDates[6];
    var sameMonth = start.getMonth() === end.getMonth();
    els.weekObjectiveLabel.textContent = "Semaine du " + start.getDate() +
      (sameMonth ? "" : " " + MONTH_LABELS[start.getMonth()]) +
      " au " + end.getDate() + " " + MONTH_LABELS[end.getMonth()];
    els.monthObjectiveLabel.textContent = MONTH_LABELS[monthAnchor.getMonth()].charAt(0).toUpperCase() +
      MONTH_LABELS[monthAnchor.getMonth()].slice(1) + " " + monthAnchor.getFullYear();

    renderObjectiveList(els.weekObjectiveList, els.weekObjectiveEmpty, "weekly", weekKey, readObjectives("weekly", weekKey));
    renderObjectiveList(els.monthObjectiveList, els.monthObjectiveEmpty, "monthly", mKey, readObjectives("monthly", mKey));
  }

  function renderWeekLabel(weekDates) {
    var start = weekDates[0], end = weekDates[6];
    var sameMonth = start.getMonth() === end.getMonth();
    var startStr = start.getDate() + (sameMonth ? "" : " " + MONTH_LABELS[start.getMonth()]);
    var endStr = end.getDate() + " " + MONTH_LABELS[end.getMonth()] + " " + end.getFullYear();
    els.weekLabel.textContent = startStr + " – " + endStr;
  }

  function renderHead(weekDates) {
    // remove existing day headers (keep first th and last two)
    var existingDayHeaders = els.tableHeadRow.querySelectorAll(".day-col");
    existingDayHeaders.forEach(function (el) { el.remove(); });

    var weekAvgTh = els.tableHeadRow.querySelector(".week-avg-col");
    var today = stripTime(new Date());

    weekDates.forEach(function (d, idx) {
      var th = document.createElement("th");
      th.className = "day-col" + (isSameDay(d, today) ? " today-col" : "");
      th.innerHTML = DAY_LABELS[idx] + "<br>" + d.getDate();
      els.tableHeadRow.insertBefore(th, weekAvgTh);
    });
  }

  function renderRows(weekDates, monthDates) {
    els.tbody.innerHTML = "";
    var today = stripTime(new Date());

    state.habits.forEach(function (habit) {
      var tr = document.createElement("tr");

      var nameTd = document.createElement("td");
      nameTd.className = "habit-col habit-name";
      nameTd.textContent = habit.name;
      tr.appendChild(nameTd);

      var freqTd = document.createElement("td");
      freqTd.className = "freq-col";
      var freqSelect = document.createElement("select");
      freqSelect.className = "freq-select";
      [7, 6, 5, 4, 3, 2, 1].forEach(function (n) {
        var opt = document.createElement("option");
        opt.value = String(n);
        opt.textContent = n === 7 ? "Tous les jours" : n + "j / semaine";
        if (habit.frequency === n) opt.selected = true;
        freqSelect.appendChild(opt);
      });
      freqSelect.addEventListener("change", function () {
        setHabitFrequency(habit.id, freqSelect.value);
      });
      freqTd.appendChild(freqSelect);
      tr.appendChild(freqTd);

      weekDates.forEach(function (d) {
        var td = document.createElement("td");
        td.className = "day-cell" + (isSameDay(d, today) ? " today-col" : "");
        var future = isFuture(d);
        var key = formatKey(d);
        var done = isDone(habit.id, key);

        var span = document.createElement("span");
        span.className = "check" + (done ? " done" : "");
        span.textContent = done ? "✓" : "";
        td.appendChild(span);

        if (future) {
          td.style.opacity = "0.35";
          td.style.cursor = "default";
        } else {
          td.addEventListener("click", function () {
            toggleDone(habit.id, key);
          });
        }
        tr.appendChild(td);
      });

      var weekAvgTd = document.createElement("td");
      weekAvgTd.className = "week-avg-col";
      var wRatio = computeAverage(habit.id, weekDates, habit.frequency);
      weekAvgTd.innerHTML = '<span class="avg-badge ' + avgClass(wRatio) + '">' + formatPercent(wRatio) + "</span>";
      tr.appendChild(weekAvgTd);

      var monthAvgTd = document.createElement("td");
      monthAvgTd.className = "month-avg-col";
      var mRatio = computeAverage(habit.id, monthDates, habit.frequency);
      monthAvgTd.innerHTML = '<span class="avg-badge ' + avgClass(mRatio) + '">' + formatPercent(mRatio) + "</span>";
      tr.appendChild(monthAvgTd);

      var actionsTd = document.createElement("td");
      actionsTd.className = "actions-col";
      var delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.title = "Supprimer";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", function () { removeHabit(habit.id); });
      actionsTd.appendChild(delBtn);
      tr.appendChild(actionsTd);

      els.tbody.appendChild(tr);
    });
  }

  function renderTotalRow(weekDates, monthDates) {
    var existing = els.totalRow.querySelectorAll(".day-total-col");
    existing.forEach(function (el) { el.remove(); });

    var weekAvgTd = els.totalRow.querySelector(".week-avg-col");
    var today = stripTime(new Date());

    weekDates.forEach(function (d) {
      var td = document.createElement("td");
      td.className = "day-total-col" + (isSameDay(d, today) ? " today-col" : "");
      if (state.habits.length === 0 || isFuture(d)) {
        td.textContent = "-";
      } else {
        var key = formatKey(d);
        var done = state.habits.filter(function (h) { return isDone(h.id, key); }).length;
        td.textContent = done + "/" + state.habits.length;
      }
      els.totalRow.insertBefore(td, weekAvgTd);
    });

    var wRatio = computeTotalAverage(weekDates);
    var mRatio = computeTotalAverage(monthDates);
    els.totalWeekAvg.innerHTML = '<span class="avg-badge ' + avgClass(wRatio) + '">' + formatPercent(wRatio) + "</span>";
    els.totalMonthAvg.innerHTML = '<span class="avg-badge ' + avgClass(mRatio) + '">' + formatPercent(mRatio) + "</span>";
  }

  function render() {
    var weekDates = getWeekDates(currentWeekStart);
    var monthDates = getMonthDates(new Date());

    renderWeekLabel(weekDates);
    renderHead(weekDates);
    renderRows(weekDates, monthDates);
    renderTotalRow(weekDates, monthDates);
    renderObjectives(weekDates);

    var hasHabits = state.habits.length > 0;
    els.table.style.display = hasHabits ? "" : "none";
    els.emptyState.hidden = hasHabits;
  }

  // ---------- events ----------

  function bindEvents() {
    els.addHabitBtn.addEventListener("click", function () {
      addHabit(els.newHabitInput.value, els.newHabitFreq.value);
      els.newHabitInput.value = "";
      els.newHabitInput.focus();
    });

    els.newHabitInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        addHabit(els.newHabitInput.value, els.newHabitFreq.value);
        els.newHabitInput.value = "";
      }
    });

    els.prevWeekBtn.addEventListener("click", function () {
      currentWeekStart = addDays(currentWeekStart, -7);
      render();
    });

    els.nextWeekBtn.addEventListener("click", function () {
      currentWeekStart = addDays(currentWeekStart, 7);
      render();
    });

    els.todayBtn.addEventListener("click", function () {
      currentWeekStart = getWeekStart(new Date());
      render();
    });

    els.weekObjectiveForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var weekKey = formatKey(getWeekDates(currentWeekStart)[0]);
      addObjective("weekly", weekKey, els.weekObjectiveInput.value);
      els.weekObjectiveInput.value = "";
    });

    els.monthObjectiveForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var mKey = monthKey(getWeekDates(currentWeekStart)[0]);
      addObjective("monthly", mKey, els.monthObjectiveInput.value);
      els.monthObjectiveInput.value = "";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    cacheEls();
    bindEvents();
    render();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function () {});
    });
  }
})();
