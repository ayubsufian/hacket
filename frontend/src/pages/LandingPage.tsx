import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  Code2,
  Globe,
  Layers,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { listEvents } from '../api/events'
import type { Hackathon } from '../types/models'
import landingDashboard from '../assets/landing-dashboard.svg'
import landingCollaboration from '../assets/landing-collaboration.svg'

const heroPhoto = '/hacket-hero.jpg'

const features = [
  { icon: Globe, title: 'Bilingual platform', desc: 'Switch between English and Amharic while keeping all workflows intact.' },
  { icon: Users, title: 'Team collaboration', desc: 'Create teams, manage members, and coordinate submissions in one workspace.' },
  { icon: Code2, title: 'Submission lifecycle', desc: 'Draft, update, and submit projects with clear status and deadlines.' },
  { icon: Trophy, title: 'Judging + leaderboard', desc: 'Score projects with role-based access and transparent rankings.' },
]

const stats = [
  { value: '120+', label: 'Active hackathons hosted' },
  { value: '35k+', label: 'Participant registrations' },
  { value: '1.8k+', label: 'Projects submitted' },
  { value: '98.7%', label: 'Platform uptime target' },
]

const organizers = [
  { name: 'Marta K.', role: 'Program Director', org: 'Addis Innovators Hub' },
  { name: 'Daniel T.', role: 'Head of Partnerships', org: 'Blue Nile Labs' },
  { name: 'Rahel A.', role: 'Community Lead', org: 'ET Youth Tech' },
]

const judges = [
  { name: 'Aster M.', area: 'AI & Data Systems' },
  { name: 'Biniam G.', area: 'Product Strategy' },
  { name: 'Nardos H.', area: 'UX & Accessibility' },
]

const testimonials = [
  {
    quote: 'The new HackET flow removed the chaos between registration, teams, and judging. Everything now feels connected.',
    author: 'Organizer, National Student Hack Week',
  },
  {
    quote: 'As a participant, the dashboard and submission timeline are clear, fast, and easy to trust under pressure.',
    author: 'Participant, Addis Build Sprint',
  },
]

const faqs = [
  { q: 'Who can create an account?', a: 'Participants, organizers, judges, mentors, and admins can register with role-based access.' },
  { q: 'How are protected pages enforced?', a: 'Protected routes check session identity and role permissions before rendering the page.' },
  { q: 'Can I switch language across pages?', a: 'Yes. The language toggle is available in the app shell and persists during navigation.' },
]

