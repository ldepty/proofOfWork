const fs = require('fs');

// Load data.json and projects.json
const sessions = JSON.parse(fs.readFileSync('data.json', 'utf8'));
const projects = JSON.parse(fs.readFileSync('projects.json', 'utf8'));

// Build a map of task name -> [project names]
const taskToProjects = {};
projects.forEach(project => {
  if (project.tasks && Array.isArray(project.tasks)) {
    project.tasks.forEach(task => {
      if (!taskToProjects[task.name]) taskToProjects[task.name] = [];
      taskToProjects[task.name].push(project.name);
    });
  }
});

const migrated = sessions.map(session => {
  // If already has both project and task, leave as is
  if (session.project && session.task) return session;

  // If only has project (which is actually a task name)
  const taskName = session.project;
  const possibleProjects = taskToProjects[taskName] || [];

  if (possibleProjects.length === 1) {
    // Unique match
    return {
      ...session,
      project: possibleProjects[0],
      task: taskName
    };
  } else if (possibleProjects.length > 1) {
    // Ambiguous, assign to Unknown
    return {
      ...session,
      project: 'Unknown',
      task: taskName
    };
  } else {
    // No match, treat as general/legacy
    return {
      ...session,
      project: 'General',
      task: taskName
    };
  }
});

fs.writeFileSync('data_migrated.json', JSON.stringify(migrated, null, 2));
console.log('Migration complete! Output written to data_migrated.json'); 