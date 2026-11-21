import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  Home,
  House,
  LogOut,
  MapPinned,
  Pencil,
  Plus,
  PoundSterling,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import {
  deleteRow,
  getFreshSession,
  isAdminUser,
  loadSession,
  requestRows,
  saveRow,
  register,
  signIn,
  signOut,
  type AdminSession,
  type AdminTable,
  type RecordRow,
} from "../../lib/admin/admin-api";
import {
  activateAdminPush,
  isInstalledApp,
  pushSupported,
  testAdminPush,
} from "../../lib/admin/admin-push";

type Pane =
  "overview" | "enquiries" | "clients" | "properties" | "staff" | "visits" | "finance" | "partners";
type EditableTable = Exclude<AdminTable, "jobs">;
type FieldType =
  | "text"
  | "email"
  | "tel"
  | "date"
  | "time"
  | "number"
  | "money"
  | "textarea"
  | "select"
  | "checkbox";
type FieldDef = {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  source?: EditableTable;
};
type EditorState = { table: EditableTable; row?: RecordRow };

const NAV: { id: Pane; label: string; icon: typeof Home }[] = [
  { id: "overview", label: "Visão geral", icon: Home },
  { id: "enquiries", label: "Pedidos", icon: ClipboardList },
  { id: "clients", label: "Clientes", icon: Users },
  { id: "properties", label: "Casas", icon: House },
  { id: "staff", label: "Funcionárias", icon: ShieldCheck },
  { id: "visits", label: "Serviços e rotas", icon: CalendarDays },
  { id: "finance", label: "Financeiro", icon: Wallet },
  { id: "partners", label: "Sócios", icon: PoundSterling },
];

const TABLES: EditableTable[] = [
  "enquiries",
  "cleaning_clients",
  "cleaning_properties",
  "cleaning_staff",
  "cleaning_visits",
  "finance_entries",
  "business_partners",
];

const TABLE_BY_PANE: Partial<Record<Pane, EditableTable>> = {
  enquiries: "enquiries",
  clients: "cleaning_clients",
  properties: "cleaning_properties",
  staff: "cleaning_staff",
  visits: "cleaning_visits",
  finance: "finance_entries",
  partners: "business_partners",
};

