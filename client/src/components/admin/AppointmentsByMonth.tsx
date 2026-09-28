import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";

const money = (v: any) =>
  `$${Number(v ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const monthLabel = (period: string) => {
  const [y, m] = period.split("-");
  return format(new Date(Number(y), Number(m) - 1, 1), "MMMM yyyy", { locale: es });
};
const monthShort = (period: string) => {
  const [y, m] = period.split("-");
  return format(new Date(Number(y), Number(m) - 1, 1), "MMM yy", { locale: es });
};

export function AppointmentsByMonth() {
  const [months, setMonths] = useState(12);
  const [open, setOpen] = useState(true);

  const { data: rows, isLoading } = trpc.admin.getAppointmentsByMonth.useQuery({ months });

  // La gráfica va en orden cronológico; la tabla, del mes más reciente hacia atrás
  const chartData = useMemo(
    () =>
      [...(rows ?? [])].reverse().map((r: any) => ({
        mes: monthShort(r.period),
        Completadas: Number(r.completadas ?? 0),
        Canceladas: Number(r.canceladas ?? 0),
        "No asistió": Number(r.noShow ?? 0),
        "En revisión": Number(r.enRevision ?? 0),
      })),
    [rows]
  );

  const exportCsv = () => {
    if (!rows) return;
    const header = [
      "Mes", "Total", "Completadas", "Canceladas", "No asistio", "En revision",
      "Agendadas", "Usuarios unicos", "Profesionales activos",
      "Bruto", "Comision Inteira", "Pagado a profesionales",
    ];
    const lines = rows.map((r: any) => [
      monthLabel(r.period), r.total, r.completadas, r.canceladas, r.noShow,
      r.enRevision, r.agendadas, r.usuariosUnicos, r.profesionalesActivos,
      Number(r.bruto).toFixed(2), Number(r.comision).toFixed(2), Number(r.pagado).toFixed(2),
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `citas-por-mes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            className="flex items-center gap-2 text-left"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            <div>
              <p className="font-semibold">Historial por mes</p>
              <p className="text-[12px] text-muted-foreground">
                Citas y dinero movido, mes a mes
              </p>
            </div>
          </button>
          {open && (
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
              >
                <option value={6}>Últimos 6 meses</option>
                <option value={12}>Últimos 12 meses</option>
                <option value={24}>Últimos 24 meses</option>
              </select>
              <Button variant="outline" size="sm" className="h-9" onClick={exportCsv} disabled={!rows?.length}>
                <Download className="w-4 h-4 mr-1.5" />
                CSV
              </Button>
            </div>
          )}
        </div>

        {!open ? null : isLoading ? (
          <div className="h-[220px] animate-pulse bg-muted/40 rounded-lg" />
        ) : !rows || rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Todavía no hay citas registradas en este periodo.
          </p>
        ) : (
          <>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Completadas" stackId="a" fill="#3d7a5e" />
                  <Bar dataKey="Canceladas"  stackId="a" fill="#ef9a9a" />
                  <Bar dataKey="No asistió"  stackId="a" fill="#f5b971" />
                  <Bar dataKey="En revisión" stackId="a" fill="#fcd34d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="text-muted-foreground border-b border-border">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Mes</th>
                    <th className="px-3 py-2 font-medium text-center">Total</th>
                    <th className="px-3 py-2 font-medium text-center">Compl.</th>
                    <th className="px-3 py-2 font-medium text-center">Canc.</th>
                    <th className="px-3 py-2 font-medium text-center">No asis.</th>
                    <th className="px-3 py-2 font-medium text-center">Revisión</th>
                    <th className="px-3 py-2 font-medium text-center">Usuarios</th>
                    <th className="px-3 py-2 font-medium text-right">Comisión</th>
                    <th className="px-3 py-2 font-medium text-right">Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.period} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2 font-medium capitalize whitespace-nowrap">
                        {monthLabel(r.period)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">{Number(r.total)}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-emerald-600 font-medium">
                        {Number(r.completadas)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">
                        {Number(r.canceladas)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">
                        {Number(r.noShow)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {Number(r.enRevision) > 0
                          ? <span className="text-amber-600 font-medium">{Number(r.enRevision)}</span>
                          : <span className="text-muted-foreground">0</span>}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">
                        {Number(r.usuariosUnicos)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-primary font-medium">
                        {money(r.comision)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(r.pagado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
