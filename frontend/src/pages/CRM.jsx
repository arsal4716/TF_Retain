import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/records";

function statusBadge(status) {
  const base =
    "inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize";
  switch (status) {
    case "retained":
      return `${base} bg-emerald-100 text-emerald-700`;
    case "error":
      return `${base} bg-rose-100 text-rose-700`;
    case "processing":
      return `${base} bg-amber-100 text-amber-700`;
    case "pending":
      return `${base} bg-slate-200 text-slate-700`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}

export default function CRM() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(API_URL, {
        params: {
          search: search || undefined,
          status: status || undefined,
        },
      });

      setData(res.data || []);
    } catch (error) {
      console.error("Failed to fetch records:", error);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 3000);
    return () => clearInterval(interval);
  }, [fetchRecords]);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">CRM Records</h2>
          <p className="mt-1 text-sm text-slate-500">
            Search and monitor TrustedForm processing records.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Search by CID or URL"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="retained">Retained</option>
            <option value="error">Error</option>
          </select>

          <button
            onClick={fetchRecords}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Total visible records:{" "}
          <span className="font-semibold text-slate-900">{data.length}</span>
        </div>

        {loading && (
          <div className="text-sm font-medium text-blue-600">Loading...</div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  CID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  TrustedForm URL
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Message
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {!loading && data.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No records found.
                  </td>
                </tr>
              )}

              {data.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-900">
                    {r.cid || "-"}
                  </td>

                  <td className="max-w-md px-4 py-4 text-sm text-blue-600">
                    <a
                      href={r.trustedFormUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 break-all hover:underline"
                    >
                      {r.trustedFormUrl}
                    </a>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-sm">
                    <span className={statusBadge(r.status)}>{r.status}</span>
                  </td>

                  <td className="max-w-md px-4 py-4 text-sm text-slate-600">
                    <div className="line-clamp-2 break-words">
                      {r.message || "-"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}