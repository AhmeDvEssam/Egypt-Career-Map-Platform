'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { use } from 'react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';

const spring = { type: 'spring' as const, stiffness: 300, damping: 25 };

interface JobDetail {
  id: string;
  titleRaw: string;
  titleNormalized: string | null;
  companyName: string;
  companyUrl: string | null;
  locationRaw: string;
  locationNormalized: string | null;
  jobType: string | null;
  workType: string | null;
  experienceLevel: string | null;
  careerLevel: string | null;
  educationLevel: string | null;
  jobCategory: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  jobUrl: string;
  postedDate: string | null;
  source: string;
  status: string;
  descriptions: { id: string; type: string; content: string; isPrimary: boolean }[];
  skills: { skill: { name: string; category: string | null } }[];
  industries: { industry: { name: string } }[];
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setJob(d.job);
      })
      .catch(() => setError('Failed to load job'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="pt-24 max-w-4xl mx-auto px-6 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-zinc-800 rounded w-2/3" />
            <div className="h-4 bg-zinc-800 rounded w-1/3" />
            <div className="h-4 bg-zinc-800 rounded w-1/2" />
            <div className="h-32 bg-zinc-800 rounded mt-6" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="min-h-screen bg-zinc-950">
        <Navbar />
        <div className="pt-24 max-w-4xl mx-auto px-6 py-20 text-center">
          <p className="text-zinc-400 text-lg">{error || 'Job not found'}</p>
          <a href="/jobs" className="text-teal-400 hover:underline mt-4 inline-block">&larr; Back to jobs</a>
        </div>
      </main>
    );
  }

  const description = job.descriptions.find((d) => d.type === 'description');
  const requirements = job.descriptions.find((d) => d.type === 'requirements');

  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="mesh-gradient fixed inset-0 opacity-20 pointer-events-none" />
      <div className="relative z-10 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <motion.a
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 mb-6"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={spring}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to all jobs
          </motion.a>

          <motion.div
            className="glass-card rounded-2xl p-8 md:p-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1 min-w-0 mr-4">
                <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">{job.titleRaw}</h1>
                <div className="flex items-center gap-3 mt-2">
                  {job.companyUrl ? (
                    <a href={job.companyUrl} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline font-medium">
                      {job.companyName}
                    </a>
                  ) : (
                    <span className="text-zinc-300 font-medium">{job.companyName}</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    job.source === 'LinkedIn' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    job.source === 'Wuzzuf' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>{job.source}</span>
                </div>
              </div>
              <a
                href={job.jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium"
              >
                Apply Now
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-900/50 mb-6">
              {job.locationRaw && (
                <div>
                  <p className="text-xs text-zinc-500">Location</p>
                  <p className="text-sm text-zinc-200">{job.locationRaw}</p>
                </div>
              )}
              {job.jobType && (
                <div>
                  <p className="text-xs text-zinc-500">Type</p>
                  <p className="text-sm text-zinc-200">{job.jobType}</p>
                </div>
              )}
              {job.experienceLevel && (
                <div>
                  <p className="text-xs text-zinc-500">Experience</p>
                  <p className="text-sm text-zinc-200">{job.experienceLevel}</p>
                </div>
              )}
              {job.salaryMin && (
                <div>
                  <p className="text-xs text-zinc-500">Salary</p>
                  <p className="text-sm text-teal-400">
                    {job.salaryMin.toLocaleString()} {job.currency || ''}
                    {job.salaryMax ? ` - ${job.salaryMax.toLocaleString()}` : ''}
                  </p>
                </div>
              )}
              {job.workType && (
                <div>
                  <p className="text-xs text-zinc-500">Work Type</p>
                  <p className="text-sm text-zinc-200">{job.workType}</p>
                </div>
              )}
              {job.careerLevel && (
                <div>
                  <p className="text-xs text-zinc-500">Career Level</p>
                  <p className="text-sm text-zinc-200">{job.careerLevel}</p>
                </div>
              )}
              {job.educationLevel && (
                <div>
                  <p className="text-xs text-zinc-500">Education</p>
                  <p className="text-sm text-zinc-200">{job.educationLevel}</p>
                </div>
              )}
              {job.jobCategory && (
                <div>
                  <p className="text-xs text-zinc-500">Category</p>
                  <p className="text-sm text-zinc-200">{job.jobCategory}</p>
                </div>
              )}
            </div>

            {description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-100 mb-3">Description</h2>
                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {description.content}
                </div>
              </div>
            )}

            {requirements && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-100 mb-3">Requirements</h2>
                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {requirements.content}
                </div>
              </div>
            )}

            {job.skills.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-100 mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((js) => (
                    <span
                      key={js.skill.name}
                      className="text-xs px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20"
                    >
                      {js.skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {job.postedDate && (
              <p className="text-xs text-zinc-600 mt-4">
                Posted: {new Date(job.postedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </motion.div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
