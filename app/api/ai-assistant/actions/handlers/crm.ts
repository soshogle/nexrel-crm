import { leadService, dealService, campaignService, noteService, taskService } from "@/lib/dal";
import { getCrmDb } from "@/lib/dal";
import { createDalContext } from "@/lib/context/industry-context";

export async function createLead(userId: string, params: any) {
  const { name, email, phone, company, status } = params;
  
  if (!name) {
    throw new Error("Lead name is required");
  }

  const ctx = createDalContext(userId);
  const lead = await leadService.create(ctx, {
    businessName: company || name,
    contactPerson: name,
    email: email || null,
    phone: phone || null,
    status: status || "NEW",
    source: "AI Assistant",
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

  const ctx = createDalContext(userId);
  let targetLeadId = leadId;
  if (!targetLeadId && contactName) {
    const found = await leadService.findMany(ctx, {
      where: {
        OR: [
          { businessName: { contains: contactName, mode: "insensitive" } },
          { contactPerson: { contains: contactName, mode: "insensitive" } },
        ],
      },
      take: 1,
    });
    if (!found?.[0]) throw new Error(`Lead "${contactName}" not found`);
    targetLeadId = found[0].id;
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

  const existingLead = await leadService.findUnique(ctx, targetLeadId);

  if (!existingLead) {
    throw new Error("Lead not found");
  }

  const lead = await leadService.update(ctx, targetLeadId, updates);

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

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  let lead;

  if (leadId) {
    lead = await db.lead.findFirst({
      where: { id: leadId, userId: ctx.userId },
      include: {
        notes: { orderBy: { createdAt: "desc" }, take: 5 },
        deals: { include: { stage: true } },
        tasks: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, take: 10 },
      },
    });
  } else if (searchName) {
    lead = await db.lead.findFirst({
      where: {
        userId: ctx.userId,
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

  const ctx = createDalContext(userId);
  let targetId = leadId;
  if (!targetId && contactName) {
    const found = await leadService.findMany(ctx, {
      where: {
        OR: [
          { businessName: { contains: contactName, mode: "insensitive" } },
          { contactPerson: { contains: contactName, mode: "insensitive" } },
        ],
      },
      take: 1,
    });
    if (!found?.[0]) throw new Error(`Lead "${contactName}" not found`);
    targetId = found[0].id;
  }

  if (!targetId) throw new Error("Lead ID or contact name is required");

  const existing = await leadService.findUnique(ctx, targetId);
  if (!existing) throw new Error("Lead not found");

  await leadService.delete(ctx, targetId);

  return {
    message: `Lead "${existing.contactPerson || existing.businessName}" deleted successfully.`,
    leadId: targetId,
  };
}

export async function listLeads(userId: string, params: any) {
  const { status, limit = 10, search } = params;

  const ctx = createDalContext(userId);
  const leads = await leadService.findMany(ctx, {
    status: status || undefined,
    search: search || undefined,
    take: Math.min(limit, 50),
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

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  // Get or create default pipeline
  let pipeline = await db.pipeline.findFirst({
    where: { userId: ctx.userId, isDefault: true },
    include: { stages: { orderBy: { displayOrder: "asc" } } },
  });

  if (!pipeline) {
    // Create default pipeline with stages
    pipeline = await db.pipeline.create({
      data: {
        userId: ctx.userId,
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

  const deal = await dealService.create(ctx, {
    pipeline: { connect: { id: pipeline.id } },
    stage: { connect: { id: firstStage.id } },
    title,
    value: value || 0,
    leadId: leadId || undefined,
    probability: firstStage.probability,
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

  const ctx = createDalContext(userId);
  const existingDeal = await dealService.findUnique(ctx, dealId);

  if (!existingDeal) {
    throw new Error("Deal not found");
  }

  const deal = await dealService.update(ctx, dealId, updates, {
    stage: { select: { name: true } },
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

  const ctx = createDalContext(userId);
  let deal;
  if (dealId) {
    deal = await dealService.findUnique(ctx, dealId, {
      lead: { select: { id: true, businessName: true, contactPerson: true, email: true, phone: true } },
      stage: true,
    });
  } else if (dealTitle) {
    const deals = await dealService.findMany(ctx, {
      where: { title: { contains: dealTitle, mode: "insensitive" } },
      take: 1,
      include: { lead: { select: { id: true, businessName: true, contactPerson: true, email: true, phone: true } }, stage: true },
    });
    deal = deals[0];
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

  const ctx = createDalContext(userId);
  let targetId = dealId;
  if (!targetId && dealTitle) {
    const found = await dealService.findMany(ctx, {
      where: { title: { contains: dealTitle, mode: "insensitive" } },
      take: 1,
    });
    if (!found?.[0]) throw new Error(`Deal "${dealTitle}" not found`);
    targetId = found[0].id;
  }

  if (!targetId) throw new Error("Deal ID or deal title is required");

  const existing = await dealService.findUnique(ctx, targetId);
  if (!existing) throw new Error("Deal not found");

  await dealService.delete(ctx, targetId);

  return {
    message: `Deal "${existing.title}" deleted successfully.`,
    dealId: targetId,
  };
}

export async function createPipeline(userId: string, params: any) {
  const { name, description } = params;

  if (!name) throw new Error("Pipeline name is required");

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const pipeline = await db.pipeline.create({
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

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const pipeline = await db.pipeline.findFirst({
    where: { userId: ctx.userId, name: { contains: pipelineName, mode: "insensitive" } },
    include: { stages: { orderBy: { displayOrder: "asc" } } },
  });

  if (!pipeline) throw new Error(`Pipeline "${pipelineName}" not found`);

  const maxOrder = pipeline.stages.length > 0 ? Math.max(...pipeline.stages.map((s) => s.displayOrder)) + 1 : 0;

  const stage = await db.pipelineStage.create({
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

  const ctx = createDalContext(userId);
  const deals = await dealService.findMany(ctx, {
    take: Math.min(limit, 50),
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

  const ctx = createDalContext(userId);
  const campaign = await campaignService.create(ctx, {
    name,
    type: type || "SMS",
    status: status || "DRAFT",
    smsTemplate: "Default SMS template - please update",
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

  const ctx = createDalContext(userId);
  let campaign;
  if (campaignId) {
    campaign = await campaignService.findUnique(ctx, campaignId);
  } else if (campaignName) {
    const campaigns = await campaignService.findMany(ctx, {
      where: { name: { contains: campaignName, mode: "insensitive" } },
      take: 1,
    });
    campaign = campaigns[0];
  }

  if (!campaign) throw new Error("Campaign not found");

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one field (name or status) is required to update");
  }

  const updated = await campaignService.update(ctx, campaign.id, updates);

  return {
    message: `Campaign "${updated.name}" updated successfully!`,
    campaign: { id: updated.id, name: updated.name, status: updated.status },
  };
}

export async function getCampaignDetails(userId: string, params: any) {
  const { campaignId, campaignName } = params;

  const ctx = createDalContext(userId);
  let campaign;
  if (campaignId) {
    campaign = await campaignService.findUnique(ctx, campaignId);
  } else if (campaignName) {
    const campaigns = await campaignService.findMany(ctx, {
      where: { name: { contains: campaignName, mode: "insensitive" } },
      take: 1,
    });
    campaign = campaigns[0];
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

  const ctx = createDalContext(userId);
  const campaigns = await campaignService.findMany(ctx, {
    status: status || undefined,
    take: Math.min(limit, 50),
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

  const ctx = createDalContext(userId);
  const leads = await leadService.findMany(ctx, {
    search: query,
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

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  let deal;
  if (dealId) {
    deal = await dealService.findUnique(ctx, dealId, { stage: true, pipeline: true });
  } else if (dealTitle) {
    const deals = await dealService.findMany(ctx, {
      where: { title: { contains: dealTitle, mode: "insensitive" } },
      take: 1,
      include: { stage: true, pipeline: true },
    });
    deal = deals[0];
  }

  if (!deal) {
    throw new Error(`Deal "${dealTitle || dealId}" not found`);
  }

  const stage = await db.pipelineStage.findFirst({
    where: {
      pipelineId: deal.pipelineId,
      name: { contains: stageName, mode: "insensitive" },
    },
  });

  if (!stage) {
    const stages = await db.pipelineStage.findMany({
      where: { pipelineId: deal.pipelineId },
      orderBy: { displayOrder: "asc" },
    });
    throw new Error(
      `Stage "${stageName}" not found. Available stages: ${stages.map((s) => s.name).join(", ")}`
    );
  }

  const updatedDeal = await dealService.update(ctx, deal.id, {
    stageId: stage.id,
    probability: stage.probability,
  }, { lead: true, stage: true });

  await db.dealActivity.create({
    data: {
      dealId: deal.id,
      userId: ctx.userId,
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

  const ctx = createDalContext(userId);
  let targetDealId = dealId;
  if (!targetDealId && dealTitle) {
    const deals = await dealService.findMany(ctx, {
      where: { title: { contains: dealTitle, mode: "insensitive" } },
      take: 1,
    });
    if (!deals?.[0]) {
      throw new Error(`Deal "${dealTitle}" not found`);
    }
    targetDealId = deals[0].id;
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

  const ctx = createDalContext(userId);
  let deal;
  if (dealId) {
    deal = await dealService.findUnique(ctx, dealId);
  } else if (dealTitle) {
    const deals = await dealService.findMany(ctx, {
      where: { title: { contains: dealTitle, mode: "insensitive" } },
      take: 1,
    });
    deal = deals[0];
  }
  if (!deal) throw new Error(`Deal "${dealTitle || dealId}" not found`);

  let lead;
  if (leadId) {
    lead = await leadService.findUnique(ctx, leadId);
  } else if (contactName) {
    const leads = await leadService.findMany(ctx, {
      where: {
        OR: [
          { contactPerson: { contains: contactName, mode: "insensitive" } },
          { businessName: { contains: contactName, mode: "insensitive" } },
        ],
      },
      take: 1,
    });
    lead = leads[0];
  }
  if (!lead) throw new Error(contactName ? `Contact "${contactName}" not found` : "Lead ID or contact name is required");

  await dealService.update(ctx, deal.id, { leadId: lead.id });

  return {
    message: `✓ Deal "${deal.title}" linked to ${lead.contactPerson || lead.businessName}`,
    dealId: deal.id,
    leadId: lead.id,
  };
}

export async function getPipelineStages(userId: string, params: any) {
  const { pipelineName } = params;

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  let pipeline;
  if (pipelineName) {
    pipeline = await db.pipeline.findFirst({
      where: { userId: ctx.userId, name: { contains: pipelineName, mode: "insensitive" } },
      include: { stages: { orderBy: { displayOrder: "asc" } } },
    });
  } else {
    pipeline = await db.pipeline.findFirst({
      where: { userId: ctx.userId, isDefault: true },
      include: { stages: { orderBy: { displayOrder: "asc" } } },
    });
    if (!pipeline) {
      pipeline = await db.pipeline.findFirst({
        where: { userId: ctx.userId },
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

  const ctx = createDalContext(userId);
  let lead;
  if (leadId) {
    lead = await leadService.findUnique(ctx, leadId);
  } else if (contactName) {
    const leads = await leadService.findMany(ctx, {
      where: {
        OR: [
          { contactPerson: { contains: contactName, mode: "insensitive" } },
          { businessName: { contains: contactName, mode: "insensitive" } },
        ],
      },
      take: 1,
    });
    lead = leads[0];
  }
  if (!lead) throw new Error(contactName ? `Contact "${contactName}" not found` : "Lead ID or contact name is required");

  const tags = Array.isArray(lead.tags) ? [...(lead.tags as string[])] : [];
  const tagValue = tag.trim();
  if (!tags.includes(tagValue)) tags.push(tagValue);

  await leadService.update(ctx, lead.id, { tags: tags as any });

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

  const ctx = createDalContext(userId);
  let lead;
  if (leadId) {
    lead = await leadService.findUnique(ctx, leadId);
  } else if (contactName) {
    const leads = await leadService.findMany(ctx, {
      where: {
        OR: [
          { contactPerson: { contains: contactName, mode: "insensitive" } },
          { businessName: { contains: contactName, mode: "insensitive" } },
        ],
      },
      take: 1,
    });
    lead = leads[0];
  }
  if (!lead) throw new Error(contactName ? `Contact "${contactName}" not found` : "Lead ID or contact name is required");

  await leadService.update(ctx, lead.id, { status: status as any });

  return {
    message: `✓ ${lead.contactPerson || lead.businessName} status updated to ${status}`,
    leadId: lead.id,
    status,
  };
}

export async function listNotes(userId: string, params: any) {
  const { contactName, dealTitle, leadId, dealId, limit = 10 } = params;

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  if (dealId || dealTitle) {
    let deal;
    if (dealId) {
      deal = await db.deal.findFirst({
        where: { id: dealId, userId: ctx.userId },
        include: { activities: { where: { type: "NOTE" }, orderBy: { createdAt: "desc" }, take: Math.min(limit, 50) } },
      });
    } else {
      deal = await db.deal.findFirst({
        where: { userId: ctx.userId, title: { contains: dealTitle, mode: "insensitive" } },
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
    lead = await db.lead.findFirst({
      where: { id: leadId, userId: ctx.userId },
      include: { notes: { orderBy: { createdAt: "desc" }, take: Math.min(limit, 50) } },
    });
  } else if (contactName) {
    lead = await db.lead.findFirst({
      where: {
        userId: ctx.userId,
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

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);

  if (dealId || dealTitle) {
    let deal;
    if (dealId) {
      deal = await db.deal.findFirst({
        where: { id: dealId, userId: ctx.userId },
      });
    } else {
      deal = await db.deal.findFirst({
        where: {
          userId: ctx.userId,
          title: { contains: dealTitle, mode: "insensitive" },
        },
      });
    }

    if (!deal) {
      throw new Error(`Deal "${dealTitle || dealId}" not found`);
    }

    await db.dealActivity.create({
      data: {
        dealId: deal.id,
        userId: ctx.userId,
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
    lead = await leadService.findUnique(ctx, leadId);
  } else if (contactName) {
    const leads = await leadService.findMany(ctx, {
      where: {
        OR: [
          { contactPerson: { contains: contactName, mode: "insensitive" } },
          { businessName: { contains: contactName, mode: "insensitive" } },
        ],
      },
      take: 1,
    });
    lead = leads[0];
  }

  if (!lead) {
    throw new Error(contactName ? `Contact "${contactName}" not found` : "Contact or lead ID is required");
  }

  await noteService.create(ctx, {
    leadId: lead.id,
    content: content.trim(),
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

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const leads = await leadService.findMany(ctx, {
    where: fromStatus ? { status: fromStatus } : undefined,
    take: Math.min(limit, 500),
  });

  if (leads.length > 0) {
    await db.lead.updateMany({
      where: { id: { in: leads.map((l) => l.id) } },
      data: { status: toStatus as any },
    });
  }

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

  const leads = await leadService.findMany(ctx, {
    where: Object.keys(where).length > 0 ? where : undefined,
    take: Math.min(limit, 500),
  });

  let count = 0;
  for (const lead of leads) {
    const tags = Array.isArray(lead.tags) ? [...(lead.tags as string[])] : [];
    if (!tags.includes(tag.trim())) {
      tags.push(tag.trim());
      await leadService.update(ctx, lead.id, { tags: tags as any });
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

  const ctx = createDalContext(userId);

  if (type === "leads") {
    const leads = await leadService.findMany(ctx, {
      take: Math.min(limit, 5000),
      select: { id: true, contactPerson: true, businessName: true, email: true, phone: true, status: true, createdAt: true },
    });
    const headers = ["ID", "Contact", "Company", "Email", "Phone", "Status", "Created"];
    const rows = leads.map((l) => [l.id, l.contactPerson || "", l.businessName || "", l.email || "", l.phone || "", l.status || "", l.createdAt?.toISOString() || ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    return { message: `✓ Exported ${leads.length} leads.`, csv, filename: `leads-${Date.now()}.csv`, type: "leads", count: leads.length };
  }

  if (type === "deals" || type === "pipeline") {
    const deals = await dealService.findMany(ctx, {
      take: Math.min(limit, 5000),
      include: { lead: true, stage: true },
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

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const deals = await db.deal.findMany({
    where: {
      userId: ctx.userId,
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

  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const leads = await leadService.findMany(ctx, {
    where: { contactPerson: { contains: contactName, mode: "insensitive" } },
    take: 1,
    include: { deals: { take: 1 }, tasks: { where: { status: { notIn: ["COMPLETED", "CANCELLED"] } }, take: 1 } },
  });
  const lead = leads[0];
  if (!lead) throw new Error(`Contact "${contactName}" not found`);
  const actionsToRun = actions || ["add_note", "create_deal", "schedule_follow_up", "draft_email"];
  const results: string[] = [];
  if (actionsToRun.includes("add_note") || !actions) {
    await noteService.create(ctx, { leadId: lead.id, content: `Composite action: prepared for ${contactName}.` });
    results.push("Added note");
  }
  if ((actionsToRun.includes("create_deal") || !actions) && lead.deals.length === 0) {
    const pipeline = await db.pipeline.findFirst({ where: { userId: ctx.userId }, include: { stages: true } });
    const firstStage = pipeline?.stages?.[0];
    if (pipeline && firstStage) {
      await dealService.create(ctx, {
        pipeline: { connect: { id: pipeline.id } },
        stage: { connect: { id: firstStage.id } },
        lead: { connect: { id: lead.id } },
        title: `${lead.contactPerson || lead.businessName} - New`,
        probability: firstStage.probability,
      });
      results.push("Created deal");
    }
  }
  if (actionsToRun.includes("schedule_follow_up") || !actions) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    await taskService.create(ctx, {
      leadId: lead.id,
      title: `Follow up with ${lead.contactPerson || "contact"}`,
      dueDate,
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

  const ctx = createDalContext(userId);
  let lid = leadId;
  if (!lid && contactName) {
    const leads = await leadService.findMany(ctx, {
      where: { contactPerson: { contains: contactName, mode: "insensitive" } },
      take: 1,
      select: { id: true },
    });
    lid = leads[0]?.id ?? null;
  }
  if (!lid) throw new Error("Contact not found. Provide contactName or leadId.");
  await noteService.create(ctx, {
    leadId: lid,
    content: `[Email logged] Subject: ${subject || "(no subject)"}\n\n${body || ""}`,
  });
  return {
    message: "Email logged to contact.",
    leadId: lid,
    navigateTo: `/dashboard/contacts?id=${lid}`,
  };
}

export async function deleteDuplicateContacts(userId: string, params: any) {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
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
    const lead1 = await db.lead.findUnique({
      where: { id: duplicate.lead1.id },
      select: { id: true, createdAt: true },
    });
    
    const lead2 = await db.lead.findUnique({
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
    const deleteResult = await leadService.deleteMany(ctx, {
      id: { in: Array.from(leadsToDelete) },
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
