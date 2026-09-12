import { SecurityRiskLevel } from '@smcore/shared';
import { AccountRiskResult } from './securityTypes';

export class AccountRiskService {
  /**
   * Evaluates the risk profile of a Discord account based on age and heuristics.
   */
  public static evaluateRisk(
    accountCreatedAt: Date,
    minimumAccountAgeHours: number,
    now: Date = new Date()
  ): AccountRiskResult {
    const ageMs = Math.max(0, now.getTime() - accountCreatedAt.getTime());
    const accountAgeHours = ageMs / (1000 * 60 * 60);

    if (accountAgeHours < minimumAccountAgeHours) {
      return {
        riskLevel: SecurityRiskLevel.HIGH,
        accountAgeHours: Number(accountAgeHours.toFixed(2)),
        isSuspicious: true,
        reason: `Account age (${accountAgeHours.toFixed(1)}h) is below the required minimum (${minimumAccountAgeHours}h)`,
      };
    }

    // Borderline recent accounts within double the minimum age threshold
    if (accountAgeHours < minimumAccountAgeHours * 2) {
      return {
        riskLevel: SecurityRiskLevel.MEDIUM,
        accountAgeHours: Number(accountAgeHours.toFixed(2)),
        isSuspicious: false,
        reason: `Account created relatively recently (${accountAgeHours.toFixed(1)}h ago)`,
      };
    }

    return {
      riskLevel: SecurityRiskLevel.LOW,
      accountAgeHours: Number(accountAgeHours.toFixed(2)),
      isSuspicious: false,
    };
  }
}
