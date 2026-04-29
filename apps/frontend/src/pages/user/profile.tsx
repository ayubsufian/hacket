import React, { useMemo, useState } from 'react';
import Head from 'next/head';
import { ParticipantLayout } from '@/layouts/ParticipantLayout';
import {
  ArrowRight,
  BadgeCheck,
  Github,
  Linkedin,
  MapPin,
  GraduationCap,
  Calendar,
  Trophy,
  Users,
  Award,
  Code2,
  Sparkles,
  Edit3,
  Share2,
  Mail,
  Phone,
  Briefcase,
  ExternalLink,
  Copy,
  Target,
  ShieldCheck,
  Clock3,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/shared/Button';

interface UserProfile {
  firstName: string;
  lastName: string;
  bio: string;
  avatarUrl: string;
  phone?: string;
  university?: string;
  graduationYear?: number;
  city?: string;
  region?: string;
  skills: string[];
  interests: string[];
  githubUrl?: string;
  linkedinUrl?: string;
  isSeekingTeam: boolean;
}

interface Team {
  id: string;
  name: string;
  hackathonName: string;
  role: 'LEADER' | 'MEMBER';
  memberCount: number;
  status: 'active' | 'completed' | 'upcoming';
}

interface Certificate {
  id: string;
  title: string;
  hackathonName: string;
  awardTier: string;
  issuedAt: string;
  type: 'CERTIFICATE' | 'BADGE';
}

interface HackathonStat {
  participated: number;
  completed: number;
  won: number;
  teamsJoined: number;
}

type ProfileTab = 'overview' | 'teams' | 'awards';

const mockUser: UserProfile = {
  firstName: 'Dawit',
  lastName: 'Mekonnen',
  bio: 'Full-stack developer passionate about building innovative solutions for social impact. Experienced in React, Node.js, and AI/ML technologies. Love participating in hackathons to learn and collaborate with talented developers.',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dawit',
  phone: '+251 912 345 678',
  university: 'Addis Ababa University',
  graduationYear: 2024,
  city: 'Addis Ababa',
  region: 'Addis Ababa',
  skills: ['React', 'TypeScript', 'Node.js', 'Python', 'AI/ML', 'PostgreSQL', 'Docker', 'AWS'],
  interests: ['Fintech', 'HealthTech', 'EdTech', 'Blockchain', 'Open Source'],
  githubUrl: 'https://github.com/dawitm',
  linkedinUrl: 'https://linkedin.com/in/dawitm',
  isSeekingTeam: true,
};

const mockStats: HackathonStat = {
  participated: 12,
  completed: 8,
  won: 3,
  teamsJoined: 5,
};

const recentActivity = [
  {
    action: 'Joined team',
    target: 'Code Warriors',
    time: '2 days ago',
    type: 'team',
  },
  {
    action: 'Registered for',
    target: 'AI For Good Safari',
    time: '1 week ago',
    type: 'event',
  },
  {
    action: 'Earned certificate',
    target: 'First Place Winner',
    time: '2 weeks ago',
    type: 'award',
  },
  {
    action: 'Submitted project',
    target: 'Green Agri-Tech Solution',
    time: '1 month ago',
    type: 'project',
  },
];

const profileHighlights = [
  {
    label: 'Profile completion',
    value: '92%',
    detail: 'Great for team matching and mentor visibility.',
    icon: BadgeCheck,
  },
  {
    label: 'Response time',
    value: '< 2 hrs',
    detail: 'Actively engages with organizers and teammates.',
    icon: Clock3,
  },
  {
    label: 'Team readiness',
    value: 'Open',
    detail: 'Available for new hackathon collaborations.',
    icon: Rocket,
  },
];

const mockTeams: Team[] = [
  {
    id: '1',
    name: 'Code Warriors',
    hackathonName: 'Addis BlockHack 2026',
    role: 'LEADER',
    memberCount: 4,
    status: 'active',
  },
  {
    id: '2',
    name: 'Tech Titans',
    hackathonName: 'Ethio FinTech Hack',
    role: 'MEMBER',
    memberCount: 5,
    status: 'completed',
  },
  {
    id: '3',
    name: 'AI Pioneers',
    hackathonName: 'AI For Good Safari',
    role: 'MEMBER',
    memberCount: 3,
    status: 'upcoming',
  },
];

const mockCertificates: Certificate[] = [
  {
    id: '1',
    title: 'First Place Winner',
    hackathonName: 'Green Agri-Tech Sprint 2025',
    awardTier: 'winner',
    issuedAt: '2025-03-15',
    type: 'CERTIFICATE',
  },
  {
    id: '2',
    title: 'Best Innovation Award',
    hackathonName: 'HealthTech Challenge 2024',
    awardTier: 'innovation',
    issuedAt: '2024-11-20',
    type: 'BADGE',
  },
  {
    id: '3',
    title: 'Outstanding Participant',
    hackathonName: 'Civic Tech Builders Lab',
    awardTier: 'participant',
    issuedAt: '2024-08-10',
    type: 'CERTIFICATE',
  },
];

const ProfileHeader: React.FC<{ user: UserProfile }> = ({ user }) => (
  <div className="relative overflow-hidden rounded-[2rem] border border-emerald-200/30 bg-gradient-to-br from-white via-emerald-50 to-sky-50 p-6 text-slate-900 shadow-2xl shadow-emerald-950/10 lg:p-8">
    {/* Background decoration */}
    <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl -translate-y-1/2 translate-x-1/2" />
    
    <div className="relative flex gap-8">
      {/* Avatar */}
      <div className="relative">
        <div className="h-32 w-32 overflow-hidden rounded-[1.5rem] border-2 border-white shadow-xl ring-1 ring-slate-200 lg:h-36 lg:w-36">
          <img
            src={user.avatarUrl}
            alt={`${user.firstName} ${user.lastName}`}
            className="w-full h-full object-cover"
          />
        </div>
        {user.isSeekingTeam && (
          <div className="absolute -bottom-2 -right-2 rounded-full border-2 border-white bg-emerald-500 px-3 py-1 text-[10px] font-bold text-white shadow-lg">
            Open to Team
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700">
              <Sparkles size={14} />
              Profile overview
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 lg:text-5xl">
              {user.firstName} {user.lastName}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              {user.university && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-emerald-600" />
                  {user.university}
                  {user.graduationYear && ` • Class of ${user.graduationYear}`}
                </span>
              )}
              {(user.city || user.region) && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-600" />
                  {[user.city, user.region].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-2 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              <Edit3 size={14} />
              Edit Profile
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              <Share2 size={14} />
              Share
            </Button>
          </div>
        </div>

        <p className="mt-5 max-w-3xl leading-relaxed text-slate-600">
          {user.bio}
        </p>

        {/* Social Links */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {user.githubUrl && (
            <a
              href={user.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700"
            >
              <Github size={16} />
              GitHub
              <ExternalLink size={14} className="text-slate-400" />
            </a>
          )}
          {user.linkedinUrl && (
            <a
              href={user.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700"
            >
              <Linkedin size={16} />
              LinkedIn
              <ExternalLink size={14} className="text-slate-400" />
            </a>
          )}
          {user.phone && (
            <a
              href={`tel:${user.phone}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700"
            >
              <Phone size={16} />
              {user.phone}
            </a>
          )}
        </div>
      </div>
    </div>
  </div>
);

const StatsCard: React.FC<{ stats: HackathonStat }> = ({ stats }) => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {[
      { label: 'Hackathons', value: stats.participated, icon: Calendar, tone: 'sky' },
      { label: 'Completed', value: stats.completed, icon: Briefcase, tone: 'emerald' },
      { label: 'Awards Won', value: stats.won, icon: Trophy, tone: 'amber' },
      { label: 'Teams Joined', value: stats.teamsJoined, icon: Users, tone: 'violet' },
    ].map((stat) => {
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
        className={`rounded-[1.5rem] border bg-gradient-to-br p-6 shadow-lg ${toneClass}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="rounded-2xl border border-current/15 bg-white/5 p-2">
            <stat.icon size={20} />
          </div>
          <Sparkles size={14} className="text-slate-500" />
        </div>
        <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-[0.25em]">
          {stat.label}
        </p>
      </div>
      );
    })}
  </div>
);

const SkillsSection: React.FC<{ skills: string[]; interests: string[] }> = ({
  skills,
  interests,
}) => (
  <div className="rounded-[2rem] border border-slate-800/60 bg-slate-900/40 p-6 shadow-xl">
    <div className="flex items-center gap-2 mb-6">
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2">
        <Code2 size={16} className="text-sky-300" />
      </div>
      <h3 className="text-lg font-black tracking-tighter text-white uppercase">
        Skills & Expertise
      </h3>
    </div>

    <div className="space-y-6">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-bold">
          Technical Skills
        </p>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-bold">
          Interests
        </p>
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <span
              key={interest}
              className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm font-medium text-slate-300"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const TeamsSection: React.FC<{ teams: Team[] }> = ({ teams }) => (
  <div className="rounded-[2rem] border border-slate-800/60 bg-slate-900/40 p-6 shadow-xl">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-2">
          <Users size={16} className="text-violet-300" />
        </div>
        <h3 className="text-lg font-black tracking-tighter text-white uppercase">
          My Teams
        </h3>
      </div>
      <Button variant="outline" size="sm">
        View All
      </Button>
    </div>

    <div className="space-y-4">
      {teams.map((team) => (
        <div
          key={team.id}
          className="group flex cursor-pointer items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 transition-all hover:border-emerald-500/25"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-sky-500/15 text-xl font-bold text-white ring-1 ring-white/5">
              {team.name.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-white transition-colors group-hover:text-emerald-300">
                {team.name}
              </h4>
              <p className="text-sm text-slate-500">{team.hackathonName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span
                className={`text-xs font-bold px-2 py-1 rounded ${
                  team.role === 'LEADER'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {team.role}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <Users size={14} />
              {team.memberCount}
            </div>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                team.status === 'active'
                  ? 'bg-emerald-500'
                  : team.status === 'completed'
                  ? 'bg-blue-500'
                  : 'bg-orange-500'
              }`}
              title={team.status}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const CertificatesSection: React.FC<{ certificates: Certificate[] }> = ({
  certificates,
}) => (
  <div className="rounded-[2rem] border border-slate-800/60 bg-slate-900/40 p-6 shadow-xl">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2">
          <Award size={16} className="text-amber-300" />
        </div>
        <h3 className="text-lg font-black tracking-tighter text-white uppercase">
          Certificates & Awards
        </h3>
      </div>
      <Button variant="outline" size="sm">
        View All
      </Button>
    </div>

    <div className="grid grid-cols-1 gap-4">
      {certificates.map((cert) => (
        <div
          key={cert.id}
          className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 transition-all hover:border-emerald-500/25"
        >
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              cert.type === 'BADGE'
                ? 'bg-amber-500/10 border border-amber-500/20'
                : 'bg-sky-500/10 border border-sky-500/20'
            }`}
          >
            {cert.type === 'BADGE' ? (
              <Trophy size={24} className="text-amber-300" />
            ) : (
              <Award size={24} className="text-sky-300" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-white transition-colors group-hover:text-emerald-300">
              {cert.title}
            </h4>
            <p className="text-sm text-slate-500">{cert.hackathonName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">
              {new Date(cert.issuedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-1 inline-block ${
                cert.awardTier === 'winner'
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : cert.awardTier === 'innovation'
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {cert.awardTier}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ActivitySection: React.FC = () => (
  <div className="rounded-[2rem] border border-slate-800/60 bg-slate-900/40 p-6 shadow-xl">
    <div className="flex items-center gap-2 mb-6">
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2">
        <Sparkles size={16} className="text-emerald-300" />
      </div>
      <h3 className="text-lg font-black tracking-tighter text-white uppercase">
        Recent Activity
      </h3>
    </div>

    <div className="space-y-4">
      {recentActivity.map((activity, i) => (
        <div key={i} className="flex items-start gap-3">
          <div
            className={`w-2 h-2 rounded-full mt-2 ${
              activity.type === 'team'
                ? 'bg-violet-500'
                : activity.type === 'event'
                ? 'bg-sky-500'
                : activity.type === 'award'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
          />
          <div className="flex-1">
            <p className="text-sm text-slate-300">
              {activity.action}{' '}
              <span className="text-white font-medium">{activity.target}</span>
            </p>
            <p className="text-xs text-slate-500">{activity.time}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function UserProfilePage() {
  const [tab, setTab] = useState<ProfileTab>('overview');

  const highlights = useMemo(() => profileHighlights, []);

  return (
    <ParticipantLayout>
      <Head>
        <title>HackET | User Profile</title>
      </Head>

      <div className="space-y-6">
        <ProfileHeader user={mockUser} />

        <StatsCard stats={mockStats} />

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-800/60 bg-slate-900/40 p-6 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Account status</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Profile controls</h2>
                </div>
                <Button variant="outline" size="sm" className="rounded-full border-slate-700 bg-slate-950/30 text-slate-200 hover:bg-slate-800">
                  <Copy size={14} className="mr-2" />
                  Copy link
                </Button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {highlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                      <Icon size={18} className="text-emerald-300" />
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{item.label}</p>
                      <p className="mt-2 text-xl font-black text-white">{item.value}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{item.detail}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="primary" size="sm" className="rounded-full bg-emerald-500 px-5 text-white hover:bg-emerald-600">
                  Edit information
                  <ArrowRight size={14} className="ml-2" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-full border-slate-700 bg-slate-950/30 text-slate-200 hover:bg-slate-800">
                  <Mail size={14} className="mr-2" />
                  Contact support
                </Button>
              </div>
            </div>

            <SkillsSection skills={mockUser.skills} interests={mockUser.interests} />
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-800/60 bg-slate-900/40 p-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Sections</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Profile tabs</h2>
                </div>
                <div className="flex rounded-full border border-slate-800 bg-slate-950/50 p-1 text-xs font-semibold">
                  {(['overview', 'teams', 'awards'] as ProfileTab[]).map((item) => (
                    <button
                      key={item}
                      onClick={() => setTab(item)}
                      className={`rounded-full px-4 py-2 capitalize transition ${
                        tab === item
                          ? 'bg-emerald-500 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {tab === 'overview' && (
                  <>
                    <ActivitySection />
                    <div className="rounded-[1.5rem] border border-slate-800/70 bg-slate-950/40 p-5">
                      <div className="flex items-center gap-2">
                        <Target size={16} className="text-emerald-300" />
                        <h3 className="font-black text-white">Current focus</h3>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-400">
                        Improving product design, team leadership, and shipping polished hackathon submissions with React and Node.js.
                      </p>
                    </div>
                  </>
                )}

                {tab === 'teams' && <TeamsSection teams={mockTeams} />}

                {tab === 'awards' && <CertificatesSection certificates={mockCertificates} />}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-800/60 bg-slate-900/40 p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-2">
                  <ShieldCheck size={16} className="text-sky-300" />
                </div>
                <h3 className="text-lg font-black tracking-tighter text-white uppercase">
                  Contact & links
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Email</p>
                    <p className="mt-1 font-semibold text-white">dawit@example.com</p>
                  </div>
                  <Mail size={16} className="text-emerald-300" />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Portfolio</p>
                    <p className="mt-1 font-semibold text-white">Portfolio-ready</p>
                  </div>
                  <ExternalLink size={16} className="text-emerald-300" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <TeamsSection teams={mockTeams} />
          <CertificatesSection certificates={mockCertificates} />
        </section>
      </div>
    </ParticipantLayout>
  );
}
