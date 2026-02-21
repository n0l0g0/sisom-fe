export const API_URL = (() => {
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL || 'http://localhost:3001';
  }
  const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const hostname = new URL(envUrl).hostname;
    const currentHost = window.location.hostname;
    if (hostname === 'api.washqueue.com') return 'https://line-sisom.washqueue.com/api';
    if (currentHost === 'cms.washqueue.com') return 'https://line-sisom.washqueue.com/api';
  } catch {}
  return envUrl;
})();

export interface Building {
  id: string;
  name: string;
  code?: string;
  floors: number;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'OVERDUE';
  pricePerMonth?: number;
  waterOverrideAmount?: number;
  electricOverrideAmount?: number;
  contracts?: Contract[];
  meterReadings?: MeterReading[];
  buildingId?: string;
  building?: Building;
}

export interface RoomContact {
  id: string;
  name: string;
  phone: string;
  lineUserId?: string;
}

export interface Tenant {
  id: string;
  name: string;
  nickname?: string;
  phone: string;
  idCard?: string;
  address?: string;
  lineUserId?: string;
  status: 'ACTIVE' | 'MOVED_OUT';
  contracts?: Contract[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Contract {
  id: string;
  tenantId: string;
  roomId: string;
  startDate: string;
  endDate?: string;
  deposit: number;
  currentRent: number;
  occupantCount: number;
  isActive: boolean;
  contractImageUrl?: string;
  tenant?: Tenant;
  room?: Room;
}

export interface MeterReading {
  id: string;
  roomId: string;
  month: number;
  year: number;
  waterReading: number;
  electricReading: number;
  room?: Room;
  createdAt: string;
}

export interface Invoice {
  id: string;
  contractId: string;
  month: number;
  year: number;
  rentAmount: number;
  waterAmount: number;
  electricAmount: number;
  otherFees: number;
  discount: number;
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  contract?: Contract;
  payments?: Payment[];
  items?: InvoiceItem[];
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  amount: number;
}
export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  slipImageUrl?: string;
  slipBankRef?: string;
  paidAt: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  invoice?: Invoice;
}

export interface DormConfig {
  id: string;
  dormName?: string;
  address?: string;
  phone?: string;
  lineId?: string;
  waterUnitPrice: number;
  waterFeeMethod?:
    | 'METER_USAGE'
    | 'METER_USAGE_MIN_AMOUNT'
    | 'METER_USAGE_MIN_UNITS'
    | 'METER_USAGE_PLUS_BASE'
    | 'METER_USAGE_TIERED'
    | 'FLAT_MONTHLY'
    | 'FLAT_PER_PERSON';
  waterFlatMonthlyFee?: number | null;
  waterFlatPerPersonFee?: number | null;
  waterMinAmount?: number | null;
  waterMinUnits?: number | null;
  waterBaseFee?: number | null;
  waterTieredRates?: Array<{
    uptoUnit?: number | null;
    unitPrice: number;
    chargeType?: 'PER_UNIT' | 'FLAT';
  }> | null;
  electricUnitPrice: number;
  electricFeeMethod?:
    | 'METER_USAGE'
    | 'METER_USAGE_MIN_AMOUNT'
    | 'METER_USAGE_MIN_UNITS'
    | 'METER_USAGE_PLUS_BASE'
    | 'METER_USAGE_TIERED'
    | 'FLAT_MONTHLY';
  electricFlatMonthlyFee?: number | null;
  electricMinAmount?: number | null;
  electricMinUnits?: number | null;
  electricBaseFee?: number | null;
  electricTieredRates?: Array<{
    uptoUnit?: number | null;
    unitPrice: number;
    chargeType?: 'PER_UNIT' | 'FLAT';
  }> | null;
  commonFee: number;
  bankAccount?: string;
}

export interface DormExtra {
  logoUrl?: string;
  mapUrl?: string;
  lineLink?: string;
}

export interface MaintenanceRequest {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  reportedBy?: string;
  resolvedAt?: string;
  cost?: number;
  room?: Room;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  roomId: string;
  name: string;
  serialNumber?: string;
  status: 'GOOD' | 'BROKEN' | 'MISSING';
  room?: Room;
  createdAt: string;
  updatedAt: string;
}

export interface RoomGalleryItem {
  filename: string;
  url: string;
}

export interface CreateAsset {
  roomId: string;
  name: string;
  serialNumber?: string;
  status?: 'GOOD' | 'BROKEN' | 'MISSING';
}

export interface UpdateAsset {
  name?: string;
  serialNumber?: string;
  status?: 'GOOD' | 'BROKEN' | 'MISSING';
}

export interface CreateMaintenanceRequest {
  roomId: string;
  title: string;
  description?: string;
  reportedBy?: string;
}

export interface UpdateMaintenanceRequest {
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  resolvedAt?: string;
  cost?: number;
}

export interface User {
  id: string;
  username: string;
  name?: string;
  role: 'OWNER' | 'ADMIN';
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  lineUserId?: string;
  phone?: string;
  verifyCode?: string;
}
export interface RecentChat {
  id: string;
  userId: string;
  type: 'received_text' | 'received_image' | 'sent_text' | 'sent_flex';
  text?: string;
  altText?: string;
  actor?: string;
  timestamp: string;
}
export interface LineProfile {
  displayName?: string;
  pictureUrl?: string;
}
export interface LineUsage {
  month: string;
  sent: number;
  limit: number;
  remaining: number;
  percent: number;
  breakdown: { pushText: number; pushFlex: number };
}

export interface CreateUserDto {
  username: string;
  passwordHash: string;
  name?: string;
  phone?: string;
  lineUserId?: string;
  role?: 'OWNER' | 'ADMIN';
  permissions?: string[];
}

export type UpdateUserDto = Partial<CreateUserDto & { lineUserId?: string; verifyCode?: string }>;

export interface LoginResponse {
  access_token: string;
  user: User;
}

// API Functions
export const api = {
  // Auth
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Login failed');
    }
    return res.json();
  },

  loginWithLine: async (lineUserId: string): Promise<LoginResponse> => {
    const res = await fetch(`${API_URL}/auth/login-line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUserId }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'LINE login failed');
    }
    return res.json();
  },

  getMoveoutState: async (tenantId: string): Promise<{ requestedAt: string | null; days: number }> => {
    const res = await fetch(`${API_URL}/line/moveout/${tenantId}`);
    if (!res.ok) throw new Error('Failed to get moveout state');
    return res.json();
  },

  getLinkRequests: async (roomId: string): Promise<Array<{ userId: string; phone: string; tenantId: string; createdAt: string }>> => {
    const res = await fetch(`${API_URL}/line/link-requests/${roomId}`);
    if (!res.ok) throw new Error('Failed to get link requests');
    const data = await res.json();
    return (data?.list || []) as Array<{ userId: string; phone: string; tenantId: string; createdAt: string }>;
  },

  getRoomContacts: async (roomId: string): Promise<RoomContact[]> => {
    const res = await fetch(`${API_URL}/rooms/${roomId}/contacts`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch room contacts');
    const data = await res.json().catch(() => ({}));
    return (data?.contacts || []) as RoomContact[];
  },

  createRoomContact: async (
    roomId: string,
    payload: { name?: string; phone?: string },
  ): Promise<RoomContact[]> => {
    const res = await fetch(`${API_URL}/rooms/${roomId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || 'Failed to create room contact');
    }
    const data = await res.json().catch(() => ({}));
    return (data?.contacts || []) as RoomContact[];
  },

  clearRoomContactLine: async (
    roomId: string,
    contactId: string,
  ): Promise<RoomContact[]> => {
    const res = await fetch(
      `${API_URL}/rooms/${roomId}/contacts/${contactId}/clear-line`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    if (!res.ok) throw new Error('Failed to clear room contact line');
    const data = await res.json().catch(() => ({}));
    return (data?.contacts || []) as RoomContact[];
  },

  unlinkRichMenu: async (
    userId: string,
    fallbackTo: 'GENERAL' | 'TENANT' | 'ADMIN' = 'GENERAL',
  ): Promise<{ ok: boolean }> => {
    const res = await fetch(`${API_URL}/line/richmenu/unlink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, fallbackTo }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || 'Failed to unlink rich menu');
    }
    return res.json();
  },

  deleteRoomContact: async (
    roomId: string,
    contactId: string,
  ): Promise<RoomContact[]> => {
    const res = await fetch(
      `${API_URL}/rooms/${roomId}/contacts/${contactId}`,
      {
        method: 'DELETE',
      },
    );
    if (!res.ok) throw new Error('Failed to delete room contact');
    const data = await res.json().catch(() => ({}));
    return (data?.contacts || []) as RoomContact[];
  },

  acceptLinkRequest: async (roomId: string, userId: string, tenantId: string): Promise<{ ok: boolean }> => {
    const res = await fetch(`${API_URL}/line/link-requests/${roomId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, tenantId }),
    });
    if (!res.ok) throw new Error('Failed to accept link request');
    return res.json();
  },

  rejectLinkRequest: async (roomId: string, userId: string): Promise<{ ok: boolean }> => {
    const res = await fetch(`${API_URL}/line/link-requests/${roomId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to reject link request');
    return res.json();
  },
  getRecentChats: async (limit = 5): Promise<RecentChat[]> => {
    const res = await fetch(`${API_URL}/line/recent-chats?limit=${limit}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch recent chats');
    const data = await res.json().catch(() => ({}));
    return (data?.items || []) as RecentChat[];
  },
  getUserChats: async (userId: string, limit = 50, before?: string): Promise<RecentChat[]> => {
    const params = new URLSearchParams();
    params.set('userId', userId);
    params.set('limit', String(limit));
    if (before) params.set('before', before);
    const res = await fetch(`${API_URL}/line/chats?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch user chats');
    const data = await res.json().catch(() => ({}));
    return (data?.items || []) as RecentChat[];
  },
  getLineProfiles: async (userIds: string[]): Promise<Record<string, LineProfile>> => {
    const ids = Array.from(new Set((userIds || []).map((s) => (s || '').trim()).filter((s) => s.length > 0)));
    if (ids.length === 0) return {};
    const query = encodeURIComponent(ids.join(','));
    const res = await fetch(`${API_URL}/line/profiles?userIds=${query}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch LINE profiles');
    const data = await res.json().catch(() => ({}));
    return (data?.profiles || {}) as Record<string, LineProfile>;
  },
  getLineUsage: async (): Promise<LineUsage> => {
    const res = await fetch(`${API_URL}/line/usage`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch LINE usage');
    return res.json();
  },
  sendLineMessage: async (userId: string, text: string, actor?: string): Promise<{ ok: boolean }> => {
    const res = await fetch(`${API_URL}/line/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, text, actor }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || 'Failed to send LINE message');
    }
    return res.json();
  },

  settleInvoice: async (id: string, method: 'DEPOSIT' | 'CASH', paidAt?: string): Promise<Invoice> => {
    const res = await fetch(`${API_URL}/invoices/${id}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, paidAt }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(txt || 'Failed to settle invoice');
    }
    return res.json();
  },

  // Buildings
  getBuildings: async (): Promise<Building[]> => {
    const res = await fetch(`${API_URL}/buildings`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch buildings');
    return res.json();
  },

  // Rooms
  getRooms: async (): Promise<Room[]> => {
    const res = await fetch(`${API_URL}/rooms`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch rooms');
    const data: Room[] = await res.json();

    // Debug logging to verify rooms loaded from API
    if (typeof window !== 'undefined') {
      // Browser console
      // eslint-disable-next-line no-console
      console.log(
        '[sisom-fe] getRooms:',
        data.length,
        'rooms ->',
        data.map((r) => r.number).join(', '),
      );
    } else {
      // Server / Node console
      // eslint-disable-next-line no-console
      console.log(
        '[sisom-fe] getRooms (server):',
        data.length,
        'rooms ->',
        data.map((r) => r.number).join(', '),
      );
    }

    return data;
  },
  createRoom: async (data: Omit<Room, 'id' | 'contracts' | 'meterReadings'> & { buildingId?: string }): Promise<Room> => {
    const res = await fetch(`${API_URL}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create room');
    return res.json();
  },

  getRoom: async (id: string): Promise<Room> => {
    const res = await fetch(`${API_URL}/rooms/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch room');
    return res.json();
  },

  // Contracts
  getContracts: async (): Promise<Contract[]> => {
    const res = await fetch(`${API_URL}/contracts`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch contracts');
    return res.json();
  },

  createContract: async (data: Omit<Contract, 'id' | 'isActive' | 'tenant' | 'room'>): Promise<Contract> => {
    const res = await fetch(`${API_URL}/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create contract');
    return res.json();
  },

  updateContract: async (id: string, data: Partial<Contract>): Promise<Contract> => {
    const res = await fetch(`${API_URL}/contracts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update contract');
    return res.json();
  },

  uploadMedia: async (file: File): Promise<{ url: string; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/media/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload media');
    return res.json();
  },
  
  getRoomGallery: async (): Promise<RoomGalleryItem[]> => {
    const res = await fetch(`${API_URL}/media/rooms`, { cache: 'no-store' });
    if (!res.ok) {
      return [];
    }
    const data = await res.json().catch(() => ({}));
    return (data?.items || []) as RoomGalleryItem[];
  },
  
  updateRoom: async (id: string, data: Partial<Room>): Promise<Room> => {
    const res = await fetch(`${API_URL}/rooms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update room');
    return res.json();
  },

  deleteRoom: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/rooms/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete room');
  },

  // Tenants
  getTenants: async (params?: { includeHistory?: boolean }): Promise<Tenant[]> => {
    const url = params?.includeHistory ? `${API_URL}/tenants?includeHistory=true` : `${API_URL}/tenants`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch tenants');
    return res.json();
  },

  createTenant: async (data: Omit<Tenant, 'id' | 'status'>): Promise<Tenant> => {
    const res = await fetch(`${API_URL}/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create tenant');
    return res.json();
  },

  updateTenant: async (id: string, data: Partial<Tenant>): Promise<Tenant> => {
    const res = await fetch(`${API_URL}/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update tenant');
    return res.json();
  },

  // Meter Readings
  getMeterReadings: async (roomId?: string, month?: number, year?: number): Promise<MeterReading[]> => {
    let url = `${API_URL}/meter-readings?`;
    if (roomId) url += `roomId=${roomId}&`;
    if (month) url += `month=${month}&`;
    if (year) url += `year=${year}&`;
    
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch meter readings');
    return res.json();
  },

  createMeterReading: async (data: Omit<MeterReading, 'id' | 'createdAt' | 'room'>): Promise<MeterReading> => {
    const res = await fetch(`${API_URL}/meter-readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create meter reading');
    return res.json();
  },

  // Invoices
  getInvoices: async (params?: { roomId?: string, ids?: string }): Promise<Invoice[]> => {
    let url = `${API_URL}/invoices?`;
    if (params?.roomId) url += `roomId=${params.roomId}&`;
    if (params?.ids) url += `ids=${params.ids}&`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
  },

  createInvoice: async (data: Omit<Invoice, 'id' | 'createdAt' | 'contract' | 'payments'>): Promise<Invoice> => {
    const res = await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create invoice');
    return res.json();
  },

  getInvoice: async (id: string): Promise<Invoice> => {
    const res = await fetch(`${API_URL}/invoices/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch invoice');
    return res.json();
  },

  updateInvoice: async (id: string, data: Partial<Invoice>): Promise<Invoice> => {
    const res = await fetch(`${API_URL}/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update invoice');
    return res.json();
  },

  cancelInvoice: async (id: string): Promise<Invoice> => {
    const res = await fetch(`${API_URL}/invoices/${id}/cancel`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to cancel invoice');
    return res.json();
  },

  addInvoiceItem: async (invoiceId: string, data: { description: string; amount: number }) => {
    const res = await fetch(`${API_URL}/invoices/${invoiceId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add invoice item');
    return res.json();
  },

  updateInvoiceItem: async (invoiceId: string, itemId: string, data: { description?: string; amount?: number }) => {
    const res = await fetch(`${API_URL}/invoices/${invoiceId}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update invoice item');
    return res.json();
  },

  deleteInvoiceItem: async (invoiceId: string, itemId: string): Promise<void> => {
    const res = await fetch(`${API_URL}/invoices/${invoiceId}/items/${itemId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete invoice item');
  },

  // Payment Schedule per Room
  getRoomPaymentSchedule: async (roomId: string): Promise<{ monthlyDay?: number; oneTimeDate?: string } | null> => {
    const res = await fetch(`${API_URL}/rooms/${roomId}/payment-schedule`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return (data?.schedule || null) as { monthlyDay?: number; oneTimeDate?: string } | null;
  },
  setRoomPaymentSchedule: async (
    roomId: string,
    payload: { date: string; monthly: boolean },
  ): Promise<{ monthlyDay?: number; oneTimeDate?: string } | null> => {
    const res = await fetch(`${API_URL}/rooms/${roomId}/payment-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to set payment schedule');
    const data = await res.json().catch(() => ({}));
    return (data?.schedule || null) as { monthlyDay?: number; oneTimeDate?: string } | null;
  },
  getRoomPaymentSchedules: async (): Promise<Record<string, { monthlyDay?: number; oneTimeDate?: string }>> => {
    const res = await fetch(`${API_URL}/rooms/payment-schedules`, { cache: 'no-store' });
    if (!res.ok) return {};
    const data = await res.json().catch(() => ({}));
    return (data?.schedules || {}) as Record<string, { monthlyDay?: number; oneTimeDate?: string }>;
  },

  // Settings
  getDormConfig: async (): Promise<DormConfig | null> => {
    const res = await fetch(`${API_URL}/settings/dorm-config`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch dorm config');
    return res.json();
  },

  updateDormConfig: async (data: Partial<DormConfig>): Promise<DormConfig> => {
    const res = await fetch(`${API_URL}/settings/dorm-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update dorm config');
    return res.json();
  },

  getDormExtra: async (): Promise<DormExtra> => {
    const res = await fetch(`${API_URL}/settings/dorm-extra`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch dorm extra');
    return res.json();
  },

  updateDormExtra: async (data: DormExtra): Promise<DormExtra> => {
    const res = await fetch(`${API_URL}/settings/dorm-extra`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update dorm extra');
    return res.json();
  },

  generateInvoice: async (data: { roomId: string; month: number; year: number }): Promise<Invoice> => {
    const res = await fetch(`${API_URL}/invoices/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to generate invoice');
    }
    return res.json();
  },
  sendInvoice: async (id: string): Promise<Invoice> => {
    const res = await fetch(`${API_URL}/invoices/${id}/send`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to send invoice');
    return res.json();
  },
  sendAllInvoices: async (month: number, year: number): Promise<{ ok: boolean; count: number }> => {
    const res = await fetch(`${API_URL}/invoices/send-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    });
    if (!res.ok) throw new Error('Failed to send all invoices');
    return res.json();
  },

  exportInvoices: async (month: number, year: number): Promise<void> => {
    const res = await fetch(`${API_URL}/invoices/export?month=${month}&year=${year}`, {
      method: 'GET',
    });
    if (!res.ok) throw new Error('Failed to export invoices');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${month}-${year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Payments
  getPayments: async (room?: string, status?: string): Promise<Payment[]> => {
    const params = new URLSearchParams();
    if (room) params.set('room', room);
    if (status) params.set('status', status);
    const url = params.toString()
      ? `${API_URL}/payments?${params.toString()}`
      : `${API_URL}/payments`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch payments');
    return res.json();
  },

  createPayment: async (data: FormData): Promise<Payment> => {
    const res = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      body: data,
    });
    if (!res.ok) throw new Error('Failed to create payment');
    return res.json();
  },

  getPaymentsByInvoice: async (invoiceId: string): Promise<Payment[]> => {
    const res = await fetch(`${API_URL}/payments?invoiceId=${invoiceId}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch payments');
    return res.json();
  },
  
  confirmSlip: async (payload: {
    paymentId?: string;
    invoiceId?: string;
    status: 'VERIFIED' | 'REJECTED';
    amount?: number;
    slipBankRef?: string;
    paidAt?: string;
  }): Promise<Payment> => {
    const res = await fetch(`${API_URL}/payments/slipok`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to confirm slip');
    }
    return res.json();
  },

  // Maintenance
  getMaintenanceRequests: async (roomId?: string): Promise<MaintenanceRequest[]> => {
    const url = roomId ? `${API_URL}/maintenance-requests?roomId=${roomId}` : `${API_URL}/maintenance-requests`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch maintenance requests');
    return res.json();
  },

  createMaintenanceRequest: async (data: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt' | 'room' | 'status'>): Promise<MaintenanceRequest> => {
    const res = await fetch(`${API_URL}/maintenance-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create maintenance request');
    return res.json();
  },

  updateMaintenanceRequest: async (id: string, data: UpdateMaintenanceRequest): Promise<MaintenanceRequest> => {
    const res = await fetch(`${API_URL}/maintenance-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update maintenance request');
    return res.json();
  },
  
  deleteMaintenanceRequest: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/maintenance-requests/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete maintenance request');
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/users`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },
  
  mapLineUserRole: async (userId: string, role: 'STAFF' | 'ADMIN' | 'OWNER'): Promise<{ ok: boolean }> => {
    const res = await fetch(`${API_URL}/line/roles/map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    if (!res.ok) throw new Error('Failed to map LINE user role');
    return res.json();
  },
  
  linkRichMenu: async (userId: string, kind: 'GENERAL' | 'TENANT' | 'ADMIN'): Promise<{ ok: boolean }> => {
    const res = await fetch(`${API_URL}/line/richmenu/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, kind }),
    });
    if (!res.ok) throw new Error('Failed to link rich menu');
    return res.json();
  },

  createUser: async (data: CreateUserDto): Promise<User> => {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let message = 'Failed to create user';
      try {
        const body = await res.json();
        if (typeof body?.message === 'string') {
          message = body.message;
        } else if (Array.isArray(body?.message) && body.message.length > 0) {
          message = String(body.message[0]);
        }
      } catch {
        // ignore parse error and keep default message
      }
      throw new Error(message);
    }
    return res.json();
  },

  updateUser: async (id: string, data: UpdateUserDto): Promise<User> => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },

  deleteUser: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete user');
  },
  
  createBuilding: async (data: { name: string; code?: string; floors: number }) => {
    const res = await fetch(`${API_URL}/buildings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create building');
    return res.json();
  },
  generateRooms: async (
    buildingId: string,
    params:
      | { startFloor: number; endFloor: number; roomsPerFloor: number; pricePerMonth?: number }
      | {
          floors: Array<{ floor: number; rooms: number; pricePerMonth?: number }>;
          format?: { digits?: 3 | 4; buildingDigit?: string; prefix?: string };
        }
  ) => {
    const res = await fetch(`${API_URL}/buildings/${buildingId}/generate-rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to generate rooms');
    return res.json();
  },
  
  // Assets
  getAssets: async (roomId?: string): Promise<Asset[]> => {
    const url = roomId ? `${API_URL}/assets?roomId=${roomId}` : `${API_URL}/assets`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch assets');
    return res.json();
  },

  createAsset: async (data: CreateAsset): Promise<Asset> => {
    const res = await fetch(`${API_URL}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create asset');
    return res.json();
  },

  updateAsset: async (id: string, data: UpdateAsset): Promise<Asset> => {
    const res = await fetch(`${API_URL}/assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update asset');
    return res.json();
  },

  deleteAsset: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/assets/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete asset');
  },

  // Backups
  getBackupSchedule: async (): Promise<{ hour: number; minute?: number }> => {
    const res = await fetch(`${API_URL}/backups/schedule`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch backup schedule');
    return res.json();
  },
  setBackupSchedule: async (hour: number, minute = 0): Promise<{ hour: number; minute?: number }> => {
    const res = await fetch(`${API_URL}/backups/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hour, minute }),
    });
    if (!res.ok) throw new Error('Failed to set backup schedule');
    return res.json();
  },
  runBackupNow: async (): Promise<{ ok: boolean; file?: string }> => {
    const res = await fetch(`${API_URL}/backups/run`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to run backup');
    return res.json();
  },
  listBackups: async (): Promise<Array<{ name: string; size: number; mtime: string }>> => {
    const res = await fetch(`${API_URL}/backups/files`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to list backups');
    return res.json();
  },
  deleteBackup: async (name: string): Promise<{ ok: boolean }> => {
    const res = await fetch(`${API_URL}/backups/files/${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete backup');
    return res.json();
  },
  downloadBackup: (name: string) => {
    const url = `${API_URL}/backups/files/${encodeURIComponent(name)}/download`;
    const a = typeof document !== 'undefined' ? document.createElement('a') : null;
    if (a) {
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  },
  
  // Activity Logs
  getActivityLogs: async (limit = 500): Promise<Array<{
    timestamp: string;
    userId?: string;
    username?: string;
    action: string;
    path?: string;
    entityType?: string;
    entityId?: string;
    details?: any;
  }>> => {
    const res = await fetch(`${API_URL}/activity-logs?limit=${limit}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch activity logs');
    const data = await res.json().catch(() => ({}));
    return (data?.items || []) as Array<any>;
  },
  getActivityLogsPaged: async (params: {
    page?: number;
    pageSize?: number;
    user?: string;
    action?: string;
    start?: string;
    end?: string;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.pageSize) qs.set('pageSize', String(params.pageSize));
    if (params.user) qs.set('user', params.user);
    if (params.action) qs.set('action', params.action);
    if (params.start) qs.set('start', params.start);
    if (params.end) qs.set('end', params.end);
    const res = await fetch(`${API_URL}/activity-logs?${qs.toString()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch activity logs');
    return res.json();
  },
  createActivityLog: async (payload: {
    action: string;
    path?: string;
    entityType?: string;
    entityId?: string;
    details?: any;
    userId?: string;
    username?: string;
  }): Promise<{ ok: boolean }> => {
    const res = await fetch(`${API_URL}/activity-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create activity log');
    return res.json();
  },
};