const STATUS_OPTIONS = [
  { value: "new", label: "Novo" },
  { value: "in_review", label: "Em análise" },
  { value: "quoted", label: "Orçamento enviado" },
  { value: "booked", label: "Reservado" },
  { value: "completed", label: "Concluído" },
  { value: "declined", label: "Recusado" },
];
const VISIT_STATUSES = [
  { value: "scheduled", label: "Agendado" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];
const FINANCE_KINDS = [
  { value: "income", label: "Entrada" },
  { value: "expense", label: "Despesa" },
  { value: "investment", label: "Aporte dos sócios" },
  { value: "distribution", label: "Retirada / distribuição" },
];

const FIELDS: Record<EditableTable, FieldDef[]> = {
  enquiries: [
    { key: "status", label: "Situação", type: "select", required: true, options: STATUS_OPTIONS },
    { key: "quote_price_pence", label: "Orçamento (£)", type: "money" },
  ],
  cleaning_clients: [
    { key: "name", label: "Nome", required: true },
    { key: "phone", label: "Telefone", type: "tel" },
    { key: "email", label: "E-mail", type: "email" },
    { key: "notes", label: "Observações", type: "textarea" },
  ],
  cleaning_properties: [
    {
      key: "client_id",
      label: "Cliente",
      type: "select",
      required: true,
      source: "cleaning_clients",
    },
    { key: "label", label: "Nome da casa", required: true },
    { key: "address_line1", label: "Endereço", required: true },
    { key: "postcode", label: "Código postal", required: true },
    {
      key: "property_type",
      label: "Tipo",
      type: "select",
      options: [
        { value: "flat", label: "Apartamento" },
        { value: "house", label: "Casa" },
        { value: "office", label: "Escritório" },
        { value: "other", label: "Outro" },
      ],
    },
    {
      key: "frequency",
      label: "Frequência",
      type: "select",
      options: [
        { value: "once", label: "Avulsa" },
        { value: "weekly", label: "Semanal" },
        { value: "fortnightly", label: "Quinzenal" },
        { value: "monthly", label: "Mensal" },
      ],
    },
    { key: "notes", label: "Orientações sem senhas ou códigos de acesso", type: "textarea" },
  ],
  cleaning_staff: [
    { key: "full_name", label: "Nome", required: true },
    { key: "phone", label: "Telefone", type: "tel" },
    { key: "email", label: "E-mail", type: "email" },
    { key: "hourly_rate_pence", label: "Valor por hora (£)", type: "money" },
    { key: "notes", label: "Observações", type: "textarea" },
    { key: "active", label: "Ativa", type: "checkbox" },
  ],
  cleaning_visits: [
    {
      key: "property_id",
      label: "Casa",
      type: "select",
      source: "cleaning_properties",
      required: true,
    },
    { key: "staff_id", label: "Funcionária responsável", type: "select", source: "cleaning_staff" },
    { key: "scheduled_date", label: "Data", type: "date", required: true },
    { key: "start_time", label: "Horário", type: "time" },
    { key: "duration_minutes", label: "Duração (minutos)", type: "number" },
    { key: "status", label: "Situação", type: "select", required: true, options: VISIT_STATUSES },
    { key: "route_order", label: "Ordem da rota", type: "number" },
    { key: "price_pence", label: "Valor cobrado (£)", type: "money" },
    { key: "staff_cost_pence", label: "Custo da funcionária (£)", type: "money" },
    { key: "supplies_cost_pence", label: "Materiais (£)", type: "money" },
    { key: "travel_cost_pence", label: "Transporte (£)", type: "money" },
    { key: "notes", label: "Instruções de trabalho (sem códigos de acesso)", type: "textarea" },
  ],
  finance_entries: [
    { key: "entry_date", label: "Data", type: "date", required: true },
    { key: "kind", label: "Tipo", type: "select", required: true, options: FINANCE_KINDS },
    { key: "category", label: "Categoria", required: true },
    { key: "description", label: "Descrição", required: true },
    { key: "amount_pence", label: "Valor (£)", type: "money", required: true },
    {
      key: "paid_by_partner_id",
      label: "Sócio que pagou / recebeu",
      type: "select",
      source: "business_partners",
    },
    {
      key: "visit_id",
      label: "Serviço relacionado (opcional)",
      type: "select",
      source: "cleaning_visits",
    },
  ],
  business_partners: [
    { key: "name", label: "Nome do sócio", required: true },
    {
      key: "profit_share_percent",
      label: "Participação nos lucros (%) — deixar vazio até acordar",
      type: "number",
    },
  ],
};

const INITIAL_ROWS: Record<EditableTable, RecordRow[]> = {
  enquiries: [],
  cleaning_clients: [],
  cleaning_properties: [],
  cleaning_staff: [],
  cleaning_visits: [],
  finance_entries: [],
  business_partners: [],
};
const money = (pence: unknown) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    Number(pence || 0) / 100,
  );
const string = (value: unknown) => (value == null ? "" : String(value));
const humanDate = (value: unknown) =>
  value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const total = (rows: RecordRow[], field: string) =>
  rows.reduce((n, row) => n + Number(row[field] || 0), 0);

function titleFor(
  table: EditableTable,
  row: RecordRow,
  data: Record<EditableTable, RecordRow[]>,
): string {
  switch (table) {
    case "enquiries":
      return `${string(row.reference)} · ${string(row.name)}`;
    case "cleaning_clients":
      return string(row.name);
    case "cleaning_properties":
      return `${string(row.label)} · ${string(row.postcode)}`;
    case "cleaning_staff":
      return string(row.full_name);
    case "cleaning_visits": {
      const property = data.cleaning_properties.find((item) => item.id === row.property_id);
      return `${property?.label || "Casa"} · ${humanDate(row.scheduled_date)}`;
    }
    case "finance_entries":
      return `${string(row.description)} · ${money(row.amount_pence)}`;
    case "business_partners":
      return string(row.name);
  }
}

