/**
 * Twilio Phone Number Management Service
 * Handles searching and purchasing phone numbers
 * Supports primary + backup accounts via TwilioAccount table
 */

import { prisma } from "./db";
import {
  getPrimaryCredentials,
  getBackupCredentials,
  getCredentialsForAccount,
  type TwilioCredentials,
} from "./twilio-credentials";

interface AvailablePhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  postalCode: string;
  isoCountry: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
}

/**
 * Get Twilio credentials - uses primary account, or specific account if twilioAccountId provided
 */
async function getTwilioCredentials(
  userId: string,
  twilioAccountId?: string,
): Promise<TwilioCredentials | null> {
  if (twilioAccountId) {
    return getCredentialsForAccount(twilioAccountId);
  }
  return getPrimaryCredentials();
}

/**
 * Search for available phone numbers
 * Tries primary account first; falls back to backup if no results
 */
export async function searchAvailableNumbers(
  userId: string,
  options: {
    countryCode?: string;
    areaCode?: string;
    contains?: string;
    smsEnabled?: boolean;
    voiceEnabled?: boolean;
    limit?: number;
  } = {},
): Promise<{
  success: boolean;
  numbers?: AvailablePhoneNumber[];
  twilioAccountId?: string; // Which account had results (for purchase)
  error?: string;
}> {
  const {
    countryCode = "US",
    areaCode,
    contains,
    smsEnabled = true,
    voiceEnabled = true,
    limit = 20,
  } = options;

  const searchWithAccount = async (
    creds: TwilioCredentials,
  ): Promise<{ numbers: AvailablePhoneNumber[]; twilioAccountId?: string }> => {
    const baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/AvailablePhoneNumbers/${countryCode}/Local.json`;
    const params = new URLSearchParams();
    if (areaCode) params.append("AreaCode", areaCode);
    if (contains) params.append("Contains", contains);
    if (smsEnabled) params.append("SmsEnabled", "true");
    if (voiceEnabled) params.append("VoiceEnabled", "true");
    params.append("PageSize", limit.toString());
    const url = `${baseUrl}?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString(
            "base64",
          ),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to search phone numbers");
    }

    const data = await response.json();
    const numbers: AvailablePhoneNumber[] =
      data.available_phone_numbers?.map((num: any) => ({
        phoneNumber: num.phone_number,
        friendlyName: num.friendly_name,
        locality: num.locality || "",
        region: num.region || "",
        postalCode: num.postal_code || "",
        isoCountry: num.iso_country,
        capabilities: {
          voice: num.capabilities?.voice || false,
          SMS: num.capabilities?.SMS || false,
          MMS: num.capabilities?.MMS || false,
        },
      })) || [];

    return {
      numbers,
      twilioAccountId: creds.twilioAccountId,
    };
  };

  try {
    // 1. Try primary account first
    const primaryCreds = await getPrimaryCredentials();
    if (primaryCreds) {
      try {
        const result = await searchWithAccount(primaryCreds);
        if (result.numbers.length > 0) {
          return {
            success: true,
            numbers: result.numbers,
            twilioAccountId: result.twilioAccountId,
          };
        }
      } catch (primaryErr) {
        console.warn("Primary account search failed:", primaryErr);
      }
    }

    // 2. Fallback to backup account
    const backupCreds = await getBackupCredentials();
    if (backupCreds) {
      try {
        const result = await searchWithAccount(backupCreds);
        return {
          success: true,
          numbers: result.numbers,
          twilioAccountId: result.twilioAccountId,
        };
      } catch (backupErr) {
        console.warn("Backup account search failed:", backupErr);
      }
    }

    if (!primaryCreds && !backupCreds) {
      return {
        success: false,
        error:
          "Twilio credentials not found. Please configure TWILIO_PRIMARY_* or TWILIO_BACKUP_* in environment.",
      };
    }

    return {
      success: true,
      numbers: [],
      error: "No numbers found in primary or backup accounts.",
    };
  } catch (error) {
    console.error("Error searching phone numbers:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to search phone numbers",
    };
  }
}

