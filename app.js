document.addEventListener('DOMContentLoaded', function() {
  // Ensure these are defined before any usage!
  const projectInput = document.getElementById('projectInput');
  const taskInput = document.getElementById('taskInput');
  const taskDropdown = document.getElementById('taskDropdown');
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
      console.log("Number of sessions:", data.length);
      
      if (!Array.isArray(data)) {
        throw new Error('Data is not an array');
      }
      
      // Convert timestamps to Luxon DateTime objects in Sydney timezone
      sessions = data.map(session => ({
        ...session,
        timestamp: luxon.DateTime.fromISO(session.timestamp, { zone: 'Australia/Sydney' })
      }));

      console.log("Sessions loaded successfully:", sessions.length);
      console.log("Sample session:", sessions[0]);
      console.log("Projects loaded:", projects.length);
      console.log("Sample project:", projects[0]);
      
      updateProjectOptions(); // Update project options after loading sessions
      updateAllDisplays();
    } catch (err) {
      console.error("Detailed error loading sessions:", err);
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
      updateAllDisplays(); // Update all displays after saving
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
    const totalHours = sessions.reduce((sum, session) => sum + session.hours, 0);
    const totalHoursElement = document.getElementById('total-hours');
    if (totalHoursElement) {
      totalHoursElement.textContent = formatHoursMinutes(totalHours);
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

    // Create calendar grid
    const calendarGrid = document.createElement('div');
    calendarGrid.className = 'calendar-grid';

    // Generate array of dates for the year
    const dates = [];
    let currentDate = startDate;
    while (currentDate <= endDate) {
      dates.push(currentDate);
      currentDate = currentDate.plus({ days: 1 });
    }

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
      } else if (totalHours <= 3) {
        dayElement.classList.add('medium');
      } else if (totalHours <= 4) {
        dayElement.classList.add('three-four');
      } else {
        dayElement.classList.add('high');
      }

      // Get projects for this day
      const dayProjects = getDayProjects(date);
      
      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      const formattedDate = date.toLocaleString({ 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
      
      let tooltipContent = `${formattedDate}\n`;
      if (totalHours > 0) {
        const hours = Math.floor(totalHours);
        const minutes = Math.round((totalHours - hours) * 60);
        tooltipContent += `${hours}h ${minutes}m\n`;
        if (dayProjects.length > 0) {
          tooltipContent += dayProjects.join(', ');
        }
      } else {
        tooltipContent += 'No hours';
      }
      
      tooltip.textContent = tooltipContent;
      dayElement.appendChild(tooltip);

      calendarGrid.appendChild(dayElement);
    });

    calendarDiv.appendChild(calendarGrid);

    // Update total hours in header
    const totalHours = sessions.reduce((sum, session) => sum + session.hours, 0);
    const totalHoursElement = document.getElementById('total-hours');
    if (totalHoursElement) {
      totalHoursElement.textContent = formatHoursMinutes(totalHours);
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
  function calculateHoursByProjectAndTask() {
    console.log("Calculating hours by project and task...");
    console.log("Sessions:", sessions.length);
    console.log("Sample sessions:", sessions.slice(0, 3));
    
    const projectTotals = {};
    sessions.forEach(session => {
      const projectName = (session.project || 'General');
      const taskName = (session.task || 'General');
      console.log(`Processing session: ${projectName} - ${taskName} (${session.hours} hours)`);
      
      if (!projectTotals[projectName]) projectTotals[projectName] = {};
      projectTotals[projectName][taskName] = (projectTotals[projectName][taskName] || 0) + session.hours;
    });
    
    console.log("Project totals:", projectTotals);
    return projectTotals;
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
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
      const loadedProjects = await response.json();
      if (Array.isArray(loadedProjects) && loadedProjects.length > 0) {
        projects = loadedProjects;
      }
      updateProjectOptions();
    } catch (err) {
      console.error("Error loading projects:", err);
      // Keep default projects if loading fails
      updateProjectOptions();
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
  const itemTypeSelect = document.getElementById('itemType');
  const projectSelect = document.getElementById('projectSelect');
  const parentProjectSelect = document.getElementById('parentProject');

  // Show/hide parent project select based on item type
  itemTypeSelect.addEventListener('change', () => {
    projectSelect.style.display = itemTypeSelect.value === 'task' ? 'block' : 'none';
    // Update parent project options when switching to task
    if (itemTypeSelect.value === 'task') {
      updateParentProjectOptions();
    }
  });

  function updateParentProjectOptions() {
    parentProjectSelect.innerHTML = '';
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      parentProjectSelect.appendChild(option);
    });
  }

  createProjectBtn.addEventListener('click', () => {
    createProjectModal.style.display = 'block';
    newProjectName.value = '';
    itemTypeSelect.value = 'project';
    projectSelect.style.display = 'none';
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    updateParentProjectOptions();
  });

  cancelProjectBtn.addEventListener('click', () => {
    createProjectModal.style.display = 'none';
  });

  confirmProjectBtn.addEventListener('click', () => {
    const name = newProjectName.value.trim();
    const selectedColor = document.querySelector('.color-option.selected');
    const isTask = itemTypeSelect.value === 'task';
    
    if (name && selectedColor) {
      if (isTask) {
        const parentProjectId = parentProjectSelect.value;
        const parentProject = projects.find(p => p.id === parentProjectId);
        
        if (parentProject) {
          const newTask = {
            id: `${parentProjectId}-${Date.now()}`,
            name: name,
            color: selectedColor.style.backgroundColor
          };
          
          if (!parentProject.tasks) {
            parentProject.tasks = [];
          }
          
          parentProject.tasks.push(newTask);
        }
      } else {
        const newProject = {
          id: Date.now().toString(),
          name: name,
          color: selectedColor.style.backgroundColor,
          tasks: []
        };
        
        projects.push(newProject);
      }
      
      saveProjects();
      updateProjectOptions();
      createProjectModal.style.display = 'none';
      
      // Set the new project/task as the current selection
      document.getElementById('projectInput').value = name;
    }
  });

  // Update project display function to show tasks under projects
  function updateProjects() {
    const projectsContainer = document.getElementById('projects');
    projectsContainer.innerHTML = '<h2>Projects</h2>';
    
    // Get total hours across all projects for percentage calculation
    const totals = calculateHoursByProjectAndTask();
    const totalHours = Object.values(totals).reduce((sum, projectTasks) => {
      return sum + Object.values(projectTasks).reduce((taskSum, hours) => taskSum + hours, 0);
    }, 0);

    // Create and append project bars
    Object.keys(totals).forEach(projectName => {
      const project = projects.find(p => p.name === projectName);
      const color = project ? project.color : '#888';
      const projectHours = Object.values(totals[projectName]).reduce((a, b) => a + b, 0);
      
      if (projectHours > 0) {
        const percentage = totalHours > 0 ? (projectHours / totalHours) * 100 : 0;
        
        // Create project header
        const projectBar = document.createElement('div');
        projectBar.className = 'project-bar';
        
        projectBar.innerHTML = `
          <div class="project-header">
            <div class="project-name">
              <span class="project-color-dot" style="background-color: ${color}"></span>
              ${projectName}
            </div>
            <div class="project-hours">${formatHoursMinutes(projectHours)}</div>
          </div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${percentage}%; background-color: ${color}"></div>
          </div>
        `;
        
        projectsContainer.appendChild(projectBar);

        // Add tasks under project
        Object.keys(totals[projectName]).forEach(taskName => {
          const taskHours = totals[projectName][taskName];
          const task = project && project.tasks ? project.tasks.find(t => t.name === taskName) : null;
          const taskColor = task ? task.color : '#aaa';

          if (taskHours > 0) {
            const taskBar = document.createElement('div');
            taskBar.className = 'project-bar task-bar';
            
            const taskPercentage = projectHours > 0 ? (taskHours / projectHours) * 100 : 0;
            
            taskBar.innerHTML = `
              <div class="project-header">
                <div class="project-name">
                  <span class="project-color-dot" style="background-color: ${taskColor}"></span>
                  ${taskName}
                </div>
                <div class="project-hours">${formatHoursMinutes(taskHours)}</div>
              </div>
              <div class="bar-container">
                <div class="bar-fill" style="width: ${taskPercentage}%; background-color: ${taskColor}"></div>
              </div>
            `;
            
            projectsContainer.appendChild(taskBar);
          }
        });
      }
    });
  }

  // Update the project options list with tasks
  function updateProjectOptions() {
    const projectSet = new Set();
    
    // Add all task names from projects
    projects.forEach(project => {
      projectSet.add(project.name);
      project.tasks.forEach(task => {
        projectSet.add(`${project.name} - ${task.name}`);
      });
    });
    
    // Add all project names from sessions (for backward compatibility)
    sessions.forEach(session => {
      if (session.project && session.task) {
        projectSet.add(`${session.project} - ${session.task}`);
      }
    });
    
    const dataList = document.getElementById('projectList');
    if (dataList) {
      dataList.innerHTML = '';
      Array.from(projectSet).sort().forEach(projectTask => {
        const option = document.createElement('option');
        option.value = projectTask;
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
    // Get current time in Sydney
    const now = luxon.DateTime.now().setZone('Australia/Sydney');
    let currentDate = now.startOf('day');
    let streak = 0;
    
    // Get all dates with sessions and convert them to date strings for easy comparison
    const datesWithSessions = new Set(
      sessions.map(session => 
        session.timestamp.startOf('day').toISODate()
      )
    );

    // Check if there's work logged today
    if (datesWithSessions.has(currentDate.toISODate())) {
      streak = 1;
      currentDate = currentDate.minus({ days: 1 });
    } else {
      // If no work today, check yesterday
      currentDate = currentDate.minus({ days: 1 });
      if (!datesWithSessions.has(currentDate.toISODate())) {
        return 0; // No work yesterday either, streak is 0
      }
      streak = 1; // Start counting from yesterday
    }
    
    // Count backwards until we find a day without sessions
    while (datesWithSessions.has(currentDate.toISODate())) {
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

  function updateAllDisplays() {
    console.log('Updating all displays...');
    
    // Update totals and stats
    const totals = calculateTotals();
    
    // Update total sessions count
    const totalSessionsElement = document.querySelector('#totalCommits');
    if (totalSessionsElement) {
      totalSessionsElement.textContent = sessions.length;
    }
    
    // Update current streak
    const currentStreakElement = document.querySelector('#currentStreak');
    if (currentStreakElement) {
      currentStreakElement.textContent = calculateCurrentStreak();
    }
    
    // Update stats display with minutes
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
      }
    });

    // Update calendar
    generateCalendar();

    // Update project bars
    updateProjects();

    // Update last 7 days and year overview
    updateLast7Days();
    updateYearOverview();

    // Update commit chart
    updateCommitChart();

    console.log('All displays updated');
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
      
      // Get unique projects for this day with their colors
      const dayProjects = Array.from(new Set(sessions
        .filter(session => {
          const sessionTime = luxon.DateTime.fromISO(session.timestamp, { zone: 'Australia/Sydney' });
          return sessionTime >= dayStart && sessionTime <= dayEnd;
        })
        .map(session => `${session.project} - ${session.task}`)
      )).map(projectTask => {
        const [projectName, taskName] = projectTask.split(' - ');
        const projectData = projects.find(p => p.name === projectName);
        return {
          name: projectName,
          color: projectData ? projectData.color : '#9370DB'
        };
      });
      
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
      dayName.textContent = index === 0 ? 'Today' : day.date.toFormat('cccc');
      
      const projectName = document.createElement('div');
      projectName.className = 'day-project';
      if (day.projects.length > 0) {
        projectName.innerHTML = day.projects.map(project => `
          <span>
            <span class="project-color-dot" style="background-color: ${project.color}"></span>
            ${project.name}
          </span>
        `).join(', ');
      } else {
        projectName.textContent = '--------';
      }
      
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
      .map(session => `${session.project} - ${session.task}`)
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
          const sessionTime = session.timestamp;
          return sessionTime >= monthStart && sessionTime <= monthEnd;
        })
        .reduce((sum, session) => sum + session.hours, 0);
      
      // Only add months that have hours logged
      if (monthHours > 0) {
        // Get unique projects for the month
        const monthProjects = [...new Set(sessions
          .filter(session => {
            const sessionTime = session.timestamp;
            return sessionTime >= monthStart && sessionTime <= monthEnd;
          })
          .map(session => `${session.project} - ${session.task}`)
        )].map(projectTask => {
          const [projectName, taskName] = projectTask.split(' - ');
          const projectData = projects.find(p => p.name === projectName);
          return {
            name: projectName,
            color: projectData ? projectData.color : '#9370DB'
          };
        });
        
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
      if (month.projects.length > 0) {
        projectName.innerHTML = month.projects.map(project => `
          <span>
            <span class="project-color-dot" style="background-color: ${project.color}"></span>
            ${project.name}
          </span>
        `).join('');
      } else {
        projectName.textContent = '--------';
      }
      
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
  let elapsedTime = 0;  // This tracks total elapsed time
  let timerInterval;

  function updateTimer() {
    if (!isRunning) return;
    
    const now = new Date().getTime();
    const currentElapsed = now - startTime;
    const totalElapsed = elapsedTime + currentElapsed;
    
    const hours = Math.floor(totalElapsed / (1000 * 60 * 60));
    const minutes = Math.floor((totalElapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((totalElapsed % (1000 * 60)) / 1000);
    
    const timeDisplay = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Update timer display
    const display = document.querySelector('.timer-display');
    display.textContent = timeDisplay;
    
    // Update browser tab title
    document.title = `${timeDisplay} - Time Tracker`;
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
      elapsedTime += new Date().getTime() - startTime;  // Add the current session to total elapsed time
      toggleHandle.className = 'fas fa-play';
      toggleSwitch.classList.remove('active');
      workingStatus.classList.remove('active');
      // Reset browser tab title when timer stops
      document.title = 'Time Tracker';
    }
  }

  // Add event listener for toggle switch
  document.querySelector('.toggle-switch').addEventListener('click', toggleTimer);

  // Update the log time button handler to require both project and task
  document.querySelector('.log-time-btn').addEventListener('click', () => {
    // Calculate total elapsed time first
    const totalElapsed = elapsedTime + (isRunning ? (new Date().getTime() - startTime) : 0);
    const hours = totalElapsed / (1000 * 60 * 60);
    
    // Validate the time before proceeding
    if (totalElapsed === 0 || isNaN(totalElapsed)) {
      alert('Cannot log zero or invalid time. Please start the timer and log some time first.');
      return;
    }
    
    if (isRunning) {
      toggleTimer(); // Stop the timer first
    }
    
    // Get current project and task
    const project = projectInput.value.trim() || 'General';
    const task = taskInput ? taskInput.value.trim() : '';
    if (!project || !task) {
      alert('Please select both a project and a task.');
      return;
    }
    
    // Create new session with Luxon DateTime
    const newSession = {
      timestamp: luxon.DateTime.now().setZone('Australia/Sydney'),
      hours: hours,
      project: project,
      task: task
    };
    
    // Add to sessions array and save
    sessions.push(newSession);
    saveSessions();
    
    // Reset timer display and elapsed time
    const display = document.querySelector('.timer-display');
    display.textContent = '00:00:00';
    elapsedTime = 0;  // Reset elapsed time
    
    // Clear project and task input
    projectInput.value = '';
    if (taskInput) taskInput.value = '';
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
  
  // Update the manual entry handler to require both project and task
  document.getElementById('addButton').addEventListener('click', () => {
    const dateInputValue = document.getElementById('dateInput').value;
    const projectInputValue = document.getElementById('projectInput')?.value.trim() || 'General';
    const taskInputValue = document.getElementById('taskInput')?.value.trim() || '';
    const hoursInputValue = parseFloat(document.getElementById('hoursInput').value) || 0;
    const minutesInputValue = parseFloat(document.getElementById('minutesInput').value) || 0;
    const totalHours = hoursInputValue + minutesInputValue / 60;
    
    // Validate the time before proceeding
    if (totalHours === 0 || isNaN(totalHours)) {
      alert('Cannot log zero or invalid time. Please enter valid hours or minutes.');
      return;
    }
    if (!projectInputValue || !taskInputValue) {
      alert('Please select both a project and a task.');
      return;
    }
    
    // Create timestamp in Sydney timezone
    const timestamp = dateInputValue 
      ? luxon.DateTime.fromISO(dateInputValue, { zone: 'Australia/Sydney' })
      : luxon.DateTime.now().setZone('Australia/Sydney');
    
    const newSession = { 
      timestamp, 
      hours: totalHours,
      project: projectInputValue,
      task: taskInputValue
    };
    
    sessions.push(newSession);
    saveSessions();
    document.getElementById('manualModal').style.display = 'none';
  });
  
  // Update: Require both project and task for new sessions
  // Assume there are two dropdowns/inputs: projectInput and taskInput
  // If not, create a taskInput next to projectInput

  // Add task input if it doesn't exist
  if (!taskInput) {
    const taskInputElem = document.createElement('input');
    taskInputElem.type = 'text';
    taskInputElem.id = 'taskInput';
    taskInputElem.placeholder = 'Task';
    taskInputElem.style.marginLeft = '10px';
    document.getElementById('projectInput').parentNode.appendChild(taskInputElem);
    taskInput = taskInputElem;
  }

  // When project changes, update task options
  projectInput.addEventListener('input', () => {
    updateTaskOptionsForProject(projectInput.value);
  });

  function updateTaskOptionsForProject(projectName) {
    const project = projects.find(p => p.name === projectName);
    if (!project) return;
    const taskList = project.tasks.map(t => t.name);
    // Optionally, show a datalist for taskInput
    let dataList = document.getElementById('taskList');
    if (!dataList) {
      dataList = document.createElement('datalist');
      dataList.id = 'taskList';
      document.body.appendChild(dataList);
      taskInput.setAttribute('list', 'taskList');
    }
    dataList.innerHTML = '';
    taskList.forEach(taskName => {
      const option = document.createElement('option');
      option.value = taskName;
      dataList.appendChild(option);
    });
  }

  // Update session creation to require both project and task
  const addSessionBtn = document.getElementById('addSessionBtn');
  if (addSessionBtn) {
    addSessionBtn.addEventListener('click', () => {
      const projectName = projectInput.value.trim();
      const taskName = taskInput.value.trim();
      const hours = parseFloat(document.getElementById('hoursInput').value);
      const date = document.getElementById('dateInput').value;
      if (!projectName || !taskName || isNaN(hours) || !date) {
        alert('Please select a project, a task, enter hours, and a date.');
        return;
      }
      const project = projects.find(p => p.name === projectName);
      if (!project || !project.tasks.find(t => t.name === taskName)) {
        alert('Please select a valid project and task.');
        return;
      }
      const timestamp = luxon.DateTime.fromISO(date).setZone('Australia/Sydney').toJSDate();
      const newSession = {
        timestamp,
        hours,
        project: projectName,
        task: taskName
      };
      sessions.push(newSession);
      saveSessions();
      updateAllDisplays();
    });
  }
  
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
  
  function updateCommitChart() {
    const container = document.getElementById('commit-chart');
    if (!container) return;

    // Get current time in Sydney
    const now = luxon.DateTime.now().setZone('Australia/Sydney');
    const year = now.year;

    // Create start and end dates in Sydney timezone
    const startDate = luxon.DateTime.fromObject({ year, month: 1, day: 1 }, { zone: 'Australia/Sydney' });
    const endDate = luxon.DateTime.fromObject({ year, month: 12, day: 31 }, { zone: 'Australia/Sydney' });

    // Generate array of dates for the year
    const dates = [];
    let currentDate = startDate;
    while (currentDate <= endDate) {
      dates.push(currentDate);
      currentDate = currentDate.plus({ days: 1 });
    }

    // Calculate commits for each day
    const commits = dates.map(date => {
      const dayStart = date.startOf('day');
      const dayEnd = date.endOf('day');
      return sessions.filter(session => {
        return session.timestamp >= dayStart && session.timestamp <= dayEnd;
      }).length;
    });

    // Find max commits for scaling
    const maxCommits = Math.max(...commits);

    // Create chart
    container.innerHTML = '';
    commits.forEach((count, index) => {
      const day = document.createElement('div');
      day.className = 'commit-day';
      
      // Calculate intensity based on number of commits
      if (count === 0) {
        day.classList.add('zero');
      } else if (count <= 1) {
        day.classList.add('low');
      } else if (count <= 2) {
        day.classList.add('medium');
      } else if (count <= 3) {
        day.classList.add('three-four');
      } else {
        day.classList.add('high');
      }

      // Add tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = `${dates[index].toFormat('MMM d')}: ${count} commit${count !== 1 ? 's' : ''}`;
      day.appendChild(tooltip);

      container.appendChild(day);
    });
  }
  
  // ===============================
  // Initialization
  // ===============================
  // Load projects first, then sessions and achievements
  loadProjects().then(() => {
    loadSessions();
    loadAchievements();
    document.getElementById('dateInput').value = new Date().toISOString().split('T')[0];
  });

  // Project input and dropdown handling

  // Show dropdown when input is focused
  projectInput.addEventListener('focus', () => {
    updateTaskDropdown();
    taskDropdown.style.display = 'block';
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!projectInput.contains(e.target) && !taskDropdown.contains(e.target)) {
      taskDropdown.style.display = 'none';
    }
  });

  // Filter tasks as user types
  projectInput.addEventListener('input', () => {
    updateTaskDropdown();
  });

  function updateTaskDropdown() {
    const searchTerm = projectInput.value.toLowerCase();
    taskDropdown.innerHTML = '';

    projects.forEach(project => {
      const matchingTasks = project.tasks.filter(task => 
        task.name.toLowerCase().includes(searchTerm)
      );

      if (matchingTasks.length > 0) {
        const projectGroup = document.createElement('div');
        projectGroup.className = 'task-group';

        const projectName = document.createElement('div');
        projectName.className = 'project-name';
        projectName.textContent = project.name;
        projectGroup.appendChild(projectName);

        matchingTasks.forEach(task => {
          const taskItem = document.createElement('div');
          taskItem.className = 'task-item';

          const taskColor = document.createElement('span');
          taskColor.className = 'task-color';
          taskColor.style.backgroundColor = task.color;

          const taskName = document.createElement('span');
          taskName.textContent = task.name;

          taskItem.appendChild(taskColor);
          taskItem.appendChild(taskName);

          // Select task when clicked
          taskItem.addEventListener('click', () => {
            projectInput.value = task.name;
            taskDropdown.style.display = 'none';
          });

          projectGroup.appendChild(taskItem);
        });

        taskDropdown.appendChild(projectGroup);
      }
    });

    // Show/hide dropdown based on content
    taskDropdown.style.display = taskDropdown.children.length > 0 ? 'block' : 'none';
  }
});