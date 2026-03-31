import { useState } from "react";
import axios from "axios";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const upload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const form = new FormData();
      form.append("file", file);

      const res = await axios.post("http://localhost:5000/api/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage(`Upload successful. Job ID: ${res.data.jobId}`);
      setFile(null);

      const input = document.getElementById("file-upload");
      if (input) input.value = "";
    } catch (error) {
      setMessage(
        error?.response?.data?.error || "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Upload File</h2>
        <p className="mt-1 text-sm text-slate-500">
          Supported formats: CSV, XLS, XLSX
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          id="file-upload"
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
        />

        <button
          onClick={upload}
          disabled={uploading}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload File"}
        </button>
      </div>

      {file && (
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
          Selected file: <span className="font-medium">{file.name}</span>
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700 ring-1 ring-blue-200">
          {message}
        </div>
      )}
    </div>
  );
}