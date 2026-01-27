#!/bin/bash
# Load memory configuration
source "$(dirname "$0")/.memory-config.sh"

echo "Starting dev server with memory limit: 8GB"
echo "Node options: $NODE_OPTIONS"

yarn dev "$@"
