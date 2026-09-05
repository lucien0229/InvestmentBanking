FROM python:3.11.14-bookworm@sha256:7489d7e0542e9e5548fb1b0a8689ae7dfefc10bae31c21aa11f1046a2e5bc37f
RUN apt-get update && apt-get install -y --no-install-recommends libgdiplus libicu72 fonts-dejavu-core fontconfig && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir aspose-cells-python==26.8.0 openpyxl==3.1.5 PyMuPDF==1.28.2
RUN apt-get update && apt-get install -y --no-install-recommends clamav && rm -rf /var/lib/apt/lists/*
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY services/office/ /app/services/office/
COPY tests/artifacts/ /app/tests/artifacts/
COPY tests/fixtures/analysis-workbook.json /app/tests/fixtures/analysis-workbook.json
USER 1000:1000
ENTRYPOINT ["python", "/app/services/office/analysis_workbook.py"]
