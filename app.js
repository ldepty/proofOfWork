document.addEventListener('DOMContentLoaded', function() {
  // ===============================
  // Inspirational Quotes Section
  // ===============================
  const quotes = [
    "The only place where success comes before work is in the dictionary. — Vidal Sassoon",
    "There are no secrets to success. It is the result of preparation, hard work, and learning from failure. — Colin Powell",
    "I'm a greater believer in luck, and I find the harder I work, the more I have of it. — Thomas Jefferson",
    "Success is no accident. It is hard work, perseverance, learning, studying, sacrifice and, most of all, love of what you are doing or learning to do. — Pelé",
    "Hard work transforms dreams into reality; perseverance turns them into achievements. — Unknown"
  ];
  
  function setRandomQuote() {
    const quoteElement = document.getElementById('quote');
    const randomIndex = Math.floor(Math.random() * quotes.length);
    quoteElement.textContent = quotes[randomIndex];
  }

  // Helper functions to get and convert to Sydney time
function getSydneyDate() {
  // Returns the current date/time in Sydney as a Date object
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
}

function toSydneyDate(date) {
  // Convert a given Date object to Sydney time
  return new Date(date.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
}
  
  // ===============================
  // Session Management (Work Hours)
  // ===============================
  let sessions = [];
  
  async function loadSessions() {
    try {
      const res = await fetch('/data');
      sessions = (await res.json()).map(session => ({
        timestamp: new Date(session.timestamp),
        hours: session.hours,
        project: session.project || 'General'
      }));
      console.log("Sessions loaded:", sessions);
      updateDisplay();
    } catch (err) {
      console.error("Error loading sessions:", err);
    }
  }
  
  async function saveSessions() {
    try {
      await fetch('/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessions)
      });
    } catch (err) {
      console.error("Error saving sessions:", err);
    }
  }
  
  // ===============================
  // Totals & Calendar Functions
  // ===============================
  function calculateTotal(start, end) {
    return sessions
      .filter(session => session.timestamp >= start && session.timestamp < end)
      .reduce((sum, session) => sum + session.hours, 0);
  }
  
  function calculateTotals() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
  
    const todayTotal = calculateTotal(startOfDay, endOfDay);
    const weekTotal = calculateTotal(startOfWeek, endOfWeek);
    const monthTotal = calculateTotal(startOfMonth, endOfMonth);
    const yearTotal = calculateTotal(startOfYear, endOfYear);
    const totalCommits = sessions.length;
  
    return { todayTotal, weekTotal, monthTotal, yearTotal, totalCommits };
  }
  
  function calculateTotalForDay(date) {
  // Convert the given date to Sydney time first
  const sydneyDate = toSydneyDate(date);
  const startOfDay = new Date(sydneyDate.getFullYear(), sydneyDate.getMonth(), sydneyDate.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  return calculateTotal(startOfDay, endOfDay);
}
  
  function calculateCommitsForDay(date) {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    return sessions.filter(session => session.timestamp >= startOfDay && session.timestamp < endOfDay).length;
  }
  
  function formatHoursMinutes(decimalHours) {
    const hours = Math.floor(decimalHours);
    let minutes = Math.round((decimalHours - hours) * 60);
    if (minutes === 60) {
      minutes = 0;
      return `${hours + 1}h ${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
  }
  
  function generateCalendar() {
    const calendarDiv = document.getElementById('calendar');
    if (!calendarDiv) {
      console.error("Calendar div not found!");
      return;
    }
    calendarDiv.innerHTML = '';
    console.log("Generating calendar...");
  
    const now = new Date();
    const startDate = new Date(now.getFullYear(), 0, 1);
    const endDate = new Date(now.getFullYear(), 11, 31);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    console.log("Days in year:", days);
  
    const dateArray = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dateArray.push(date);
    }
    console.log("Date array length:", dateArray.length);
  
    dateArray.forEach(date => {
      const totalHours = calculateTotalForDay(date);
      const commitCount = calculateCommitsForDay(date);
  
      let className = 'day';
      if (totalHours === 0) {
        className += ' zero';
      } else if (totalHours <= 2) {
        className += ' low';
      } else if (totalHours <= 3) {
        className += ' medium';
      } else if (totalHours <= 4) {
        className += ' three-four';
      } else {
        className += ' high';
      }
  
      const dayDiv = document.createElement('div');
      dayDiv.className = className;
  
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
    const formattedDate = new Date(date.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })).toLocaleDateString('en-US', {
  weekday: 'short',
  month: 'long',
  day: 'numeric'
});
      tooltip.textContent = `${formattedDate}: ${formatHoursMinutes(totalHours)}, ${commitCount} commits`;
  
      dayDiv.appendChild(tooltip);
      calendarDiv.appendChild(dayDiv);
    });
    console.log("Calendar generated with", calendarDiv.children.length, "day elements.");
  }
  
  // ===============================
  // Additional Metrics Helper Functions
  // ===============================
  function calculateBestDay() {
    const dailyTotals = {};
    sessions.forEach(session => {
      const dateKey = session.timestamp.toDateString();
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + session.hours;
    });
    let maxHours = 0;
    for (const day in dailyTotals) {
      if (dailyTotals[day] > maxHours) {
        maxHours = dailyTotals[day];
      }
    }
    return maxHours;
  }
  
  function calculateAvgWorkDay() {
    const dailyTotals = {};
    sessions.forEach(session => {
      const dayOfWeek = session.timestamp.getDay();
      // Consider only weekdays (Monday = 1 through Friday = 5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateKey = session.timestamp.toDateString();
        dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + session.hours;
      }
    });
    const totals = Object.values(dailyTotals);
    const sum = totals.reduce((acc, hours) => acc + hours, 0);
    return totals.length ? sum / totals.length : 0;
  }
  
  // ===============================
  // Project-Specific Calculations
  // ===============================
  function calculateHoursByProject() {
    const projectTotals = {};
    sessions.forEach(session => {
      const proj = session.project || 'General';
      projectTotals[proj] = (projectTotals[proj] || 0) + session.hours;
    });
    return projectTotals;
  }
  
  function renderProjects(projectTotals) {
    const projectsDisplay = document.getElementById('projectsDisplay');
    if (!projectsDisplay) return;
    projectsDisplay.innerHTML = '';
  
    const ul = document.createElement('ul');
    for (const [projectName, totalHours] of Object.entries(projectTotals)) {
      const li = document.createElement('li');
      li.textContent = `${projectName}: ${formatHoursMinutes(totalHours)}`;
      ul.appendChild(li);
    }
    projectsDisplay.appendChild(ul);
  }
  
  // ===============================
  // Update the Project Options List
  // ===============================
  function updateProjectOptions() {
    const projectSet = new Set();
    sessions.forEach(session => {
      if (session.project) {
        projectSet.add(session.project);
      }
    });
    const dataList = document.getElementById('projectList');
    if (dataList) {
      dataList.innerHTML = '';
      projectSet.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        dataList.appendChild(option);
      });
    }
  }
  
  // ===============================
  // Update Display
  // ===============================
  function updateDisplay() {
    const totals = calculateTotals();
    document.getElementById('totalCommits').textContent = totals.totalCommits;
    document.getElementById('todayTotal').textContent = formatHoursMinutes(totals.todayTotal);
    document.getElementById('weekTotal').textContent = formatHoursMinutes(totals.weekTotal);
    document.getElementById('monthTotal').textContent = formatHoursMinutes(totals.monthTotal);
    document.getElementById('yearTotal').textContent = formatHoursMinutes(totals.yearTotal);
  
    // Calculate Last Week Total
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    const lastWeekTotal = calculateTotal(startOfLastWeek, startOfWeek);
  
    // Calculate Best Day and Average Workday
    const bestDay = calculateBestDay();
    const avgWorkDay = calculateAvgWorkDay();
  
    document.getElementById('lastWeekTotal').textContent = formatHoursMinutes(lastWeekTotal);
    document.getElementById('bestDay').textContent = formatHoursMinutes(bestDay);
    document.getElementById('avgWorkDay').textContent = formatHoursMinutes(avgWorkDay);
  
    // Update project summary and options list
    const projectTotals = calculateHoursByProject();
    renderProjects(projectTotals);
    updateProjectOptions();
  
    generateCalendar();
  }
  
  // ===============================
  // Stopwatch Functionality
  // ===============================
  let stopwatchInterval = null;
  let stopwatchStartTime = null;
  let stopwatchElapsedTime = 0;
  
  function formatTime(ms) {
    let totalSeconds = Math.floor(ms / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  
  function updateStopwatchDisplay() {
    document.getElementById('stopwatchDisplay').textContent = formatTime(stopwatchElapsedTime);
  }
  
  document.getElementById('startButton').addEventListener('click', () => {
    stopwatchStartTime = Date.now() - stopwatchElapsedTime;
    stopwatchInterval = setInterval(() => {
      stopwatchElapsedTime = Date.now() - stopwatchStartTime;
      updateStopwatchDisplay();
    }, 1000);
    document.getElementById('startButton').disabled = true;
    document.getElementById('stopButton').disabled = false;
    document.getElementById('logButton').disabled = false;
  });
  
  document.getElementById('stopButton').addEventListener('click', () => {
    clearInterval(stopwatchInterval);
    stopwatchInterval = null;
    document.getElementById('startButton').disabled = false;
    document.getElementById('stopButton').disabled = true;
  });
  
  document.getElementById('logButton').addEventListener('click', () => {
    const hoursLogged = stopwatchElapsedTime / (1000 * 60 * 60);
    const dateInputValue = document.getElementById('dateInput').value;
    const projectInputValue = document.getElementById('stopwatchProjectInput')?.value.trim() || 'General';
   let timestamp = getSydneyDate();
if (dateInputValue) {
  // When a date is provided, convert that date to Sydney time.
  timestamp = toSydneyDate(new Date(dateInputValue));
    }
    const newSession = { 
      timestamp, 
      hours: hoursLogged,
      project: projectInputValue
    };
    sessions.push(newSession);
    saveSessions();
    updateDisplay();
    clearInterval(stopwatchInterval);
    stopwatchInterval = null;
    stopwatchElapsedTime = 0;
    updateStopwatchDisplay();
    document.getElementById('startButton').disabled = false;
    document.getElementById('stopButton').disabled = true;
    document.getElementById('logButton').disabled = true;
  });
  
  // ===============================
  // Manual Entry via Modal
  // ===============================
  // When user clicks the "Manually enter session" link, show the modal
  document.getElementById('manualSessionLink').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('manualModal').style.display = 'block';
  });
  
  // Close modal when user clicks on the close button (inside modal)
  document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('manualModal').style.display = 'none';
  });
  
  // Manual Entry (Add Button inside modal)
  document.getElementById('addButton').addEventListener('click', () => {
    const dateInputValue = document.getElementById('dateInput').value;
    const projectInputValue = document.getElementById('projectInput')?.value.trim() || 'General';
    const hoursInputValue = parseFloat(document.getElementById('hoursInput').value) || 0;
    const minutesInputValue = parseFloat(document.getElementById('minutesInput').value) || 0;
    const totalHours = hoursInputValue + minutesInputValue / 60;
    let timestamp = dateInputValue ? new Date(dateInputValue) : new Date();
    const newSession = { 
      timestamp, 
      hours: totalHours,
      project: projectInputValue
    };
    sessions.push(newSession);
    saveSessions();
    updateDisplay();
    // Hide the modal after adding a session
    document.getElementById('manualModal').style.display = 'none';
  });
  
  // ===============================
  // Daily Achievements Section
  // ===============================
  let achievements = [];
  
  async function loadAchievements() {
    try {
      const res = await fetch('/achievements');
      achievements = await res.json();
      renderAchievements();
    } catch (err) {
      console.error("Error loading achievements:", err);
    }
  }
  
  async function saveAchievements() {
    try {
      await fetch('/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(achievements)
      });
    } catch (err) {
      console.error("Error saving achievements:", err);
    }
  }
  
  const noteDateInput = document.getElementById('noteDateInput');
  const noteInput = document.getElementById('noteInput');
  const addNoteButton = document.getElementById('addNoteButton');
  const notesDisplay = document.getElementById('notesDisplay');
  
  noteDateInput.value = new Date().toISOString().split('T')[0];
  
  addNoteButton.addEventListener('click', function() {
    const dateValue = noteDateInput.value.trim();
    const noteText = noteInput.value.trim();
    if (!noteText) return;
    const dateString = dateValue || new Date().toISOString().split('T')[0];
    const newAchievement = {
      id: Date.now(),
      dateString,
      text: noteText
    };
    achievements.push(newAchievement);
    saveAchievements();
    renderAchievements();
    noteInput.value = '';
  });
  
  function renderAchievements() {
    notesDisplay.innerHTML = '';
    const achievementsByDate = {};
    achievements.forEach(item => {
      if (!achievementsByDate[item.dateString]) {
        achievementsByDate[item.dateString] = [];
      }
      achievementsByDate[item.dateString].push(item);
    });
    const sortedDates = Object.keys(achievementsByDate).sort();
    sortedDates.forEach(dateStr => {
      const noteGroup = document.createElement('div');
      noteGroup.classList.add('note-group');
      noteGroup.setAttribute('data-date', dateStr);
      const dateHeader = document.createElement('h3');
      dateHeader.textContent = dateStr;
      noteGroup.appendChild(dateHeader);
      const ul = document.createElement('ul');
      achievementsByDate[dateStr].forEach(item => {
        const li = document.createElement('li');
        const noteTextSpan = document.createElement('span');
        noteTextSpan.textContent = item.text;
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', function() {
          if (editBtn.textContent === 'Edit') {
            editBtn.textContent = 'Save';
            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.value = item.text;
            li.replaceChild(editInput, noteTextSpan);
          } else {
            const editInput = li.querySelector('input');
            const updatedText = editInput.value.trim() || item.text;
            item.text = updatedText;
            editBtn.textContent = 'Edit';
            noteTextSpan.textContent = updatedText;
            li.replaceChild(noteTextSpan, editInput);
            saveAchievements();
          }
        });
        li.appendChild(noteTextSpan);
        li.appendChild(editBtn);
        ul.appendChild(li);
      });
      noteGroup.appendChild(ul);
      notesDisplay.appendChild(noteGroup);
    });
  }
  
  // ===============================
  // Initialization
  // ===============================
  setRandomQuote();
  loadSessions();
  loadAchievements();
  document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
});
