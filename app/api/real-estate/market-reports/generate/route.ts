export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REReportType } from '@prisma/client';

interface MarketReportRequest {
  region: string;
  reportType: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'MARKET_UPDATE';
  marketData?: {
    medianPrice?: number;
    averagePrice?: number;
    totalSales?: number;
    newListings?: number;
    daysOnMarket?: number;
    priceChangePercent?: number;
    inventoryMonths?: number;
  };
  customPrompt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: MarketReportRequest = await request.json();
    const { region, reportType, marketData, customPrompt } = body;

    if (!region || !reportType) {
      return NextResponse.json(
        { error: 'Region and report type are required' },
        { status: 400 }
      );
    }

    const currentDate = new Date();
    const periodEnd = currentDate;
    let periodStart = new Date();
    
    // Calculate period based on report type
    switch (reportType) {
      case 'WEEKLY':
        periodStart.setDate(currentDate.getDate() - 7);
        break;
      case 'MONTHLY':
        periodStart.setMonth(currentDate.getMonth() - 1);
        break;
      case 'QUARTERLY':
        periodStart.setMonth(currentDate.getMonth() - 3);
        break;
      case 'ANNUAL':
        periodStart.setFullYear(currentDate.getFullYear() - 1);
        break;
      default:
        periodStart.setDate(currentDate.getDate() - 30);
    }

    const systemPrompt = `You are a professional real estate market analyst creating reports for real estate agents to share with clients. Your reports should be:
- Data-driven but accessible
- Professional yet engaging
- Actionable with clear insights
- Suitable for both buyers and sellers

Generate a comprehensive market report in the following JSON format:
{
  "title": "Catchy, professional report title",
  "executiveSummary": "2-3 paragraph executive summary of the market conditions",
  "keyHighlights": [
    {
      "metric": "Metric name",
      "value": "Current value",
      "trend": "UP" | "DOWN" | "STABLE",
      "insight": "Brief insight about this metric"
    }
  ],
  "buyerInsights": "2-3 paragraphs with insights specifically for buyers in this market",
  "sellerInsights": "2-3 paragraphs with insights specifically for sellers in this market",
  "predictions": {
    "shortTerm": "What to expect in the next 1-3 months",
    "mediumTerm": "What to expect in 3-6 months",
    "risks": ["Potential market risks"],
    "opportunities": ["Current market opportunities"]
  },
  "socialCaption": "A compelling social media caption (under 280 characters) to promote this report",
  "newsletterTeaser": "A 2-3 sentence teaser for email newsletters"
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;

    let userPrompt = `Generate a ${reportType.toLowerCase()} real estate market report for: ${region}

Report Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;

    if (marketData) {
      userPrompt += `\n\nAvailable Market Data:\n`;
      if (marketData.medianPrice) userPrompt += `- Median Home Price: $${marketData.medianPrice.toLocaleString()}\n`;
      if (marketData.averagePrice) userPrompt += `- Average Home Price: $${marketData.averagePrice.toLocaleString()}\n`;
      if (marketData.totalSales) userPrompt += `- Total Sales: ${marketData.totalSales}\n`;
      if (marketData.newListings) userPrompt += `- New Listings: ${marketData.newListings}\n`;
      if (marketData.daysOnMarket) userPrompt += `- Average Days on Market: ${marketData.daysOnMarket}\n`;
      if (marketData.priceChangePercent) userPrompt += `- Price Change: ${marketData.priceChangePercent > 0 ? '+' : ''}${marketData.priceChangePercent}%\n`;
      if (marketData.inventoryMonths) userPrompt += `- Months of Inventory: ${marketData.inventoryMonths}\n`;
    }

    if (customPrompt) {
      userPrompt += `\n\nAdditional Context: ${customPrompt}`;
    }

    userPrompt += `\n\nCreate a professional, insightful market report that agents can share with their clients.`;

    // Call the LLM API
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM API error:', errorText);
      return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }

    const data = await response.json();
    const reportContent = data.choices?.[0]?.message?.content;

    if (!reportContent) {
      return NextResponse.json({ error: 'No report generated' }, { status: 500 });
    }

    let report;
    try {
      report = JSON.parse(reportContent);
    } catch (e) {
      console.error('Failed to parse LLM response:', reportContent);
      return NextResponse.json({ error: 'Invalid report format' }, { status: 500 });
    }

    // Save the report to the database
    const marketReport = await prisma.rEMarketReport.create({
      data: {
        userId: session.user.id,
        type: reportType as REReportType,
        title: report.title || `${region} ${reportType} Market Report`,
        region,
        periodStart,
        periodEnd,
        executiveSummary: report.executiveSummary || null,
        keyHighlights: report.keyHighlights || [],
        buyerInsights: report.buyerInsights || null,
        sellerInsights: report.sellerInsights || null,
        predictions: report.predictions || {},
        socialCaption: report.socialCaption || null,
      },
    });

    return NextResponse.json({
      success: true,
      report: marketReport,
      content: report,
    });
  } catch (error) {
    console.error('Market report generate error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
