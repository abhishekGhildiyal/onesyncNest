import { shopifyApi, ApiVersion, Session } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-07';
import '@shopify/shopify-api/adapters/node';

class SimpleSessionStorage {
  private sessions = new Map<string, Session>();

  async storeSession(session: Session) {
    this.sessions.set(session.id, session);
    return true;
  }

  async loadSession(id: string) {
    return this.sessions.get(id);
  }

  async deleteSession(id: string) {
    return this.sessions.delete(id);
  }

  async deleteSessions(ids: string[]) {
    for (const id of ids) {
      this.sessions.delete(id);
    }
    return true;
  }

  async findSessionsByShop(shop: string) {
    const sessions: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.shop === shop) {
        sessions.push(session);
      }
    }
    return sessions;
  }
}

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || 'c3839e44fcbf9ab0b29051de91282cb4',
  apiSecretKey: process.env.SHOPIFY_API_SECRET || '90a7191a07c4b2fbaa45f9583a75369c',
  scopes: (process.env.SCOPES || 'write_products,read_products').split(','),
  hostName: (process.env.HOST || 'localhost').replace(/https?:\/\//, ''),
  apiVersion: ApiVersion.July24,
  isEmbeddedApp: false,
  restResources,
  sessionStorage: new SimpleSessionStorage(),
});
