import { prisma } from "@/lib/db";

export async function createLead(userId: string, params: any) {
  const { name, email, phone, company, status } = params;
  
  if (!name) {
    throw new Error("Lead name is required");
  }

  const lead = await prisma.lead.create({
    data: {
      userId,
      businessName: company || name,
      contactPerson: name,
      email: email || null,
      phone: phone || null,
      status: status || "NEW",
      source: "AI Assistant",
    },
  });

  return {
    message: `Lead "${name}" created successfully!`,
    lead: {
      id: lead.id,
      businessName: lead.businessName,
      contactPerson: lead.contactPerson,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
    },
  };
}

export async function updateLead(userId: string, params: any) {
  const { leadId, contactName, email, phone, status, company, name, ...rest } = params;

  let targetLeadId = leadId;
  if (!targetLeadId && contactName) {
    const found = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { businessName: { contains: contactName, mode: "insensitive" } },
          { contactPerson: { contains: contactName, mode: "insensitive" } },
        ],
      },
    });
    if (!found) throw new Error(`Lead "${contactName}" not found`);
    targetLeadId = found.id;
  }

  if (!targetLeadId) {
    throw new Error("Lead ID or contact name is required");
  }

  const updates: any = { ...rest };
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (status !== undefined) updates.status = status;
  if (company !== undefined) updates.businessName = company;
  if (name !== undefined) updates.contactPerson = name;

  const existingLead = await prisma.lead.findFirst({
    where: { id: targetLeadId, userId },
  });

  if (!existingLead) {
    throw new Error("Lead not found");
  }

  const lead = await prisma.lead.update({
    where: { id: targetLeadId },
    data: updates,
  });

  return {
    message: `Lead "${lead.businessName}" updated successfully!`,
    lead: {
      id: lead.id,
      businessName: lead.businessName,
      contactPerson: lead.contactPerson,
      status: lead.status,
    },
  };
}

export async function getLeadDetails(userId: string, params: any) {
  const { leadId, name, contactName } = params;
  const searchName = name || contactName;

  let lead;

  if (leadId) {
    lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: {
        notes: { orderBy: { createdAt: "desc" }, take: 5 },
        deals: { include: { stage: true } },
        tasks: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, take: 10 },
      },
    });
  } else if (searchName) {
    lead = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { businessName: { contains: searchName, mode: "insensitive" } },
          { contactPerson: { contains: searchName, mode: "insensitive" } },
        ],
      },
      include: {
        notes: { orderBy: { createdAt: "desc" }, take: 5 },
        deals: { include: { stage: true } },
        tasks: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, take: 10 },
      },
    });
  }

  if (!lead) {
    throw new Error("Lead not found");
  }

  return {
    message: `Details for ${lead.contactPerson || lead.businessName}`,
    lead: {
      id: lead.id,
      businessName: lead.businessName,
      contactPerson: lead.contactPerson,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      notes: lead.notes,
      deals: lead.deals?.map((d: any) => ({ id: d.id, title: d.title, value: d.value, stage: d.stage?.name })) || [],
      tasks: lead.tasks?.map((t: any) => ({ id: t.id, title: t.title, dueDate: t.dueDate })) || [],
      createdAt: lead.createdAt,
    },
  };
}

export async function deleteLead(userId: string, params: any) {
  const { leadId, contactName } = params;

  let targetId = leadId;
  if (!targetId && contactName) {
    const found = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { businessName: { contains: contactName, mode: "insensitive" } },
          { contactPerson: { contains: contactName, mode: "insensitive" } },
        ],
      },
    });
    if (!found) throw new Error(`Lead "${contactName}" not found`);
    targetId = found.id;
  }

  if (!targetId) throw new Error("Lead ID or contact name is required");

  const existing = await prisma.lead.findFirst({
    where: { id: targetId, userId },
  });
  if (!existing) throw new Error("Lead not found");

  await prisma.lead.delete({
    where: { id: targetId },
  });

  return {
    message: `Lead "${existing.contactPerson || existing.businessName}" deleted successfully.`,
    leadId: targetId,
  };
}

export async function listLeads(userId: string, params: any) {
  const { status, limit = 10, search } = params;

  const where: any = { userId };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: "insensitive" } },
      { contactPerson: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    take: Math.min(limit, 50), // Max 50 leads
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      businessName: true,
      contactPerson: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
    },
  });

  return {
    count: leads.length,
    leads,
  };
}

