# Workflow Guide

This guide explains how users and the system move through the major DevLedger workflows.

## 1. Access Workflow

Users enter through either a live session or demo mode.

```mermaid
flowchart TD
    A["Open App"] --> B{"Existing session?"}
    B -->|Yes| C["Load live dashboard"]
    B -->|No| D["Show login page"]
    D --> E{"Choose path"}
    E -->|Sign in| F["Call /api/v1/auth/login"]
    E -->|Demo mode| G["Load demo snapshot"]
    F --> H{"Login success?"}
    H -->|Yes| C
    H -->|No| I["Show login error"]
```

## 2. Authentication Workflow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant DB as MongoDB

    User->>Frontend: Enter email and password
    Frontend->>Backend: POST /api/v1/auth/login
    Backend->>DB: Find user + validate password
    DB-->>Backend: User record
    Backend-->>Frontend: Access token + user payload
    Frontend->>Frontend: Store token locally
    Frontend->>Backend: GET /api/v1/users/me
    Backend-->>Frontend: Current user profile
```

## 3. RBAC Decision Workflow

```mermaid
flowchart TD
    A["Incoming request"] --> B["Authenticate JWT"]
    B --> C{"Valid token?"}
    C -->|No| D["401 Unauthorized"]
    C -->|Yes| E["Extract role and user id"]
    E --> F["Route guard checks role"]
    F --> G{"Role allowed?"}
    G -->|No| H["403 Forbidden"]
    G -->|Yes| I["Service layer checks ownership / membership"]
    I --> J{"Business rule passes?"}
    J -->|No| H
    J -->|Yes| K["Perform action"]
```

## 4. Project Management Workflow

```mermaid
flowchart LR
    A["Create project"] --> B["Assign owner"]
    B --> C["Attach members"]
    C --> D["Track project status"]
    D --> E["Update project details"]
    E --> F["Archive when complete or inactive"]
```

### Project status lifecycle

```mermaid
stateDiagram-v2
    [*] --> PLANNING
    PLANNING --> ACTIVE
    ACTIVE --> ON_HOLD
    ON_HOLD --> ACTIVE
    ACTIVE --> COMPLETED
    COMPLETED --> ARCHIVED
    ON_HOLD --> ARCHIVED
```

## 5. Task Delivery Workflow

```mermaid
stateDiagram-v2
    [*] --> TODO
    TODO --> IN_PROGRESS
    IN_PROGRESS --> IN_REVIEW
    IN_PROGRESS --> BLOCKED
    BLOCKED --> IN_PROGRESS
    IN_REVIEW --> DONE
    IN_REVIEW --> IN_PROGRESS
```

### Task ownership workflow

```mermaid
flowchart TD
    A["Task created"] --> B["Validate project exists"]
    B --> C["Validate creator access"]
    C --> D{"Assignee provided?"}
    D -->|No| E["Save task"]
    D -->|Yes| F["Validate assignee exists"]
    F --> G["Validate assignee belongs to project"]
    G --> E
```

## 6. Dashboard Data Workflow

The dashboard can render from two sources.

```mermaid
flowchart TD
    A["Dashboard load"] --> B{"Demo mode or no token?"}
    B -->|Yes| C["Use demo snapshot"]
    B -->|No| D["Fetch user, projects, stats, tasks"]
    D --> E{"API success?"}
    E -->|Yes| F["Render live dashboard"]
    E -->|No| G["Clear token and fall back to demo snapshot"]
```

## 7. Audit Logging Workflow

```mermaid
sequenceDiagram
    participant Client
    participant Route
    participant Service
    participant Audit as Audit Plugin
    participant DB as MongoDB

    Client->>Route: Write request
    Route->>Service: Perform business action
    Service->>Route: Return updated entity
    Route->>Audit: Attach audit context
    Audit->>DB: Store audit log entry
```

## 8. Deployment Workflow

```mermaid
flowchart TD
    A["Push changes to GitHub"] --> B["Deploy backend to Render"]
    B --> C["Verify /health and auth"]
    C --> D["Deploy frontend to Vercel"]
    D --> E["Set VITE_API_URL"]
    E --> F["Run smoke tests"]
    F --> G["Release ready"]
```

## Workflow Notes

- Demo mode is intentional, not a fallback accident.
- Live mode depends on a valid token and reachable backend.
- RBAC is enforced at both route and service levels.
- Projects and tasks are the core business workflows.
- Audit logging is a supporting workflow that records sensitive actions.