function descriptionFor(
  table: EditableTable,
  row: RecordRow,
  data: Record<EditableTable, RecordRow[]>,
): string {
  switch (table) {
    case "enquiries":
      return `${string(row.service)} · ${string(row.postcode)} · ${string(row.phone_e164)} · ${string(row.status)}`;
    case "cleaning_clients":
      return [row.phone, row.email].filter(Boolean).join(" · ");
    case "cleaning_properties": {
      const client = data.cleaning_clients.find((item) => item.id === row.client_id);
      return `${string(row.address_line1)} · ${client?.name || "Sem cliente"}`;
    }
    case "cleaning_staff":
      return [row.phone, row.email, row.active === false ? "Inativa" : "Ativa"]
        .filter(Boolean)
        .join(" · ");
    case "cleaning_visits": {
      const worker = data.cleaning_staff.find((item) => item.id === row.staff_id);
      return `${string(row.start_time).slice(0, 5) || "Horário a definir"} · ${worker?.full_name || "Sem funcionária"} · ${string(row.status)}`;
    }
    case "finance_entries":
      return `${humanDate(row.entry_date)} · ${string(row.category)} · ${FINANCE_KINDS.find((kind) => kind.value === row.kind)?.label || row.kind}`;
    case "business_partners":
      return row.profit_share_percent == null
        ? "Participação a combinar"
        : `${row.profit_share_percent}% dos lucros`;
  }
}

