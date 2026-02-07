# Orthanc DICOM Server Dockerfile
# Production-ready configuration

FROM jodogne/orthanc-plugins:latest

# Install additional tools if needed
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy custom configuration
COPY orthanc.json /etc/orthanc/orthanc.json

# Create storage directory with proper permissions
RUN mkdir -p /var/lib/orthanc/db && \
    chmod 777 /var/lib/orthanc/db

# Expose ports
# 4242: DICOM port (C-STORE, C-FIND, C-MOVE)
# 8042: HTTP REST API port
EXPOSE 4242 8042

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8042/system || exit 1

# Run Orthanc with custom config
ENTRYPOINT ["Orthanc"]
CMD ["/etc/orthanc/orthanc.json"]
