document.addEventListener('DOMContentLoaded', function() {
  // ===============================
  // Inspirational Quotes Section
  // ===============================
  const quotes = [
    " The only place where success comes before work is in the dictionary. — Vidal Sassoon",
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

  // ===============================
  // Helper Functions (Sydney Time)
  // ===============================
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
  // Totals & Calendar Functions (Using Luxon)
  // ===============================
  function calculateTotal(start, end) {
    return sessions
      .filter(session => {
        const sessionDate = luxon.DateTime.fromJSDate(session.timestamp).setZone('Australia/Sydney');
        return sessionDate >= start && sessionDate < end;
      })
      .reduce((sum, session) => sum + session.hours, 0);
  }
  
  function calculateTotalForDay(date) {
    // Convert the given date to a Luxon DateTime in Sydney time
    const sydneyStart = luxon.DateTime.fromJSDate(date).setZone('Australia/Sydney').startOf('day');
    const sydneyEnd = sydneyStart.plus({ days: 1 });
    return sessions.filter(session => {
      const sessionDate = luxon.DateTime.fromJSDate(session.timestamp).setZone('Australia/Sydney');
      return sessionDate >= sydneyStart && sessionDate < sydneyEnd;
    }).reduce((sum, session) => sum + session.hours, 0);
  }

  function calculateCommitsForDay(date) {
    const sydneyStart = luxon.DateTime.fromJSDate(date).setZone('Australia/Sydney').startOf('day');
    const sydneyEnd = sydneyStart.plus({ days: 1 });
    return sessions.filter(session => {
      const sessionDate = luxon.DateTime.fromJSDate(session.timestamp).setZone('Australia/Sydney');
      return sessionDate >= sydneyStart && sessionDate < sydneyEnd;
    }).length;
  }
  
  function calculateTotals() {
    const now = new Date();
    const startOfDay = luxon.DateTime.fromJSDate(now).setZone('Australia/Sydney').startOf('day');
    const endOfDay = startOfDay.plus({ days: 1 });
    const startOfWeek = luxon.DateTime.fromJSDate(now).setZone('Australia/Sydney').startOf('week');
    const endOfWeek = startOfWeek.plus({ weeks: 1 });
    const startOfMonth = luxon.DateTime.fromJSDate(now).setZone('Australia/Sydney').startOf('month');
    const endOfMonth = startOfMonth.plus({ months: 1 });
    const startOfYear = luxon.DateTime.fromJSDate(now).setZone('Australia/Sydney').startOf('year');
    const endOfYear = startOfYear.plus({ years: 1 });
  
    const todayTotal = calculateTotal(startOfDay, endOfDay);
    const weekTotal = calculateTotal(startOfWeek, endOfWeek);
    const monthTotal = calculateTotal(startOfMonth, endOfMonth);
    const yearTotal = calculateTotal(startOfYear, endOfYear);
    const totalCommits = sessions.length;
  
    return { todayTotal, weekTotal, monthTotal, yearTotal, totalCommits };
  }
  
  function generateCalendar() {
    const calendarDiv = document.getElementById('calendar');
    if (!calendarDiv) {
      console.error("Calendar div not found!");
      return;
    }
    calendarDiv.innerHTML = '';
    console.log("Generating calendar...");
    
    let yearToDisplay = new Date().getFullYear();
    if (sessions.length > 0) {
      // Use the year from the first session's timestamp
      yearToDisplay = sessions[0].timestamp.getFullYear();
    }
    
    // Create start/end date in Sydney time
    const startDate = luxon.DateTime.fromObject({ year: yearToDisplay, month: 1, day: 1 }, { zone: 'Australia/Sydney' }).toJSDate();
    const endDate = luxon.DateTime.fromObject({ year: yearToDisplay, month: 12, day: 31 }, { zone: 'Australia/Sydney' }).toJSDate();
    
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
      const formattedDate = luxon.DateTime.fromJSDate(date)
        .setZone('Australia/Sydney')
        .toFormat('ccc LLLL d');
      tooltip.textContent = `${formattedDate}: ${formatHoursMinutes(totalHours)}, ${commitCount} commits`;
  
      dayDiv.appendChild(tooltip);
      calendarDiv.appendChild(dayDiv);
    });
    console.log("Calendar generated with", calendarDiv.children.length, "day elements.");
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
  
  // ===============================
  // Additional Metrics Helper Functions
  // ===============================
  function calculateBestDay() {
    const dailyTotals = {};
    sessions.forEach(session => {
      const dateKey = luxon.DateTime.fromJSDate(session.timestamp)
        .setZone('Australia/Sydney')
        .toISODate();
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
      const dayOfWeek = luxon.DateTime.fromJSDate(session.timestamp)
        .setZone('Australia/Sydney')
        .weekday;
      // Monday=1 ... Friday=5
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateKey = luxon.DateTime.fromJSDate(session.timestamp)
          .setZone('Australia/Sydney')
          .toISODate();
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
  
    const now = new Date();
    const startOfWeek = luxon.DateTime.fromJSDate(now).setZone('Australia/Sydney').startOf('week');
    const startOfLastWeek = startOfWeek.minus({ weeks: 1 });
    const lastWeekTotal = calculateTotal(startOfLastWeek, startOfWeek);
  
    const bestDay = calculateBestDay();
    const avgWorkDay = calculateAvgWorkDay();
  
    document.getElementById('lastWeekTotal').textContent = formatHoursMinutes(lastWeekTotal);
    document.getElementById('bestDay').textContent = formatHoursMinutes(bestDay);
    document.getElementById('avgWorkDay').textContent = formatHoursMinutes(avgWorkDay);
  
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
  document.getElementById('manualSessionLink').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('manualModal').style.display = 'block';
  });
  
  document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('manualModal').style.display = 'none';
  });
  
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
    document.getElementById('manualModal').style.display = 'none';
  });
  
  // ===============================
  // Daily Achievements Section
  // ===============================
  let achievements = [];
  let currentMonthFilter = 'all'; // "all" or "YYYY-MM"
  
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
  const achievementsSidebar = document.getElementById('achievementsSidebar');
  
  noteDateInput.value = new Date().toISOString().split('T')[0];
  
  function getSydneyNow() {
    return luxon.DateTime.now().setZone('Australia/Sydney');
  }
  
  addNoteButton.addEventListener('click', function() {
    const dateValue = noteDateInput.value.trim();
    const noteText = noteInput.value.trim();
    if (!noteText) return;
    const dateString = dateValue || getSydneyNow().toISODate();
    const newAchievement = {
      id: Date.now(),
      dateString,
      text: noteText
    };
    // Avoid duplicates
    if (!achievements.some(item => item.id === newAchievement.id)) {
      achievements.push(newAchievement);
      saveAchievements();
      renderAchievements();
      noteInput.value = '';
    }
  });
  
  function deduplicateAchievements(achievementsArray) {
    const uniqueMap = new Map();
    achievementsArray.forEach(item => {
      uniqueMap.set(item.id, item);
    });
    return Array.from(uniqueMap.values());
  }
  
  // Helper for day headings, e.g. "Monday Feb 24th"
  function getOrdinalSuffix(n) {
    if (n % 100 >= 11 && n % 100 <= 13) return 'th';
    switch (n % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }
  
  function formatAchievementDate(dateString) {
    const dt = luxon.DateTime.fromISO(dateString);
    const day = dt.day;
    const suffix = getOrdinalSuffix(day);
    return dt.toFormat('cccc LLL') + ` ${day}${suffix}`;
  }

  // Build data structure grouped by month-year => day => array of items
  function groupAchievements(achList) {
    const grouped = {};
    achList.forEach(item => {
      // parse date
      const dt = luxon.DateTime.fromISO(item.dateString);
      const monthKey = dt.toFormat('yyyy-MM');  // e.g. "2025-02"
      const monthLabel = dt.toFormat('LLLL yyyy'); // e.g. "February 2025"
      const dayKey = dt.toISODate(); // e.g. "2025-02-24"

      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          label: monthLabel,
          days: {}
        };
      }
      if (!grouped[monthKey].days[dayKey]) {
        grouped[monthKey].days[dayKey] = [];
      }
      grouped[monthKey].days[dayKey].push(item);
    });
    return grouped;
  }

  function renderMonthSidebar(grouped) {
    achievementsSidebar.innerHTML = '';

    // Flatten total achievements count
    const totalCount = achievements.length;
    // "All" link at the top
    const ul = document.createElement('ul');
    
    const allLi = document.createElement('li');
    const allLink = document.createElement('a');
    allLink.href = "#";
    allLink.textContent = `All (${totalCount})`;
    allLink.addEventListener('click', (e) => {
      e.preventDefault();
      currentMonthFilter = 'all';
      renderAchievements();
    });
    allLi.appendChild(allLink);
    ul.appendChild(allLi);

    // Build an array of month keys
    let monthKeys = Object.keys(grouped);
    // Sort them by descending date so newest months come first
    monthKeys.sort().reverse();
    
    monthKeys.forEach(mKey => {
      // Count how many achievements are in that month
      let monthCount = 0;
      Object.values(grouped[mKey].days).forEach(dayArr => {
        monthCount += dayArr.length;
      });
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = "#";
      link.textContent = `${grouped[mKey].label} (${monthCount})`;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        currentMonthFilter = mKey; // e.g. "2025-02"
        renderAchievements();
      });
      li.appendChild(link);
      ul.appendChild(li);
    });

    achievementsSidebar.appendChild(ul);
  }

  function renderAchievementsContent(grouped) {
    notesDisplay.innerHTML = '';
    // If user selected a single month, only render that month
    if (currentMonthFilter !== 'all') {
      // Render just the single month
      const single = {};
      single[currentMonthFilter] = grouped[currentMonthFilter];
      renderMonthSection(single);
    } else {
      // Render all months in descending order
      renderMonthSection(grouped);
    }
  }

  // Actually create DOM elements for each month + day
  function renderMonthSection(grouped) {
    const monthKeys = Object.keys(grouped).sort().reverse(); // descending
    monthKeys.forEach(mKey => {
      const monthObj = grouped[mKey];
      const monthSection = document.createElement('div');
      monthSection.classList.add('month-section');

      // Month heading, e.g. "February 2025"
      const monthHeading = document.createElement('h2');
      monthHeading.textContent = monthObj.label;
      monthSection.appendChild(monthHeading);

      // Sort day keys in descending order
      const dayKeys = Object.keys(monthObj.days).sort().reverse();
      dayKeys.forEach(dayKey => {
        const dayArr = monthObj.days[dayKey];
        // Sort each day's achievements by ID descending (so newer notes come first)
        dayArr.sort((a, b) => (b.id - a.id));

        const noteDayDiv = document.createElement('div');
        noteDayDiv.classList.add('note-day');
        // e.g. "Monday Feb 24th"
        const dayHeading = document.createElement('h3');
        dayHeading.textContent = formatAchievementDate(dayKey);
        noteDayDiv.appendChild(dayHeading);

        const ul = document.createElement('ul');
        dayArr.forEach(item => {
          const li = document.createElement('li');
          // The text
          const noteSpan = document.createElement('span');
          noteSpan.textContent = item.text;

          // Edit button
          const editBtn = document.createElement('button');
          editBtn.classList.add('edit-button');
          editBtn.textContent = 'Edit';
          editBtn.addEventListener('click', function() {
            if (editBtn.textContent === 'Edit') {
              editBtn.textContent = 'Save';
              const editInput = document.createElement('input');
              editInput.type = 'text';
              editInput.value = item.text;
              li.replaceChild(editInput, noteSpan);
            } else {
              const editInput = li.querySelector('input');
              const updatedText = editInput.value.trim() || item.text;
              item.text = updatedText;
              editBtn.textContent = 'Edit';
              noteSpan.textContent = updatedText;
              li.replaceChild(noteSpan, editInput);
              saveAchievements();
            }
          });

          li.appendChild(noteSpan);
          li.appendChild(editBtn);
          ul.appendChild(li);
        });
        noteDayDiv.appendChild(ul);
        monthSection.appendChild(noteDayDiv);
      });
      notesDisplay.appendChild(monthSection);
    });
  }

  // Master function to sort achievements descending, group them, build sidebar, etc.
  function renderAchievements() {
    achievements = deduplicateAchievements(achievements);
    // Sort achievements by date descending
    achievements.sort((a, b) => {
      // parse dateStrings
      const dtA = luxon.DateTime.fromISO(a.dateString);
      const dtB = luxon.DateTime.fromISO(b.dateString);
      return dtB.toMillis() - dtA.toMillis();
    });
    const grouped = groupAchievements(achievements);
    renderMonthSidebar(grouped);
    renderAchievementsContent(grouped);
  }
  
  // ===============================
  // Initialization
  // ===============================
  setRandomQuote();
  loadSessions();
  loadAchievements();
  document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
});