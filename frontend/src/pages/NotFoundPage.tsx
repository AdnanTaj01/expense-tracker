import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-800">404</h1>
        <p className="mt-4 text-slate-500">Page not found</p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;