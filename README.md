# Multi-Agent Software Team Platform

An interactive full-stack workspace simulation modeling real-time multi-agent communication. Watch specialized AI agents (Patricia (PM), Arthur (Architect), Ben (Backend), Fiona (Frontend), Quentin (QA), and Diana (DevOps)) collaborate on software ideas, formulate specifications, partition roadmaps, and write concrete source files.
#LIVE ON - https://multi-agent-software-team-platform-production.up.railway.app/
---

## 🎨 Creative Architecture & Key Features

1. **Diverse Team Perspectives**:
   * **Patricia (Product Manager)**: Details user experiences, defines requirements, and generates the product requirements document.
   * **Arthur (Architect)**: Evaluates schemas, creates PostgreSQL layouts, and registers critical structural decisions.
   * **Ben (Backend Developer)**: Authors REST routes, configures controllers, and processes API payloads.
   * **Fiona (Frontend Developer)**: Combines UI components, hooks up responsive inputs, and styles layouts.
   * **Quentin (Quality Assurance)**: Authors functional PyTest suites/assertions to verify endpoints.
   * **Diana (DevOps Engineer)**: Creates robust multi-stage Dockerfiles and container configurations.

2. **Sandbox Environments**:
   * Create customized sandbox briefs details.
   * Click **Deploy Team Sim** to initiate agent deliberation.
   * Toggle between the **Engineering Standup**, **Code & Assets Explorer**, and server-level **Control Center**.

3. **Intelligent State Synchronization**:
   * Automatically persists decision memory states, telemetry streams, codebases, and meeting transcripts.

---

## 🚀 Setup & Execution Guide

1. **Install Base Dependencies**:
   ```bash
   npm install
   ```

2. **Add Environment Variables**:
   Create a standard `.env` configuration mapping your credentials:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start Development Environment**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to interact with our team workspace.

4. **Prepare Production Build Bundle**:
   ```bash
   npm run build
   ```
