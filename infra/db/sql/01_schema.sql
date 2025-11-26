CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','manager','user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflows_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(50),
  assigned_to VARCHAR(100),
  due_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_workflow
    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  actor_id INT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  event TEXT,
  status VARCHAR(50),
  duration_ms INT NULL,
  CONSTRAINT fk_logs_task
    FOREIGN KEY (task_id) REFERENCES tasks(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS integrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  credentials TEXT NOT NULL,
  user_id INT NOT NULL,
  CONSTRAINT fk_integrations_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workflow_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workflow_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  when_status VARCHAR(50),
  when_name_contains VARCHAR(120),
  action_type VARCHAR(50) NOT NULL, -- set_status | assign_to | notify_slack
  action_value TEXT,
  cron_expr VARCHAR(120),
  last_run_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rules_workflow
    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
