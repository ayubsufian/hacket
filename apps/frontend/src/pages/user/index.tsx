import React from 'react'
import ParticipantLayout from '../../layouts/ParticipantLayout'

const UserPage: React.FC = () => {
  return (
    <ParticipantLayout>
      <div className="container mx-auto py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center gap-6">
            <img
              src="/images/avatar-placeholder.png"
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover"
            />
            <div>
              <h1 className="text-2xl font-semibold">John Doe</h1>
              <p className="text-sm text-gray-500">Participant</p>
              <div className="mt-4 flex gap-3">
                <button className="px-4 py-2 bg-green-500 text-white rounded">Edit Profile</button>
                <button className="px-4 py-2 border border-gray-200 rounded">View Portfolio</button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Events Joined</p>
              <p className="text-xl font-bold">12</p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Submissions</p>
              <p className="text-xl font-bold">5</p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">Teams</p>
              <p className="text-xl font-bold">3</p>
            </div>
          </div>
        </div>
      </div>
    </ParticipantLayout>
  )
}

export default UserPage
