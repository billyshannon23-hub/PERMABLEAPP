# One box with everything the framework needs: Python, Chromium (for drawing frames), ffmpeg and the Flite speech libraries.
#   docker build -t permeable-framework .
#   docker run --rm -v "$PWD/projects:/kit/projects" -v "$PWD/out:/kit/out" permeable-framework make heart
FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libflite1 && rm -rf /var/lib/apt/lists/*
WORKDIR /kit
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && python -m playwright install --with-deps chromium
COPY . .
ENTRYPOINT ["python3", "tools/kit.py"]