export async function createDeal(userId: string, params: any) {
  const { title, value, stage, leadId } = params;

  if (!title) {
    throw new Error("Deal title is required");
  }

  // Get or create default pipeline
  let pipeline = await prisma.pipeline.findFirst({
    where: { userId, isDefault: true },
    include: { stages: { orderBy: { displayOrder: "asc" } } },
  });

  if (!pipeline) {
    // Create default pipeline with stages
    pipeline = await prisma.pipeline.create({
      data: {
        userId,
        name: "Sales Pipeline",
        isDefault: true,
        stages: {
          create: [
            { name: "Prospecting", displayOrder: 0, probability: 10 },
            { name: "Qualification", displayOrder: 1, probability: 25 },
            { name: "Proposal", displayOrder: 2, probability: 50 },
            { name: "Negotiation", displayOrder: 3, probability: 75 },
            { name: "Won", displayOrder: 4, probability: 100 },
            { name: "Lost", displayOrder: 5, probability: 0 },
          ],
        },
      },
      include: { stages: { orderBy: { displayOrder: "asc" } } },
    });
  }

  const firstStage = pipeline.stages[0];

  const deal = await prisma.deal.create({
    data: {
      userId,
      pipelineId: pipeline.id,
      stageId: firstStage.id,
      title,
      value: value || 0,
      leadId: leadId || null,
      probability: firstStage.probability,
    },
  });

  return {
    message: `Deal "${title}" created successfully!`,
    deal: {
      id: deal.id,
      title: deal.title,
      value: deal.value,
      stage: firstStage.name,
    },
  };
}

export async function updateDeal(userId: string, params: any) {
  const { dealId, ...updates } = params;

  if (!dealId) {
    throw new Error("Deal ID is required");
  }

  // Verify ownership
  const existingDeal = await prisma.deal.findFirst({
    where: { id: dealId, userId },
  });

  if (!existingDeal) {
    throw new Error("Deal not found");
  }

  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: updates,
    include: {
      stage: {
        select: {
          name: true,
        },
      },
    },
  });

  return {
    message: `Deal "${deal.title}" updated successfully!`,
    deal: {
      id: deal.id,
      title: deal.title,
      stage: deal.stage.name,
      value: deal.value,
    },
  };
}

export async function getDealDetails(userId: string, params: any) {
  const { dealId, dealTitle } = params;

  let deal;
  if (dealId) {
    deal = await prisma.deal.findFirst({
      where: { id: dealId, userId },
      include: { lead: { select: { id: true, businessName: true, contactPerson: true, email: true, phone: true } }, stage: true },
    });
  } else if (dealTitle) {
    deal = await prisma.deal.findFirst({
      where: { userId, title: { contains: dealTitle, mode: "insensitive" } },
      include: { lead: { select: { id: true, businessName: true, contactPerson: true, email: true, phone: true } }, stage: true },
    });
  }

  if (!deal) {
    throw new Error(dealId || dealTitle ? "Deal not found" : "Deal ID or deal title is required");
  }

  return {
    message: `Details for deal "${deal.title}"`,
    deal,
  };
}

export async function deleteDeal(userId: string, params: any) {
  const { dealId, dealTitle } = params;

  let targetId = dealId;
  if (!targetId && dealTitle) {
    const found = await prisma.deal.findFirst({
      where: { userId, title: { contains: dealTitle, mode: "insensitive" } },
    });
    if (!found) throw new Error(`Deal "${dealTitle}" not found`);
    targetId = found.id;
  }

  if (!targetId) throw new Error("Deal ID or deal title is required");

  const existing = await prisma.deal.findFirst({
    where: { id: targetId, userId },
  });
  if (!existing) throw new Error("Deal not found");

  await prisma.deal.delete({ where: { id: targetId } });

  return {
    message: `Deal "${existing.title}" deleted successfully.`,
    dealId: targetId,
  };
}

export async function createPipeline(userId: string, params: any) {
  const { name, description } = params;

  if (!name) throw new Error("Pipeline name is required");

  const pipeline = await prisma.pipeline.create({
    data: {
      userId,
      name,
      description: description || null,
      isDefault: false,
    },
  });

  return {
    message: `Pipeline "${name}" created successfully!`,
    pipeline: { id: pipeline.id, name: pipeline.name },
  };
}

