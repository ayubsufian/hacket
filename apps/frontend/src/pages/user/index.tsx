import React, { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ParticipantLayout } from '@/layouts/ParticipantLayout';
import { Button } from '@/components/shared/Button';
import {
	ArrowRight,
	BadgeCheck,
	Bell,
	Calendar,
	CheckCircle2,
	Compass,
	ExternalLink,
	MapPin,
	Search,
	ShieldCheck,
	Sparkles,
	Star,
	Target,
	Trophy,
	Users,
	Zap,
} from 'lucide-react';

const recommendations = [
	{
		title: 'Addis BlockHack 2026',
		category: 'FinTech · Hybrid',
		match: 98,
		date: 'Nov 12 — Nov 14',
		location: 'Addis Ababa / Remote',
		status: 'Registration Open',
		accent: 'emerald',
	},
	{
		title: 'AI for Good Safari',
		category: 'AI · Social Impact',
		match: 94,
		date: 'Dec 05 — Dec 07',
		location: 'Bahir Dar',
		status: 'Mentor Matching',
		accent: 'sky',
	},
	{
		title: 'Green Agri-Tech Sprint',
		category: 'Climate · Agriculture',
		match: 89,
		date: 'Jan 18 — Jan 20',
		location: 'Hybrid',
		status: 'Saved Track',
		accent: 'violet',
	},
	{
		title: 'Civic Tech Builders Lab',
		category: 'GovTech · Product',
		match: 87,
		date: 'Feb 03 — Feb 05',
		location: 'Addis Ababa',
		status: 'Invite Only',
		accent: 'amber',
	},
];

const stats = [
	{ label: 'Hackathons joined', value: '12', icon: Calendar, tone: 'sky' },
	{ label: 'Projects shipped', value: '8', icon: CheckCircle2, tone: 'emerald' },
	{ label: 'Awards earned', value: '3', icon: Trophy, tone: 'amber' },
	{ label: 'Teams matched', value: '5', icon: Users, tone: 'violet' },
];

const actionItems = [
	{ label: 'Update profile', href: '/user/profile', icon: BadgeCheck },
	{ label: 'Browse events', href: '/events', icon: Compass },
	{ label: 'Search tracks', href: '/events/search', icon: Search },
];

const milestones = [
	{
		title: 'Profile verified',
		description: 'Identity and contact details confirmed.',
		icon: ShieldCheck,
	},
	{
		title: 'Team-ready badge',
		description: 'Visible to organizers and recruiters.',
		icon: Sparkles,
	},
	{
		title: 'Mentor shortlist',
		description: 'Suggested by recent hackathon activity.',
		icon: Target,
	},
];

const getAccentClass = (accent: string) => {
	switch (accent) {
		case 'emerald':
			return 'from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/20';
		case 'sky':
			return 'from-sky-500/20 to-sky-500/5 text-sky-300 border-sky-500/20';
		case 'violet':
			return 'from-violet-500/20 to-violet-500/5 text-violet-300 border-violet-500/20';
		default:
			return 'from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/20';
	}
};

