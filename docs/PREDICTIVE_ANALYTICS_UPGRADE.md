# Predictive Analytics Upgrade

## Summary

Predictions now use **statistical models** instead of simple linear extrapolation. LLM is used only for human-readable explanations, not for the numerical forecasts.

## Changes

### 1. Statistical Models (`lib/business-ai/predictive-models.ts`)

| Metric | Method | Description |
|--------|--------|-------------|
| **Revenue** | Linear regression | Fits trend on 30 days of daily revenue, projects next 30 days, confidence from volatility |
| **Lead conversions** | Wilson score + historical rate | Uses binomial confidence interval; confidence improves with sample size |
| **Deal closure** | Stage-weighted probability | Later stages (proposal, negotiation) weighted higher than early (discovery) |

### 2. Data Pipeline Additions (`lib/business-ai/data-pipeline.ts`)

- `deals.openPipelineValue` – Sum of open deal values (for forecasting)
- `deals.openByStage` – Stage breakdown for open deals only (for stage-weighted model)

### 3. LLM Explanations (`lib/business-ai/prediction-explainer.ts`)

- Optional: when `OPENAI_API_KEY` is set, adds a short explanation for each prediction
- Does not affect the prediction numbers; only adds natural language context

### 4. UI Updates

- Card description: "Statistical forecasts from your CRM data"
- Shows `explanation` when present (from LLM)

## Dependencies

- `simple-statistics` – Linear regression, standard deviation

## Flow

```
CRM data → Data pipeline (with openPipelineValue, openByStage)
    → Predictive models (regression, Wilson, stage-weighted)
    → Analytics engine
    → [Optional] Prediction explainer (LLM)
    → Health API → UI
```

## Fallback

When the full pipeline fails, the CRM fallback still uses simple formulas (no new dependencies).
