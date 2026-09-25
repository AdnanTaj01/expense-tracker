import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 transition-colors">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-800 dark:text-slate-100">
          404
        </h1>
        <p className="mt-4 text-slate-500 dark:text-slate-400">
          Page not found
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block px-4 py-2 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-md hover:bg-slate-700 dark:hover:bg-white transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;