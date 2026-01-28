# NEXREL CRM Development Workflow
# ================================
# This file documents the automated workflow for this project

## Build Strategy
LOCAL_BUILD=skip
DEPLOY_TARGET=vercel

## Workflow Steps
# 1. Make code changes
# 2. git add -A && git commit -m "message" && git push origin master
# 3. Vercel auto-deploys (no local build needed)
# 4. Check status via API or Vercel dashboard

## Vercel Project Info
PROJECT_ID=prj_TtBTAMHeXkbofxX808MlIgSzSIzu
DOMAIN=nexrel.soshogleagents.com
GITHUB_REPO=soshogle/nexrel-crm

## Quick Commands
# Push: ./scripts/push-to-vercel.sh "commit message"
# Status: ./scripts/check-vercel-status.sh
