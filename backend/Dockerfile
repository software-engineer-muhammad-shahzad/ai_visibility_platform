FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 FLASK_APP=run.py FLASK_ENV=production HOST=0.0.0.0 PORT=5000

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 5000

# apply migrations, then serve. One worker with threads: pipelines run in background threads of that worker.
CMD ["sh", "-c", "flask db upgrade && gunicorn --bind 0.0.0.0:${PORT} --workers 1 --threads 8 --timeout 300 run:app"]