export async function createPipelineStage(userId: string, params: any) {
  const { pipelineName, stageName, probability } = params;

  if (!pipelineName || !stageName) throw new Error("Pipeline name and stage name are required");

  const pipeline = await prisma.pipeline.findFirst({
    where: { userId, name: { contains: pipelineName, mode: "insensitive" } },
    include: { stages: { orderBy: { displayOrder: "asc" } } },
  });

  if (!pipeline) throw new Error(`Pipeline "${pipelineName}" not found`);

  const maxOrder = pipeline.stages.length > 0 ? Math.max(...pipeline.stages.map((s) => s.displayOrder)) + 1 : 0;

  const stage = await prisma.pipelineStage.create({
    data: {
      pipelineId: pipeline.id,
      name: stageName,
      displayOrder: maxOrder,
      probability: probability ?? 50,
    },
  });

  return {
    message: `Stage "${stageName}" added to pipeline "${pipeline.name}"`,
    stage: { id: stage.id, name: stage.name },
  };
}

export async function listDeals(userId: string, params: any) {
  const { stage, limit = 10 } = params;

  const where: any = { userId };

  const deals = await prisma.deal.findMany({
    where,
    take: Math.min(limit, 50),
    orderBy: { createdAt: "desc" },
    include: {
      lead: true,
      stage: true,
    },
  });

  return {
    count: deals.length,
    deals,
  };
}

export async function createCampaign(userId: string, params: any) {
  const { name, type, status } = params;

  if (!name) {
    throw new Error("Campaign name is required");
  }

  const campaign = await prisma.campaign.create({
    data: {
      userId,
      name,
      type: type || "SMS",
      status: status || "DRAFT",
      smsTemplate: "Default SMS template - please update",
    },
  });

  return {
    message: `Campaign "${name}" created successfully!`,
    campaign: {
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
    },
  };
}

export async function updateCampaign(userId: string, params: any) {
  const { campaignId, campaignName, name, status } = params;

  let campaign;
  if (campaignId) {
    campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
  } else if (campaignName) {
    campaign = await prisma.campaign.findFirst({
      where: { userId, name: { contains: campaignName, mode: "insensitive" } },
    });
  }

  if (!campaign) throw new Error("Campaign not found");

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one field (name or status) is required to update");
  }

  const updated = await prisma.campaign.update({
    where: { id: campaign.id },
    data: updates,
  });

  return {
    message: `Campaign "${updated.name}" updated successfully!`,
    campaign: { id: updated.id, name: updated.name, status: updated.status },
  };
}

export async function getCampaignDetails(userId: string, params: any) {
  const { campaignId, campaignName } = params;

  let campaign;
  if (campaignId) {
    campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });
  } else if (campaignName) {
    campaign = await prisma.campaign.findFirst({
      where: { userId, name: { contains: campaignName, mode: "insensitive" } },
    });
  }

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  return {
    message: `Details for campaign "${campaign.name}"`,
    campaign,
  };
}

export async function listCampaigns(userId: string, params: any) {
  const { status, limit = 10 } = params;

  const where: any = { userId };

  if (status) {
    where.status = status;
  }

  const campaigns = await prisma.campaign.findMany({
    where,
    take: Math.min(limit, 50),
    orderBy: { createdAt: "desc" },
  });

  return {
    count: campaigns.length,
    campaigns,
  };
}

