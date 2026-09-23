import { useAuth } from "../context/AuthContext";

function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Welcome{user?.full_name ? `, ${user.full_name}` : ""}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Signed in as {user?.email} · Currency: {user?.currency}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {["Total Balance", "Month Income", "Month Expense", "Net"].map(
          (label) => (
            <div
              key={label}
              className="bg-white rounded-lg shadow-sm p-5 border border-slate-200"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-2">—</p>
            </div>
          ),
        )}
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Live data coming in Phase 14.
      </p>
    </div>
  );
}

export default DashboardPage;