function makeMapsUrl(visits: RecordRow[], properties: RecordRow[]): string | null {
  const stops = visits
    .map((visit) => properties.find((property) => property.id === visit.property_id))
    .filter((property): property is RecordRow => Boolean(property));
  if (!stops.length) return null;
  const addresses = stops.map((property) =>
    [property.address_line1, property.postcode, "London, UK"].filter(Boolean).join(", "),
  );
  const params = new URLSearchParams({ api: "1", destination: addresses[addresses.length - 1]! });
  if (addresses.length > 1) params.set("waypoints", addresses.slice(0, -1).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function csvEscape(value: unknown) {
  let raw = string(value).replace(/\r?\n/g, " ");
  if (/^[\s]*[=+@-]/.test(raw)) raw = `'${raw}`;
  return `"${raw.replace(/"/g, '""')}"`;
}

function downloadCsv(pane: Pane, rows: RecordRow[]) {
  if (typeof document === "undefined" || !rows.length) return;
  const columns = Object.keys(rows[0]!).filter((key) => key !== "id" && key !== "updated_at");
  const csv = `\uFEFF${[columns.join(","), ...rows.map((row) => columns.map((key) => csvEscape(row[key])).join(","))].join("\r\n")}`;
  const href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = `goodspotless-${pane}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function Editor({
  editor,
  rows,
  onClose,
  onSaved,
  session,
}: {
  editor: EditorState;
  rows: Record<EditableTable, RecordRow[]>;
  session: AdminSession;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const fields = FIELDS[editor.table];
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(
      fields.map((field) => {
        const value = editor.row?.[field.key];
        return [
          field.key,
          field.type === "checkbox"
            ? value !== false
            : field.type === "money" && value != null
              ? (Number(value) / 100).toFixed(2)
              : string(value),
        ];
      }),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        const value = values[field.key];
        if (field.type === "checkbox") payload[field.key] = Boolean(value);
        else if (value === undefined || String(value).trim() === "") payload[field.key] = null;
        else if (field.type === "money") payload[field.key] = Math.round(Number(value) * 100);
        else if (field.type === "number") payload[field.key] = Number(value);
        else payload[field.key] = String(value).trim();
      }
      if (editor.table === "finance_entries" && Number(payload["amount_pence"]) <= 0)
        throw new Error("Informe um valor maior que zero.");
      if (
        editor.table === "business_partners" &&
        payload["profit_share_percent"] != null &&
        (Number(payload["profit_share_percent"]) < 0 ||
          Number(payload["profit_share_percent"]) > 100)
      ) {
        throw new Error("A participação deve ficar entre 0% e 100%.");
      }
      await saveRow(session, editor.table, payload, editor.row?.id);
      await onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={editor.row ? "Editar registro" : "Novo registro"}
        className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-8"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">
              GOODSPOTLESS
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              {editor.row ? "Editar registro" : "Adicionar registro"}
            </h2>
          </div>
          <button
            className="rounded-full border px-3 py-2 text-slate-700"
            type="button"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const options = field.source
              ? rows[field.source].map((row) => ({
                  value: row.id,
                  label: titleFor(field.source!, row, rows),
                }))
              : field.options;
            const common = {
              id: `admin-${field.key}`,
              name: field.key,
              required: field.required,
              disabled: busy,
              className:
                "mt-1.5 w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200",
            };
            return (
              <label
                key={field.key}
                className={`block text-sm font-semibold text-slate-700 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
                htmlFor={common.id}
              >
                {field.type === "checkbox" ? (
                  <span className="flex gap-2 items-center">
                    <input
                      id={common.id}
                      type="checkbox"
                      checked={Boolean(values[field.key])}
                      disabled={busy}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.key]: event.target.checked }))
                      }
                    />
                    {field.label}
                  </span>
                ) : (
                  <>
                    {field.label}
                    {field.required ? " *" : ""}
                    {options ? (
                      <select
                        {...common}
                        value={String(values[field.key] ?? "")}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [field.key]: event.target.value }))
                        }
                      >
                        <option value="">Selecione…</option>
                        {options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        {...common}
                        rows={3}
                        value={String(values[field.key] ?? "")}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [field.key]: event.target.value }))
                        }
                      />
                    ) : (
                      <input
                        {...common}
                        type={field.type === "money" ? "number" : field.type || "text"}
                        step={
                          field.type === "money"
                            ? "0.01"
                            : field.type === "number"
                              ? "any"
                              : undefined
                        }
                        min={field.type === "money" || field.type === "number" ? "0" : undefined}
                        value={String(values[field.key] ?? "")}
                        onChange={(event) =>
                          setValues((current) => ({ ...current, [field.key]: event.target.value }))
                        }
                      />
                    )}
                  </>
                )}
              </label>
            );
          })}
          {editor.table === "cleaning_properties" || editor.table === "cleaning_visits" ? (
            <p className="sm:col-span-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Por segurança, não coloque senhas, códigos de alarme ou de fechaduras nestes campos.
            </p>
          ) : null}
          {error && (
            <p role="alert" className="sm:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="sm:col-span-2 flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-3 text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function AdminDashboard() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [authStatus, setAuthStatus] = useState<"checking" | "login" | "denied" | "ready">(
    "checking",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [authError, setAuthError] = useState("");
  const [rows, setRows] = useState<Record<EditableTable, RecordRow[]>>(INITIAL_ROWS);
  const [pane, setPane] = useState<Pane>("overview");
  const [filter, setFilter] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [dataError, setDataError] = useState("");
  const [busyData, setBusyData] = useState(false);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);
  const [pushBusy, setPushBusy] = useState<"activate" | "test" | null>(null);
  const [pushFeedback, setPushFeedback] = useState("");

  const activateNotifications = () => {
    if (!session) return;
    setPushBusy("activate");
    setPushFeedback("");
    // Keep permission request in the click's user-activation context for iOS.
    void activateAdminPush(session)
      .then(setPushFeedback)
      .catch((error: unknown) =>
        setPushFeedback(error instanceof Error ? error.message : "Falha ao ativar."),
      )
      .finally(() => setPushBusy(null));
  };

  const sendTestPush = () => {
    if (!session) return;
    setPushBusy("test");
    setPushFeedback("");
    void testAdminPush(session)
      .then(setPushFeedback)
      .catch((error: unknown) =>
        setPushFeedback(error instanceof Error ? error.message : "Falha no teste."),
      )
      .finally(() => setPushBusy(null));
  };

  const reload = useCallback(async (activeSession: AdminSession) => {
    setBusyData(true);
    try {
      const results = await Promise.all(
        TABLES.map(async (table) => {
          const query =
            table === "enquiries"
              ? "select=*&deleted_at=is.null&order=created_at.desc&limit=500"
              : table === "finance_entries"
                ? "select=*&order=entry_date.desc&limit=500"
                : "select=*&limit=500";
          return [table, await requestRows(activeSession, table, query)] as const;
        }),
      );
      setRows(Object.fromEntries(results) as Record<EditableTable, RecordRow[]>);
      setDataError("");
      setLastLoaded(new Date());
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Não foi possível carregar os dados.");
    } finally {
      setBusyData(false);
    }
  }, []);

  const authorise = useCallback(
    async (candidate: AdminSession) => {
      try {
        const authorised = await isAdminUser(candidate);
        if (!authorised) {
          setAuthStatus("denied");
          return;
        }
        const fresh = await getFreshSession(candidate);
        setSession(fresh);
        setAuthStatus("ready");
        await reload(fresh);
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : "Falha na autenticação.");
        setAuthStatus("login");
      }
    },
    [reload],
  );

  useEffect(() => {
    const existing = loadSession();
    if (existing) {
      setSession(existing);
      void authorise(existing);
    } else setAuthStatus("login");
  }, [authorise]);

  useEffect(() => {
    if (authStatus !== "ready" || !session) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void reload(session);
    }, 20_000);
    return () => window.clearInterval(id);
  }, [authStatus, reload, session]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginBusy(true);
    setAuthError("");
    try {
      if (registerMode) {
        if (password.length < 12)
          throw new Error("Use uma senha nova com pelo menos 12 caracteres.");
        await register(email.trim(), password);
        setRegistered(true);
        setRegisterMode(false);
        setPassword("");
      } else {
        const result = await signIn(email.trim(), password);
        setPassword("");
        await authorise(result);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = async () => {
    await signOut(session);
    setRows(INITIAL_ROWS);
    setSession(null);
    setAuthStatus("login");
    setEmail("");
  };

  const visibleTable = TABLE_BY_PANE[pane];
  const items = useMemo(() => {
    const allItems = visibleTable ? rows[visibleTable] : [];
    const active = allItems.filter(
      (item) =>
        item.archived_at == null && (visibleTable !== "finance_entries" || item.voided_at == null),
    );
    const query = filter.trim().toLowerCase();
    return query
      ? active.filter((item) =>
          Object.values(item).some((value) => string(value).toLowerCase().includes(query)),
        )
      : active;
  }, [rows, filter, visibleTable]);

  const finances = rows.finance_entries.filter((row) => row.voided_at == null);
  const revenue = total(
    finances.filter((row) => row.kind === "income"),
    "amount_pence",
  );
  const expenses = total(
    finances.filter((row) => row.kind === "expense"),
    "amount_pence",
  );
  const profit = revenue - expenses;
  const openEnquiries = rows.enquiries.filter(
    (row) => row.status === "new" || row.status === "in_review",
  );
  const upcomingVisits = rows.cleaning_visits.filter(
    (row) => row.status !== "cancelled" && row.status !== "completed",
  );
  const shares = rows.business_partners.map((row) => Number(row.profit_share_percent));
  const sharesValid =
    shares.length >= 2 &&
    rows.business_partners.every((row) => row.profit_share_percent != null) &&
    Math.abs(shares.reduce((acc, amount) => acc + amount, 0) - 100) < 0.001;

  const remove = async (table: EditableTable, row: RecordRow) => {
    if (!session) return;
    const isFinancial = table === "finance_entries";
    const prompt = isFinancial
      ? "Estornar este lançamento? O histórico ficará registrado."
      : `Excluir ${titleFor(table, row, rows)}? Esta ação pode ser irreversível.`;
    if (!window.confirm(prompt)) return;
    try {
      if (isFinancial)
        await saveRow(session, table, { voided_at: new Date().toISOString() }, row.id);
      else await deleteRow(session, table, row.id);
      await reload(session);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
  };

  if (authStatus !== "ready") {
    return (
      <div className="min-h-screen bg-[#f4f6f3] px-4 py-10 text-slate-900 sm:py-20">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[.25em] text-emerald-800">
            GOODSPOTLESS · Interno
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Painel de gestão</h1>
          <p className="mt-3 text-sm text-slate-600">
            Acesso reservado a administradores autorizados. Nenhum dado de cliente é público.
          </p>
          {authStatus === "checking" ? (
            <p className="mt-8">Conferindo acesso…</p>
          ) : authStatus === "denied" ? (
            <>
              <p role="alert" className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                Esta conta ainda não recebeu o papel de administrador no Supabase GOODSPOTLESS. Peça
                ao proprietário para autorizar seu usuário em{" "}
                <strong>Authentication / Users</strong> e na tabela <strong>user_roles</strong>.
              </p>
              <button
                onClick={() => void logout()}
                className="mt-5 rounded-xl bg-emerald-800 px-5 py-3 text-white"
              >
                Voltar ao login
              </button>
            </>
          ) : (
            <form onSubmit={(event) => void login(event)} className="mt-7 space-y-4">
              <label htmlFor="admin-email" className="block text-sm font-semibold">
                E-mail
                <input
                  id="admin-email"
                  autoComplete="username"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-emerald-700"
                  placeholder="voce@empresa.com"
                />
              </label>
              <label htmlFor="admin-password" className="block text-sm font-semibold">
                Senha
                <input
                  id="admin-password"
                  autoComplete="current-password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-base focus:outline-emerald-700"
                  placeholder="Sua senha do painel"
                />
              </label>
              {authError && (
                <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {authError}
                </p>
              )}
              {registered && (
                <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
                  Conta solicitada. Confirme o e-mail se solicitado e peça ao responsável para
                  aprovar sua função de administrador antes de entrar.
                </p>
              )}
              <button
                type="submit"
                disabled={loginBusy}
                className="w-full rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white disabled:opacity-60"
              >
                {loginBusy
                  ? "Aguarde…"
                  : registerMode
                    ? "Criar conta para aprovação"
                    : "Entrar no painel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegisterMode((mode) => !mode);
                  setAuthError("");
                }}
                className="w-full text-sm font-semibold text-emerald-800 underline"
              >
                {registerMode ? "Já tenho acesso" : "Primeiro acesso: criar minha conta"}
              </button>
            </form>
          )}
          <a href="/" className="mt-7 inline-block text-sm text-emerald-800 underline">
            Voltar ao site
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f3] text-slate-900">
      <div className="mx-auto flex max-w-[1600px] flex-col lg:min-h-screen lg:flex-row">
        <aside className="bg-[#142f27] px-4 py-5 text-white lg:w-64 lg:shrink-0 lg:px-5 lg:py-9">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div>
              <p className="text-xs font-bold tracking-[.26em] text-emerald-200">GOODSPOTLESS</p>
              <p className="mt-1 text-xl font-semibold">Administração</p>
            </div>
            <button
              className="rounded-xl p-2 text-emerald-100 hover:bg-white/10 lg:hidden"
              onClick={() => void logout()}
              aria-label="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
          <nav
            aria-label="Seções do painel"
            className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:mt-10 lg:flex-col lg:overflow-visible"
          >
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setPane(id);
                  setFilter("");
                }}
                aria-current={pane === id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors lg:w-full ${pane === id ? "bg-white text-[#142f27]" : "text-emerald-50 hover:bg-white/10"}`}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav>
          <button
            className="mt-10 hidden items-center gap-2 px-3 text-sm text-emerald-100 hover:text-white lg:flex"
            onClick={() => void logout()}
          >
            <LogOut size={16} /> Sair com segurança
          </button>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-12 lg:py-10">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-800">
                Controle operacional
              </p>
              <h1 className="mt-1 text-3xl font-semibold md:text-4xl">
                {NAV.find((item) => item.id === pane)?.label}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {lastLoaded
                  ? `Atualizado às ${lastLoaded.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · Atualização automática a cada 20 segundos`
                  : "Carregando dados…"}
              </p>
            </div>
            <button
              onClick={() => session && void reload(session)}
              disabled={busyData}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              <RefreshCw size={16} className={busyData ? "animate-spin" : ""} />
              Atualizar
            </button>
          </header>

          {dataError && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              Falha ao carregar: {dataError}. Confira se as tabelas operacionais já foram instaladas
              no Supabase GOODSPOTLESS.
            </div>
          )}

          {pane === "overview" && (
            <>
              <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <BellRing className="mt-1 shrink-0 text-emerald-900" size={24} />
                  <div>
                    <h2 className="text-lg font-bold text-emerald-950">
                      Avisar quando chegar cliente
                    </h2>
                    <p className="mt-2 text-sm text-emerald-950">
                      Ative o push para receber novos pedidos na tela bloqueada do iPhone. Os avisos
                      não mostram informações pessoais do cliente até você abrir o painel.
                    </p>
                    <p className="mt-2 text-sm text-emerald-900">
                      {!pushSupported()
                        ? "Seu navegador ainda não oferece Web Push. No iPhone, use Safari e adicione o painel à Tela de Início."
                        : !isInstalledApp()
                          ? "iPhone: no Safari, toque Compartilhar → Adicionar à Tela de Início; depois abra pelo novo ícone GOODSPOTLESS."
                          : "App instalado: você pode permitir os alertas abaixo. Ative também Sons em Ajustes → Notificações → GOODSPOTLESS."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={activateNotifications}
                        disabled={pushBusy !== null || !pushSupported()}
                        className="rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {pushBusy === "activate" ? "Ativando…" : "Ativar notificações push"}
                      </button>
                      <button
                        type="button"
                        onClick={sendTestPush}
                        disabled={pushBusy !== null || !pushSupported()}
                        className="rounded-xl border border-emerald-900 px-4 py-2.5 text-sm font-semibold text-emerald-950 disabled:opacity-50"
                      >
                        {pushBusy === "test" ? "Enviando…" : "Testar aviso real"}
                      </button>
                    </div>
                    {pushFeedback && (
                      <p role="status" className="mt-3 text-sm font-semibold text-emerald-950">
                        {pushFeedback}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-emerald-800">
                      O toque e a vibração com a tela bloqueada dependem das configurações do iOS,
                      modo silencioso e Foco. O site não pode forçar o volume nem duas vibrações.
                    </p>
                  </div>
                </div>
              </section>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Clientes aguardando resposta",
                    value: String(openEnquiries.length),
                    icon: ClipboardList,
                    color: "text-orange-700",
                  },
                  {
                    label: "Serviços em aberto",
                    value: String(upcomingVisits.length),
                    icon: CalendarDays,
                    color: "text-emerald-800",
                  },
                  {
                    label: "Entradas registradas",
                    value: money(revenue),
                    icon: ArrowDownLeft,
                    color: "text-emerald-800",
                  },
                  {
                    label: "Despesas registradas",
                    value: money(expenses),
                    icon: ArrowUpRight,
                    color: "text-red-700",
                  },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <Icon className={color} size={22} />
                    <p className="mt-4 text-sm text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-sm text-slate-500">Resultado operacional registrado</p>
                  <p
                    className={`mt-2 text-4xl font-bold ${profit < 0 ? "text-red-700" : "text-emerald-800"}`}
                  >
                    {money(profit)}
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
                    Entradas − despesas lançadas. Aportes e retiradas dos sócios não entram no
                    cálculo; valores previstos dos serviços também não são somados automaticamente.
                  </p>
                  <button
                    onClick={() => setPane("finance")}
                    className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-emerald-800"
                  >
                    Ver lançamentos <ChevronRight size={16} />
                  </button>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="text-sm text-slate-500">Estrutura da operação</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      ["Casas", rows.cleaning_properties.length],
                      ["Funcionárias", rows.cleaning_staff.length],
                      ["Clientes", rows.cleaning_clients.length],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-xl bg-slate-50 p-3 text-center">
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-xs text-slate-500">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-slate-600">
                    Cadastre primeiro clientes e casas; depois vincule funcionárias e agende os
                    serviços.
                  </p>
                </section>
              </div>
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">Pedidos recentes</h2>
                  <button
                    onClick={() => setPane("enquiries")}
                    className="text-sm font-semibold text-emerald-800"
                  >
                    Ver todos
                  </button>
                </div>
                {rows.enquiries.length ? (
                  rows.enquiries.slice(0, 5).map((row) => (
                    <div
                      key={row.id}
                      className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"
                    >
                      <div>
                        <b>{titleFor("enquiries", row, rows)}</b>
                        <p className="text-slate-500">{descriptionFor("enquiries", row, rows)}</p>
                      </div>
                      <ChevronRight size={16} />
                    </div>
                  ))
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    Ainda não há pedidos recebidos neste banco. O formulário público permanece
                    inalterado.
                  </p>
                )}
              </section>
            </>
          )}

          {visibleTable && (
            <>
              <div className="mb-5 flex flex-wrap gap-3">
                <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-500">
                  <Search size={17} />
                  <input
                    type="search"
                    placeholder="Pesquisar nesta lista"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    className="w-full bg-transparent text-base text-slate-900 outline-none"
                  />
                </label>
                <button
                  onClick={() => downloadCsv(pane, items)}
                  disabled={!items.length}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  <Download size={17} />
                  CSV
                </button>
                {pane !== "enquiries" && (
                  <button
                    onClick={() => setEditor({ table: visibleTable })}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Plus size={17} />
                    Adicionar
                  </button>
                )}
              </div>

              {pane === "finance" && (
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="text-sm text-emerald-900">Entradas</p>
                    <b className="text-xl text-emerald-900">{money(revenue)}</b>
                  </div>
                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-sm text-red-900">Despesas</p>
                    <b className="text-xl text-red-900">{money(expenses)}</b>
                  </div>
                  <div className="rounded-xl bg-white p-4">
                    <p className="text-sm text-slate-600">Resultado</p>
                    <b className="text-xl">{money(profit)}</b>
                  </div>
                </div>
              )}

              {pane === "partners" && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  {sharesValid ? (
                    <>
                      <CheckCircle2 size={17} className="mr-2 inline" />
                      Percentuais somam 100%. Resultado estimado por sócio:{" "}
                      {rows.business_partners
                        .map(
                          (row) =>
                            `${row.name}: ${money(Math.round((profit * Number(row.profit_share_percent)) / 100))}`,
                        )
                        .join(" · ")}
                      . Não representa distribuição paga.
                    </>
                  ) : (
                    "A participação nos lucros ainda não está acordada ou não soma 100%. Definam os percentuais antes de qualquer distribuição; aportes e retiradas devem ser lançados no Financeiro."
                  )}
                </div>
              )}

              {pane === "visits" && (
                <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <MapPinned size={18} className="mr-2 inline text-emerald-800" />
                  Ordene os serviços de um mesmo dia pelo campo “Ordem da rota”.
                  {(() => {
                    const today = new Date().toLocaleDateString("en-CA");
                    const todaysVisits = rows.cleaning_visits
                      .filter(
                        (visit) => visit.scheduled_date === today && visit.status !== "cancelled",
                      )
                      .sort((a, b) => Number(a.route_order || 999) - Number(b.route_order || 999));
                    const url = makeMapsUrl(todaysVisits, rows.cleaning_properties);
                    return url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 font-bold text-emerald-800 underline"
                      >
                        Abrir rota de hoje no Google Maps
                      </a>
                    ) : (
                      <span className="ml-2 text-slate-500">Nenhuma rota para hoje.</span>
                    );
                  })()}
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {items.length ? (
                  items.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:px-6"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-bold sm:text-base">
                          {titleFor(visibleTable, row, rows)}
                        </p>
                        <p className="mt-1 break-words text-xs text-slate-500 sm:text-sm">
                          {descriptionFor(visibleTable, row, rows)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {pane === "enquiries" && typeof row.phone_e164 === "string" && (
                          <a
                            href={`https://wa.me/${row.phone_e164.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800"
                          >
                            WhatsApp
                          </a>
                        )}
                        <button
                          title="Editar"
                          aria-label={`Editar ${titleFor(visibleTable, row, rows)}`}
                          onClick={() => setEditor({ table: visibleTable, row })}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-emerald-50"
                        >
                          <Pencil size={16} />
                        </button>
                        {pane !== "enquiries" && pane !== "partners" && (
                          <button
                            title={pane === "finance" ? "Estornar" : "Excluir"}
                            aria-label={`${pane === "finance" ? "Estornar" : "Excluir"} ${titleFor(visibleTable, row, rows)}`}
                            onClick={() => void remove(visibleTable, row)}
                            className="rounded-lg border border-slate-200 p-2 text-red-700 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-14 text-center">
                    <p className="font-semibold text-slate-700">
                      {filter ? "Nenhum resultado para esta pesquisa" : "Nenhum registro ainda"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {pane === "enquiries"
                        ? "As solicitações do site aparecerão aqui quando forem recebidas no Supabase."
                        : "Você pode cadastrar o primeiro registro usando o botão Adicionar."}
                    </p>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {items.length} registros exibidos. Listagem limitada aos 500 mais recentes por
                tabela.
              </p>
            </>
          )}
        </main>
      </div>
      {editor && session && (
        <Editor
          editor={editor}
          session={session}
          rows={rows}
          onClose={() => setEditor(null)}
          onSaved={() => reload(session)}
        />
      )}
    </div>
  );
}