export async function searchContacts(userId: string, params: any) {
  const { query, limit = 10 } = params;

  if (!query) {
    throw new Error("Search query is required");
  }

  const leads = await prisma.lead.findMany({
    where: {
      userId,
      OR: [
        { businessName: { contains: query, mode: "insensitive" } },
        { contactPerson: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    take: Math.min(limit, 20),
    select: {
      id: true,
      businessName: true,
      contactPerson: true,
      email: true,
      phone: true,
      status: true,
    },
  });

  return {
    query,
    count: leads.length,
    contacts: leads,
  };
}

export async function updateDealStage(userId: string, params: any) {
  const { dealTitle, stageName, dealId } = params;

  let deal;
  if (dealId) {
    deal = await prisma.deal.findFirst({
      where: { id: dealId, userId },
      include: { stage: true, pipeline: true },
    });
  } else if (dealTitle) {
    deal = await prisma.deal.findFirst({
      where: {
        userId,
        title: { contains: dealTitle, mode: "insensitive" },
      },
      include: { stage: true, pipeline: true },
    });
  }

  if (!deal) {
    throw new Error(`Deal "${dealTitle || dealId}" not found`);
  }

  const stage = await prisma.pipelineStage.findFirst({
    where: {
      pipelineId: deal.pipelineId,
      name: { contains: stageName, mode: "insensitive" },
    },
  });

  if (!stage) {
    const stages = await prisma.pipelineStage.findMany({
      where: { pipelineId: deal.pipelineId },
      orderBy: { displayOrder: "asc" },
    });
    throw new Error(
      `Stage "${stageName}" not found. Available stages: ${stages.map((s) => s.name).join(", ")}`
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const updatedDeal = await prisma.deal.update({
    where: { id: deal.id },
    data: {
      stageId: stage.id,
      probability: stage.probability,
    },
    include: {
      lead: true,
      stage: true,
    },
  });

  await prisma.dealActivity.create({
    data: {
      dealId: deal.id,
      userId,
      type: "STAGE_CHANGED",
      description: `Deal moved from "${deal.stage.name}" to "${stage.name}"`,
    },
  });

  try {
    const { default: workflowEngine } = await import("@/lib/workflow-engine");
    workflowEngine.triggerWorkflow(
      "DEAL_STAGE_CHANGED",
      {
        userId,
        dealId: deal.id,
        leadId: updatedDeal.leadId || undefined,
        variables: {
          dealTitle: updatedDeal.title,
          dealValue: updatedDeal.value,
          businessName: updatedDeal.lead?.businessName,
        },
      },
      { oldStageId: deal.stageId, newStageId: stage.id }
    ).catch(() => {});
  } catch {}

  return {
    message: `✓ Deal "${deal.title}" moved to "${stage.name}"`,
    deal: {
      id: updatedDeal.id,
      title: updatedDeal.title,
      stage: stage.name,
      value: updatedDeal.value,
    },
  };
}

export async function updateDealOrByTitle(userId: string, params: any) {
  const { dealId, dealTitle, value, expectedCloseDate, ...rest } = params;

  let targetDealId = dealId;
  if (!targetDealId && dealTitle) {
    const deal = await prisma.deal.findFirst({
      where: {
        userId,
        title: { contains: dealTitle, mode: "insensitive" },
      },
    });
    if (!deal) {
      throw new Error(`Deal "${dealTitle}" not found`);
    }
    targetDealId = deal.id;
  }

  if (!targetDealId) {
    throw new Error("Deal ID or deal title is required");
  }

  const updates: any = { ...rest };
  if (value != null) updates.value = value;
  if (expectedCloseDate != null) updates.expectedCloseDate = new Date(expectedCloseDate);

  return updateDeal(userId, { dealId: targetDealId, ...updates });
}

export async function assignDealToLead(userId: string, params: any) {
  const { dealId, dealTitle, leadId, contactName } = params;

  let deal;
  if (dealId) {
    deal = await prisma.deal.findFirst({ where: { id: dealId, userId } });
  } else if (dealTitle) {
    deal = await prisma.deal.findFirst({
      where: { userId, title: { contains: dealTitle, mode: "insensitive" } },
    });
  }
  if (!deal) throw new Error(`Deal "${dealTitle || dealId}" not found`);

  let lead;
  if (leadId) {
    lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
  } else if (contactName) {
    lead = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { contactPerson: { contains: contactName, mode: "insensitive" } },
          { businessName: { contains: contactName, mode: "insensitive" } },
        ],
      },
    });
  }
  if (!lead) throw new Error(contactName ? `Contact "${contactName}" not found` : "Lead ID or contact name is required");

  await prisma.deal.update({
    where: { id: deal.id },
    data: { leadId: lead.id },
  });

  return {
    message: `✓ Deal "${deal.title}" linked to ${lead.contactPerson || lead.businessName}`,
    dealId: deal.id,
    leadId: lead.id,
  };
}

export async function getPipelineStages(userId: string, params: any) {
  const { pipelineName } = params;

  let pipeline;
  if (pipelineName) {
    pipeline = await prisma.pipeline.findFirst({
      where: { userId, name: { contains: pipelineName, mode: "insensitive" } },
      include: { stages: { orderBy: { displayOrder: "asc" } } },
    });
  } else {
    pipeline = await prisma.pipeline.findFirst({
      where: { userId, isDefault: true },
      include: { stages: { orderBy: { displayOrder: "asc" } } },
    });
    if (!pipeline) {
      pipeline = await prisma.pipeline.findFirst({
        where: { userId },
        include: { stages: { orderBy: { displayOrder: "asc" } } },
      });
    }
  }

  if (!pipeline) throw new Error("No pipeline found");

  const stages = pipeline.stages.map((s) => ({ id: s.id, name: s.name, probability: s.probability, displayOrder: s.displayOrder }));
  return {
    message: `Pipeline "${pipeline.name}" has ${stages.length} stage(s)`,
    pipeline: { id: pipeline.id, name: pipeline.name },
    stages,
  };
}

export async function addLeadTag(userId: string, params: any) {
  const { leadId, contactName, tag } = params;
  if (!tag?.trim()) throw new Error("Tag is required");

  let lead;
  if (leadId) {
    lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
  } else if (contactName) {
    lead = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { contactPerson: { contains: contactName, mode: "insensitive" } },
          { businessName: { contains: contactName, mode: "insensitive" } },
        ],
      },
    });
  }
  if (!lead) throw new Error(contactName ? `Contact "${contactName}" not found` : "Lead ID or contact name is required");

  const tags = Array.isArray(lead.tags) ? [...(lead.tags as string[])] : [];
  const tagValue = tag.trim();
  if (!tags.includes(tagValue)) tags.push(tagValue);

  await prisma.lead.update({
    where: { id: lead.id },
    data: { tags: tags as any },
  });

  return {
    message: `✓ Tag "${tagValue}" added to ${lead.contactPerson || lead.businessName}`,
    leadId: lead.id,
    tags,
  };
}