/**
 * Purchase a phone number
 * Uses twilioAccountId if provided (from search result); otherwise primary account
 */
export async function purchasePhoneNumber(
  userId: string,
  phoneNumber: string,
  options: {
    voiceUrl?: string;
    voiceFallbackUrl?: string;
    smsUrl?: string;
    friendlyName?: string;
    twilioAccountId?: string;
  } = {},
): Promise<{
  success: boolean;
  phoneNumber?: string;
  twilioAccountId?: string;
  error?: string;
}> {
  try {
    const credentials = await getTwilioCredentials(
      userId,
      options.twilioAccountId,
    );

    if (!credentials) {
      return {
        success: false,
        error: "Twilio credentials not found. Please configure Twilio first.",
      };
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/IncomingPhoneNumbers.json`;

    const formData = new URLSearchParams();
    formData.append("PhoneNumber", phoneNumber);

    if (options.friendlyName) {
      formData.append("FriendlyName", options.friendlyName);
    }

    if (options.voiceUrl) {
      formData.append("VoiceUrl", options.voiceUrl);
      formData.append("VoiceMethod", "POST");
    }

    if (options.voiceFallbackUrl) {
      formData.append("VoiceFallbackUrl", options.voiceFallbackUrl);
      formData.append("VoiceFallbackMethod", "POST");
    }

    if (options.smsUrl) {
      formData.append("SmsUrl", options.smsUrl);
      formData.append("SmsMethod", "POST");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${credentials.accountSid}:${credentials.authToken}`,
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Twilio purchase error:", errorData);
      return {
        success: false,
        error: errorData.message || "Failed to purchase phone number",
      };
    }

    const data = await response.json();
    const accountId = credentials.twilioAccountId || options.twilioAccountId;

    await prisma.purchasedPhoneNumber.create({
      data: {
        userId,
        phoneNumber: data.phone_number || phoneNumber,
        friendlyName: options.friendlyName || phoneNumber,
        country: data.iso_country || "US",
        capabilities: {
          voice: data.capabilities?.voice || false,
          sms: data.capabilities?.sms || false,
          mms: data.capabilities?.mms || false,
        },
        twilioSid: data.sid,
        twilioAccountId: accountId || undefined,
        status: "active",
      },
    });

    // Update user's Twilio phone number in smsProviderConfig
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { smsProviderConfig: true },
    });

    if (user?.smsProviderConfig) {
      try {
        const config = JSON.parse(user.smsProviderConfig);
        config.phoneNumber = phoneNumber;

        await prisma.user.update({
          where: { id: userId },
          data: {
            smsProviderConfig: JSON.stringify(config),
            smsProviderConfigured: true,
          },
        });
      } catch (error) {
        console.error("Error updating Twilio config with phone number:", error);
      }
    }

    console.log("Phone number purchased successfully:", data.phone_number);

    return {
      success: true,
      phoneNumber: data.phone_number,
      twilioAccountId: accountId,
    };
  } catch (error) {
    console.error("Error purchasing phone number:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to purchase phone number",
    };
  }
}

/**
 * Get phone numbers from both platform Twilio accounts (PRIMARY + BACKUP)
 * Used for Connect Phone pool - shows all numbers the platform has access to
 */
