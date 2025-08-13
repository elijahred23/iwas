-- 02_seed.sql  (idempotent bulk seed)
-- === Vars ===
SET @ADMIN_EMAIL := 'elijah@example.com';
SET @ADMIN_HASH  := 'scrypt:32768:8:1$NiKtNjszc4HtW3XZ$ddf906cce53d98da6d6afed899e795c7c8637d27dc1a1b30951204408dfda1b6111759c63905a151d32850b94bd40dc3a92d716c91c8bbf40ef2fb8e07fc447f';
-- we'll use the same hash for all dummy users so their password is `changeme`
SET @CHANGEME := @ADMIN_HASH;

-- === Users ===
INSERT INTO users (name, email, password_hash, role)
VALUES 
  ('Elijah Proctor', @ADMIN_EMAIL, @ADMIN_HASH, 'admin'),
  ('Ava Morgan',      'ava@example.com',      @CHANGEME, 'manager'),
  ('Noah Patel',      'noah@example.com',     @CHANGEME, 'user'),
  ('Liam Chen',       'liam@example.com',     @CHANGEME, 'user'),
  ('Mia Rodriguez',   'mia@example.com',      @CHANGEME, 'user'),
  ('Sophia Nguyen',   'sophia@example.com',   @CHANGEME, 'manager'),
  ('James Kim',       'james@example.com',    @CHANGEME, 'user'),
  ('Olivia Davis',    'olivia@example.com',   @CHANGEME, 'user'),
  ('Ethan Johnson',   'ethan@example.com',    @CHANGEME, 'user'),
  ('Isabella Martinez','isabella@example.com',@CHANGEME, 'user'),
  ('William Thompson','william@example.com',  @CHANGEME, 'user'),
  ('Amelia Clark',    'amelia@example.com',   @CHANGEME, 'user'),
  ('Lucas Wright',    'lucas@example.com',    @CHANGEME, 'user'),
  ('Harper Lewis',    'harper@example.com',   @CHANGEME, 'user'),
  ('Benjamin Hall',   'benjamin@example.com', @CHANGEME, 'user'),
  -- additional users for richer data
  ('Charlotte Edwards', 'charlotte@example.com', @CHANGEME, 'user'),
  ('Henry Turner',      'henry@example.com',      @CHANGEME, 'user'),
  ('Emily Cooper',      'emily@example.com',      @CHANGEME, 'user'),
  ('Michael Scott',     'michael@example.com',    @CHANGEME, 'manager'),
  ('Sarah Lee',         'sarah@example.com',      @CHANGEME, 'user'),
  ('David King',        'david@example.com',      @CHANGEME, 'user'),
  ('Grace Miller',      'grace@example.com',      @CHANGEME, 'user'),
  ('Daniel Moore',      'daniel@example.com',     @CHANGEME, 'user'),
  ('Sophia Brown',      'sophiab@example.com',    @CHANGEME, 'manager'),
  ('Oliver Clark',      'oliver@example.com',     @CHANGEME, 'user'),
  ('Amelia Baker',      'ameliab@example.com',    @CHANGEME, 'user'),
  ('Lucas Turner',      'lucast@example.com',     @CHANGEME, 'user'),
  ('Lily Johnson',      'lily@example.com',       @CHANGEME, 'user'),
  ('James Anderson',    'jamesa@example.com',     @CHANGEME, 'user')
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  role=VALUES(role),
  password_hash=VALUES(password_hash);

-- === Special admin demo workflow & task (exactly once) ===
INSERT INTO workflows (user_id, name, description)
SELECT u.id, 'Sample Workflow', 'Initial test workflow'
FROM users u
WHERE u.email = @ADMIN_EMAIL
  AND NOT EXISTS (
    SELECT 1 FROM workflows w
    WHERE w.user_id = u.id AND w.name = 'Sample Workflow'
  );

INSERT INTO tasks (workflow_id, name, status, assigned_to, due_date)
SELECT w.id, 'Create Jira Issue', 'pending', 'Elijah', '2025-08-31'
FROM workflows w
JOIN users u ON u.id = w.user_id
WHERE u.email = @ADMIN_EMAIL
  AND w.name = 'Sample Workflow'
  AND NOT EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.workflow_id = w.id AND t.name = 'Create Jira Issue'
  );

-- === Bulk workflows for ALL users (8 per user, idempotent) ===
INSERT INTO workflows (user_id, name, description)
SELECT u.id, t.wf_name, t.wf_desc
FROM users u
JOIN (
  SELECT 'Onboarding'           AS wf_name, 'New hire onboarding checklist'                   AS wf_desc UNION ALL
  SELECT 'Release Train'        AS wf_name, 'Bi-weekly release pipeline'                      AS wf_desc UNION ALL
  SELECT 'Incident Response'    AS wf_name, 'Runbook for P1 incidents'                        AS wf_desc UNION ALL
  SELECT 'Data Pipeline'        AS wf_name, 'ETL checks and data validations'                 AS wf_desc UNION ALL
  SELECT 'Marketing Campaign'   AS wf_name, 'Launch and monitor marketing campaigns'          AS wf_desc UNION ALL
  SELECT 'Bug Triage'           AS wf_name, 'Identify and prioritize incoming bugs'           AS wf_desc UNION ALL
  SELECT 'Customer Support'     AS wf_name, 'Handle support tickets and escalations'          AS wf_desc UNION ALL
  SELECT 'Quarterly Planning'   AS wf_name, 'Prepare roadmap and objectives for next quarter' AS wf_desc
) AS t
  ON 1=1
