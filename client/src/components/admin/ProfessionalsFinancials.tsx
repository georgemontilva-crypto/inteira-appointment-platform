import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import { formatLocation } from "@shared/locations";

const money = (v: any) =>
  `$${Number(v ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  completed:      { label: "Completada",  className: "bg-emerald-100 text-emerald-700" },
  canceled:       { label: "Cancelada",   className: "bg-red-100 text-red-700" },
  "no-show":      { label: "No asistió",  className: "bg-orange-100 text-orange-700" },
  pending_review: { label: "En revisión", className: "bg-amber-100 text-amber-700" },
  scheduled:      { label: "Agendada",    className: "bg-blue-100 text-blue-700" },
  in_progress:    { label: "En curso",    className: "bg-blue-100 text-blue-700" },
};

function ProfessionalDetail({
  professionalId,
  from,
  to,
}: {
  professionalId: number;
  from?: string;
  to?: string;
}) {
  const { data: rows, isLoading } = trpc.admin.getProfessionalBreakdown.useQuery({
    professionalId,
    from: from || undefined,
    to: to || undefined,
    limit: 200,
  });

  if (isLoading) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Cargando detalle…</div>;
  }
  if (!rows || rows.length === 0) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Sin citas en este periodo.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead className="text-muted-foreground border-b border-border">
          <tr className="text-left">
            <th className="px-3 py-2 font-medium">Fecha</th>
            <th className="px-3 py-2 font-medium">Cliente</th>
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2 font-medium text-right">Bruto</th>
            <th className="px-3 py-2 font-medium text-right">Comisión</th>
            <th className="px-3 py-2 font-medium text-right">Neto profesional</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => {
            const st = STATUS_LABEL[r.status] ?? { label: r.status, className: "bg-gray-100 text-gray-700" };
            const reversed = r.earningStatus === "reversed";
            return (
              <tr key={r.appointmentId} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.appointmentDate
                    ? format(new Date(r.appointmentDate), "d MMM yyyy, HH:mm", { locale: es })
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="truncate max-w-[180px]">{r.clientName ?? "—"}</div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                    {r.clientEmail}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Badge className={`${st.className} border-0 text-[10px]`}>{st.label}</Badge>
                  {r.cancellationReason && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px]">
                      {r.canceledBy === "professional" ? "Profesional: " : r.canceledBy === "user" ? "Cliente: " : ""}
                      {r.cancellationReason}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {r.grossAmount != null ? money(r.grossAmount) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-primary">
                  {r.commissionAmount != null ? (
                    <>
                      {money(r.commissionAmount)}
                      <div className="text-[10px] text-muted-foreground">
                        {(Number(r.commissionRate) * 100).toFixed(1)}%
                      </div>
                    </>
                  ) : "—"}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums font-medium ${reversed ? "line-through text-muted-foreground" : ""}`}>
                  {r.netAmount != null ? money(r.netAmount) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const MONTH_LABEL = (period: string) => {
  const [y, m] = period.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return format(d, "MMM yy", { locale: es });
};

function RevenueCharts({ topProfessionals }: { topProfessionals: any[] }) {
  const { data: series, isLoading } = trpc.admin.getRevenueSeries.useQuery({ months: 12 });

  const chartData = useMemo(
    () =>
      (series ?? []).map((r: any) => ({
        mes: MONTH_LABEL(r.period),
        "Comisión Inteira": Number(r.commission ?? 0),
        "Pagado a profesionales": Number(r.net ?? 0),
        sesiones: Number(r.sessions ?? 0),
      })),
    [series]
  );

  const pieData = useMemo(
    () =>
      topProfessionals
        .slice(0, 6)
        .map((p) => ({ name: p.professionalName ?? "—", value: Number(p.commissionTotal ?? 0) }))
        .filter((d) => d.value > 0),
    [topProfessionals]
  );

  const PIE_COLORS = ["#3d7a5e", "#5a9d7c", "#7cbf9c", "#a3d9bc", "#c9ead9", "#e4f4ec"];

  if (isLoading) {
    return <Card className="border-border"><CardContent className="p-6 h-[280px] animate-pulse" /></Card>;
  }
  if (chartData.length === 0) {
    return (
      <Card className="border-border border-dashed">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Todavía no hay sesiones completadas para graficar.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="border-border lg:col-span-2">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Ingresos por mes</p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v: any) => money(v)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Comisión Inteira" stackId="a" fill="#3d7a5e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Pagado a profesionales" stackId="a" fill="#c9ead9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">Comisión por profesional</p>
          {pieData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
              Sin datos en el periodo
            </div>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => money(v)}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ProfessionalsFinancials() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: rows, isLoading } = trpc.admin.getProfessionalsFinancials.useQuery({
    from: from || undefined,
    to: to || undefined,
  });

  const totals = useMemo(() => {
    if (!rows) return null;
    return rows.reduce(
      (acc: any, r: any) => ({
        gross: acc.gross + Number(r.grossTotal ?? 0),
        commission: acc.commission + Number(r.commissionTotal ?? 0),
        net: acc.net + Number(r.netTotal ?? 0),
        completed: acc.completed + Number(r.sessionsCompleted ?? 0),
        canceled: acc.canceled + Number(r.sessionsCanceled ?? 0),
      }),
      { gross: 0, commission: 0, net: 0, completed: 0, canceled: 0 }
    );
  }, [rows]);

  const exportCsv = () => {
    if (!rows) return;
    const header = [
      "Profesional", "Email", "Especialidad", "Tier", "Ubicacion",
      "Completadas", "Canceladas", "No asistio", "En revision", "Agendadas",
      "Bruto", "Comision plataforma", "Neto profesional",
      "Saldo wallet", "En retiro", "Retirado",
    ];
    const lines = rows.map((r: any) => [
      r.professionalName ?? "", r.professionalEmail ?? "", r.specialtyName ?? "",
      r.tier ?? "", formatLocation(r.country, r.state) ?? "",
      r.sessionsCompleted, r.sessionsCanceled, r.sessionsNoShow,
      r.sessionsPendingReview, r.sessionsScheduled,
      Number(r.grossTotal).toFixed(2), Number(r.commissionTotal).toFixed(2),
      Number(r.netTotal).toFixed(2), Number(r.walletBalance).toFixed(2),
      Number(r.walletPending).toFixed(2), Number(r.walletWithdrawn).toFixed(2),
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profesionales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: "Poppins, sans-serif" }}>
            Desglose por profesional
          </h2>
          <p className="text-sm text-muted-foreground">
            Sesiones, lo que gana cada profesional y lo que factura la plataforma.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-[11px]">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <div>
            <Label className="text-[11px]">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={exportCsv} disabled={!rows?.length}>
            <Download className="w-4 h-4 mr-1.5" />
            CSV
          </Button>
        </div>
      </div>

      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Facturado bruto</p>
              <p className="text-xl font-bold tabular-nums">{money(totals.gross)}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-primary/5">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Comisión plataforma</p>
              <p className="text-xl font-bold tabular-nums text-primary">{money(totals.commission)}</p>
              {totals.gross > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {((totals.commission / totals.gross) * 100).toFixed(1)}% del bruto
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Pagado a profesionales</p>
              <p className="text-xl font-bold tabular-nums">{money(totals.net)}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Sesiones</p>
              <p className="text-xl font-bold tabular-nums">{totals.completed}</p>
              <p className="text-[11px] text-muted-foreground">{totals.canceled} canceladas</p>
            </CardContent>
          </Card>
        </div>
      )}

      <RevenueCharts topProfessionals={rows ?? []} />

      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/40 text-xs text-muted-foreground border-b border-border">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">Profesional</th>
                <th className="px-4 py-3 font-medium text-center">Compl.</th>
                <th className="px-4 py-3 font-medium text-center">Canc.</th>
                <th className="px-4 py-3 font-medium text-center">No asis.</th>
                <th className="px-4 py-3 font-medium text-center">Revisión</th>
                <th className="px-4 py-3 font-medium text-right">Bruto</th>
                <th className="px-4 py-3 font-medium text-right">Comisión</th>
                <th className="px-4 py-3 font-medium text-right">Ganó</th>
                <th className="px-4 py-3 font-medium text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Cargando…</td></tr>
              )}
              {!isLoading && (!rows || rows.length === 0) && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                  No hay profesionales aprobados todavía.
                </td></tr>
              )}
              {rows?.map((r: any) => {
                const isOpen = expanded === r.professionalId;
                return (
                  <>
                    <tr
                      key={r.professionalId}
                      className="border-b border-border/60 hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpanded(isOpen ? null : r.professionalId)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isOpen
                            ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                          {r.profileImage ? (
                            <img src={r.profileImage} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                              {(r.professionalName ?? "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium truncate">{r.professionalName ?? "—"}</p>
                              <Badge variant="outline" className="text-[10px] uppercase">{r.tier ?? "basic"}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {r.specialtyName ?? "Sin especialidad"}
                              {formatLocation(r.country, r.state) ? ` · ${formatLocation(r.country, r.state)}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">{Number(r.sessionsCompleted)}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{Number(r.sessionsCanceled)}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{Number(r.sessionsNoShow)}</td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {Number(r.sessionsPendingReview) > 0 ? (
                          <span className="text-amber-600 font-medium">{Number(r.sessionsPendingReview)}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{money(r.grossTotal)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-primary font-medium">{money(r.commissionTotal)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{money(r.netTotal)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {money(r.walletBalance)}
                        {Number(r.walletPending) > 0 && (
                          <div className="text-[10px] text-amber-600">{money(r.walletPending)} en retiro</div>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${r.professionalId}-detail`}>
                        <td colSpan={9} className="bg-muted/20 p-0">
                          <ProfessionalDetail
                            professionalId={r.professionalId}
                            from={from}
                            to={to}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


/**
 * Historial completo de un profesional, en modal. Se abre desde la tarjeta
 * del profesional en la pestaña "Profesionales activos".
 */
export function ProfessionalHistoryModal({
  professionalId,
  name,
  onClose,
}: {
  professionalId: number;
  name: string;
  onClose: () => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: rows } = trpc.admin.getProfessionalBreakdown.useQuery({
    professionalId,
    from: from || undefined,
    to: to || undefined,
    limit: 500,
  });

  const summary = useMemo(() => {
    if (!rows) return null;
    const count = (st: string) => rows.filter((r: any) => r.status === st).length;
    const sum = (field: string) =>
      rows.reduce(
        (acc: number, r: any) =>
          acc + (r.earningStatus === "credited" ? Number(r[field] ?? 0) : 0),
        0
      );
    return {
      completed: count("completed"),
      canceled: count("canceled"),
      noShow: count("no-show"),
      pendingReview: count("pending_review"),
      scheduled: count("scheduled"),
      gross: sum("grossAmount"),
      commission: sum("commissionAmount"),
      net: sum("netAmount"),
    };
  }, [rows]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
          <div>
            <h3 className="font-bold text-lg">{name}</h3>
            <p className="text-sm text-muted-foreground">Historial de citas y ganancias</p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <Label className="text-[11px]">Desde</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[140px]" />
            </div>
            <div>
              <Label className="text-[11px]">Hasta</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[140px]" />
            </div>
            <Button variant="ghost" size="sm" className="h-9" onClick={onClose}>Cerrar</Button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-b border-border">
            <div className="bg-white p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Completadas</p>
              <p className="text-lg font-bold tabular-nums">{summary.completed}</p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">No realizadas</p>
              <p className="text-lg font-bold tabular-nums">{summary.canceled + summary.noShow}</p>
              <p className="text-[10px] text-muted-foreground">
                {summary.canceled} canc. · {summary.noShow} no asistió
              </p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Comisión Inteira</p>
              <p className="text-lg font-bold tabular-nums text-primary">{money(summary.commission)}</p>
            </div>
            <div className="bg-white p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ganó</p>
              <p className="text-lg font-bold tabular-nums">{money(summary.net)}</p>
              <p className="text-[10px] text-muted-foreground">de {money(summary.gross)} brutos</p>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          <ProfessionalDetail professionalId={professionalId} from={from} to={to} />
        </div>
      </div>
    </div>
  );
}
