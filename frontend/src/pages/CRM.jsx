import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const API_URL = "/api/portal/records";
const PAGE_SIZE = 20;

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
    case "queued":
      return `${base} bg-slate-200 text-slate-700`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}

function sourceBadge(source) {
  const base =
    "inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize";
  switch (source) {
    case "upload":
      return `${base} bg-blue-100 text-blue-700`;
    case "pixel":
      return `${base} bg-violet-100 text-violet-700`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}

export default function CRM() {
  const [data, setData] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axios.get(API_URL, {
        params: {
          page,
          limit: PAGE_SIZE,
          search: search || undefined,
          status: status || undefined,
          source: source || undefined,
        },
      });

      setData(res.data?.data || []);
      setPagination(
        res.data?.pagination || {
          page: 1,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      );
    } catch (error) {
      console.error("Failed to fetch portal records:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, source]);

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 10000);
    return () => clearInterval(interval);
  }, [fetchRecords]);

  const applyFilters = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setSource("all");
    setPage(1);
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Portal Records
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Showing both file upload and Ringba pixel TrustedForm records.
          </p>
        </div>

        <div className="text-sm text-slate-500">
          Total Records:{" "}
          <span className="font-semibold text-slate-900">
            {pagination.total}
          </span>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-5">
        <input
          type="text"
          placeholder="Search CID, phone, call ID, TF URL..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:col-span-2"
        />

        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">All Sources</option>
          <option value="upload">File Upload</option>
          <option value="pixel">Ringba Pixel</option>
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="queued">Queued</option>
          <option value="processing">Processing</option>
          <option value="retained">Retained</option>
          <option value="error">Error</option>
        </select>

        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Search
          </button>
          <button
            onClick={resetFilters}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Page{" "}
          <span className="font-semibold text-slate-900">
            {pagination.page}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-slate-900">
            {pagination.totalPages || 1}
          </span>
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
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  CID / Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Call ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  TrustedForm
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Message
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Attempts
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Created
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {!loading && data.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No records found.
                  </td>
                </tr>
              )}

              {data.map((r) => (
                <tr key={`${r.source}-${r._id}`} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-4 text-sm">
                    <span className={sourceBadge(r.source)}>
                      {r.sourceLabel || r.source}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-900">
                    <div className="font-medium">
                      {r.cid || r.phoneNumber || "-"}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-600">
                    {r.ringbaCallId || "-"}
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
                    {r.trustedId ? (
                      <div className="mt-1 text-xs text-slate-500 break-all">
                        ID: {r.trustedId}
                      </div>
                    ) : null}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-sm">
                    <span className={statusBadge(r.status)}>{r.status}</span>
                  </td>

                  <td className="max-w-md px-4 py-4 text-sm text-slate-600">
                    <div className="line-clamp-2 break-words">
                      {r.message || "-"}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                    {r.attempts ?? 0}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-900">{data.length}</span> of{" "}
          <span className="font-semibold text-slate-900">
            {pagination.total}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            disabled={!pagination.hasPrevPage}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          <button
            disabled={!pagination.hasNextPage}
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