export async function updateLeadStatus(userId: string, params: any) {
  const { leadId, contactName, status } = params;
  if (!status) throw new Error("Status is required");
  const validStatuses = ["NEW", "CONTACTED", "RESPONDED", "QUALIFIED", "CONVERTED", "LOST"];
  if (!validStatuses.includes(status)) throw new Error(`Invalid status. Use: ${validStatuses.join(", ")}`);

  let lead;
  if (leadId) {
    lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
  } else if (contactName) {
    lead = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { contactPerson: { contains: contactName, mode: "insensitive" } },
          { businessName: { contains: contactName, mode: "insensitive" } },
        ],
      },
    });
  }
  if (!lead) throw new Error(contactName ? `Contact "${contactName}" not found` : "Lead ID or contact name is required");

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: status as any },
  });

  return {
    message: `✓ ${lead.contactPerson || lead.businessName} status updated to ${status}`,
    leadId: lead.id,
    status,
  };
}

export async function listNotes(userId: string, params: any) {
  const { contactName, dealTitle, leadId, dealId, limit = 10 } = params;

  if (dealId || dealTitle) {
    let deal;
    if (dealId) {
      deal = await prisma.deal.findFirst({
        where: { id: dealId, userId },
        include: { activities: { where: { type: "NOTE" }, orderBy: { createdAt: "desc" }, take: Math.min(limit, 50) } },
      });
    } else {
      deal = await prisma.deal.findFirst({
        where: { userId, title: { contains: dealTitle, mode: "insensitive" } },
        include: { activities: { where: { type: "NOTE" }, orderBy: { createdAt: "desc" }, take: Math.min(limit, 50) } },
      });
    }
    if (!deal) throw new Error(`Deal "${dealTitle || dealId}" not found`);

    const notes = deal.activities.map((a) => ({ content: a.description, createdAt: a.createdAt, type: "deal" }));
    return {
      message: `Found ${notes.length} note(s) for deal "${deal.title}"`,
      notes,
      dealId: deal.id,
    };
  }

  let lead;
  if (leadId) {
    lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: { notes: { orderBy: { createdAt: "desc" }, take: Math.min(limit, 50) } },
    });
  } else if (contactName) {
    lead = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { contactPerson: { contains: contactName, mode: "insensitive" } },
          { businessName: { contains: contactName, mode: "insensitive" } },
        ],
      },
      include: { notes: { orderBy: { createdAt: "desc" }, take: Math.min(limit, 50) } },
    });
  }
  if (!lead) throw new Error(contactName ? `Contact "${contactName}" not found` : "Lead ID or contact name is required");

  const notes = lead.notes.map((n) => ({ content: n.content, createdAt: n.createdAt, type: "contact" }));
  return {
    message: `Found ${notes.length} note(s) for ${lead.contactPerson || lead.businessName}`,
    notes,
    leadId: lead.id,
  };
}

