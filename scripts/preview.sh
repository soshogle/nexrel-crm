#!/bin/bash
# Quick alias script for preview deployments
# Usage: ./scripts/preview.sh [branch-name]

exec bash scripts/create-preview-deployment.sh "$@"
