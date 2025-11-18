FROM python:3.12-slim

WORKDIR /app

COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY api .

ENV FLASK_APP=app/main.py
ENV PYTHONUNBUFFERED=1

CMD ["python", "-m", "app.main"]