export default function LandingPage() {
  const [liveEvents, setLiveEvents] = useState<Hackathon[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [eventsError, setEventsError] = useState(false)

  useEffect(() => {
    listEvents({ limit: 4 })
      .then(res => setLiveEvents(res.data.filter(event => event.status !== 'DRAFT')))
      .catch(() => setEventsError(true))
      .finally(() => setLoadingEvents(false))
  }, [])

  return (
    <div className="relative overflow-hidden bg-[linear-gradient(180deg,#f3fbf8_0%,#f2fbf9_18%,#f5fbff_52%,#f7fbff_100%)]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-150px] h-[620px] w-[880px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-200/30 via-cyan-200/20 to-indigo-200/12 blur-[120px]" />
        <div className="absolute -left-28 top-[28%] h-[460px] w-[460px] rounded-full bg-gradient-to-br from-emerald-200/20 to-cyan-200/10 blur-[100px]" />
        <div className="absolute -right-24 top-[40%] h-[520px] w-[520px] rounded-full bg-gradient-to-br from-indigo-200/16 to-cyan-200/14 blur-[110px]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.22)_1px,transparent_1px)] [background-size:38px_38px]" />
      </div>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <section className="relative pt-14">
          <div className="grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 backdrop-blur-md">
                <Sparkles size={14} /> Production-ready platform
              </div>
              <h1 className="mt-6 max-w-xl text-balance text-5xl font-bold leading-[1.02] tracking-tight text-slate-900 sm:text-6xl">
                Unify Ethiopia&apos;s Innovation Ecosystem
              </h1>
              <div className="mt-6 h-1.5 w-52 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" />
              <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
                A centralized, multilingual platform for end-to-end hackathon management and discovery in Ethiopia. Connect participants, organizers, and judges in one unified ecosystem.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link to="/events" className="btn-primary h-12 px-7 text-base !rounded-full !bg-gradient-to-r !from-emerald-500 !to-emerald-400 !shadow-emerald-500/25">
                  Explore Hackathons <ArrowRight size={17} />
                </Link>
                <Link to="/signup" className="btn-secondary h-12 px-7 text-base !rounded-full">
                  Sign up
                </Link>
              </div>

              <div className="mt-12 grid max-w-xl gap-4 sm:grid-cols-2">
                <div className="glass rounded-2xl p-4">
                  <p className="text-xl font-bold text-slate-900">200k+</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Ethiopian innovators</p>
                </div>
                <div className="glass rounded-2xl p-4">
                  <p className="text-xl font-bold text-slate-900">Role-based</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Secure workflows</p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[560px]">
              <div className="absolute -left-9 top-10 hidden animate-float rounded-2xl border border-white/70 bg-white/78 p-3 text-sm shadow-glass backdrop-blur-xl lg:block">
                <p className="text-[11px] font-semibold text-slate-500">Active Hackathons</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-xl font-bold text-slate-900">15</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Send</span>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 hidden animate-float rounded-2xl border border-white/70 bg-white/80 p-3 text-sm shadow-glass backdrop-blur-xl [animation-delay:700ms] lg:block">
                <p className="text-[11px] font-semibold text-slate-500">Projects submitted</p>
                <p className="mt-1 text-base font-bold text-slate-900">1.8k+</p>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-white/75 bg-white/70 p-2 shadow-hero backdrop-blur-xl">
                <img
                  src={heroPhoto}
                  alt="HackET participants collaborating during a hackathon event"
                  className="aspect-[4/3] w-full rounded-[1.5rem] object-cover"
                  loading="eager"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=80' }}
                />
              </div>
              <div className="absolute -right-9 top-[44%] hidden w-36 animate-float overflow-hidden rounded-2xl border border-emerald-200/60 bg-white/95 p-3 shadow-card backdrop-blur-xl [animation-delay:400ms] lg:block">
                <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-600 font-semibold">Teams</p>
                <p className="mt-2 text-xl font-bold text-slate-900">120+</p>
                <p className="mt-0.5 text-[10px] text-slate-500">Hackathons hosted</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-24">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="section-title text-indigo-600">Features</p>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Built for end-to-end event execution</h2>
            </div>
            <Link to="/signup" className="hidden items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:inline-flex">
              Create account <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className="group rounded-3xl border border-white/65 bg-white/62 p-6 shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-hover"
                style={{ animationDelay: `${120 + index * 80}ms` }}
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <feature.icon size={20} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-24">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-title text-indigo-600">Events</p>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Live hackathons and deadlines</h2>
            </div>
            <Link to="/events" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500">
              Browse all events <ChevronRight size={16} />
            </Link>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/65 bg-white/62 shadow-elevated backdrop-blur-xl">
            {loadingEvents ? (
              <div className="space-y-4 p-6">{[1, 2, 3].map(item => <div key={item} className="skeleton h-20 w-full rounded-2xl" />)}</div>
            ) : eventsError ? (
              <div className="p-10 text-center">
                <p className="font-semibold text-slate-800">Could not load events right now</p>
                <p className="mt-1 text-sm text-slate-500">Please check backend availability and try again.</p>
              </div>
            ) : liveEvents.length === 0 ? (
              <div className="p-10 text-center text-slate-500">No active events available yet.</div>
            ) : (
              <div className="divide-y divide-white/70">
                {liveEvents.map(event => (
                  <Link key={event.id} to={`/events/${event.id}`} className="group flex flex-wrap items-center gap-4 p-5 transition-colors hover:bg-white/75 sm:flex-nowrap">
                    <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-sm">
                      {event.title.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-slate-900 group-hover:text-indigo-600">{event.title}</h3>
                      <p className="mt-1 truncate text-sm text-slate-500">{event.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <Clock3 size={14} />
                      {new Date(event.eventStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-24 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(stat => (
            <div key={stat.label} className="rounded-3xl border border-white/65 bg-white/62 p-6 shadow-card backdrop-blur-xl">
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-600">{stat.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-24 grid gap-8 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/65 bg-white/62 p-7 shadow-card backdrop-blur-xl">
            <p className="section-title text-indigo-600">Organizers</p>
            <h3 className="text-2xl font-bold text-slate-900">Trusted by event leaders</h3>
            <div className="mt-5 space-y-3">
              {organizers.map(org => (
                <div key={org.name} className="rounded-2xl border border-white/70 bg-white/78 p-4">
                  <p className="font-semibold text-slate-900">{org.name}</p>
                  <p className="text-sm text-slate-500">{org.role} · {org.org}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/65 bg-white/62 p-7 shadow-card backdrop-blur-xl">
            <p className="section-title text-indigo-600">Judges</p>
            <h3 className="text-2xl font-bold text-slate-900">Scoring panel readiness</h3>
            <div className="mt-5 space-y-3">
              {judges.map(judge => (
                <div key={judge.name} className="rounded-2xl border border-white/70 bg-white/78 p-4">
                  <p className="font-semibold text-slate-900">{judge.name}</p>
                  <p className="text-sm text-slate-500">{judge.area}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-card backdrop-blur-xl">
            <img
              src={landingDashboard}
              alt="HackET dashboard screen"
              className="w-full rounded-[1.5rem]"
              loading="lazy"
            />
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-card backdrop-blur-xl">
            <img
              src={landingCollaboration}
              alt="HackET collaboration and team workflow"
              className="w-full rounded-[1.5rem]"
              loading="lazy"
            />
          </div>
        </section>

        <section className="mt-24 grid gap-5 lg:grid-cols-2">
          {testimonials.map(item => (
            <blockquote key={item.author} className="rounded-[2rem] border border-white/65 bg-white/62 p-7 shadow-card backdrop-blur-xl">
              <p className="text-lg leading-relaxed text-slate-700">“{item.quote}”</p>
              <footer className="mt-4 text-sm font-semibold text-slate-500">{item.author}</footer>
            </blockquote>
          ))}
        </section>

        <section className="mt-24 rounded-[2rem] border border-white/65 bg-white/62 p-8 shadow-elevated backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="section-title text-indigo-600">Leaderboard</p>
              <h3 className="text-2xl font-bold text-slate-900">Top teams preview</h3>
            </div>
            <Link to="/leaderboard" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500">
              Full leaderboard <ChevronRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { team: 'Code Rift', score: '94.6', track: 'AI for Public Services' },
              { team: 'Pixel Forge', score: '92.1', track: 'EdTech Innovation' },
              { team: 'Green Signal', score: '90.8', track: 'Climate Solutions' },
            ].map((entry, index) => (
              <div key={entry.team} className="flex items-center gap-4 rounded-2xl border border-white/70 bg-white/78 p-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">#{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{entry.team}</p>
                  <p className="truncate text-sm text-slate-500">{entry.track}</p>
                </div>
                <p className="text-sm font-semibold text-slate-700">{entry.score}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/65 bg-white/62 p-8 shadow-card backdrop-blur-xl">
            <p className="section-title text-indigo-600">FAQ</p>
            <h3 className="text-2xl font-bold text-slate-900">Common questions</h3>
            <div className="mt-6 space-y-4">
              {faqs.map(item => (
                <div key={item.q} className="rounded-2xl border border-white/70 bg-white/78 p-4">
                  <p className="font-semibold text-slate-900">{item.q}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/65 bg-gradient-to-br from-slate-900/95 to-indigo-950/95 p-8 text-white shadow-elevated">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-100">
              <Layers size={14} /> Production ready
            </div>
            <h3 className="mt-4 text-2xl font-bold">Launch your next event confidently</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Signup, login, role checks, token handling, and route guards are now aligned to the backend auth contract.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-transform hover:-translate-y-0.5">
                Get started <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15">
                Login to dashboard
              </Link>
            </div>
          </aside>
        </section>

        <footer className="mt-24 rounded-[2rem] border border-white/65 bg-white/62 px-6 py-7 shadow-card backdrop-blur-xl sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-bold text-slate-900">HackET</p>
              <p className="text-sm text-slate-500">Modern infrastructure for hackathon communities.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
              <Link to="/events" className="hover:text-slate-900">Events</Link>
              <Link to="/leaderboard" className="hover:text-slate-900">Leaderboard</Link>
              <Link to="/login" className="hover:text-slate-900">Login</Link>
              <Link to="/signup" className="hover:text-slate-900">Sign up</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