export default function UserHomePage() {
	const visibleRecommendations = useMemo(() => recommendations, []);

	return (
		<ParticipantLayout>
			<Head>
				<title>HackET | User Hub</title>
			</Head>

			<div className="space-y-6">
				<section className="relative overflow-hidden rounded-[2rem] border border-slate-800/60 bg-gradient-to-br from-white via-emerald-50 to-sky-50 text-slate-900 shadow-2xl shadow-emerald-950/20">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.12),_transparent_35%)]" />
					<div className="relative grid gap-8 px-6 py-8 lg:grid-cols-[1.4fr_0.9fr] lg:px-10 lg:py-10">
						<div className="space-y-6">
							<div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-700">
								<Sparkles size={14} />
								User Hub
							</div>

							<div className="space-y-4 max-w-3xl">
								<h1 className="text-4xl font-black tracking-tight text-slate-950 lg:text-6xl">
									Build your profile, discover the right hackathons, and keep every opportunity in one place.
								</h1>
								<p className="max-w-2xl text-sm leading-7 text-slate-600 lg:text-base">
									A clean participant workspace inspired by the landing page design: soft gradients, bold typography, and focused actions that make it easy to stay active.
								</p>
							</div>

							<div className="grid gap-3 sm:grid-cols-[1fr_auto]">
								<div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
									<Search size={18} className="text-slate-400" />
									<input
										aria-label="Search opportunities"
										className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
										placeholder="Search saved events, teams, mentors, or skills"
									/>
								</div>
								<Button
									variant="primary"
									size="lg"
									className="rounded-2xl bg-emerald-500 px-6 font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600"
								>
									Explore opportunities
									<ArrowRight size={16} className="ml-2" />
								</Button>
							</div>

							<div className="flex flex-wrap gap-3">
								{actionItems.map((item) => {
									const Icon = item.icon;
									return (
										<Link
											key={item.label}
											href={item.href}
											className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700"
										>
											<Icon size={16} />
											{item.label}
											<ExternalLink size={14} className="text-slate-400" />
										</Link>
									);
								})}
							</div>
						</div>

						<div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white/85 p-5 shadow-xl backdrop-blur">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Profile health</p>
									<h2 className="mt-1 text-2xl font-black text-slate-950">92% complete</h2>
								</div>
								<div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
									Ready for teams
								</div>
							</div>

							<div className="h-3 rounded-full bg-slate-100">
								<div className="h-full w-[92%] rounded-full bg-gradient-to-r from-emerald-500 to-sky-500" />
							</div>

							<div className="grid grid-cols-2 gap-3">
								{[
									{ label: 'Location', value: 'Addis Ababa', icon: MapPin },
									{ label: 'Availability', value: 'Open to teams', icon: Bell },
									{ label: 'Next deadline', value: 'Nov 12', icon: Calendar },
									{ label: 'Match score', value: '98%', icon: Star },
								].map((item) => {
									const Icon = item.icon;
									return (
										<div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
											<Icon size={16} className="text-emerald-600" />
											<p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{item.label}</p>
											<p className="mt-1 text-sm font-bold text-slate-900">{item.value}</p>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</section>

				<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{stats.map((stat) => {
						const Icon = stat.icon;
						const toneClass =
							stat.tone === 'emerald'
								? 'from-emerald-500/15 to-emerald-500/5 text-emerald-300 border-emerald-500/20'
								: stat.tone === 'sky'
								? 'from-sky-500/15 to-sky-500/5 text-sky-300 border-sky-500/20'
								: stat.tone === 'violet'
								? 'from-violet-500/15 to-violet-500/5 text-violet-300 border-violet-500/20'
								: 'from-amber-500/15 to-amber-500/5 text-amber-300 border-amber-500/20';

						return (
							<div
								key={stat.label}
								className={`rounded-[1.5rem] border bg-gradient-to-br p-5 shadow-lg ${toneClass}`}
							>
								<div className="flex items-center justify-between">
									<div className="rounded-2xl border border-current/15 bg-white/5 p-3">
										<Icon size={18} />
									</div>
									<Zap size={16} className="text-slate-500" />
								</div>
								<p className="mt-6 text-3xl font-black text-white">{stat.value}</p>
								<p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
									{stat.label}
								</p>
							</div>
						);
					})}
				</section>

				<section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
					<div className="rounded-[2rem] border border-slate-800/60 bg-slate-900/40 p-6 shadow-xl">
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Recommended for you</p>
								<h2 className="mt-2 text-2xl font-black tracking-tight text-white">High-fit opportunities</h2>
							</div>
							<Link href="/events" className="text-sm font-semibold text-emerald-300 transition hover:text-emerald-200">
								View all
							</Link>
						</div>

						<div className="mt-6 grid gap-4 md:grid-cols-2">
							{visibleRecommendations.map((item) => (
								<article
									key={item.title}
									className={`rounded-[1.5rem] border bg-gradient-to-br p-5 ${getAccentClass(item.accent)}`}
								>
									<div className="flex items-start justify-between gap-4">
										<div>
											<p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
												{item.category}
											</p>
											<h3 className="mt-2 text-xl font-black tracking-tight text-white">{item.title}</h3>
										</div>
										<div className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-center">
											<p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Match</p>
											<p className="text-lg font-black text-white">{item.match}%</p>
										</div>
									</div>

									<div className="mt-5 space-y-2 text-sm text-slate-300">
										<div className="flex items-center gap-2">
											<Calendar size={14} />
											{item.date}
										</div>
										<div className="flex items-center gap-2">
											<MapPin size={14} />
											{item.location}
										</div>
									</div>

									<div className="mt-6 flex items-center justify-between gap-3">
										<span className="rounded-full border border-current/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em]">
											{item.status}
										</span>
										<Button variant="primary" size="sm" className="rounded-full bg-white text-slate-950 hover:bg-slate-100">
											Open
										</Button>
									</div>
								</article>
							))}
						</div>
					</div>

					<div className="space-y-6">
						<div className="rounded-[2rem] border border-slate-800/60 bg-slate-900/40 p-6 shadow-xl">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Next steps</p>
									<h2 className="mt-2 text-2xl font-black tracking-tight text-white">Fast actions</h2>
								</div>
								<Sparkles size={18} className="text-emerald-300" />
							</div>

							<div className="mt-6 space-y-3">
								{milestones.map((item) => {
									const Icon = item.icon;
									return (
										<div key={item.title} className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
											<div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">
												<Icon size={16} />
											</div>
											<div>
												<p className="font-semibold text-white">{item.title}</p>
												<p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						<div className="rounded-[2rem] border border-slate-800/60 bg-slate-900/40 p-6 shadow-xl">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Account setup</p>
									<h2 className="mt-2 text-2xl font-black tracking-tight text-white">Checklist</h2>
								</div>
								<BadgeCheck size={18} className="text-sky-300" />
							</div>

							<div className="mt-6 space-y-3 text-sm">
								{[
									'Add your GitHub and LinkedIn links',
									'Complete skill tags and interests',
									'Join one recommended hackathon',
									'Save at least one team opportunity',
								].map((item, index) => (
									<div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
										<div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-[11px] font-black text-emerald-300">
											{index + 1}
										</div>
										<span className="text-slate-300">{item}</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</section>
			</div>
		</ParticipantLayout>
	);
}
