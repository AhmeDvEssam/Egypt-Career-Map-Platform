"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const google_1 = require("next/font/google");
require("./globals.css");
const inter = (0, google_1.Inter)({
    subsets: ['latin'],
    variable: '--font-inter',
});
const calistoga = (0, google_1.Calistoga)({
    subsets: ['latin'],
    weight: '400',
    variable: '--font-calistoga',
});
exports.metadata = {
    title: 'Egypt Career Map | Labor Market Intelligence',
    description: 'Discover opportunities across Egypt. AI-powered job aggregation, skill gap analysis, and labor market intelligence for job seekers, recruiters, and strategic planners.',
    keywords: [
        'Egypt jobs',
        'career map',
        'labor market',
        'job aggregator',
        'Egypt employment',
        'skill gap analysis',
    ],
};
function RootLayout({ children, }) {
    return (<html lang="en" className="dark">
      <body className={`${inter.variable} ${calistoga.variable} font-sans`}>
        {children}
      </body>
    </html>);
}
