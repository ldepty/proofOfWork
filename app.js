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

  function getDayProjects(date) {
    // Convert input date to Luxon DateTime in Sydney timezone if it's not already
    const sydneyDate = luxon.DateTime.isDateTime(date) 
      ? date.setZone('Australia/Sydney')
      : luxon.DateTime.fromJSDate(date).setZone('Australia/Sydney');
    
    const sydneyStart = sydneyDate.startOf('day');
    const sydneyEnd = sydneyDate.endOf('day');

    const daySessions = sessions.filter(session => {
      return session.timestamp >= sydneyStart && session.timestamp <= sydneyEnd;
    });

    // Get unique project-task combinations
    const projectTasks = new Set();
    daySessions.forEach(session => {
      if (session.project && session.task) {
        projectTasks.add(`${session.project} - ${session.task}`);
      }
    });

    return Array.from(projectTasks);
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
      // session.timestamp is already a Luxon DateTime object
      const dateKey = session.timestamp.setZone('Australia/Sydney').toISODate();
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + session.hours;
    });
    let maxHours = 0;
    let bestDate = null;
    for (const day in dailyTotals) {
      if (dailyTotals[day] > maxHours) {
        maxHours = dailyTotals[day];
        bestDate = day;
      }
    }
    return { hours: maxHours, date: bestDate };
  }
  
  function calculateAvgWorkDay() {
    const dailyTotals = {};
    sessions.forEach(session => {
      // session.timestamp is already a Luxon DateTime object
      const dayOfWeek = session.timestamp.setZone('Australia/Sydney').weekday;
      // Monday=1 ... Friday=5
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateKey = session.timestamp.setZone('Australia/Sydney').toISODate();
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

    // Get most recent session for each project
    const projectLastActivity = {};
    sessions.forEach(session => {
      const projectName = session.project || 'General';
      if (!projectLastActivity[projectName] || session.timestamp > projectLastActivity[projectName]) {
        projectLastActivity[projectName] = session.timestamp;
      }
    });

    // Sort projects by most recent activity
    const sortedProjectNames = Object.keys(totals).sort((a, b) => {
      const aLastActivity = projectLastActivity[a] || new Date(0);
      const bLastActivity = projectLastActivity[b] || new Date(0);
      return bLastActivity - aLastActivity; // Most recent first
    });

    // Create and append project bars in sorted order
    sortedProjectNames.forEach(projectName => {
      const project = projects.find(p => p.name === projectName);
      const color = project ? project.color : '#888';
      const projectHours = Object.values(totals[projectName]).reduce((a, b) => a + b, 0);
      
      if (projectHours > 0) {
        const percentage = totalHours > 0 ? (projectHours / totalHours) * 100 : 0;
        
        // Create project container
        const projectContainer = document.createElement('div');
        projectContainer.className = 'project-container';
        
        // Create project header with dropdown toggle
        const projectHeader = document.createElement('div');
        projectHeader.className = 'project-header collapsible';
        projectHeader.innerHTML = `
          <div class="project-name">
            <i class="fas fa-chevron-right dropdown-icon"></i>
            <span class="project-color-dot" style="background-color: ${color}"></span>
            ${projectName}
          </div>
          <div class="project-hours" style="border-left-color: ${color}">${formatHoursMinutes(projectHours)}</div>
        `;
        
        // Create tasks container (initially hidden)
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'tasks-container';
        tasksContainer.style.display = 'none';
        
        // Add tasks under project
        Object.keys(totals[projectName]).forEach(taskName => {
          const taskHours = totals[projectName][taskName];
          const task = project && project.tasks && Array.isArray(project.tasks) ? project.tasks.find(t => t.name === taskName) : null;
          const taskColor = task ? task.color : '#aaa';

          if (taskHours > 0) {
            const taskBar = document.createElement('div');
            taskBar.className = 'project-bar task-bar';
            
            const taskPercentage = projectHours > 0 ? (taskHours / projectHours) * 100 : 0;
            
            taskBar.innerHTML = `
              <div class="task-header">
                <div class="project-name">
                  <span class="project-color-dot" style="background-color: ${taskColor}"></span>
                  ${taskName}
                </div>
                <div class="task-hours" style="border-left-color: ${taskColor}">${formatHoursMinutes(taskHours)}</div>
              </div>
              <div class="bar-container">
                <div class="bar-fill" style="width: ${taskPercentage}%; background-color: ${taskColor}"></div>
              </div>
            `;
            
            tasksContainer.appendChild(taskBar);
          }
        });
        
        // Add click handler for dropdown toggle
        projectHeader.addEventListener('click', () => {
          const icon = projectHeader.querySelector('.dropdown-icon');
          const isExpanded = tasksContainer.style.display !== 'none';
          
          if (isExpanded) {
            tasksContainer.style.display = 'none';
            icon.className = 'fas fa-chevron-right dropdown-icon';
          } else {
            tasksContainer.style.display = 'block';
            icon.className = 'fas fa-chevron-down dropdown-icon';
          }
        });
        
        // Add to container
        projectContainer.appendChild(projectHeader);
        projectContainer.appendChild(tasksContainer);
        projectsContainer.appendChild(projectContainer);
      }
    });
  }

  // Update the project options list with tasks
  function updateProjectOptions() {
    const projectSet = new Set();
    
    // Add all task names from projects
    projects.forEach(project => {
      projectSet.add(project.name);
      if (project.tasks && Array.isArray(project.tasks)) {
        project.tasks.forEach(task => {
          projectSet.add(`${project.name} - ${task.name}`);
        });
      }
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
    
    // Update best day and average work day
    const bestDayData = calculateBestDay();
    const avgWorkDayHours = calculateAvgWorkDay();
    
    document.getElementById('bestDay').textContent = formatHoursMinutes(bestDayData.hours);
    
    // Update best day date
    const bestDayDateElement = document.getElementById('bestDayDate');
    if (bestDayDateElement && bestDayData.date) {
      const formattedDate = luxon.DateTime.fromISO(bestDayData.date).toFormat('MMM d, yyyy');
      bestDayDateElement.textContent = formattedDate;
    } else if (bestDayDateElement) {
      bestDayDateElement.textContent = '';
    }
    
    document.getElementById('avgWorkDay').textContent = formatHoursMinutes(avgWorkDayHours);

    // Update calendar
    generateCalendar();

    // Update project bars
    updateProjects();

    // Update current week and year overview
    updateCurrentWeek();
    updateYearOverview();

    // Update commit chart
    updateCommitChart();

    console.log('All displays updated');
  }
  
  function updateCurrentWeek() {
    const container = document.getElementById('seven-days-content');
    container.innerHTML = '';
    
    const now = luxon.DateTime.now().setZone('Australia/Sydney');
    
    // Get the start of the current week (Monday)
    const weekStart = now.startOf('week');
    
    // Calculate week number (1-52)
    const weekNumber = Math.ceil(now.ordinal / 7);
    
    // Update the header to show current week
    const headerElement = document.querySelector('#last-seven-days h2');
    if (headerElement) {
      headerElement.textContent = `Week ${weekNumber} of 52`;
    }
    
    // Create array of days for the current week (Monday to Sunday)
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = weekStart.plus({ days: i });
      const dayStart = date.startOf('day');
      const dayEnd = date.endOf('day');
      
      // Calculate total hours for this day
      const dayHours = sessions
        .filter(session => {
          const sessionTime = session.timestamp;
          return sessionTime >= dayStart && sessionTime <= dayEnd;
        })
        .reduce((sum, session) => sum + session.hours, 0);
      
      // Get unique projects for this day with their colors
      const dayProjects = Array.from(new Set(sessions
        .filter(session => {
          const sessionTime = session.timestamp;
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
        projects: dayProjects,
        isToday: date.hasSame(now, 'day')
      });
    }
    
    // Create rows for each day
    days.forEach((day, index) => {
      const row = document.createElement('div');
      row.className = 'day-row';
      
      // Remove bottom border for the last day (Sunday) since we have a separator
      if (index === 6) {
        row.style.borderBottom = 'none';
      }
      
      const dayName = document.createElement('div');
      dayName.className = 'day-name';
      dayName.textContent = day.isToday ? 'Today' : day.date.toFormat('cccc');
      
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
      
      const dayHours = document.createElement('div');
      dayHours.className = 'day-hours';
      dayHours.textContent = formatHoursMinutes(day.hours);
      
      row.appendChild(dayName);
      row.appendChild(projectName);
      row.appendChild(dayHours);
      container.appendChild(row);
    });
    
    // Add separator line
    const separator = document.createElement('div');
    separator.style.borderTop = '2px solid #222';
    separator.style.margin = '15px 0';
    container.appendChild(separator);
    
    // Add last 4 weeks summary
    for (let i = 1; i <= 4; i++) {
      const previousWeekStart = weekStart.minus({ weeks: i });
      const previousWeekEnd = previousWeekStart.endOf('week');
      
      // Calculate total hours for the previous week
      const weekHours = sessions
        .filter(session => {
          const sessionTime = session.timestamp;
          return sessionTime >= previousWeekStart && sessionTime <= previousWeekEnd;
        })
        .reduce((sum, session) => sum + session.hours, 0);
      
      const previousWeekNumber = Math.ceil(previousWeekStart.ordinal / 7);
      
      const weekRow = document.createElement('div');
      weekRow.className = 'day-row';
      
      const weekName = document.createElement('div');
      weekName.className = 'day-name';
      weekName.textContent = `Week ${previousWeekNumber}`;
      
      const weekProject = document.createElement('div');
      weekProject.className = 'day-project';
      weekProject.textContent = '--------';
      
      const weekHoursElement = document.createElement('div');
      weekHoursElement.className = 'day-hours';
      weekHoursElement.textContent = formatHoursMinutes(weekHours);
      
      weekRow.appendChild(weekName);
      weekRow.appendChild(weekProject);
      weekRow.appendChild(weekHoursElement);
      container.appendChild(weekRow);
    }
  }

  function updateYearOverview() {
    const container = document.getElementById('year-overview-content');
    container.innerHTML = '';
    
    const now = luxon.DateTime.now().setZone('Australia/Sydney');
    const currentYear = now.year;
    const currentMonth = now.month;
    
    // Create array of months for the current year
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const monthStart = luxon.DateTime.fromObject({ year: currentYear, month }, { zone: 'Australia/Sydney' }).startOf('month');
      const monthEnd = luxon.DateTime.fromObject({ year: currentYear, month }, { zone: 'Australia/Sydney' }).endOf('month');
      
      // Calculate total hours for this month
      const monthSessions = sessions.filter(session => {
        const sessionTime = session.timestamp;
        return sessionTime >= monthStart && sessionTime <= monthEnd;
      });
      
      const monthHours = monthSessions.reduce((sum, session) => sum + session.hours, 0);
      
      // Only include months that have time logged
      if (monthHours > 0) {
        // Get unique projects for this month (only project names, no tasks)
        const uniqueProjects = new Map();
        monthSessions.forEach(session => {
          const projectName = session.project || 'General';
          if (!uniqueProjects.has(projectName)) {
            const projectData = projects.find(p => p.name === projectName);
            uniqueProjects.set(projectName, {
              name: projectName,
              color: projectData ? projectData.color : '#9370DB'
            });
          }
        });
        
        const monthProjects = Array.from(uniqueProjects.values());
        
        months.push({
          month,
          hours: monthHours,
          projects: monthProjects,
          isCurrentMonth: month === currentMonth
        });
      }
    }
    
    // Sort months by most recent first (current month at top)
    months.sort((a, b) => b.month - a.month);
    
    // Create rows for each month
    months.forEach(monthData => {
      const row = document.createElement('div');
      row.className = 'month-row';
      
      const monthName = document.createElement('div');
      monthName.className = 'month-name';
      
      const monthText = luxon.DateTime.fromObject({ month: monthData.month }, { zone: 'Australia/Sydney' }).toFormat('MMMM');
      
      if (monthData.isCurrentMonth) {
        monthName.innerHTML = `
          <div>${monthText}</div>
          <div class="current-indicator">
            <span class="current-dot"></span>
            <span class="current-text">current</span>
          </div>
        `;
      } else {
        monthName.textContent = monthText;
      }
      
      const projectName = document.createElement('div');
      projectName.className = 'month-project';
      if (monthData.projects.length > 0) {
        projectName.innerHTML = monthData.projects.map(project => `
          <span>
            <span class="project-color-dot" style="background-color: ${project.color}"></span>
            ${project.name}
          </span>
        `).join(', ');
      } else {
        projectName.textContent = '--------';
      }
      
      const monthHours = document.createElement('div');
      monthHours.className = 'month-hours';
      monthHours.textContent = formatHoursMinutes(monthData.hours);
      
      row.appendChild(monthName);
      row.appendChild(projectName);
      row.appendChild(monthHours);
      container.appendChild(row);
    });
  }

  function updateCommitChart() {
    // This function is called but not implemented - placeholder for now
    console.log('Update commit chart called');
  }

  // ===============================
  // Timer and Session Management
  // ===============================
  let isRunning = false;
  let startTime = null;
  let currentSession = null;
  let intervalId = null;

  const toggleSwitch = document.querySelector('.toggle-switch');
  const timerDisplay = document.querySelector('.timer-display');
  const logTimeBtn = document.querySelector('.log-time-btn');
  const workingStatus = document.querySelector('.working-status');

  // Initialize timer display
  function updateTimerDisplay() {
    if (!isRunning || !startTime) {
      timerDisplay.textContent = '00:00:00';
      return;
    }

    const now = luxon.DateTime.now().setZone('Australia/Sydney');
    const elapsed = now.diff(startTime, ['hours', 'minutes', 'seconds']);
    
    const hours = Math.floor(elapsed.hours);
    const minutes = Math.floor(elapsed.minutes);
    const seconds = Math.floor(elapsed.seconds);
    
    timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Toggle timer on/off
  toggleSwitch.addEventListener('click', () => {
    if (isRunning) {
      // Stop timer
      isRunning = false;
      toggleSwitch.classList.remove('active');
      workingStatus.classList.remove('active');
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      logTimeBtn.disabled = false;
    } else {
      // Start timer
      isRunning = true;
      startTime = luxon.DateTime.now().setZone('Australia/Sydney');
      toggleSwitch.classList.add('active');
      workingStatus.classList.add('active');
      intervalId = setInterval(updateTimerDisplay, 1000);
      logTimeBtn.disabled = true;
    }
  });

  // Log time button
  logTimeBtn.addEventListener('click', () => {
    const projectValue = document.getElementById('projectInput').value.trim();
    const taskValue = document.getElementById('taskInput').value.trim();
    
    if (!projectValue || !taskValue) {
      alert('Please enter both project and task names');
      return;
    }

    // Calculate elapsed time
    const now = luxon.DateTime.now().setZone('Australia/Sydney');
    const elapsed = now.diff(startTime, 'hours');
    const hours = elapsed.hours + (elapsed.minutes / 60);

    // Create new session
    const newSession = {
      timestamp: startTime.toISO(),
      hours: hours,
      project: projectValue,
      task: taskValue
    };

    sessions.push(newSession);
    saveSessions();
    
    // Reset timer
    isRunning = false;
    toggleSwitch.classList.remove('active');
    workingStatus.classList.remove('active');
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    logTimeBtn.disabled = false;
    timerDisplay.textContent = '00:00:00';
  });

  // ===============================
  // Task Dropdown Functionality
  // ===============================
  let taskDropdownTimeout;

  taskInput.addEventListener('input', () => {
    clearTimeout(taskDropdownTimeout);
    const query = taskInput.value.toLowerCase();
    
    if (query.length < 2) {
      taskDropdown.style.display = 'none';
      return;
    }

    taskDropdownTimeout = setTimeout(() => {
      const matchingTasks = [];
      
      // Search through projects and their tasks
      projects.forEach(project => {
        if (project.name.toLowerCase().includes(query)) {
          matchingTasks.push({
            name: project.name,
            color: project.color,
            type: 'project'
          });
        }
        
        if (project.tasks && Array.isArray(project.tasks)) {
          project.tasks.forEach(task => {
            if (task.name.toLowerCase().includes(query)) {
              matchingTasks.push({
                name: `${project.name} - ${task.name}`,
                color: task.color,
                type: 'task'
              });
            }
          });
        }
      });

      // Also search through existing sessions
      sessions.forEach(session => {
        const projectTask = `${session.project} - ${session.task}`;
        if (projectTask.toLowerCase().includes(query) && 
            !matchingTasks.find(t => t.name === projectTask)) {
          matchingTasks.push({
            name: projectTask,
            color: '#9370DB',
            type: 'session'
          });
        }
      });

      displayTaskDropdown(matchingTasks);
    }, 300);
  });

  function displayTaskDropdown(tasks) {
    taskDropdown.innerHTML = '';
    
    if (tasks.length === 0) {
      taskDropdown.style.display = 'none';
      return;
    }

    // Group tasks by project
    const groupedTasks = {};
    tasks.forEach(task => {
      const [projectName, taskName] = task.name.includes(' - ') ? task.name.split(' - ') : [task.name, ''];
      if (!groupedTasks[projectName]) {
        groupedTasks[projectName] = [];
      }
      groupedTasks[projectName].push({ ...task, taskName });
    });

    Object.keys(groupedTasks).forEach(projectName => {
      const projectGroup = document.createElement('div');
      projectGroup.className = 'task-group';
      
      const projectHeader = document.createElement('div');
      projectHeader.className = 'project-name';
      projectHeader.textContent = projectName;
      projectGroup.appendChild(projectHeader);

      groupedTasks[projectName].forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';
        taskItem.innerHTML = `
          <span class="task-color" style="background-color: ${task.color}"></span>
          <span>${task.taskName || task.name}</span>
        `;
        
        taskItem.addEventListener('click', () => {
          const [project, taskName] = task.name.includes(' - ') ? task.name.split(' - ') : [task.name, ''];
          document.getElementById('projectInput').value = project;
          document.getElementById('taskInput').value = taskName || project;
          taskDropdown.style.display = 'none';
        });
        
        projectGroup.appendChild(taskItem);
      });

      taskDropdown.appendChild(projectGroup);
    });

    taskDropdown.style.display = 'block';
  }

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!taskInput.contains(e.target) && !taskDropdown.contains(e.target)) {
      taskDropdown.style.display = 'none';
    }
  });

  // ===============================
  // Manual Session Entry
  // ===============================
  const manualSessionLink = document.getElementById('manualSessionLink');
  const manualModal = document.getElementById('manualModal');
  const closeModal = document.getElementById('closeModal');
  const addButton = document.getElementById('addButton');

  manualSessionLink.addEventListener('click', (e) => {
    e.preventDefault();
    manualModal.style.display = 'block';
    
    // Set today's date as default
    const today = luxon.DateTime.now().setZone('Australia/Sydney').toISODate();
    document.getElementById('dateInput').value = today;
  });

  closeModal.addEventListener('click', () => {
    manualModal.style.display = 'none';
  });

  addButton.addEventListener('click', () => {
    const date = document.getElementById('dateInput').value;
    const project = document.getElementById('projectInput').value;
    const task = document.getElementById('taskInput').value;
    const hours = parseFloat(document.getElementById('hoursInput').value) || 0;
    const minutes = parseFloat(document.getElementById('minutesInput').value) || 0;
    
    const totalHours = hours + (minutes / 60);
    
    if (date && project && task && totalHours > 0) {
      const sessionDate = luxon.DateTime.fromISO(date, { zone: 'Australia/Sydney' });
      
      const newSession = {
        timestamp: sessionDate.toISO(),
        hours: totalHours,
        project: project,
        task: task
      };
      
      sessions.push(newSession);
      saveSessions();
      manualModal.style.display = 'none';
      
      // Clear inputs
      document.getElementById('dateInput').value = '';
      document.getElementById('projectInput').value = '';
      document.getElementById('taskInput').value = '';
      document.getElementById('hoursInput').value = '';
      document.getElementById('minutesInput').value = '';
    } else {
      alert('Please fill in all fields with valid values');
    }
  });



  // ===============================
  // Initialize Application
  // ===============================
  
  // Load data and initialize displays
  loadSessions();
  loadProjects();
  
  // Update timer display every second when running
  setInterval(() => {
    if (isRunning) {
      updateTimerDisplay();
    }
  }, 1000);
});