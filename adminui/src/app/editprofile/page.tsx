"use client";

import React, { useState } from "react";
import Image from "next/image";
import { HiCamera } from "react-icons/hi";

export default function EditProfile() {
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePic(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Profile Updated!\nName: ${name}\nEmail: ${email}`);
  };

  return (
      <div className="p-6 max-w-2xl mx-auto space-y-8">
        <h3 className="text-3xl font-extrabold text-primary text-center">
          Edit Profile
        </h3>

        {/* Profile Picture */}
        <div className="flex flex-col items-center relative">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#722F37] dark:border-[#5E2228] shadow-lg relative">
            {profilePic ? (
              <Image
                src={URL.createObjectURL(profilePic)}
                alt="Profile"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <span className="text-3xl font-bold">P</span>
              </div>
            )}

            {/* Camera button outside circle, bottom-right */}
            <label className="absolute -bottom-0 -right-0 bg-[#722F37] dark:bg-[#5E2228] text-white p-3 rounded-full cursor-pointer hover:bg-[#5E2228] dark:hover:bg-[#722F37] transition shadow-md flex items-center justify-center border-2 border-white dark:border-gray-900">
              <HiCamera className="w-4 h-4" />
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
          </div>
          
        </div>

        {/* Profile Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-[#722F37] dark:focus:ring-[#5E2228] focus:border-[#722F37] dark:focus:border-[#5E2228] transition"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-[#722F37] dark:focus:ring-[#5E2228] focus:border-[#722F37] dark:focus:border-[#5E2228] transition"
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-[#722F37] dark:focus:ring-[#5E2228] focus:border-[#722F37] dark:focus:border-[#5E2228] transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#722F37] hover:bg-[#5E2228] dark:bg-[#5E2228] dark:hover:bg-[#722F37] text-white py-3 rounded-xl font-semibold shadow-md transition-all"
          >
            Save Changes
          </button>
        </form>
      </div>
  );
}
