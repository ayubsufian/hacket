import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  User,
  Mail,
  MapPin,
  GraduationCap,
  Github,
  Linkedin,
  Calendar,
  Edit2,
  Check,
  X,
  Camera,
  Award,
  Trophy,
  Users,
  Loader2,
  Globe,
  Briefcase,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getMyProfile, getPublicProfile, updateProfile, uploadAvatar, type ProfileWithHistory, type PublicProfile } from '../api/profile'

interface ExtendedUserProfile {
  firstName: string
  lastName: string
  avatarUrl?: string | null
  bio?: string | null
  city?: string | null
  region?: string | null
  skills?: string[]
  interests?: string[]
  phone?: string | null
  university?: string | null
  graduationYear?: number | null
  githubUrl?: string | null
  linkedinUrl?: string | null
  isSeekingTeam?: boolean
  preferredLocale?: 'en' | 'am'
  preferredCalendar?: 'GREGORIAN' | 'ETHIOPIAN'
}

interface EditableFieldProps {
  label: string
  value: string | null | undefined
  name: string
  isEditing: boolean
  onChange: (name: string, value: string) => void
  type?: 'text' | 'textarea' | 'number' | 'url'
  placeholder?: string
  icon?: React.ReactNode
}

function EditableField({ label, value, name, isEditing, onChange, type = 'text', placeholder, icon }: EditableFieldProps) {
  if (!isEditing) {
    if (!value) return null
    return (
      <div className="flex items-start gap-3 py-2">
        {icon && <div className="mt-0.5 text-gray-400">{icon}</div>}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-sm text-gray-900 dark:text-gray-100">{value}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 uppercase tracking-wider">{label}</label>
      {type === 'textarea' ? (
        <textarea
          name={name}
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      ) : (
        <input
          type={type === 'url' ? 'url' : type}
          name={name}
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      )}
    </div>
  )
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>()
  const { user: currentUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<ProfileWithHistory | PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [editData, setEditData] = useState<Partial<ExtendedUserProfile>>({})

  const isOwnProfile = !userId || userId === 'me' || userId === currentUser?.id
  const profileData: ExtendedUserProfile | undefined = isOwnProfile 
    ? (profile as ProfileWithHistory)?.profile 
    : (profile as PublicProfile)?.profile

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        
        if (isOwnProfile) {
          const data = await getMyProfile()
          console.log('[Profile] Loaded my profile:', data)
          setProfile(data)
          setEditData(data.profile)
        } else {
          const data = await getPublicProfile(userId)
          console.log('[Profile] Loaded public profile:', data)
          setProfile(data)
        }
      } catch (err: any) {
        console.error('[Profile] Error loading profile:', err)
        setError(err.message || err.payload?.message || 'Failed to load profile. Please check your connection and try again.')
      } finally {
        setLoading(false)
      }
    }

    void loadProfile()
  }, [userId, isOwnProfile])

  const handleEdit = () => {
    if (isOwnProfile && profile) {
      setEditData((profile as ProfileWithHistory).profile)
      setIsEditing(true)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setEditData((profile as ProfileWithHistory).profile)
    }
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!isOwnProfile) return
    
    try {
      setIsSaving(true)
      await updateProfile({
        firstName: editData.firstName,
        lastName: editData.lastName,
        bio: editData.bio,
        phone: editData.phone,
        university: editData.university,
        graduationYear: editData.graduationYear,
        githubUrl: editData.githubUrl,
        linkedinUrl: editData.linkedinUrl,
        city: editData.city,
        region: editData.region,
        isSeekingTeam: editData.isSeekingTeam,
        preferredLocale: editData.preferredLocale,
      })
      
      // Refresh profile data
      const updated = await getMyProfile()
      setProfile(updated)
      setEditData(updated.profile)
      
      
      setIsEditing(false)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarClick = () => {
    if (isOwnProfile && !isEditing) {
      fileInputRef.current?.click()
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      await uploadAvatar(file)
      
      // Refresh profile
      const updated = await getMyProfile()
      setProfile(updated)
    } catch (err: any) {
      setError(err.message || 'Failed to upload avatar')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFieldChange = (name: string, value: string) => {
    setEditData((prev: Partial<ExtendedUserProfile>) => ({ ...prev, [name]: value }))
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'ORGANIZER': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'JUDGE': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'MENTOR': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrator'
      case 'ORGANIZER': return 'Event Organizer'
      case 'JUDGE': return 'Judge'
      case 'MENTOR': return 'Mentor'
      case 'PARTICIPANT': return 'Participant'
      default: return role
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="skeleton h-48 w-full rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="skeleton h-96 w-full rounded-2xl" />
          <div className="md:col-span-2 space-y-4">
            <div className="skeleton h-32 w-full rounded-2xl" />
            <div className="skeleton h-64 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    const isConnectionError = error.toLowerCase().includes('unable to connect') || error.toLowerCase().includes('connection') || error.toLowerCase().includes('offline')
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <AlertCircle className="text-red-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to Load Profile</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{error}</p>
          {isConnectionError && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">Make sure the backend server is running on http://localhost:5000</p>
          )}
          <div className="flex gap-3">
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!profile || !profileData) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <User className="text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Profile Not Found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">The user profile you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  const user = isOwnProfile ? currentUser : (profile as PublicProfile)
  const participation = isOwnProfile ? (profile as ProfileWithHistory).pastParticipation : []
  const currentSubs = isOwnProfile ? (profile as ProfileWithHistory).currentSubmissions : []

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="card-elevated overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-accent-500 via-emerald-500 to-teal-500" />
        <div className="px-6 pb-6">
          <div className="relative -mt-16 mb-4 flex items-end gap-4">
            {/* Avatar */}
            <div 
              className={`relative ${isOwnProfile ? 'cursor-pointer group' : ''}`}
              onClick={handleAvatarClick}
            >
              <div className="h-32 w-32 rounded-2xl border-4 border-white dark:border-slate-800 bg-white dark:bg-slate-800 overflow-hidden shadow-lg">
                {profileData?.avatarUrl ? (
                  <img 
                    src={profileData.avatarUrl} 
                    alt={`${profileData.firstName} ${profileData.lastName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-accent-500 to-emerald-500 text-white text-4xl font-bold">
                    {(profileData?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={24} />
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                  <Loader2 className="text-white animate-spin" size={24} />
                </div>
              )}
            </div>

            {/* Name & Role */}
            <div className="flex-1 min-w-0 pb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                {profileData?.firstName || 'New'} {profileData?.lastName || 'User'}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`badge ${getRoleBadgeColor(user?.role || 'PARTICIPANT')}`}>
                  {getRoleLabel(user?.role || 'PARTICIPANT')}
                </span>
                {profileData?.isSeekingTeam && (
                  <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Seeking Team
                  </span>
                )}
              </div>
            </div>

            {/* Edit Actions */}
            {isOwnProfile && (
              <div className="flex gap-2 pb-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="btn-secondary h-9 px-3"
                    >
                      <X size={16} /> Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="btn-primary h-9 px-3"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleEdit}
                    className="btn-secondary h-9 px-3"
                  >
                    <Edit2 size={16} /> Edit Profile
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Hidden file input for avatar */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarUpload}
            className="hidden"
          />

          {/* Bio */}
          {isEditing ? (
            <EditableField
              label="Bio"
              name="bio"
              value={editData.bio}
              isEditing={true}
              onChange={handleFieldChange}
              type="textarea"
              placeholder="Tell us about yourself..."
            />
          ) : profileData?.bio ? (
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {profileData.bio}
            </p>
          ) : isOwnProfile && (
            <p className="text-gray-400 dark:text-gray-500 text-sm italic">
              No bio yet. Click Edit Profile to add one!
            </p>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Contact & Social */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="card-elevated">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User size={16} /> Contact Information
            </h3>
            
            {isEditing ? (
              <div className="space-y-3">
                <EditableField
                  label="First Name"
                  name="firstName"
                  value={editData.firstName}
                  isEditing={true}
                  onChange={handleFieldChange}
                />
                <EditableField
                  label="Last Name"
                  name="lastName"
                  value={editData.lastName}
                  isEditing={true}
                  onChange={handleFieldChange}
                />
                <EditableField
                  label="Phone"
                  name="phone"
                  value={editData.phone}
                  isEditing={true}
                  onChange={handleFieldChange}
                  placeholder="+251 9XX XXX XXX"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {user?.email && (
                  <div className="flex items-start gap-3">
                    <Mail size={16} className="mt-0.5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Email</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{user.email}</p>
                    </div>
                  </div>
                )}
                <EditableField
                  label="Phone"
                  name="phone"
                  value={profileData?.phone}
                  isEditing={false}
                  onChange={() => {}}
                  icon={<Globe size={16} />}
                />
              </div>
            )}
          </div>

          {/* Location */}
          {(profileData?.city || profileData?.region || isEditing) && (
            <div className="card-elevated">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin size={16} /> Location
              </h3>
              {isEditing ? (
                <div className="space-y-3">
                  <EditableField
                    label="City"
                    name="city"
                    value={editData.city}
                    isEditing={true}
                    onChange={handleFieldChange}
                  />
                  <EditableField
                    label="Region"
                    name="region"
                    value={editData.region}
                    isEditing={true}
                    onChange={handleFieldChange}
                  />
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="mt-0.5 text-gray-400" />
                  <div>
                    {profileData?.city && <p className="text-sm text-gray-900 dark:text-gray-100">{profileData.city}</p>}
                    {profileData?.region && <p className="text-sm text-gray-500">{profileData.region}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Education */}
          {(profileData?.university || profileData?.graduationYear || isEditing) && (
            <div className="card-elevated">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <GraduationCap size={16} /> Education
              </h3>
              {isEditing ? (
                <div className="space-y-3">
                  <EditableField
                    label="University"
                    name="university"
                    value={editData.university}
                    isEditing={true}
                    onChange={handleFieldChange}
                    placeholder="Addis Ababa University"
                  />
                  <EditableField
                    label="Graduation Year"
                    name="graduationYear"
                    value={editData.graduationYear?.toString()}
                    isEditing={true}
                    onChange={handleFieldChange}
                    type="number"
                    placeholder="2024"
                  />
                </div>
              ) : (
                <EditableField
                  label="Education"
                  name="university"
                  value={profileData?.university || profileData?.graduationYear?.toString()}
                  isEditing={false}
                  onChange={() => {}}
                  icon={<GraduationCap size={16} />}
                />
              )}
            </div>
          )}

          {/* Preferences */}
          {isEditing && (
            <div className="card-elevated">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Globe size={16} /> Preferences
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Language</label>
                  <select
                    name="preferredLocale"
                    value={editData.preferredLocale || 'en'}
                    onChange={(e) => handleFieldChange('preferredLocale', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                  >
                    <option value="en">English</option>
                    <option value="am">Amharic</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Calendar</label>
                  <select
                    name="preferredCalendar"
                    value={editData.preferredCalendar || 'GREGORIAN'}
                    onChange={(e) => handleFieldChange('preferredCalendar', e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                  >
                    <option value="GREGORIAN">Gregorian</option>
                    <option value="ETHIOPIAN">Ethiopian</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Social Links */}
          {(profileData?.githubUrl || profileData?.linkedinUrl || isEditing) && (
            <div className="card-elevated">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <LinkIcon size={16} /> Links
              </h3>
              {isEditing ? (
                <div className="space-y-3">
                  <EditableField
                    label="GitHub URL"
                    name="githubUrl"
                    value={editData.githubUrl}
                    isEditing={true}
                    onChange={handleFieldChange}
                    type="url"
                    placeholder="https://github.com/username"
                  />
                  <EditableField
                    label="LinkedIn URL"
                    name="linkedinUrl"
                    value={editData.linkedinUrl}
                    isEditing={true}
                    onChange={handleFieldChange}
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {profileData?.githubUrl && (
                    <a 
                      href={profileData.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-accent-600 transition-colors"
                    >
                      <Github size={16} /> GitHub
                    </a>
                  )}
                  {profileData?.linkedinUrl && (
                    <a 
                      href={profileData.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-accent-600 transition-colors"
                    >
                      <Linkedin size={16} /> LinkedIn
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Skills & Activity */}
        <div className="md:col-span-2 space-y-6">
          {/* Skills */}
          {(profileData?.skills?.length || isEditing) && (
            <div className="card-elevated">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Award size={16} /> Skills
              </h3>
              {isEditing ? (
                <div className="space-y-2">
                  <EditableField
                    label="Skills (comma separated)"
                    name="skills"
                    value={editData.skills?.join(', ')}
                    isEditing={true}
                    onChange={(name, val) => handleFieldChange(name, val.split(',').map(s => s.trim()).filter(Boolean).join(','))}
                    placeholder="React, Node.js, Python, UI Design"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profileData?.skills?.map((skill, i) => (
                    <span 
                      key={i}
                      className="px-3 py-1 rounded-full bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-400 text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Interests */}
          {(profileData?.interests?.length || isEditing) && (
            <div className="card-elevated">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Briefcase size={16} /> Interests
              </h3>
              {isEditing ? (
                <div className="space-y-2">
                  <EditableField
                    label="Interests (comma separated)"
                    name="interests"
                    value={editData.interests?.join(', ')}
                    isEditing={true}
                    onChange={(name, val) => handleFieldChange(name, val.split(',').map(s => s.trim()).filter(Boolean).join(','))}
                    placeholder="AI, Web3, Mobile Apps, FinTech"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profileData?.interests?.map((interest, i) => (
                    <span 
                      key={i}
                      className="px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-sm font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Current Submissions - Only for own profile */}
          {isOwnProfile && currentSubs.length > 0 && (
            <div className="card-elevated">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Trophy size={16} /> Active Submissions
              </h3>
              <div className="space-y-3">
                {currentSubs.map((sub, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                    <div className="h-10 w-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                      <Trophy size={18} className="text-accent-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {sub.submissionTitle || 'Untitled Submission'}
                      </p>
                      <p className="text-xs text-gray-500">{sub.eventName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {sub.teamName}
                        </span>
                        <span className="text-2xs text-gray-400">
                          {sub.submissionStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past Participation */}
          {participation.length > 0 && (
            <div className="card-elevated">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users size={16} /> Past Participation
              </h3>
              <div className="space-y-3">
                {participation.slice(0, 5).map((part, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50">
                    <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Calendar size={18} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {part.eventName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(part.date).toLocaleDateString()} • {part.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {participation.length > 5 && (
                <p className="text-center text-xs text-gray-400 mt-4">
                  +{participation.length - 5} more hackathons
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
