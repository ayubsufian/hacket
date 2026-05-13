import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type Locale = 'en' | 'am'

/* ─── Translation dictionary ─────────────────────────────────────────── */
const translations: Record<Locale, Record<string, string>> = {
    en: {
        'nav.home': 'Home',
        'nav.discover': 'Discover',
        'nav.organizers': 'For Organizers',
        'nav.leaderboard': 'Leaderboard',
        'nav.login': 'Login',
        'nav.signup': 'Sign Up',
        'nav.dashboard': 'Dashboard',
        'nav.teams': 'Teams',
        'nav.submissions': 'Submissions',
        'nav.notifications': 'Notifications',
        'nav.admin': 'Admin',
        'nav.signout': 'Sign Out',
        'hero.tagline': 'Production-ready platform',
        'hero.title': "Unify Ethiopia's Innovation Ecosystem",
        'hero.subtitle': 'A centralized, multilingual platform for end-to-end hackathon management and discovery in Ethiopia. Connect participants, organizers, and judges in one unified ecosystem.',
        'hero.cta': 'Explore Hackathons',
        'hero.stats': 'Join 200,000+ Ethiopian Innovators',
        'features.title': "How HackET Supports Ethiopia's Tech Community",
        'features.subtitle': 'From fragmented Social channels to a unified digital infrastructure.',
        'features.discovery.title': 'Event Discovery',
        'features.discovery.desc': 'Centralized hub for all Ethiopian hackathons. Search, filter, and track upcoming events by region, theme, and category.',
        'features.judging.title': 'Automated Judging',
        'features.judging.desc': 'Multi-criteria scoring, online normalization, and real-time leaderboards. Eliminate manual spreadsheet-based evaluation.',
        'features.teams.title': 'Team Formation',
        'features.teams.desc': 'Skill-based matching engine helps you find compatible teammates. No more chaotic Telegram group chats.',
        'portfolio.title': 'Persistent Developer Portfolio',
        'portfolio.desc': 'Unlike one-off event sites, HackET archives your entire hackathon journey — creating a verifiable digital resume that grows with you.',
        'portfolio.cta': 'View Your Portfolio →',
        'auth.login': 'Login',
        'auth.signup': 'Create Account',
        'auth.email': 'Email address',
        'auth.password': 'Password',
        'auth.firstName': 'First name',
        'auth.lastName': 'Last name',
        'auth.role': 'Role',
        'auth.loginSubtitle': 'Welcome back to HackET',
        'auth.signupSubtitle': 'Join Ethiopia\'s innovation ecosystem',
        'auth.noAccount': "Don't have an account?",
        'auth.hasAccount': 'Already have an account?',
        'auth.participant': 'Participant',
        'auth.organizer': 'Organizer',
        'auth.judge': 'Judge',
        'auth.mentor': 'Mentor',
        'common.loading': 'Loading…',
        'common.error': 'Something went wrong',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.noResults': 'No results found',
        'dashboard.title': 'Dashboard',
        'events.title': 'Discover Events',
        'teams.title': 'Team Management',
        'submissions.title': 'Submissions',
        'leaderboard.title': 'Leaderboard',
        'notifications.title': 'Notifications',
        'admin.title': 'Admin Panel',
    },
    am: {
        'nav.home': 'መነሻ',
        'nav.discover': 'ያግኙ',
        'nav.organizers': 'ለአዘጋጆች',
        'nav.leaderboard': 'ደረጃ ሰሌዳ',
        'nav.login': 'ግባ',
        'nav.signup': 'ተመዝገብ',
        'nav.dashboard': 'ዳሽቦርድ',
        'nav.teams': 'ቡድኖች',
        'nav.submissions': 'ማስረከቢያ',
        'nav.notifications': 'ማሳወቂያዎች',
        'nav.admin': 'አስተዳዳሪ',
        'nav.signout': 'ውጣ',
        'hero.tagline': 'ለምርታማነት የተዘጋጀ መድረክ',
        'hero.title': 'የኢትዮጵያን የፈጠራ ሥነ-ምህዳር አንድ ያድርጉ',
        'hero.subtitle': 'በኢትዮጵያ ውስጥ ለሁሉም ሃካቶን አስተዳደር እና ግኝት የተማከለ፣ ባለብዙ ቋንቋ መድረክ። ተሳታፊዎችን፣ አዘጋጆችን እና ዳኞችን በአንድ ስነ-ምህዳር ያገናኙ።',
        'hero.cta': 'ሃካቶኖችን ያስሱ',
        'hero.stats': 'ከ200,000+ የኢትዮጵያ ፈጣሪዎች ጋር ይቀላቀሉ',
        'features.title': 'HackET የኢትዮጵያን የቴክ ማህበረሰብ እንዴት ይደግፋል',
        'features.subtitle': 'ከተበታተኑ ማህበራዊ ቻናሎች ወደ አንድ ዲጂታል መሠረተ ልማት።',
        'features.discovery.title': 'ክስተት ግኝት',
        'features.discovery.desc': 'ለሁሉም የኢትዮጵያ ሃካቶኖች የተማከለ ማዕከል። በክልል፣ ጭብጥ እና ምድብ ይፈልጉ።',
        'features.judging.title': 'ራስ-ሰር ዳኝነት',
        'features.judging.desc': 'ባለብዙ መስፈርት ውጤት አሰጣጥ፣ መደበኛነት እና በቅጽበት ደረጃ ሰሌዳዎች።',
        'features.teams.title': 'ቡድን መመስረት',
        'features.teams.desc': 'በክህሎት ላይ የተመሠረተ ማዛመጃ ሞተር ተስማሚ የቡድን አባላት እንዲያገኙ ይረዳዎታል።',
        'portfolio.title': 'ቋሚ የገንቢ ፖርትፎሊዮ',
        'portfolio.desc': 'HackET ሁሉንም የሃካቶን ጉዞዎን ያስቀምጣል — ከእርስዎ ጋር የሚያድግ ሊረጋገጥ የሚችል ዲጂታል ግምገማ ይፈጥራል።',
        'portfolio.cta': 'ፖርትፎሊዮዎን ይመልከቱ →',
        'auth.login': 'ግባ',
        'auth.signup': 'መለያ ፍጠር',
        'auth.email': 'ኢሜይል',
        'auth.password': 'የይለፍ ቃል',
        'auth.firstName': 'ስም',
        'auth.lastName': 'የአባት ስም',
        'auth.role': 'ሚና',
        'auth.loginSubtitle': 'እንኳን ወደ HackET ተመለሱ',
        'auth.signupSubtitle': 'የኢትዮጵያን የፈጠራ ስነ-ምህዳር ይቀላቀሉ',
        'auth.noAccount': 'መለያ የለዎትም?',
        'auth.hasAccount': 'አስቀድመው መለያ አለዎት?',
        'auth.participant': 'ተሳታፊ',
        'auth.organizer': 'አዘጋጅ',
        'auth.judge': 'ዳኛ',
        'auth.mentor': 'አማካሪ',
        'common.loading': 'በመጫን ላይ…',
        'common.error': 'ችግር ተፈጥሯል',
        'common.save': 'አስቀምጥ',
        'common.cancel': 'ሰርዝ',
        'common.delete': 'ሰርዝ',
        'common.search': 'ፈልግ',
        'common.filter': 'አጣራ',
        'common.noResults': 'ውጤት አልተገኘም',
        'dashboard.title': 'ዳሽቦርድ',
        'events.title': 'ክስተቶችን ያግኙ',
        'teams.title': 'ቡድን አስተዳደር',
        'submissions.title': 'ማስረከቢያዎች',
        'leaderboard.title': 'ደረጃ ሰሌዳ',
        'notifications.title': 'ማሳወቂያዎች',
        'admin.title': 'የአስተዳዳሪ ፓነል',
    },
}

interface LanguageContextValue {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(() => {
        const saved = localStorage.getItem('hacket_lang')
        return (saved === 'am' ? 'am' : 'en') as Locale
    })

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale)
        localStorage.setItem('hacket_lang', newLocale)
    }, [])

    const t = useCallback(
        (key: string) => translations[locale][key] || key,
        [locale]
    )

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useTranslation() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useTranslation must be used within a LanguageProvider')
    }
    return context
}
