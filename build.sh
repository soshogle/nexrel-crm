#!/bin/bash
# Load memory configuration
source "$(dirname "$0")/.memory-config.sh"

echo "Building with memory limit: 8GB"
echo "Node options: $NODE_OPTIONS"
echo "Thread pool size: $UV_THREADPOOL_SIZE"

yarn build "$@"
