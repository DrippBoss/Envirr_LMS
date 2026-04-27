# Envirr LMS Setup Guide

There are two primary ways to run the Envirr LMS project on a new system: using Docker (Recommended), or running the services manually the traditional way. 

## Prerequisites
No matter which path you choose, you need to set up your `.env` file first.

1. **Clone the repository** (if you haven't already).
2. **Create a `.env` file** in the root directory and add the following contents:

```env
DEBUG=True
SECRET_KEY=django-insecure-replace-me-in-prod
DATABASE_URL=postgres://postgres:postgres@db:5432/envirr_db
REDIS_URL=redis://redis:6379/1
GEMINI_API_KEY=your-gemini-key-goes-here
```
*(Note: If you run locally without Docker, you will need to change `@db` to `@localhost` in your DATABASE_URL)*

---

## Path A: Using Docker (Recommended)

This is the easiest and fastest way to get the project running as it handles all databases, redis services, frontend, and backend environments automatically.

### Requirements:
- [Docker Engine and Docker Compose](https://docs.docker.com/get-docker/)

### Steps:
1. Open a terminal in the root `Envirr_LMS` directory.
2. Run the following command:
   ```bash
   docker compose up --build -d
   ```
3. Once the containers start, the services are available at:
   - **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   - **Django Backend**: [http://localhost:8000](http://localhost:8000)

4. To view logs:
   ```bash
   docker compose logs -f
   ```

5. To shut down the environment:
   ```bash
   docker compose down
   ```

---

## Path B: Local Setup (Without Docker)

This path requires setting up isolated environments manually and requires you to have PostgreSQL and Redis installed natively.

### Requirements:
- Python 3.10+
- Node.js (v18+)
- PostgreSQL installed and running
- Redis installed and running

### Step 1: Start Databases
Ensure Redis and PostgreSQL are active on your system.
Create a local database named `envirr_db` in PostgreSQL.

### Step 2: Backend Setup
1. Create and activate a Virtual Environment:
   ```bash
   python -m venv venv

   # Windows
   .\venv\Scripts\activate
   # macOS/Linux
   source venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run Database Migrations:
   ```bash
   python manage.py migrate
   ```
4. Start the Django Server:
   ```bash
   python manage.py runserver
   ```
5. In a new tab (with the virtual environment activated), start the Celery Worker:
   ```bash
   celery -A envirr_backend worker --loglevel=info
   ```

### Step 3: Frontend Setup
1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

The frontend will be running on `http://localhost:5173` and the backend will be available at `http://localhost:8000`.
