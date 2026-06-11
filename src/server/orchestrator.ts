/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './db.js';
import { 
  runPMAgent, 
  runArchitectAgent, 
  runBackendAgent, 
  runFrontendAgent, 
  runQAAgent, 
  runDevOpsAgent,
  hasGeminiKey
} from './gemini.js';

// Global map to avoid concurrent duplicate executions on same project
const runningExecutions = new Map<string, boolean>();

export async function runOrchestration(projectId: string): Promise<void> {
  if (runningExecutions.get(projectId)) {
    console.log(`Execution already in progress for project ${projectId}`);
    return;
  }

  runningExecutions.set(projectId, true);

  // Initialize logs & data cleanup for a fresh run
  db.clearTasksForProject(projectId);
  db.clearMessagesForProject(projectId);
  db.clearFilesForProject(projectId);
  db.clearMemoriesForProject(projectId);
  db.clearLogsForProject(projectId);

  const project = db.getProject(projectId);
  if (!project) {
    runningExecutions.delete(projectId);
    return;
  }

  db.updateProject(projectId, { 
    status: 'planning', 
    currentPhase: 'pm' 
  });

  const exec = db.createExecution({
    projectId,
    phaseId: 'pm',
    status: 'running',
    logs: ['[System] Grounding project requirements...', '[System] Launching software developer team orchestrator.'],
    artifacts: {}
  });

  const addLog = (msg: string, level: 'info' | 'warn' | 'error' = 'info') => {
    db.createLog({
      projectId,
      level,
      source: 'agent_orchestrator',
      message: msg
    });
    // Append to active execution logs
    const currentExecs = db.getExecutions(projectId);
    const activeExec = currentExecs.find(e => e.id === exec.id);
    if (activeExec) {
      db.updateExecution(activeExec.id, {
        logs: [...activeExec.logs, `[${new Date().toLocaleTimeString()}] ${msg}`]
      });
    }
  };

  addLog(`Starting team simulation for: "${project.name}"`);

  // Guard API Key
  if (!hasGeminiKey()) {
    const errMsg = 'Missing GEMINI_API_KEY. Please configure your secrets in the AI Studio side panel to start generating agent flows.';
    addLog(errMsg, 'error');
    db.updateProject(projectId, { status: 'failed', currentPhase: 'idle' });
    db.updateExecution(exec.id, { status: 'failed' });
    runningExecutions.delete(projectId);
    return;
  }

  try {
    // ==========================================
    // PHASE 1: PRODUCT MANAGER AGENT (Patricia)
    // ==========================================
    addLog(`Contacting Product Manager Agent (Patricia) to analyze scope and plan tasks...`);
    db.updateProject(projectId, { currentPhase: 'pm', status: 'planning' });
    
    const pmResult = await runPMAgent(project.requirements, project.name);
    
    addLog(`Received Product Requirement Document (PRD) from Patricia.`);
    
    // Save PRD file
    db.createOrUpdateFile({
      projectId,
      path: 'requirements/PRD.md',
      content: pmResult.prd,
      fileType: 'doc',
      language: 'markdown',
      createdPhase: 'pm'
    });

    // Save Patricia's update to chat
    db.createMessage({
      projectId,
      executionId: exec.id,
      senderId: 'pm',
      senderName: 'Patricia (PM)',
      content: `Hello Team! I have analyzed the customer requirements for our new project **"${project.name}"** and authored a comprehensive Product Requirement Document (PRD).

I have saved our core specs into \`requirements/PRD.md\`. Additionally, I have mapped out our implementation roadmap with ${pmResult.tasks.length} standard engineering tasks. Arthur, please review our PRD and architectural boundaries so Ben and Fiona can begin coding!`,
    });

    // Write tasks to database
    let index = 1;
    for (const t of pmResult.tasks) {
      db.createTask({
        projectId,
        title: t.title,
        description: t.description,
        assignedAgentId: t.assignedAgentId,
        status: t.assignedAgentId === 'pm' ? 'completed' : 'pending',
        priority: t.priority,
        order: index++,
        dependencies: t.dependencies || []
      });
    }

    addLog(`Parsed Patricia's milestone roadmap: created ${pmResult.tasks.length} task items.`);

    // ==========================================
    // PHASE 2: SYSTEM ARCHITECT AGENT (Arthur)
    // ==========================================
    addLog(`Handing off to System Architect Agent (Arthur) for DB & schema outline...`);
    db.updateProject(projectId, { currentPhase: 'architect', status: 'designing' });
    
    // Update active architect tasks to 'in_progress' and PM tasks to 'completed'
    const pmTasks = db.getTasks(projectId).filter(t => t.assignedAgentId === 'pm');
    pmTasks.forEach(t => db.updateTask(t.id, { status: 'completed' }));
    
    const archTasks = db.getTasks(projectId).filter(t => t.assignedAgentId === 'architect');
    archTasks.forEach(t => db.updateTask(t.id, { status: 'in_progress' }));

    const archResult = await runArchitectAgent(project.name, pmResult.prd, project.requirements);
    
    addLog(`Arthur completed database indexing and API design charts.`);
    
    // Save Architecture doc
    db.createOrUpdateFile({
      projectId,
      path: 'specs/Architecture.md',
      content: archResult.architectureMarkdown,
      fileType: 'doc',
      language: 'markdown',
      createdPhase: 'architect'
    });

    // Populate decisions in MemoryStore
    for (const d of archResult.decisions) {
      db.createMemory({
        projectId,
        agentId: 'architect',
        key: d.key,
        value: d.value,
        type: d.type
      });
      addLog(`Architect Memory Registered: [${d.key} -> ${d.value}]`);
    }

    db.createMessage({
      projectId,
      executionId: exec.id,
      senderId: 'architect',
      senderName: 'Arthur (Architect)',
      content: `Greetings team, I have completed the architectural definitions and endpoint schemas for **"${project.name}"**.
      
I've designed a clean relational mapping and detailed our API specifications in \`specs/Architecture.md\`. We will proceed with a backend API framework. Ben, you have the green light to write the FastAPI models and services! Fiona, you can start building the React view components following the rest interfaces. Let's make this solid.`,
    });

    archTasks.forEach(t => db.updateTask(t.id, { status: 'completed' }));

    // ==========================================
    // PHASE 3: BACKEND DEVELOPER AGENT (Ben)
    // ==========================================
    addLog(`Assigning tasks to Backend Engineer Agent (Ben)...`);
    db.updateProject(projectId, { currentPhase: 'backend', status: 'developing' });
    
    const backendTasks = db.getTasks(projectId).filter(t => t.assignedAgentId === 'backend');
    backendTasks.forEach(t => db.updateTask(t.id, { status: 'in_progress' }));

    const memoryString = db.getMemories(projectId)
      .map(m => `${m.key}: ${m.value} (${m.type})`)
      .join('\n');

    const backendResult = await runBackendAgent(
      project.name, 
      pmResult.prd, 
      archResult.architectureMarkdown, 
      memoryString
    );

    addLog(`Ben generated ${backendResult.files.length} Python modules successfully.`);

    // Write backend files to DB
    for (const f of backendResult.files) {
      db.createOrUpdateFile({
        projectId,
        path: f.path,
        content: f.content,
        fileType: f.fileType,
        language: f.language,
        createdPhase: 'backend'
      });
      addLog(`Compiled source module: ${f.path}`);
    }

    db.createMessage({
      projectId,
      executionId: exec.id,
      senderId: 'backend',
      senderName: 'Ben (Backend)',
      content: `Hey everyone! I have fully generated our server modules utilizing Python and FastAPI. 

I've placed the core API loops, database models and base config inside:
${backendResult.files.map(f => `- \`${f.path}\``).join('\n')}

All endpoints are fully defined, schema checked, and connected to SQLAlchemy! Fiona, here is our full backend file layout. You can integrate React component endpoints dynamically. Quentin, the APIs are ready for testing!`,
    });

    backendTasks.forEach(t => db.updateTask(t.id, { status: 'completed' }));

    // ==========================================
    // PHASE 4: FRONTEND DEVELOPER AGENT (Fiona)
    // ==========================================
    addLog(`Handing off visual requirements to Frontend Engineer Agent (Fiona)...`);
    db.updateProject(projectId, { currentPhase: 'frontend', status: 'developing' });

    const frontendTasks = db.getTasks(projectId).filter(t => t.assignedAgentId === 'frontend');
    frontendTasks.forEach(t => db.updateTask(t.id, { status: 'in_progress' }));

    const backendFilesDescription = backendResult.files.map(f => `Path: ${f.path}\nContent snippet:\n${f.content.slice(0, 300)}...`).join('\n\n');

    const frontendResult = await runFrontendAgent(
      project.name,
      pmResult.prd,
      archResult.architectureMarkdown,
      backendFilesDescription
    );

    addLog(`Fiona generated ${frontendResult.files.length} UI components.`);

    for (const f of frontendResult.files) {
      db.createOrUpdateFile({
        projectId,
        path: f.path,
        content: f.content,
        fileType: f.fileType,
        language: f.language,
        createdPhase: 'frontend'
      });
      addLog(`Created UI Component: ${f.path}`);
    }

    db.createMessage({
      projectId,
      executionId: exec.id,
      senderId: 'frontend',
      senderName: 'Fiona (Frontend)',
      content: `Hi guys! I have built our user-facing dashboard components!
      
I structured the interfaces:
${frontendResult.files.map(f => `- \`${f.path}\``).join('\n')}

I used Tailwind CSS layout patterns with rich responsive forms, tables, and visualization components. Connecting to Ben's FastAPI server is modular and clear! Quentin, I'm ready for the deployment test workflows. Let me know if you hit any visual bugs.`,
    });

    frontendTasks.forEach(t => db.updateTask(t.id, { status: 'completed' }));

    // ==========================================
    // PHASE 5: QA / TESTING SPECIALIST (Quentin)
    // ==========================================
    addLog(`Summoning QA Analyst Agent (Quentin) to write automated integration tests...`);
    db.updateProject(projectId, { currentPhase: 'qa', status: 'testing' });

    const qaTasks = db.getTasks(projectId).filter(t => t.assignedAgentId === 'qa');
    qaTasks.forEach(t => db.updateTask(t.id, { status: 'in_progress' }));

    const backendCodeSummary = backendResult.files.map(f => `### ${f.path}\n\`\`\`python\n${f.content}\n\`\`\``).join('\n\n');
    const frontendCodeSummary = frontendResult.files.map(f => `### ${f.path}\n\`\`\`tsx\n${f.content}\n\`\`\``).join('\n\n');

    const qaResult = await runQAAgent(
      project.name,
      pmResult.prd,
      backendCodeSummary,
      frontendCodeSummary
    );

    addLog(`Quentin compiled ${qaResult.files.length} unit tests and automation assertions.`);

    for (const f of qaResult.files) {
      db.createOrUpdateFile({
        projectId,
        path: f.path,
        content: f.content,
        fileType: f.fileType,
        language: f.language,
        createdPhase: 'qa'
      });
      addLog(`Compiled test suite: ${f.path}`);
    }

    db.createMessage({
      projectId,
      executionId: exec.id,
      senderId: 'qa',
      senderName: 'Quentin (QA)',
      content: `Hello everyone, testing phase has run successfully! 

I have written automated test structures in:
${qaResult.files.map(f => `- \`${f.path}\``).join('\n')}

I have configured mock request sessions, test parameters, and checked response code assertions. PM Patricia and Ben, your backend code is passing standard checks perfectly! Diana, you are clear to containerize the services.`,
    });

    qaTasks.forEach(t => db.updateTask(t.id, { status: 'completed' }));

    // ==========================================
    // PHASE 6: DEVOPS ENGINEER AGENT (Diana)
    // ==========================================
    addLog(`Initiating DevOps Agent (Diana) to wrap up Docker configurations...`);
    db.updateProject(projectId, { currentPhase: 'devops', status: 'deploying' });

    const devopsTasks = db.getTasks(projectId).filter(t => t.assignedAgentId === 'devops');
    devopsTasks.forEach(t => db.updateTask(t.id, { status: 'in_progress' }));

    const currentFilesSummary = db.getFiles(projectId).map(f => f.path).join(', ');

    const devopsResult = await runDevOpsAgent(
      project.name,
      pmResult.prd,
      currentFilesSummary
    );

    addLog(`Diana created ${devopsResult.files.length} Docker environment setup files.`);

    for (const f of devopsResult.files) {
      db.createOrUpdateFile({
        projectId,
        path: f.path,
        content: f.content,
        fileType: f.fileType,
        language: f.language,
        createdPhase: 'devops'
      });
      addLog(`Created configuration setup: ${f.path}`);
    }

    db.createMessage({
      projectId,
      executionId: exec.id,
      senderId: 'devops',
      senderName: 'Diana (DevOps)',
      content: `Alright Team! The workspace is containerized. 

I've generated the complete system environments in:
${devopsResult.files.map(f => `- \`${f.path}\``).join('\n')}

Our backend is configured on a slim, production-ready Python base with hot-reloading routes. Our database container is fully configured with standard environment values. PM, our project is fully polished and ready to deploy!`,
    });

    devopsTasks.forEach(t => db.updateTask(t.id, { status: 'completed' }));

    // Complete Execution
    db.updateProject(projectId, { 
      status: 'completed', 
      currentPhase: 'idle' 
    });

    db.updateExecution(exec.id, { 
      status: 'completed',
      artifacts: {
        prd: 'requirements/PRD.md',
        architecture: 'specs/Architecture.md',
        backendCode: backendResult.files.map(f => f.path),
        frontendCode: frontendResult.files.map(f => f.path),
        testSuites: qaResult.files.map(f => f.path),
        dockerConfigs: devopsResult.files.map(f => f.path)
      }
    });

    addLog(`System Multi-Agent Simulation workflow succeeded for "${project.name}"!`);

  } catch (err: any) {
    const errorStr = err?.message || JSON.stringify(err);
    addLog(`An error occurred during workflow simulation run: ${errorStr}`, 'error');
    db.updateProject(projectId, { status: 'failed', currentPhase: 'idle' });
    db.updateExecution(exec.id, { status: 'failed' });
  } finally {
    runningExecutions.delete(projectId);
  }
}
