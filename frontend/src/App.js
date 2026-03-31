import Upload from "./pages/Upload";
import CRM from "./pages/CRM";

function App() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            TrustedForm CRM Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Upload files, monitor processing, and manage retained/error records.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Upload />
          <CRM />
        </div>
      </div>
    </div>
  );
}

export default App;