export async function addNote(userId: string, params: any) {
  const { contactName, dealTitle, content, leadId, dealId } = params;

  if (!content || !content.trim()) {
    throw new Error("Note content is required");
  }

  if (dealId || dealTitle) {
    let deal;
    if (dealId) {
      deal = await prisma.deal.findFirst({
        where: { id: dealId, userId },
      });
    } else {
      deal = await prisma.deal.findFirst({
        where: {
          userId,
          title: { contains: dealTitle, mode: "insensitive" },
        },
      });
    }

    if (!deal) {
      throw new Error(`Deal "${dealTitle || dealId}" not found`);
    }

    await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        userId,
        type: "NOTE",
        description: content.trim(),
      },
    });

    return {
      message: `✓ Note added to deal "${deal.title}"`,
      dealId: deal.id,
      type: "deal",
    };
  }

  let lead;
  if (leadId) {
    lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
    });
  } else if (contactName) {
    lead = await prisma.lead.findFirst({
      where: {
        userId,
        OR: [
          { contactPerson: { contains: contactName, mode: "insensitive" } },
          { businessName: { contains: contactName, mode: "insensitive" } },
        ],
      },
    });
  }

  if (!lead) {
    throw new Error(contactName ? `Contact "${contactName}" not found` : "Contact or lead ID is required");
  }

  await prisma.note.create({
    data: {
      leadId: lead.id,
      userId,
      content: content.trim(),
    },
  });

  return {
    message: `✓ Note added to contact ${lead.contactPerson || lead.businessName}`,
    leadId: lead.id,
    type: "contact",
  };
}

export async function bulkUpdateLeadStatus(userId: string, params: any) {
  const { fromStatus, toStatus, limit = 100 } = params;
  if (!toStatus) throw new Error("toStatus is required");

  const where: any = { userId };
  if (fromStatus) where.status = fromStatus;

  const leads = await prisma.lead.findMany({
    where,
    take: Math.min(limit, 500),
  });

  await prisma.lead.updateMany({
    where: { id: { in: leads.map((l) => l.id) } },
    data: { status: toStatus as any },
  });

  return {
    message: `✓ Updated ${leads.length} lead(s) to ${toStatus}.`,
    count: leads.length,
    navigateTo: "/dashboard/contacts",
  };
}

export async function bulkAddTag(userId: string, params: any) {
  const { tag, status, period, limit = 100 } = params;
  if (!tag?.trim()) throw new Error("tag is required");

  const where: any = { userId };
  if (status) where.status = status;
  if (period) {
    const now = new Date();
    if (period === "today") where.createdAt = { gte: new Date(now.setHours(0, 0, 0, 0)) };
    else if (period === "last_week") where.createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    else if (period === "last_2_weeks") where.createdAt = { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) };
    else if (period === "last_month") where.createdAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
  }

  const leads = await prisma.lead.findMany({
    where,
    take: Math.min(limit, 500),
  });

  let count = 0;
  for (const lead of leads) {
    const tags = Array.isArray(lead.tags) ? [...(lead.tags as string[])] : [];
    if (!tags.includes(tag.trim())) {
      tags.push(tag.trim());
      await prisma.lead.update({
        where: { id: lead.id },
        data: { tags: tags as any },
      });
      count++;
    }
  }

  return {
    message: `✓ Added tag "${tag}" to ${count} lead(s).`,
    count,
    navigateTo: "/dashboard/contacts",
  };
}

