'use client';

import { Tenant } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Calendar, Phone, User, Home, Building2, CreditCard, MapPin, X } from 'lucide-react';

type Props = {
  tenant: Tenant;
  onClose: () => void;
};

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

const formatDate = (s?: string) => {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function FormerTenantDetailDialog({ tenant, onClose }: Props) {
  const contracts = tenant.contracts ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tenant.name}</h2>
              {tenant.nickname && <p className="text-xs text-slate-400">({tenant.nickname})</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={<Phone className="w-4 h-4" />} label="เบอร์โทร" value={tenant.phone} />
            {tenant.idCard && <InfoBox icon={<CreditCard className="w-4 h-4" />} label="เลขบัตรประชาชน" value={tenant.idCard} />}
            {tenant.address && (
              <div className="col-span-2">
                <InfoBox icon={<MapPin className="w-4 h-4" />} label="ที่อยู่" value={tenant.address} />
              </div>
            )}
          </div>

          {/* Contracts History */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">ประวัติการเช่า</p>
            <div className="space-y-3">
              {contracts.length === 0 ? (
                <p className="text-sm text-slate-400">ไม่มีข้อมูล</p>
              ) : (
                contracts.map((contract, idx) => {
                  const building = contract.room?.building;
                  const invoices = contract.invoices ?? [];
                  const paidCount = invoices.filter((i: any) => i.status === 'PAID').length;
                  const totalAmount = invoices
                    .filter((i: any) => i.status === 'PAID')
                    .reduce((sum: number, i: any) => sum + Number(i.totalAmount), 0);

                  return (
                    <div
                      key={contract.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/50 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Home className="w-4 h-4 text-indigo-500" />
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">
                            ห้อง {contract.room?.number ?? '-'}
                          </span>
                          {building && (
                            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <Building2 className="w-3 h-3" />
                              {building.name}
                              {building.code && ` (${building.code})`}
                            </span>
                          )}
                        </div>
                        {idx === 0 && (
                          <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600">
                            ล่าสุด
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-400">เริ่ม</span>
                          {formatDate(contract.startDate)}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-400">ออก</span>
                          {formatDate(contract.endDate)}
                        </div>
                      </div>

                      {invoices.length > 0 && (
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex items-center justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">บิลที่ชำระ</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {paidCount} เดือน · ฿{totalAmount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}
