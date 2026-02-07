# Docker Installation Guide

## Quick Install for macOS

### Option 1: Homebrew (Recommended)

```bash
# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop
open -a Docker

# Wait for Docker to start (30-60 seconds)
# You'll see Docker icon in menu bar when ready
```

### Option 2: Direct Download

1. Visit: https://www.docker.com/products/docker-desktop/
2. Download Docker Desktop for Mac
3. Open the downloaded `.dmg` file
4. Drag Docker.app to Applications folder
5. Open Docker Desktop from Applications
6. Wait for Docker to start (30-60 seconds)

---

## Verify Installation

```bash
# Check Docker is installed
docker --version

# Check Docker is running
docker ps

# Should show empty list or running containers
```

---

## After Installation

Run the setup script:

```bash
./scripts/setup-docker-and-orthanc.sh
```

This will:
1. ✅ Check Docker is installed
2. ✅ Start Docker Desktop if needed
3. ✅ Start Orthanc container
4. ✅ Verify Orthanc is running
5. ✅ Provide access information

---

## Troubleshooting

### Docker won't start

```bash
# Check Docker Desktop is running
ps aux | grep Docker

# Try starting manually
open -a Docker

# Check Docker daemon
docker info
```

### Permission denied

```bash
# Add your user to docker group (Linux)
sudo usermod -aG docker $USER

# On macOS, Docker Desktop handles permissions automatically
```

### Port already in use

```bash
# Check what's using port 8042
lsof -i :8042

# Stop existing Orthanc
docker stop nexrel-orthanc
docker rm nexrel-orthanc
```

---

## Next Steps

Once Docker and Orthanc are running:

1. **Start Next.js app:**
   ```bash
   npm run dev
   ```

2. **Run tests:**
   ```bash
   ./scripts/test-dicom-complete.sh
   ```

3. **Open app:**
   ```
   http://localhost:3000/dashboard/dental-test
   ```

---

## Manual Orthanc Start

If you prefer to start Orthanc manually:

```bash
# Start Orthanc
docker-compose -f docker-compose.orthanc.yml up -d

# Check status
docker ps | grep orthanc

# View logs
docker logs nexrel-orthanc

# Stop Orthanc
docker-compose -f docker-compose.orthanc.yml down
```

---

**Status:** Ready to install Docker and start Orthanc 🚀