export async function exportPipelineCsv(userId: string, params: any) {
  const { type = "deals", limit = 1000 } = params;

  if (type === "leads") {
    const leads = await prisma.lead.findMany({
      where: { userId },
      take: Math.min(limit, 5000),
      select: { id: true, contactPerson: true, businessName: true, email: true, phone: true, status: true, createdAt: true },
    });
    const headers = ["ID", "Contact", "Company", "Email", "Phone", "Status", "Created"];
    const rows = leads.map((l) => [l.id, l.contactPerson || "", l.businessName || "", l.email || "", l.phone || "", l.status || "", l.createdAt?.toISOString() || ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    return { message: `✓ Exported ${leads.length} leads.`, csv, filename: `leads-${Date.now()}.csv`, type: "leads", count: leads.length };
  }

  if (type === "deals" || type === "pipeline") {
    const deals = await prisma.deal.findMany({
      where: { userId },
      take: Math.min(limit, 5000),
      include: { lead: true, stage: true },
      orderBy: { createdAt: "desc" },
    });
    const headers = ["ID", "Title", "Value", "Stage", "Lead", "Status", "Created"];
    const rows = deals.map((d) => [d.id, d.title, d.value || 0, d.stage?.name || "", d.lead?.contactPerson || d.lead?.businessName || "", d.status || "", d.createdAt?.toISOString() || ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    return { message: `✓ Exported ${deals.length} deals.`, csv, filename: `pipeline-${Date.now()}.csv`, type: "deals", count: deals.length };
  }

  throw new Error("type must be leads or deals");
}

export async function getDealRiskAlerts(userId: string, params: any) {
  const { staleDays = 7, limit = 10 } = params;
  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

  const deals = await prisma.deal.findMany({
    where: {
      userId,
      status: "OPEN",
      actualCloseDate: null,
    },
    include: {
      stage: true,
      lead: true,
      activities: { take: 1, orderBy: { createdAt: "desc" } },
    },
    take: Math.min(limit * 3, 100),
  });

  const atRisk = deals
    .filter((d) => {
      const lastAct = d.activities[0];
      return !lastAct || lastAct.createdAt < cutoff;
    })
    .slice(0, limit);

  return {
    message: `Found ${atRisk.length} deal(s) that may need attention.`,
    deals: atRisk.map((d) => ({
      id: d.id,
      title: d.title,
      value: d.value,
      stage: d.stage?.name,
      lead: d.lead?.contactPerson || d.lead?.businessName,
      lastActivity: d.activities[0]?.createdAt,
    })),
    navigateTo: "/dashboard/pipeline",
  };
}

export async function doEverythingForContact(userId: string, params: any) {
  const { contactName, actions } = params;
  if (!contactName) throw new Error("contactName is required");
  const lead = await prisma.lead.findFirst({
    where: { userId, contactPerson: { contains: contactName, mode: "insensitive" } },
    include: { deals: { take: 1 }, tasks: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, take: 1 } },
  });
  if (!lead) throw new Error(`Contact "${contactName}" not found`);
  const actionsToRun = actions || ["add_note", "create_deal", "schedule_follow_up", "draft_email"];
  const results: string[] = [];
  if (actionsToRun.includes("add_note") || !actions) {
    await prisma.note.create({
      data: { userId, leadId: lead.id, content: `Composite action: prepared for ${contactName}.` },
    });
    results.push("Added note");
  }
  if ((actionsToRun.includes("create_deal") || !actions) && lead.deals.length === 0) {
    const pipeline = await prisma.pipeline.findFirst({ where: { userId }, include: { stages: true } });
    const firstStage = pipeline?.stages?.[0];
    if (pipeline && firstStage) {
      await prisma.deal.create({
        data: { userId, leadId: lead.id, pipelineId: pipeline.id, stageId: firstStage.id, title: `${lead.contactPerson || lead.businessName} - New` },
      });
      results.push("Created deal");
    }
  }
  if (actionsToRun.includes("schedule_follow_up") || !actions) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    await prisma.task.create({
      data: { userId, leadId: lead.id, title: `Follow up with ${lead.contactPerson || "contact"}`, dueDate, status: "TODO" },
    });
    results.push("Scheduled follow-up");
  }
  return {
    message: `Completed for ${lead.contactPerson || lead.businessName}: ${results.join(", ")}.`,
    leadId: lead.id,
    actionsCompleted: results,
    navigateTo: `/dashboard/contacts?id=${lead.id}`,
  };
}

export async function logEmailToContact(userId: string, params: any) {
  const { contactName, subject, body, leadId } = params;
  const lid = leadId || (contactName ? (await prisma.lead.findFirst({
    where: { userId, contactPerson: { contains: contactName, mode: "insensitive" } },
    select: { id: true },
  }))?.id : null);
  if (!lid) throw new Error("Contact not found. Provide contactName or leadId.");
  await prisma.note.create({
    data: {
      userId,
      leadId: lid,
      content: `[Email logged] Subject: ${subject || "(no subject)"}\n\n${body || ""}`,
    },
  });
  return {
    message: "Email logged to contact.",
    leadId: lid,
    navigateTo: `/dashboard/contacts?id=${lid}`,
  };
}

export async function deleteDuplicateContacts(userId: string, params: any) {
  const { findPotentialDuplicates } = await import('@/lib/lead-generation/deduplication');
  
  console.log(`[DELETE_DUPLICATES] Starting duplicate deletion for user ${userId}...`);
  
  // First, find all potential duplicates
  const potentialDuplicates = await findPotentialDuplicates(userId, 0.85);
  
  if (potentialDuplicates.length === 0) {
    return {
      message: "✅ No duplicate contacts found!",
      duplicatesFound: 0,
      duplicatesDeleted: 0,
    };
  }

  console.log(`[DELETE_DUPLICATES] Found ${potentialDuplicates.length} potential duplicate pairs`);
  
  // Track which leads to keep (oldest) and which to delete
  const leadsToKeep = new Set<string>();
  const leadsToDelete = new Set<string>();
  const processedPairs = new Set<string>();
  
  // First pass: identify which leads to keep (oldest in each pair)
  for (const duplicate of potentialDuplicates) {
    const pairKey = [duplicate.lead1.id, duplicate.lead2.id].sort().join('-');
    
    // Skip if we've already processed this pair
    if (processedPairs.has(pairKey)) {
      continue;
    }
    
    processedPairs.add(pairKey);
    
    // Get full lead data with createdAt
    const lead1 = await prisma.lead.findUnique({
      where: { id: duplicate.lead1.id },
      select: { id: true, createdAt: true },
    });
    
    const lead2 = await prisma.lead.findUnique({
      where: { id: duplicate.lead2.id },
      select: { id: true, createdAt: true },
    });
    
    if (!lead1 || !lead2) continue;
    
    // Keep the older lead, mark the newer one for deletion
    if (lead1.createdAt < lead2.createdAt) {
      leadsToKeep.add(lead1.id);
      // Only mark for deletion if it's not already marked to keep
      if (!leadsToKeep.has(lead2.id)) {
        leadsToDelete.add(lead2.id);
      }
    } else {
      leadsToKeep.add(lead2.id);
      // Only mark for deletion if it's not already marked to keep
      if (!leadsToKeep.has(lead1.id)) {
        leadsToDelete.add(lead1.id);
      }
    }
  }
  
  // Remove any leads from delete set that are in keep set (safety check)
  for (const keepId of leadsToKeep) {
    leadsToDelete.delete(keepId);
  }
  
  console.log(`[DELETE_DUPLICATES] Will delete ${leadsToDelete.size} duplicate contacts`);
  
  // Delete the duplicate leads
  let deletedCount = 0;
  if (leadsToDelete.size > 0) {
    const deleteResult = await prisma.lead.deleteMany({
      where: {
        id: { in: Array.from(leadsToDelete) },
        userId, // Ensure we only delete user's own contacts
      },
    });
    
    deletedCount = deleteResult.count;
    console.log(`[DELETE_DUPLICATES] Successfully deleted ${deletedCount} duplicate contacts`);
  }
  
  return {
    message: deletedCount > 0 
      ? `✅ Successfully deleted ${deletedCount} duplicate contact(s)!`
      : "✅ No duplicates found to delete.",
    duplicatesFound: potentialDuplicates.length,
    duplicatesDeleted: deletedCount,
    details: deletedCount > 0
      ? `Found ${potentialDuplicates.length} duplicate pair(s) and removed ${deletedCount} duplicate contact(s), keeping the oldest version of each.`
      : `Found ${potentialDuplicates.length} duplicate pair(s) but no contacts were deleted (they may have already been removed).`,
  };
}

export async function importContacts(userId: string, params: any) {
  // Navigate to contacts page - user can use the Import button there
  return {
    message: "I'll take you to the Contacts page. Click the 'Import Contacts' button to upload a CSV with columns: name, email, phone, company. I can also create contacts one by one—just say 'Create a lead for [Name] at [email]'.",
    navigateTo: "/dashboard/contacts",
  };
}
