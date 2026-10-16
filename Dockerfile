FROM node:22-alpine AS frontend
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home explorer
COPY backend/ backend/
COPY frontend/planets.json frontend/planets.json
COPY --from=frontend /build/dist frontend/dist/
RUN mkdir data && chown explorer:explorer data
USER explorer
EXPOSE 8970
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8970"]
