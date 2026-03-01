'use client'
import { api, Room, API_URL, User, Building, Contract } from "@/services/api";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { Search, Filter, CheckCircle, Zap, Droplets, Save } from "lucide-react";

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export const dynamic = 'force-dynamic';

function MeterForm({ userId, allowByLogin }: { userId?: string; allowByLogin?: boolean }) {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [isStaff, setIsStaff] = useState<boolean>(false);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const nextMonthInit = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYearInit = now.getFullYear() + (currentMonth === 12 ? 1 : 0);
  const [month, setMonth] = useState<number>(nextMonthInit);
  const [year, setYear] = useState<number>(nextYearInit);
  const [values, setValues] = useState<Record<string, { water: string; electric: string }>>({});
  const [prevValues, setPrevValues] = useState<Record<string, { water?: number; electric?: number }>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [progressPct, setProgressPct] = useState<number>(0);
  const [progressRooms, setProgressRooms] = useState<number>(0);
  const [progressTotal, setProgressTotal] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [onlyIncomplete, setOnlyIncomplete] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (allowByLogin) {
          setIsStaff(true);
        } else if (userId) {
          const res = await fetch(`${API_URL}/line/is-staff?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' });
          const data = await res.json().catch(() => ({ isStaff: false }));
          setIsStaff(Boolean(data?.isStaff));
        } else {
          setIsStaff(false);
        }
        const [rs, bs, cs, mr] = await Promise.all([
          api.getRooms(),
          api.getBuildings().catch(() => []),
          api.getContracts().catch(() => []),
          api.getMeterReadings(undefined, month, year),
        ]);
        setRooms(rs);
        setBuildings(bs || []);
        setContracts(cs || []);
        const map: Record<string, { water: string; electric: string }> = {};
        for (const r of rs) {
          map[r.id] = { water: '', electric: '' };
        }
        for (const m of mr) {
          map[m.roomId] = { water: String(m.waterReading ?? ''), electric: String(m.electricReading ?? '') };
        }
        setValues(map);
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const mrPrev = await api.getMeterReadings(undefined, prevMonth, prevYear).catch(() => []);
        const prevMap: Record<string, { water?: number; electric?: number }> = {};
        for (const m of mrPrev) {
          prevMap[m.roomId] = { water: m.waterReading, electric: m.electricReading };
        }
        setPrevValues(prevMap);
      } catch {
        setIsStaff(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, allowByLogin, month, year]);

  function activeTenantName(roomId: string) {
    const c = contracts.find((x) => x.roomId === roomId && x.isActive);
    return c?.tenant?.name || '-';
  }

  function usedAmount(roomId: string, type: 'water' | 'electric') {
    const prev = prevValues[roomId]?.[type] ?? null;
    const cur = values[roomId]?.[type] ?? '';
    const prevNum = prev !== null && prev !== undefined ? Number(prev) : null;
    const curNum = cur.trim() !== '' ? Number(cur) : null;
    if (prevNum === null || curNum === null || !Number.isFinite(prevNum) || !Number.isFinite(curNum)) return '-';
    const diff = curNum - prevNum;
    if (!Number.isFinite(diff)) return '-';
    if (diff < 0) return '-';
    const isInteger = Math.floor(diff) === diff;
    return isInteger ? String(diff) : diff.toFixed(2);
  }

  const filteredRooms = useMemo(() => {
    const byBuilding = rooms.filter((r) => !selectedBuilding || r.buildingId === selectedBuilding);
    const bySearch = search.trim()
      ? byBuilding.filter((r) => {
          const q = search.trim().toLowerCase();
          const name = String(activeTenantName(r.id) || '').toLowerCase();
          const num = String(r.number || '').toLowerCase();
          const bname = String(r.building?.name || r.building?.code || '').toLowerCase();
          return name.includes(q) || num.includes(q) || bname.includes(q);
        })
      : byBuilding;
    const byIncomplete = onlyIncomplete
      ? bySearch.filter((r) => {
          const v = values[r.id];
          const wEmpty = !v || v.water.trim() === '';
          const eEmpty = !v || v.electric.trim() === '';
          return wEmpty || eEmpty;
        })
      : bySearch;
    return byIncomplete;
  }, [rooms, selectedBuilding, search, onlyIncomplete, values]);

  const sortedRooms = useMemo(() => {
    return [...filteredRooms].sort((a, b) => {
      const na = (a.building?.name || a.building?.code || '').trim();
      const nb = (b.building?.name || b.building?.code || '').trim();
      const aIsSmall = /บ้านน้อย/i.test(na);
      const bIsSmall = /บ้านน้อย/i.test(nb);
      if (aIsSmall !== bIsSmall) return aIsSmall ? 1 : -1;
      const nameCmp = na.localeCompare(nb, 'th');
      if (nameCmp !== 0) return nameCmp;
      const floorCmp = Number(a.floor) - Number(b.floor);
      if (floorCmp !== 0) return floorCmp;
      const numA = parseInt(String(a.number), 10);
      const numB = parseInt(String(b.number), 10);
      const bothNumeric = Number.isFinite(numA) && Number.isFinite(numB);
      if (bothNumeric) return numA - numB;
      return String(a.number).localeCompare(String(b.number), 'th');
    });
  }, [filteredRooms]);

  const tableRows = useMemo(() => {
    const items: React.ReactNode[] = [
      <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400" key="header">
        <th className="px-4 py-3 hidden sm:table-cell font-semibold text-xs uppercase" rowSpan={2}>ตึก</th>
        <th className="px-4 py-3 hidden sm:table-cell font-semibold text-xs uppercase" rowSpan={2}>ชั้น</th>
        <th className="px-4 py-3 font-semibold text-xs uppercase text-left" rowSpan={2}>ห้อง</th>
        <th className="px-4 py-3 text-center font-semibold text-rose-600 dark:text-rose-400 border-b border-slate-200 dark:border-slate-700" colSpan={3}>
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" /> มิเตอร์ไฟฟ้า
          </div>
        </th>
        <th className="px-4 py-3 text-center font-semibold text-cyan-600 dark:text-cyan-400 border-b border-slate-200 dark:border-slate-700" colSpan={3}>
          <div className="flex items-center justify-center gap-2">
            <Droplets className="w-4 h-4" /> มิเตอร์น้ำ
          </div>
        </th>
      </tr>,
      <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider" key="subheader">
        <th className="px-4 py-2 font-medium border-l border-slate-200 dark:border-slate-700">ก่อนหน้า</th>
        <th className="px-4 py-2 font-medium">ปัจจุบัน</th>
        <th className="px-4 py-2 font-medium">ใช้ไป</th>
        <th className="px-4 py-2 font-medium border-l border-slate-200 dark:border-slate-700">ก่อนหน้า</th>
        <th className="px-4 py-2 font-medium">ปัจจุบัน</th>
        <th className="px-4 py-2 font-medium">ใช้ไป</th>
      </tr>
    ];
    sortedRooms.forEach((r, idx) => {
      const prev = sortedRooms[idx - 1];
      const isNewBuilding = !prev || prev.buildingId !== r.buildingId;
      const buildingName = r.building?.name || r.building?.code || '-';
      if (isNewBuilding) {
        items.push(
          <tr key={`building-${r.buildingId}`} className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-20 shadow-sm">
            <td colSpan={9} className="px-4 py-3 font-bold text-slate-800 dark:text-white text-sm">
              {buildingName}
            </td>
          </tr>,
        );
      }
      items.push(
        <tr
          key={r.id}
          className={`border-t border-slate-200 dark:border-slate-800 ${
            idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/50'
          } hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors`}
        >
          <td className="px-4 py-3 hidden sm:table-cell text-slate-600 dark:text-slate-400 text-sm">{r.building?.name || r.building?.code || '-'}</td>
          <td className="px-4 py-3 hidden sm:table-cell text-slate-600 dark:text-slate-400 text-sm">{Number(r.floor) || '-'}</td>
          <td className="px-4 py-3 bg-white dark:bg-slate-900 sticky left-0 z-10 min-w-[140px]">
            <div className="font-bold text-slate-900 dark:text-white text-base">{r.number}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
              {activeTenantName(r.id)}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 sm:hidden mt-0.5">
              {(r.building?.name || r.building?.code || '-')}{' '}• ชั้น {Number(r.floor) || '-'}
            </div>
          </td>
          <td className="px-4 py-2 border-l border-slate-100 dark:border-slate-800 text-center bg-slate-50/30 dark:bg-slate-800/30">
            <div className="text-slate-500 dark:text-slate-400 font-mono text-sm">{prevValues[r.id]?.electric ?? '-'}</div>
          </td>
          <td className="px-4 py-2">
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus={idx === 0}
              value={values[r.id]?.electric ?? ''}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [r.id]: { water: prev[r.id]?.water ?? '', electric: e.target.value.replace(/\D/g, '') },
                }))
              }
              className="w-24 mx-auto block text-center rounded-lg px-2 py-1.5 h-10 font-mono text-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none placeholder:text-rose-300/50 dark:placeholder:text-rose-700/30 transition-all shadow-sm focus:shadow-md"
              placeholder="0"
            />
          </td>
          <td className="px-4 py-2 text-center bg-rose-50/10 dark:bg-rose-900/10 border-r border-slate-100 dark:border-slate-800">
            <div className="text-rose-600 dark:text-rose-400 font-bold font-mono text-sm">{usedAmount(r.id, 'electric')}</div>
          </td>
          <td className="px-4 py-2 text-center bg-slate-50/30 dark:bg-slate-800/30">
            <div className="text-slate-500 dark:text-slate-400 font-mono text-sm">{prevValues[r.id]?.water ?? '-'}</div>
          </td>
          <td className="px-4 py-2">
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={values[r.id]?.water ?? ''}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [r.id]: { water: e.target.value.replace(/\D/g, ''), electric: prev[r.id]?.electric ?? '' },
                }))
              }
              className="w-24 mx-auto block text-center rounded-lg px-2 py-1.5 h-10 font-mono text-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none placeholder:text-cyan-300/50 dark:placeholder:text-cyan-700/30 transition-all shadow-sm focus:shadow-md"
              placeholder="0"
            />
          </td>
          <td className="px-4 py-2 text-center bg-cyan-50/10 dark:bg-cyan-900/10">
            <div className="text-cyan-600 dark:text-cyan-400 font-bold font-mono text-sm">{usedAmount(r.id, 'water')}</div>
          </td>
        </tr>
      );
    });
    return items;
  }, [sortedRooms, values, prevValues]);

  const submitAll = async () => {
    const candidates = sortedRooms.filter((r) => {
      if (selectedBuilding && r.buildingId !== selectedBuilding) return false;
      const v = values[r.id];
      return v && v.water.trim() !== '' && v.electric.trim() !== '';
    });
    if (!candidates.length) {
      setMessage('กรอกค่าน้ำและค่าไฟอย่างน้อยหนึ่งห้อง');
      return;
    }
    const confirmText = `ยืนยันบันทึกค่ามิเตอร์ ${candidates.length} ห้องใช่หรือไม่?`;
    if (!window.confirm(confirmText)) {
      return;
    }
    setSubmitting(true);
    setMessage('');
    setProgressTotal(candidates.length);
    setProgressRooms(0);
    setProgressPct(0);
    try {
      const created: string[] = [];
      const invoiced: string[] = [];
      for (let i = 0; i < candidates.length; i++) {
        const room = candidates[i];
        const v = values[room.id];
        if (!v) continue;
        await api.createMeterReading({
          roomId: room.id,
          month,
          year,
          waterReading: Number(v.water),
          electricReading: Number(v.electric),
        });
        created.push(room.id);

        const hasActiveContract = contracts.some((c) => c.roomId === room.id && c.isActive);
        if (hasActiveContract) {
          try {
            const invoice = await api.generateInvoice({ roomId: room.id, month, year });
            if (invoice?.id) invoiced.push(room.id);
          } catch (e) {
          }
        }

        const done = i + 1;
        setProgressRooms(done);
        setProgressPct(Math.round((done / candidates.length) * 100));
      }
      setMessage(
        `บันทึกสำเร็จ ${created.length} ห้อง${
          invoiced.length ? ` และสร้างบิลแล้ว ${invoiced.length} ห้อง` : ''
        }`,
      );
      router.push('/bills');
    } catch (e) {
      setMessage('บันทึกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
      setProgressPct(100);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-500 dark:text-slate-400">กำลังโหลด...</div>;
  }
  if (!isStaff) {
    return <div className="p-6 text-center">
      <div className="text-lg font-semibold text-rose-600 dark:text-rose-500">สำหรับเจ้าหน้าที่เท่านั้น</div>
      <div className="text-slate-500 dark:text-slate-400 mt-2">ระบบตรวจพบว่า LINE account นี้ไม่มีสิทธิ์บันทึกมิเตอร์</div>
    </div>;
  }
  return (
    <div className="space-y-8 fade-in pb-32 md:pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">จดมิเตอร์</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">บันทึกค่ามิเตอร์น้ำ-ไฟประจำเดือน</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">เดือน</label>
            <div className="relative">
              <select
                value={month}
                onChange={(e) => {
                  const value = Number(e.target.value || '1');
                  if (!Number.isFinite(value) || value < 1 || value > 12) return;
                  setMonth(value);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-sm"
              >
                {THAI_MONTHS.map((label, idx) => {
                  const value = idx + 1;
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">ปี</label>
            <input
              type="number"
              min={2000}
              max={3000}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value || `${new Date().getFullYear()}`))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">ตึก</label>
            <div className="relative">
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-sm"
              >
                <option value="">
                  ทุกตึก ({rooms.length} ห้อง)
                </option>
                {buildings.map((b) => {
                  const count = rooms.filter((r) => r.buildingId === b.id).length;
                  const name = b.name || b.code || 'ตึก';
                  return (
                    <option key={b.id} value={b.id}>
                      {name} ({count} ห้อง)
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="w-full md:flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="เลขห้อง / ชื่อลูกค้า / ชื่อตึก"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={onlyIncomplete}
                onChange={(e) => setOnlyIncomplete(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </div>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">เฉพาะที่ยังไม่กรอก</span>
          </label>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              {tableRows.slice(0, 2)}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {tableRows.slice(2)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedRooms.flatMap((r, idx) => {
          const prev = sortedRooms[idx - 1];
          const isNewBuilding = !prev || prev.buildingId !== r.buildingId;
          const buildingName = r.building?.name || r.building?.code || '-';
          const items = [];
          if (isNewBuilding) {
            items.push(
              <div key={`building-sm-${r.buildingId}`} className="bg-slate-100 dark:bg-slate-800 sticky top-[70px] z-10 rounded-xl px-4 py-2 font-bold text-slate-800 dark:text-white text-sm border border-slate-200 dark:border-slate-700 shadow-sm mb-2 mt-4">
                {buildingName}
              </div>
            );
          }
          items.push(
            <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
              {/* Card Header */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">ห้อง {r.number}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">{activeTenantName(r.id)}</div>
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  ชั้น {Number(r.floor) || '-'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Electric Input Section */}
                <div className="space-y-2 p-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  <label className="text-xs font-bold text-rose-600 dark:text-rose-400 flex justify-between uppercase tracking-wide">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> ไฟฟ้า</span>
                    <span className="opacity-70 font-mono">ก่อน: {prevValues[r.id]?.electric ?? '-'}</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus={idx === 0}
                    value={values[r.id]?.electric ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [r.id]: { water: prev[r.id]?.water ?? '', electric: e.target.value.replace(/\D/g, '') },
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const nextInput = document.getElementById(`water-${r.id}`);
                        nextInput?.focus();
                      }
                    }}
                    id={`electric-${r.id}`}
                    className="w-full h-12 text-xl text-center rounded-lg bg-white dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 placeholder:text-rose-200 dark:placeholder:text-rose-800 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all font-mono shadow-sm"
                    placeholder="0"
                  />
                  <div className="text-xs text-center text-slate-500 dark:text-slate-400">
                    ใช้ไป <span className="text-rose-600 dark:text-rose-400 font-bold font-mono text-sm">{usedAmount(r.id, 'electric')}</span>
                  </div>
                </div>

                {/* Water Input Section */}
                <div className="space-y-2 p-3 bg-cyan-50/50 dark:bg-cyan-900/10 rounded-xl border border-cyan-100 dark:border-cyan-900/30">
                  <label className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex justify-between uppercase tracking-wide">
                    <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> น้ำประปา</span>
                    <span className="opacity-70 font-mono">ก่อน: {prevValues[r.id]?.water ?? '-'}</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={values[r.id]?.water ?? ''}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [r.id]: { water: e.target.value.replace(/\D/g, ''), electric: prev[r.id]?.electric ?? '' },
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        // Try to focus next card's electric input
                        const nextRoom = sortedRooms[idx + 1];
                        if (nextRoom) {
                          const nextInput = document.getElementById(`electric-${nextRoom.id}`);
                          nextInput?.focus();
                          // Scroll into view
                          nextInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }
                    }}
                    id={`water-${r.id}`}
                    className="w-full h-12 text-xl text-center rounded-lg bg-white dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-200 placeholder:text-cyan-200 dark:placeholder:text-cyan-800 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all font-mono shadow-sm"
                    placeholder="0"
                  />
                  <div className="text-xs text-center text-slate-500 dark:text-slate-400">
                    ใช้ไป <span className="text-cyan-600 dark:text-cyan-400 font-bold font-mono text-sm">{usedAmount(r.id, 'water')}</span>
                  </div>
                </div>
              </div>
            </div>
          );
          return items;
        })}
      </div>

      <div className="fixed bottom-6 left-4 right-4 z-40 md:left-auto md:right-8 md:w-96">
        <button
          disabled={submitting}
          onClick={submitAll}
          className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-xl shadow-indigo-600/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-3 backdrop-blur-sm"
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>กำลังบันทึก...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>บันทึกทั้งหมด ({progressTotal > 0 ? `${progressRooms}/${progressTotal}` : 'พร้อม'})</span>
            </>
          )}
        </button>
      </div>
      
      {/* Progress Bar (Visible only when submitting) */}
      {submitting && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 z-[60]">
          <div 
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
      )}
      
      {message && (
        <div className="fixed bottom-24 left-4 right-4 z-50 md:left-auto md:right-8 md:w-96">
          <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-lg border border-slate-700 dark:border-slate-200 text-center animate-in fade-in slide-in-from-bottom-4 font-medium">
            {message}
          </div>
        </div>
      )}
    </div>
  );
}

function MeterPageInner() {
  const params = useSearchParams();
  const uidQuery = params.get('uid') || '';
  const [uidFromLiff, setUidFromLiff] = useState<string>('');
  const [uidManual, setUidManual] = useState<string>('');
  const uid = uidQuery || uidFromLiff || uidManual;
  const [allowByLogin, setAllowByLogin] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !uidManual) {
      const saved = localStorage.getItem('sisom_meter_uid') || '';
      if (saved) {
        setUidManual(saved);
      }
    }
  }, [uidManual]);

  useEffect(() => {
    const tryCookieProfile = async () => {
      try {
        const cookies = typeof document !== 'undefined' ? document.cookie || '' : '';
        const token = cookies.split(';').map(s => s.trim()).find(s => s.startsWith('sisom_token='))?.split('=')[1] || '';
        if (token) {
          const res = await fetch(`${API_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          if (res.ok) {
            const user = await res.json() as User;
            const permitted =
              user?.role === 'OWNER' ||
              user?.role === 'ADMIN' ||
              (Array.isArray(user?.permissions) && user.permissions.includes('meter'));
            setAllowByLogin(Boolean(permitted));
            return;
          }
        }
      } catch {
        // ignore and fallback to localStorage
      }
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('sisom_user') : null;
        if (raw) {
          const user = JSON.parse(raw) as User;
          const permitted =
            user?.role === 'OWNER' ||
            user?.role === 'ADMIN' ||
            (Array.isArray(user?.permissions) && user.permissions.includes('meter'));
          setAllowByLogin(Boolean(permitted));
        } else {
          setAllowByLogin(false);
        }
      } catch {
        setAllowByLogin(false);
      }
    };
    void tryCookieProfile();
  }, []);

  useEffect(() => {
    if (uidQuery) return;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobile = /Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry|Mobile/i.test(ua);
    if (!isMobile) return;
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (!liffId) return;
    const script = document.createElement('script');
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
    script.async = true;
    script.onload = async () => {
      try {
        // @ts-expect-error
        await window.liff.init({ liffId });
        // @ts-expect-error
        if (window.liff.isInClient()) {
          // @ts-expect-error
          const profile = await window.liff.getProfile();
          if (profile?.userId) setUidFromLiff(profile.userId as string);
        }
      } catch {
        // ignore
      }
    };
    document.body.appendChild(script);
  }, [uidQuery]);

  if (!uid && !allowByLogin) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4 mt-10">
        <div className="text-xl font-bold text-slate-900 dark:text-white">บันทึกมิเตอร์ผ่าน LINE</div>
        <div className="text-slate-600 dark:text-slate-400">กำลังตรวจสอบสิทธิจาก LINE...</div>
        <div className="text-slate-500 dark:text-slate-500 text-sm bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          หากไม่สามารถตรวจจับ LINE ได้ ให้พิมพ์คำสั่ง <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">whoami</span> ในห้องแชท
          แล้วคัดลอก LINE userId มาวางด้านล่าง
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">LINE userId</div>
          <input
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={uidManual}
            onChange={(e) => {
              const value = e.target.value.trim();
              setUidManual(value);
              if (typeof window !== 'undefined') {
                localStorage.setItem('sisom_meter_uid', value);
              }
            }}
          />
          <div className="text-xs text-slate-400">
            ตัวอย่าง: Uxxxxx...
          </div>
        </div>
      </div>
    );
  }
  return <MeterForm userId={uid} allowByLogin={allowByLogin} />;
}

export default function MeterPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500 dark:text-slate-400 text-center">กำลังโหลด...</div>}>
      <MeterPageInner />
    </Suspense>
  );
}
