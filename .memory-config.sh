#!/bin/bash
# Memory configuration for Node.js processes
# Increase heap size to 8GB with optimizations
export NODE_OPTIONS="--max-old-space-size=8192 --max-semi-space-size=512"
# Increase thread pool size for better I/O performance
export UV_THREADPOOL_SIZE=128
# Suppress deprecation warnings to reduce memory overhead
export NODE_NO_WARNINGS=1
