/**
 * DNC (Do Not Call) Module Exports
 */

export {
  checkCanadianDNCL,
  bulkCheckCanadianDNCL,
  normalizeCanadianPhone,
  isCanadianPhone,
  type DNCLCheckResult
} from './canadian-dncl';

export {
  checkUSFTCDNC,
  bulkCheckUSFTCDNC,
  normalizeUSPhone,
  isUSPhone,
  type FTCDNCResult
} from './us-ftc-dnc';

export {
  checkDNC,
  bulkCheckDNC,
  filterDNCLeads,
  addToDNC,
  removeFromDNC,
  type UnifiedDNCResult
} from './unified-dnc-check';
