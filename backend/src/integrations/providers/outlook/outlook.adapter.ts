import { Injectable, Logger } from '@nestjs/common';

export interface OutlookCredentials {
  azureTenantId: string;
  clientId: string;
  clientSecret: string;
  senderEmail: string; // the shared mailbox to send from, e.g. concierge@hotel.com
}

/**
 * OutlookAdapter — sends mail via Microsoft Graph using the "Application
 * permission / shared mailbox" approach (spec's Option B), which the spec
 * itself recommends starting with: one app-level OAuth grant per tenant
 * (set up once by a Super Admin), all letters sent from one shared
 * mailbox address. Per-concierge delegated sending (Option A) would be a
 * separate adapter later — this one's `sendMail` signature doesn't assume
 * either, so that stays additive rather than a rewrite.
 *
 * Requires an Azure AD App Registration with `Mail.Send` **application**
 * permission (admin-consented) — that's a manual Azure Portal step only
 * you can do; this adapter is the code side of that setup.
 */
@Injectable()
export class OutlookAdapter {
  private readonly logger = new Logger(OutlookAdapter.name);

  private async getAccessToken(creds: OutlookCredentials): Promise<string> {
    const url = `https://login.microsoftonline.com/${creds.azureTenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!res.ok) throw new Error(`Azure AD token request failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    return data.access_token;
  }

  private async sendOnce(creds: OutlookCredentials, to: string, subject: string, html: string): Promise<void> {
    const token = await this.getAccessToken(creds);
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(creds.senderEmail)}/sendMail`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: 'HTML', content: html },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: true,
      }),
    });
    if (!res.ok) throw new Error(`Graph sendMail failed (${res.status}): ${await res.text()}`);
  }

  /** Sends with one retry on transient failure — never throws; the caller
   * (GuestCommunicationsService) decides what SENT/FAILED means for the audit log. */
  async sendMail(creds: OutlookCredentials, to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await this.sendOnce(creds, to, subject, html);
        return { success: true };
      } catch (err: any) {
        this.logger.error(`Outlook send attempt ${attempt} failed: ${err.message}`);
        if (attempt === 2) return { success: false, error: err.message };
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    return { success: false, error: 'Unknown error' };
  }
}