WHERE NOT EXISTS (
  SELECT 1 FROM workflows w
  WHERE w.user_id = u.id AND w.name = t.wf_name
);

-- === Bulk tasks for EVERY workflow (10 per workflow, idempotent) ===
-- More varied names, statuses, due offsets, and assignees.
INSERT INTO tasks (workflow_id, name, status, assigned_to, due_date, created_at)
SELECT
  w.id,
  tt.task_name,
  CASE
    WHEN tt.task_name IN ('Define requirements','Write tests','Update documentation') THEN 'done'
    WHEN tt.task_name IN ('Implement feature','Deploy','Conduct A/B test') THEN 'pending'
    WHEN tt.task_name IN ('QA sign-off','Performance testing') THEN 'in-progress'
    ELSE 'review'
  END AS status,
  tt.assigned_to,
  DATE_ADD(CURDATE(), INTERVAL tt.due_offset DAY) AS due_date,
  NOW()
FROM workflows w
JOIN (
  SELECT 'Define requirements'   AS task_name, 'PM'       AS assigned_to, -12 AS due_offset UNION ALL
  SELECT 'Implement feature'     AS task_name, 'Dev'      AS assigned_to,   5 AS due_offset UNION ALL
  SELECT 'Write tests'           AS task_name, 'QA'       AS assigned_to,   8 AS due_offset UNION ALL
  SELECT 'Code review'           AS task_name, 'Dev'      AS assigned_to,   2 AS due_offset UNION ALL
  SELECT 'Deploy'                AS task_name, 'Ops'      AS assigned_to,  14 AS due_offset UNION ALL
  SELECT 'QA sign-off'           AS task_name, 'QA Lead'  AS assigned_to,   0 AS due_offset UNION ALL
  SELECT 'Performance testing'   AS task_name, 'Perf QA'  AS assigned_to,  10 AS due_offset UNION ALL
  SELECT 'Update documentation'  AS task_name, 'Tech Writer' AS assigned_to, -3 AS due_offset UNION ALL
  SELECT 'Customer feedback'     AS task_name, 'Support'  AS assigned_to,  18 AS due_offset UNION ALL
  SELECT 'Conduct A/B test'      AS task_name, 'Analyst'  AS assigned_to,  21 AS due_offset
) tt
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.workflow_id = w.id AND t.name = tt.task_name
);

-- === Seed additional logs for tasks without logs (idempotent) ===
INSERT INTO logs (task_id, event, status, timestamp)
SELECT t.id, CONCAT('seeded-', t.status), t.status, NOW()
FROM tasks t
LEFT JOIN logs l ON l.task_id = t.id
WHERE l.id IS NULL;

-- === Seed a variety of supplementary logs (status changes) ===
-- This adds two more logs per task if not present, to simulate history.
INSERT INTO logs (task_id, event, status, timestamp)
SELECT t.id, 
       CASE WHEN t.status='pending' THEN 'created' ELSE 'status changed' END,
       t.status,
       DATE_ADD(NOW(), INTERVAL -5 DAY)
FROM tasks t
WHERE NOT EXISTS (
  SELECT 1 FROM logs l
  WHERE l.task_id = t.id AND l.event IN ('created','status changed')
);

INSERT INTO logs (task_id, event, status, timestamp)
SELECT t.id, 'updated',
       CASE WHEN t.status='done' THEN 'done' ELSE 'in-progress' END,
       DATE_ADD(NOW(), INTERVAL -2 DAY)
FROM tasks t
WHERE NOT EXISTS (
  SELECT 1 FROM logs l
  WHERE l.task_id = t.id AND l.event = 'updated'
);

-- === Integrations ===
-- Slack for every user with a placeholder webhook (idempotent)
INSERT INTO integrations (type, credentials, user_id)
SELECT 'slack',
       CONCAT('{"webhook_url":"https://hooks.slack.com/services/SEED/', LPAD(u.id, 3, '0'), '/PLACEHOLDER"}'),
       u.id
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM integrations i
  WHERE i.user_id = u.id AND i.type = 'slack'
);

-- GitHub for admin + selected users (idempotent)
INSERT INTO integrations (type, credentials, user_id)
SELECT 'github',
       CONCAT(
         '{"api_base":"https://api.github.com","token":"ghp_dummy_', LPAD(u.id,3,'0'),
         '","default_repo":"', LOWER(REPLACE(u.name, ' ', '')), '/demo-repo"}'
       ),
       u.id
FROM users u
WHERE u.email IN (
    @ADMIN_EMAIL, 'ava@example.com', 'noah@example.com', 'sophia@example.com',
    'charlotte@example.com', 'michael@example.com', 'sarah@example.com'
  )
  AND NOT EXISTS (
    SELECT 1 FROM integrations i
    WHERE i.user_id = u.id AND i.type = 'github'
  );

-- Jira for a handful of users (idempotent)
INSERT INTO integrations (type, credentials, user_id)
SELECT 'jira',
       CONCAT(
         '{"base_url":"https://your-domain.atlassian.net","email":"', u.email,
         '","api_token":"jira_dummy_', LPAD(u.id,3,'0'),
         '","default_project":"DEM"}'
       ),
       u.id
FROM users u
WHERE u.email IN (
    @ADMIN_EMAIL, 'liam@example.com', 'mia@example.com',
    'henry@example.com', 'emily@example.com', 'sophia@example.com'
  )
  AND NOT EXISTS (
    SELECT 1 FROM integrations i
    WHERE i.user_id = u.id AND i.type = 'jira'
  );
