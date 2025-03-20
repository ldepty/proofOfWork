document.addEventListener('DOMContentLoaded', function() {
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
      console.log("Attempting to load sessions from http://localhost:3000/data.json");
      const response = await fetch('http://localhost:3000/data.json');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Raw data received:", data);
      
      if (!Array.isArray(data)) {
        throw new Error('Data is not an array');
      }
      
      // Convert timestamps to Luxon DateTime objects in Sydney timezone
      sessions = data.map(session => ({
        ...session,
        timestamp: luxon.DateTime.fromISO(session.timestamp, { zone: 'Australia/Sydney' })
      }));

      console.log("Sessions loaded successfully:", sessions.length);
      console.log("First session:", sessions[0]);
      console.log("Last session:", sessions[sessions.length - 1]);
      
      updateDisplay();
    } catch (err) {
      console.error("Detailed error loading sessions:", {
        message: err.message,
        stack: err.stack,
        type: err.name
      });
      sessions = [];
    }
  }
  
  async function saveSessions() {
    try {
      // Convert Luxon DateTime objects to ISO strings for storage
      const dataToSave = sessions.map(session => ({
        ...session,
        timestamp: session.timestamp.toISO()
      }));

      const response = await fetch('http://localhost:3000/data.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSave)
      });

      if (!response.ok) {
        throw new Error('Failed to save sessions');
      }

      console.log("Sessions saved successfully");
    } catch (err) {
      console.error("Error saving sessions:", err);
    }
  }
  
  // ===============================
  // Totals & Calendar Functions (Using Luxon)
  // ===============================
  function calculateTotals() {
    console.log('Calculating totals...');
    
    // Get current time in Sydney
    const now = luxon.DateTime.now().setZone('Australia/Sydney');
    console.log('Current time (Sydney):', now.toISO());

    // Calculate day range
    const dayStart = now.startOf('day');
    const dayEnd = now.endOf('day');

    // Calculate week range (Monday to Sunday)
    const weekStart = now.startOf('week');
    const weekEnd = now.endOf('week');

    // Calculate month range
    const monthStart = now.startOf('month');
    const monthEnd = now.endOf('month');

    // Calculate year range
    const yearStart = now.startOf('year');
    const yearEnd = now.endOf('year');

    // Calculate totals using proper DateTime comparison
    const dayTotal = sessions.reduce((sum, session) => {
      const sessionTime = session.timestamp;
      if (sessionTime >= dayStart && sessionTime <= dayEnd) {
        return sum + session.hours;
      }
      return sum;
    }, 0);

    const weekTotal = sessions.reduce((sum, session) => {
      const sessionTime = session.timestamp;
      if (sessionTime >= weekStart && sessionTime <= weekEnd) {
        return sum + session.hours;
      }
      return sum;
    }, 0);

    const monthTotal = sessions.reduce((sum, session) => {
      const sessionTime = session.timestamp;
      if (sessionTime >= monthStart && sessionTime <= monthEnd) {
        return sum + session.hours;
      }
      return sum;
    }, 0);

    const yearTotal = sessions.reduce((sum, session) => {
      const sessionTime = session.timestamp;
      if (sessionTime >= yearStart && sessionTime <= yearEnd) {
        return sum + session.hours;
      }
      return sum;
    }, 0);

    // Update the stats display
    document.getElementById('todayTotal').textContent = formatHoursMinutes(dayTotal);
    document.getElementById('weekTotal').textContent = formatHoursMinutes(weekTotal);
    document.getElementById('monthTotal').textContent = formatHoursMinutes(monthTotal);
    document.getElementById('yearTotal').textContent = formatHoursMinutes(yearTotal);

    // Update total hours in calendar header
    const totalHoursElement = document.getElementById('total-hours');
    if (totalHoursElement) {
      totalHoursElement.textContent = `${formatHoursMinutes(yearTotal)} total`;
    }

    return {
      day: dayTotal,
      week: weekTotal,
      month: monthTotal,
      year: yearTotal
    };
  }

  function calculateTotal(start, end) {
    const total = sessions
      .filter(session => {
        const sessionDate = luxon.DateTime.fromJSDate(session.timestamp).setZone('Australia/Sydney');
        const isInRange = sessionDate >= start && sessionDate < end;
        console.log("Session:", sessionDate.toISO(), "in range:", isInRange, "hours:", session.hours);
        return isInRange;
      })
      .reduce((sum, session) => sum + session.hours, 0);
    
    console.log(`Total for ${start.toISO()} to ${end.toISO()}: ${total}`);
    return total;
  }
  
  function calculateTotalForDay(date) {
    // Convert input date to Luxon DateTime in Sydney timezone if it's not already
    const sydneyDate = luxon.DateTime.isDateTime(date) 
      ? date.setZone('Australia/Sydney')
      : luxon.DateTime.fromJSDate(date).setZone('Australia/Sydney');
    
    const sydneyStart = sydneyDate.startOf('day');
    const sydneyEnd = sydneyDate.endOf('day');

    return sessions.filter(session => {
      return session.timestamp >= sydneyStart && session.timestamp <= sydneyEnd;
    }).reduce((sum, session) => sum + session.hours, 0);
  }

  function calculateCommitsForDay(date) {
    // Convert input date to Luxon DateTime in Sydney timezone if it's not already
    const sydneyDate = luxon.DateTime.isDateTime(date) 
      ? date.setZone('Australia/Sydney')
      : luxon.DateTime.fromJSDate(date).setZone('Australia/Sydney');
    
    const sydneyStart = sydneyDate.startOf('day');
    const sydneyEnd = sydneyDate.endOf('day');

    return sessions.filter(session => {
      return session.timestamp >= sydneyStart && session.timestamp <= sydneyEnd;
    }).length;
  }
  
  function generateCalendar() {
    const calendarDiv = document.getElementById('calendar');
    if (!calendarDiv) {
      console.error('Calendar div not found');
      return;
    }

    // Clear existing calendar
    calendarDiv.innerHTML = '';

    // Get current time in Sydney
    const now = luxon.DateTime.now().setZone('Australia/Sydney');
    const year = now.year;

    // Create start and end dates in Sydney timezone
    const startDate = luxon.DateTime.fromObject({ year, month: 1, day: 1 }, { zone: 'Australia/Sydney' });
    const endDate = luxon.DateTime.fromObject({ year, month: 12, day: 31 }, { zone: 'Australia/Sydney' });

    // Create container for month labels
    const monthLabelsContainer = document.createElement('div');
    monthLabelsContainer.className = 'month-labels';
    
    // Add month labels
    for (let month = 1; month <= 12; month++) {
      const monthLabel = document.createElement('div');
      monthLabel.className = 'month-label';
      monthLabel.textContent = luxon.DateTime.fromObject({ month }, { zone: 'Australia/Sydney' }).toFormat('MMM');
      monthLabelsContainer.appendChild(monthLabel);
    }
    calendarDiv.appendChild(monthLabelsContainer);

    // Generate array of dates for the year
    const dates = [];
    let currentDate = startDate;
    while (currentDate <= endDate) {
      dates.push(currentDate);
      currentDate = currentDate.plus({ days: 1 });
    }

    // Create calendar grid
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';

    // Add days to grid
    dates.forEach(date => {
      const dayElement = document.createElement('div');
      dayElement.className = 'day';

      // Calculate total hours for this day
      const totalHours = calculateTotalForDay(date);
      
      // Add intensity class based on hours
      if (totalHours === 0) {
        dayElement.classList.add('zero');
      } else if (totalHours <= 2) {
        dayElement.classList.add('low');
      } else if (totalHours <= 4) {
        dayElement.classList.add('medium');
      } else if (totalHours <= 6) {
        dayElement.classList.add('three-four');
      } else {
        dayElement.classList.add('high');
      }

      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      const formattedDate = date.toLocaleString({ 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
      const formattedHours = totalHours > 0 ? `${totalHours.toFixed(1)} hours` : 'No hours';
      tooltip.textContent = `${formattedDate}\n${formattedHours}`;
      dayElement.appendChild(tooltip);

      calendarGrid.appendChild(dayElement);
    });

    calendarDiv.appendChild(calendarGrid);

    // Update total hours in header
    const totalHours = sessions.reduce((sum, session) => sum + session.hours, 0);
    const totalHoursElement = document.getElementById('total-hours');
    if (totalHoursElement) {
      totalHoursElement.textContent = `${formatHoursMinutes(totalHours)} total`;
    }
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
    
    // First pass: normalize project names and sum hours
    sessions.forEach(session => {
      const projectName = (session.project || 'General').toLowerCase();
      projectTotals[projectName] = (projectTotals[projectName] || 0) + session.hours;
    });
    
    // Create a mapping of normalized names to display names
    const displayNames = {};
    sessions.forEach(session => {
      const normalizedName = (session.project || 'General').toLowerCase();
      // Keep the first capitalization we see for each project
      if (!displayNames[normalizedName]) {
        displayNames[normalizedName] = session.project || 'General';
      }
    });
    
    // Create final result with proper display names
    const result = {};
    Object.entries(projectTotals).forEach(([normalizedName, hours]) => {
      result[displayNames[normalizedName]] = hours;
    });
    
    // Sort projects by hours in descending order
    return Object.entries(result)
      .sort(([,a], [,b]) => b - a)
      .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
  }
  
  // ===============================
  // Project Management
  // ===============================
  let projects = [
    { id: 1, name: 'Assassination of Mahmoud al-Mabhouh (research)', color: '#FF6B6B' },
    { id: 2, name: 'general', color: '#4ECDC4' },
    { id: 3, name: 'The Pope Video', color: '#45B7D1' }
  ];
  const defaultColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5',
    '#9B59B6', '#3498DB', '#2ECC71', '#F1C40F', '#E67E22', '#E74C3C'
  ];

  async function loadProjects() {
    try {
      const response = await fetch('http://localhost:3000/projects.json');
      projects = await response.json();
      updateProjectOptions();
    } catch (err) {
      console.error("Error loading projects:", err);
      // Initialize with default projects if file doesn't exist
      projects = [
        { id: 1, name: 'Assassination of Mahmoud al-Mabhouh (research)', color: '#FF6B6B' },
        { id: 2, name: 'general', color: '#4ECDC4' },
        { id: 3, name: 'The Pope Video', color: '#45B7D1' }
      ];
    }
  }

  async function saveProjects() {
    try {
      const response = await fetch('http://localhost:3000/projects.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projects)
      });

      if (!response.ok) {
        throw new Error('Failed to save projects');
      }

      console.log("Projects saved successfully");
    } catch (err) {
      console.error("Error saving projects:", err);
    }
  }

  // Initialize color picker
  function initializeColorPicker() {
    const colorPicker = document.getElementById('colorPicker');
    if (!colorPicker) {
      console.warn('Color picker element not found');
      return;
    }
    
    defaultColors.forEach(color => {
      const colorOption = document.createElement('div');
      colorOption.className = 'color-option';
      colorOption.style.backgroundColor = color;
      colorOption.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
        colorOption.classList.add('selected');
      });
      colorPicker.appendChild(colorOption);
    });
  }

  // Call initialize after DOM is loaded
  initializeColorPicker();

  // Project creation modal handlers
  const createProjectBtn = document.getElementById('createProjectBtn');
  const createProjectModal = document.getElementById('createProjectModal');
  const cancelProjectBtn = document.getElementById('cancelProjectBtn');
  const confirmProjectBtn = document.getElementById('confirmProjectBtn');
  const newProjectName = document.getElementById('newProjectName');

  createProjectBtn.addEventListener('click', () => {
    createProjectModal.style.display = 'block';
    newProjectName.value = '';
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
  });

  cancelProjectBtn.addEventListener('click', () => {
    createProjectModal.style.display = 'none';
  });

  confirmProjectBtn.addEventListener('click', () => {
    const name = newProjectName.value.trim();
    const selectedColor = document.querySelector('.color-option.selected');
    
    if (name && selectedColor) {
      const newProject = {
        id: Date.now(),
        name: name,
        color: selectedColor.style.backgroundColor
      };
      
      projects.push(newProject);
      saveProjects();
      updateProjectOptions();
      createProjectModal.style.display = 'none';
      
      // Set the new project as the current selection
      document.getElementById('projectInput').value = name;
    }
  });

  // Update project display function to use project colors
  function updateProjectsDisplay() {
    const projectsContainer = document.getElementById('projects');
    if (!projectsContainer) {
      console.error('Projects container not found');
      return;
    }
    
    // Clear existing projects
    projectsContainer.innerHTML = '';
    
    // Calculate total hours
    const totalHours = sessions.reduce((sum, session) => sum + session.hours, 0);
    
    // Get project hours
    const projectHours = calculateHoursByProject();
    
    // Create project bars
    Object.entries(projectHours).forEach(([project, hours]) => {
      const percentage = (hours / totalHours) * 100;
      const projectBar = document.createElement('div');
      projectBar.className = 'project-bar';
      
      // Format hours to one decimal place
      const formattedHours = hours.toFixed(1);
      
      projectBar.innerHTML = `
        <div class="project-header">
          <span class="project-name">${project}</span>
          <span class="project-hours">${formattedHours}h</span>
        </div>
        <div class="bar-container">
          <div class="bar-fill" style="width: ${percentage}%"></div>
        </div>
      `;
      projectsContainer.appendChild(projectBar);
    });
  }

  // Update the project options list with colors
  function updateProjectOptions() {
    const projectSet = new Set();
    sessions.forEach(session => {
      if (session.project) {
        projectSet.add(session.project);
      }
    });
    projects.forEach(project => {
      projectSet.add(project.name);
    });
    
    const dataList = document.getElementById('projectList');
    if (dataList) {
      dataList.innerHTML = '';
      projectSet.forEach(projectName => {
        const option = document.createElement('option');
        option.value = projectName;
        dataList.appendChild(option);
      });
    }
  }
  
  // ===============================
  // Update Display
  // ===============================
  function calculatePercentageChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  function formatPercentageChange(percentage) {
    const isPositive = percentage >= 0;
    const icon = isPositive ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
    const colorClass = isPositive ? 'positive-change' : 'negative-change';
    return `<span class="${colorClass}">${icon} ${Math.abs(percentage).toFixed(1)}%</span>`;
  }

  function calculateCurrentStreak() {
    const now = luxon.DateTime.now().setZone('Australia/Sydney');
    let currentDate = now.startOf('day');
    let streak = 0;
    
    // Check if there's work logged today
    const todayHours = calculateTotalForDay(currentDate.toJSDate());
    if (todayHours === 0) {
      // If no work today, check if there was work yesterday
      currentDate = currentDate.minus({ days: 1 });
      const yesterdayHours = calculateTotalForDay(currentDate.toJSDate());
      if (yesterdayHours === 0) {
        return 0; // Break in streak
      }
    }
    
    // Count backwards from current date
    while (true) {
      const dayTotal = calculateTotalForDay(currentDate.toJSDate());
      if (dayTotal === 0) break;
      streak++;
      currentDate = currentDate.minus({ days: 1 });
    }
    
    return streak;
  }

  function formatTimeDifference(currentMinutes, previousMinutes) {
    const diff = currentMinutes - previousMinutes;
    if (diff === 0) return '';
    
    const isPositive = diff > 0;
    const absDiff = Math.abs(diff);
    const hours = Math.floor(absDiff / 60);
    const minutes = Math.floor(absDiff % 60);
    
    const sign = isPositive ? '+' : '-';
    const className = isPositive ? 'time-difference positive' : 'time-difference negative';
    
    let diffText = '';
    if (hours > 0) diffText += `${hours}h `;
    if (minutes > 0) diffText += `${minutes}m`;
    
    return `<span class="${className}">${sign}${diffText}</span>`;
  }

  function updateDisplay() {
    console.log('Updating display...');
    
    // Update totals
    const totals = calculateTotals();
    console.log('Calculated totals:', totals);

    // Calculate total sessions
    const totalSessions = sessions.length;
    document.getElementById('totalCommits').textContent = totalSessions;

    // Update stats display
    document.querySelectorAll('.stat').forEach(stat => {
      const period = stat.getAttribute('data-period');
      if (period && totals[period] !== undefined) {
        const hours = totals[period];
        const hoursDisplay = Math.floor(hours);
        const minutes = Math.round((hours - hoursDisplay) * 60);
        
        // Update hours/minutes display
        const valueElement = stat.querySelector('p');
        if (valueElement) {
          valueElement.textContent = `${hoursDisplay}h ${minutes}m`;
        }

        // Calculate and update percentage change
        const compareElement = stat.querySelector('.compare');
        if (compareElement) {
          const now = luxon.DateTime.now().setZone('Australia/Sydney');
          let previousTotal = 0;
          
          if (period === 'day') {
            const yesterday = now.minus({ days: 1 });
            previousTotal = calculateTotalForDay(yesterday);
          } else if (period === 'week') {
            const lastWeekStart = now.minus({ weeks: 1 }).startOf('week');
            const lastWeekEnd = lastWeekStart.endOf('week');
            previousTotal = calculateTotal(lastWeekStart, lastWeekEnd);
          } else if (period === 'month') {
            const lastMonthStart = now.minus({ months: 1 }).startOf('month');
            const lastMonthEnd = lastMonthStart.endOf('month');
            previousTotal = calculateTotal(lastMonthStart, lastMonthEnd);
          } else if (period === 'year') {
            const lastYearStart = now.minus({ years: 1 }).startOf('year');
            const lastYearEnd = lastYearStart.endOf('year');
            previousTotal = calculateTotal(lastYearStart, lastYearEnd);
          }

          const diff = totals[period] - previousTotal;
          const diffHours = Math.floor(Math.abs(diff));
          const diffMinutes = Math.round((Math.abs(diff) - diffHours) * 60);
          const sign = diff >= 0 ? '+' : '-';
          const className = diff >= 0 ? 'positive' : 'negative';

          compareElement.textContent = `${sign}${diffHours}h ${diffMinutes}m`;
          compareElement.className = `compare ${className}`;
        }
      }
    });

    // Update calendar
    generateCalendar();

    // Update project bars
    updateProjectsDisplay();

    // Update last 7 days and year overview
    updateLast7Days();
    updateYearOverview();

    console.log('Display update complete');
  }
  
  function updateLast7Days() {
    const container = document.getElementById('seven-days-content');
    container.innerHTML = '';
    
    const now = luxon.DateTime.now().setZone('Australia/Sydney');
    
    // Create array of last 7 days
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = now.minus({ days: i });
      const dayStart = date.startOf('day');
      const dayEnd = date.endOf('day');
      
      // Calculate total hours for this day
      const dayHours = sessions
        .filter(session => {
          const sessionTime = luxon.DateTime.fromISO(session.timestamp, { zone: 'Australia/Sydney' });
          return sessionTime >= dayStart && sessionTime <= dayEnd;
        })
        .reduce((sum, session) => sum + session.hours, 0);
      
      // Get unique projects for this day
      const dayProjects = [...new Set(sessions
        .filter(session => {
          const sessionTime = luxon.DateTime.fromISO(session.timestamp, { zone: 'Australia/Sydney' });
          return sessionTime >= dayStart && sessionTime <= dayEnd;
        })
        .map(session => session.project)
      )];
      
      days.push({
        date,
        hours: dayHours,
        projects: dayProjects
      });
    }
    
    // Create rows for each day
    days.forEach((day, index) => {
      const row = document.createElement('div');
      row.className = 'day-row';
      
      const dayName = document.createElement('div');
      dayName.className = 'day-name';
      // Use "Today" for current day, actual day name for others
      dayName.textContent = index === 0 ? 'Today' : day.date.toFormat('cccc');
      
      const projectName = document.createElement('div');
      projectName.className = 'day-project';
      projectName.textContent = day.projects.join(', ') || '--------';
      
      const hoursDisplay = document.createElement('div');
      hoursDisplay.className = 'day-hours';
      hoursDisplay.textContent = formatHoursMinutes(day.hours);
      
      row.appendChild(dayName);
      row.appendChild(projectName);
      row.appendChild(hoursDisplay);
      container.appendChild(row);
    });
  }
  
  function getDayProjects(date) {
    const start = luxon.DateTime.fromJSDate(date).setZone('Australia/Sydney').startOf('day');
    const end = start.plus({ days: 1 });
    
    return [...new Set(sessions
      .filter(session => {
        const sessionDate = luxon.DateTime.fromJSDate(session.timestamp).setZone('Australia/Sydney');
        return sessionDate >= start && sessionDate < end;
      })
      .map(session => session.project)
    )];
  }
  
  function updateYearOverview() {
    const container = document.getElementById('year-overview-content');
    container.innerHTML = '';
    
    const now = luxon.DateTime.now().setZone('Australia/Sydney');
    const currentYear = now.year;
    
    // Create an array of all months in the current year
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const date = luxon.DateTime.fromObject({ year: currentYear, month }, { zone: 'Australia/Sydney' });
      const monthStart = date.startOf('month');
      const monthEnd = date.endOf('month');
      
      // Calculate total hours for the month
      const monthHours = sessions
        .filter(session => {
          return session.timestamp >= monthStart && session.timestamp <= monthEnd;
        })
        .reduce((sum, session) => sum + session.hours, 0);
      
      // Only add months that have hours logged
      if (monthHours > 0) {
        // Get unique projects for the month
        const monthProjects = [...new Set(sessions
          .filter(session => {
            return session.timestamp >= monthStart && session.timestamp <= monthEnd;
          })
          .map(session => session.project)
        )];
        
        months.push({
          name: date.toFormat('MMMM'),
          hours: monthHours,
          projects: monthProjects
        });
      }
    }
    
    // Create rows for each month
    months.forEach(month => {
      const row = document.createElement('div');
      row.className = 'month-row';
      
      const monthName = document.createElement('div');
      monthName.className = 'month-name';
      monthName.textContent = month.name;
      
      const projectName = document.createElement('div');
      projectName.className = 'month-project';
      projectName.textContent = month.projects.join(', ');
      
      const hoursDisplay = document.createElement('div');
      hoursDisplay.className = 'month-hours';
      hoursDisplay.textContent = formatHoursMinutes(month.hours);
      
      row.appendChild(monthName);
      row.appendChild(projectName);
      row.appendChild(hoursDisplay);
      container.appendChild(row);
    });
  }
  
  // ===============================
  // Stopwatch Functionality
  // ===============================
  let isRunning = false;
  let startTime;
  let timerInterval;

  function updateTimer() {
    if (!isRunning) return;
    
    const now = new Date().getTime();
    const elapsed = now - startTime;
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    
    const display = document.querySelector('.timer-display');
    display.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function toggleTimer() {
    const toggleSwitch = document.querySelector('.toggle-switch');
    const toggleHandle = toggleSwitch.querySelector('.toggle-handle i');
    const workingStatus = document.querySelector('.working-status');
    
    if (!isRunning) {
      // Start timer
      isRunning = true;
      startTime = new Date().getTime();
      timerInterval = setInterval(updateTimer, 1000);
      toggleHandle.className = 'fas fa-pause';
      toggleSwitch.classList.add('active');
      workingStatus.classList.add('active');
    } else {
      // Stop timer
      isRunning = false;
      clearInterval(timerInterval);
      toggleHandle.className = 'fas fa-play';
      toggleSwitch.classList.remove('active');
      workingStatus.classList.remove('active');
    }
  }

  // Add event listeners
  document.querySelector('.toggle-switch').addEventListener('click', toggleTimer);
  document.querySelector('.log-time-btn').addEventListener('click', () => {
    if (isRunning) {
      toggleTimer(); // Stop the timer first
    }
    // Add your logging logic here
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
      const response = await fetch('http://localhost:3000/achievements.json');
      achievements = await response.json();
      renderAchievements();
    } catch (err) {
      console.error("Error loading achievements:", err);
      achievements = [];
    }
  }
  
  async function saveAchievements() {
    try {
      const response = await fetch('http://localhost:3000/achievements.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(achievements)
      });

      if (!response.ok) {
        throw new Error('Failed to save achievements');
      }

      console.log("Achievements saved successfully");
    } catch (err) {
      console.error("Error saving achievements:", err);
    }
  }
  
  const noteDateInput = document.getElementById('noteDateInput');
  const noteInput = document.getElementById('noteInput');
  const addNoteButton = document.getElementById('addNoteButton');
  const notesDisplay = document.getElementById('notesDisplay');
  const achievementsSidebar = document.getElementById('achievementsSidebar');
  
  // Initialize date input with current Sydney date
  noteDateInput.value = getSydneyNow().toISODate();
  
  function getSydneyNow() {
    return luxon.DateTime.now().setZone('Australia/Sydney');
  }
  
  addNoteButton.addEventListener('click', function() {
    const dateValue = noteDateInput.value.trim();
    const noteText = noteInput.value.trim();
    if (!noteText) return;
    
    // Get current Sydney time
    const sydneyNow = getSydneyNow();
    // Use provided date or current Sydney date
    const dateString = dateValue || sydneyNow.toISODate();
    
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
  loadSessions();
  loadAchievements();
  loadProjects();
  document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
});