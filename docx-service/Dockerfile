FROM python:3.12-slim

WORKDIR /app

# System deps for python-docx XML rendering.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2 \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8080

# Single uvicorn process. Stage 5 calls this once per generation — no need
# for multi-worker until volume increases.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