export async function getPhoneNumbersFromPlatformAccounts(): Promise<{
  success: boolean;
  numbers?: Array<{
    phoneNumber: string;
    friendlyName?: string;
    twilioAccountId?: string;
    source?: "primary" | "backup";
  }>;
  error?: string;
}> {
  const results: Array<{
    phoneNumber: string;
    friendlyName?: string;
    twilioAccountId?: string;
    source?: "primary" | "backup";
  }> = [];
  const seen = new Set<string>();

  const fetchForAccount = async (
    creds: { accountSid: string; authToken: string; twilioAccountId?: string },
    label: "primary" | "backup",
  ) => {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/IncomingPhoneNumbers.json?PageSize=100`;
    const res = await fetch(url, {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString(
            "base64",
          ),
      },
    });
    if (!res.ok) {
      console.warn(
        `[getPhoneNumbersFromPlatformAccounts] ${label} fetch failed: ${res.status} ${res.statusText}`,
      );
      return;
    }
    const data = await res.json();
    const list = data.incoming_phone_numbers || [];
    for (const p of list) {
      const num = p.phone_number || p.number;
      if (num && !seen.has(num)) {
        seen.add(num);
        results.push({
          phoneNumber: num,
          friendlyName: p.friendly_name || num,
          twilioAccountId: creds.twilioAccountId,
          source: label,
        });
      }
    }
  };

  try {
    const { getPrimaryCredentials, getBackupCredentials } = await import(
      "./twilio-credentials"
    );
    const primary = await getPrimaryCredentials();
    if (primary) {
      await fetchForAccount(primary, "primary");
      console.log(
        `[getPhoneNumbersFromPlatformAccounts] PRIMARY: ${results.length} numbers so far`,
      );
    } else {
      console.warn(
        "[getPhoneNumbersFromPlatformAccounts] PRIMARY credentials not found (check TwilioAccount envKey=PRIMARY or TWILIO_ACCOUNT_SID)",
      );
    }
    const backup = await getBackupCredentials();
    if (backup) {
      const beforeBackup = results.length;
      await fetchForAccount(backup, "backup");
      console.log(
        `[getPhoneNumbersFromPlatformAccounts] BACKUP: added ${results.length - beforeBackup} numbers (total: ${results.length})`,
      );
    }
    // Ensure primary numbers always appear before backup (in case of any reordering)
    results.sort((a, b) => {
      const order = { primary: 0, backup: 1 };
      return (
        (order[a.source ?? "backup"] ?? 1) - (order[b.source ?? "backup"] ?? 1)
      );
    });
    return { success: true, numbers: results };
  } catch (err) {
    console.error("getPhoneNumbersFromPlatformAccounts error:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to fetch platform numbers",
    };
  }
}

/**
 * Get list of owned phone numbers for a specific user
 * Uses PurchasedPhoneNumber table for proper multi-tenancy
 * Optionally merges with platform pool (numbers from PRIMARY + BACKUP Twilio accounts)
 */
export async function getOwnedPhoneNumbers(
  userId: string,
  options?: { includePlatformPool?: boolean },
): Promise<{ success: boolean; numbers?: any[]; error?: string }> {
  try {
    console.log("📞 Getting owned phone numbers for user:", userId);

    // Fetch numbers from PurchasedPhoneNumber table for THIS USER ONLY
    const purchasedNumbers = await prisma.purchasedPhoneNumber.findMany({
      where: {
        userId: userId,
        status: "active",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const seen = new Set<string>();
    const formattedNumbers = purchasedNumbers.map((number) => {
      seen.add(number.phoneNumber);
      return {
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName || number.phoneNumber,
        sid: number.twilioSid,
        twilioAccountId: number.twilioAccountId,
        capabilities: number.capabilities as any,
        country: number.country || "US",
        dateCreated: number.createdAt,
      };
    });

    // Optionally merge with platform pool (PRIMARY + BACKUP Twilio accounts)
    if (options?.includePlatformPool) {
      const platform = await getPhoneNumbersFromPlatformAccounts();
      if (platform.success && platform.numbers?.length) {
        for (const p of platform.numbers) {
          if (!seen.has(p.phoneNumber)) {
            seen.add(p.phoneNumber);
            formattedNumbers.push({
              phoneNumber: p.phoneNumber,
              friendlyName: p.friendlyName || p.phoneNumber,
              sid: null as unknown as string,
              twilioAccountId: p.twilioAccountId ?? null,
              capabilities: null,
              country: "US",
              dateCreated: null as unknown as Date,
            });
          }
        }
      }
    }

    console.log(`✅ Found ${formattedNumbers.length} phone numbers for user`);

    return {
      success: true,
      numbers: formattedNumbers,
    };
  } catch (error) {
    console.error("❌ Error fetching owned numbers:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch phone numbers",
    };
  }
}
