// Stub exports
export function getApifyToken() { return ''; }
export function getHunterApiKey() { return ''; }
export async function scrapeDuProprio() { return { success: false, listings: [], errors: [] }; }
export async function checkDuProprioJobStatus() { return { status: 'failed', listings: [] }; }
export async function scrapeUSFSBO() { return { success: false, listings: [], errors: [] }; }
export async function createScrapingJob() { return { success: false }; }
export async function runScrapingJob() { return { success: false }; }
export async function getScrapingJobs() { return []; }
export async function updateScrapingJob() { return { success: false }; }
export async function deleteScrapingJob() { return { success: false }; }
export async function getJobsDueForRun() { return []; }
export async function scrapeCentris() { return { success: false, listings: [], errors: [] }; }
export async function checkCentrisJobStatus() { return { status: 'failed', listings: [] }; }
export async function scrapeRealtorCA() { return { success: false, listings: [], errors: [] }; }
export async function checkRealtorCAJobStatus() { return { status: 'failed', listings: [] }; }
export async function scrapeRealtorCom() { return { success: false, listings: [], errors: [] }; }
export async function checkRealtorComJobStatus() { return { status: 'failed', listings: [] }; }
export async function scrapeZillow() { return { success: false, listings: [], errors: [] }; }
export async function checkZillowJobStatus() { return { status: 'failed', listings: [] }; }
export async function scrapeCraigslist() { return { success: false, listings: [], errors: [] }; }
export async function checkCraigslistJobStatus() { return { status: 'failed', listings: [] }; }
