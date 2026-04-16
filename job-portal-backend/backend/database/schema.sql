-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) CHECK (role IN ('admin', 'manager', 'client')) NOT NULL,
  profile_pic VARCHAR(500),
  resume_url VARCHAR(500),
  skills TEXT,
  bio TEXT,
  title VARCHAR(255),
  custom_url VARCHAR(255),
  status VARCHAR(20) CHECK (status IN ('active', 'suspended')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  logo_url VARCHAR(500),
  banner_url VARCHAR(500),
  about TEXT,
  industry VARCHAR(255),
  location VARCHAR(255),
  website VARCHAR(255),
  manager_id INT,
  approved BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) CHECK (status IN ('active', 'suspended')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id)
);

-- Jobs table
CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  company_id INT NOT NULL,
  salary_min DECIMAL(10,2),
  salary_max DECIMAL(10,2),
  location VARCHAR(255),
  type VARCHAR(50) CHECK (type IN ('full-time', 'part-time', 'remote')) NOT NULL,
  status VARCHAR(50) CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  is_taken_down BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Applications table
CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  job_id INT NOT NULL,
  user_id INT NOT NULL,
  cover_letter TEXT,
  resume_url VARCHAR(500),
  college_name VARCHAR(255),
  cgpa DECIMAL(4,2),
  willing_to_relocate BOOLEAN DEFAULT FALSE,
  experience_years INT DEFAULT 0,
  status VARCHAR(50) CHECK (status IN ('applied', 'shortlisted', 'interview', 'hired', 'rejected')) DEFAULT 'applied',
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Saved jobs table
CREATE TABLE saved_jobs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  job_id INT NOT NULL,
  saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- Interview links (secure tokens)
CREATE TABLE interview_links (
  id SERIAL PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_id INT NOT NULL,
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Interview results (stored after interview app submission)
CREATE TABLE interview_results (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  score INT,
  feedback JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
