import React from 'react';
import { ParticipantLayout } from '@/layouts/ParticipantLayout';
import {
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
  <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-8 relative overflow-hidden">
    {/* Background decoration */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
    
    <div className="relative flex gap-8">
      {/* Avatar */}
      <div className="relative">
        <div className="w-32 h-32 rounded-2xl bg-slate-800 overflow-hidden border-2 border-slate-700 shadow-xl">
          <img
            src={user.avatarUrl}
            alt={`${user.firstName} ${user.lastName}`}
            className="w-full h-full object-cover"
          />
        </div>
        {user.isSeekingTeam && (
          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-slate-900">
            Open to Team
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter mb-2">
              {user.firstName} {user.lastName}
            </h1>
            <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
              {user.university && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={14} className="text-blue-400" />
                  {user.university}
                  {user.graduationYear && ` • Class of ${user.graduationYear}`}
                </span>
              )}
              {(user.city || user.region) && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-blue-400" />
                  {[user.city, user.region].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Edit3 size={14} />
              Edit Profile
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Share2 size={14} />
              Share
            </Button>
          </div>
        </div>

        <p className="text-slate-300 leading-relaxed max-w-2xl mb-4">
          {user.bio}
        </p>

        {/* Social Links */}
        <div className="flex items-center gap-3">
          {user.githubUrl && (
            <a
              href={user.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all border border-slate-700"
            >
              <Github size={16} />
              GitHub
            </a>
          )}
          {user.linkedinUrl && (
            <a
              href={user.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all border border-slate-700"
            >
              <Linkedin size={16} />
              LinkedIn
            </a>
          )}
          {user.phone && (
            <a
              href={`tel:${user.phone}`}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all border border-slate-700"
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
  <div className="grid grid-cols-4 gap-4">
    {[
      { label: 'Hackathons', value: stats.participated, icon: Calendar, color: 'blue' },
      { label: 'Completed', value: stats.completed, icon: Briefcase, color: 'emerald' },
      { label: 'Awards Won', value: stats.won, icon: Trophy, color: 'orange' },
      { label: 'Teams Joined', value: stats.teamsJoined, icon: Users, color: 'purple' },
    ].map((stat) => (
      <div
        key={stat.label}
        className="bg-slate-900/30 border border-slate-800/60 rounded-2xl p-6 hover:border-slate-700 transition-all group"
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 bg-${stat.color}-500/10 rounded-lg`}>
            <stat.icon size={20} className={`text-${stat.color}-400`} />
          </div>
          <Sparkles size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>
        <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
          {stat.label}
        </p>
      </div>
    ))}
  </div>
);

const SkillsSection: React.FC<{ skills: string[]; interests: string[] }> = ({
  skills,
  interests,
}) => (
  <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6">
    <div className="flex items-center gap-2 mb-6">
      <div className="p-1.5 bg-blue-500/10 rounded-lg">
        <Code2 size={16} className="text-blue-400" />
      </div>
      <h3 className="text-lg font-black text-white tracking-tighter uppercase">
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
              className="px-3 py-1.5 bg-blue-600/10 text-blue-400 text-sm font-medium rounded-lg border border-blue-500/20"
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
              className="px-3 py-1.5 bg-slate-800/50 text-slate-300 text-sm font-medium rounded-lg border border-slate-700"
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
  <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-purple-500/10 rounded-lg">
          <Users size={16} className="text-purple-400" />
        </div>
        <h3 className="text-lg font-black text-white tracking-tighter uppercase">
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
          className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-xl font-bold text-white">
              {team.name.charAt(0)}
            </div>
            <div>
              <h4 className="text-white font-bold group-hover:text-blue-400 transition-colors">
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
                    ? 'bg-blue-500/20 text-blue-400'
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
  <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-orange-500/10 rounded-lg">
          <Award size={16} className="text-orange-400" />
        </div>
        <h3 className="text-lg font-black text-white tracking-tighter uppercase">
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
          className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all group cursor-pointer"
        >
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              cert.type === 'BADGE'
                ? 'bg-orange-500/10 border border-orange-500/20'
                : 'bg-blue-500/10 border border-blue-500/20'
            }`}
          >
            {cert.type === 'BADGE' ? (
              <Trophy size={24} className="text-orange-400" />
            ) : (
              <Award size={24} className="text-blue-400" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-white font-bold group-hover:text-blue-400 transition-colors">
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
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : cert.awardTier === 'innovation'
                  ? 'bg-purple-500/20 text-purple-400'
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
  <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6">
    <div className="flex items-center gap-2 mb-6">
      <div className="p-1.5 bg-emerald-500/10 rounded-lg">
        <Sparkles size={16} className="text-emerald-400" />
      </div>
      <h3 className="text-lg font-black text-white tracking-tighter uppercase">
        Recent Activity
      </h3>
    </div>

    <div className="space-y-4">
      {[
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
      ].map((activity, i) => (
        <div key={i} className="flex items-start gap-3">
          <div
            className={`w-2 h-2 rounded-full mt-2 ${
              activity.type === 'team'
                ? 'bg-purple-500'
                : activity.type === 'event'
                ? 'bg-blue-500'
                : activity.type === 'award'
                ? 'bg-orange-500'
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
  return (
    <ParticipantLayout>
      <div className="space-y-6">
        {/* Profile Header */}
        <ProfileHeader user={mockUser} />

        {/* Stats Overview */}
        <StatsCard stats={mockStats} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Skills & Activity */}
          <div className="col-span-4 space-y-6">
            <SkillsSection skills={mockUser.skills} interests={mockUser.interests} />
            <ActivitySection />
          </div>

          {/* Middle Column - Teams */}
          <div className="col-span-4">
            <TeamsSection teams={mockTeams} />
          </div>

          {/* Right Column - Certificates */}
          <div className="col-span-4">
            <CertificatesSection certificates={mockCertificates} />
          </div>
        </div>
      </div>
    </ParticipantLayout>
  );
}
