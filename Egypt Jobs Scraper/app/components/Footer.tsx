export default function Footer() {
  return (
    <footer className="border-t border-zinc-800/50 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                <span className="text-zinc-950 font-bold text-sm">EC</span>
              </div>
              <span className="font-semibold text-zinc-100">Egypt Career Map</span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">
              AI-powered labor market intelligence for the Arab Republic of Egypt.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href="/jobs" className="hover:text-zinc-300 transition-colors">Job Search</a></li>
              <li><a href="/skills" className="hover:text-zinc-300 transition-colors">Skills Explorer</a></li>
              <li><a href="/planner" className="hover:text-zinc-300 transition-colors">Planner Dashboard</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-4">Data</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><span className="hover:text-zinc-300 transition-colors cursor-pointer">LinkedIn</span></li>
              <li><span className="hover:text-zinc-300 transition-colors cursor-pointer">Wuzzuf</span></li>
              <li><span className="hover:text-zinc-300 transition-colors cursor-pointer">Indeed</span></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href="/about" className="hover:text-zinc-300 transition-colors">About</a></li>
              <li><a href="/login" className="hover:text-zinc-300 transition-colors">Login</a></li>
              <li><a href="/signup" className="hover:text-zinc-300 transition-colors">Sign Up</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-zinc-800/50 text-center text-sm text-zinc-600">
          &copy; {new Date().getFullYear()} Egypt Career Map. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
