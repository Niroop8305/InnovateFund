import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  MapPin,
  Building,
  Globe,
  Linkedin,
  Edit,
  Camera,
  Star,
  TrendingUp,
  Lightbulb,
  Eye,
  Heart,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { api } from "../services/api";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Modal from "../components/ui/Modal";
import toast from "react-hot-toast";

const ProfilePage = () => {
  // State and logic for editing ideas (must be inside component)
  const [editingIdea, setEditingIdea] = useState(null);
  const [editIdeaData, setEditIdeaData] = useState({});
  // Edit idea mutation
  const editIdeaMutation = useMutation(
    ({ id, data }) => api.ideas.editIdea(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["profile", profileId]);
        setEditingIdea(null);
        setEditIdeaData({});
        toast.success("Idea updated!");
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || "Failed to update idea");
      },
    }
  );

  const handleEditIdea = (idea) => {
    setEditingIdea(idea);
    setEditIdeaData({
      title: idea.title,
      description: idea.description,
      category: idea.category,
      stage: idea.stage,
      fundingGoal: idea.fundingGoal,
      tags: idea.tags?.join(", ") || "",
      status: idea.status,
    });
  };

  const handleSaveIdea = (publish = false) => {
    const data = {
      ...editIdeaData,
      tags: editIdeaData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: publish ? "published" : editIdeaData.status,
    };
    editIdeaMutation.mutate({ id: editingIdea._id, data });
  };
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({});
  const [profilePicture, setProfilePicture] = useState(null);

  const isOwnProfile = !id || id === user?._id;
  const profileId = id || user?._id;

  // Fetch profile data
  const { data: profileResponse, isLoading } = useQuery(
    ["profile", profileId],
    () => api.users.getProfile(profileId),
    { enabled: !!profileId }
  );

  const profile = profileResponse?.data?.user;
  const ideas = profileResponse?.data?.ideas || [];

  // Update profile mutation
  const updateProfileMutation = useMutation(
    (data) => api.users.updateProfile(data),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries(["profile", profileId]);
        updateUser(response.data.user);
        setIsEditing(false);
        toast.success("Profile updated successfully!");
      },
      onError: (error) => {
        toast.error(
          error.response?.data?.message || "Failed to update profile"
        );
      },
    }
  );

  // Upload profile picture mutation
  const uploadPictureMutation = useMutation(
    (file) => api.users.uploadProfilePicture(file),
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries(["profile", profileId]);
        updateUser({ profilePicture: response.data.profilePicture });
        toast.success("Profile picture updated!");
      },
      onError: (error) => {
        toast.error(
          error.response?.data?.message || "Failed to upload picture"
        );
      },
    }
  );

  const handleEditProfile = () => {
    setProfileData({
      name: profile?.name || "",
      bio: profile?.bio || "",
      location: profile?.location || "",
      company: profile?.company || "",
      website: profile?.website || "",
      linkedinProfile: profile?.linkedinProfile || "",
      expertise: profile?.expertise || [],
      sectorsOfInterest: profile?.sectorsOfInterest || [],
      investmentRange: profile?.investmentRange || { min: 0, max: 0 },
    });
    setIsEditing(true);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadPictureMutation.mutate(file);
    }
  };

  const formatCurrency = (amount) => {
    const safeAmount = Number(amount);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(isNaN(safeAmount) ? 0 : safeAmount);
  };

  const addSkill = (type, skill) => {
    if (skill.trim() && !profileData[type].includes(skill.trim())) {
      setProfileData((prev) => ({
        ...prev,
        [type]: [...prev[type], skill.trim()],
      }));
    }
  };

  const removeSkill = (type, skillToRemove) => {
    setProfileData((prev) => ({
      ...prev,
      [type]: prev[type].filter((skill) => skill !== skillToRemove),
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Profile not found
          </h2>
          <p className="text-gray-600">
            The profile you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            {/* Profile Picture */}
            <div className="relative">
              <img
                src={
                  profile.profilePicture ||
                  `https://ui-avatars.com/api/?name=${profile.name}&background=667eea&color=fff&size=120`
                }
                alt={profile.name}
                className="w-24 h-24 rounded-full object-cover"
              />
              {isOwnProfile && (
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700 transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
                    {profile.name}
                  </h1>
                  <div className="flex items-center text-sm text-gray-600 dark:text-slate-400 space-x-4 mb-2">
                    <span className="capitalize font-medium text-primary-600">
                      {profile.userType}
                    </span>
                    {profile.company && (
                      <span className="flex items-center">
                        <Building className="w-4 h-4 mr-1" />
                        {profile.company}
                      </span>
                    )}
                    {profile.location && (
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {profile.location}
                      </span>
                    )}
                  </div>
                  {profile.bio && (
                    <p className="text-gray-600 dark:text-slate-300 max-w-2xl">
                      {profile.bio}
                    </p>
                  )}
                </div>

                {isOwnProfile && (
                  <Button
                    variant="outline"
                    onClick={handleEditProfile}
                    className="mt-4 sm:mt-0"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>

              {/* Links */}
              <div className="flex items-center space-x-4 mt-4">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-gray-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    <Globe className="w-4 h-4 mr-1" />
                    Website
                  </a>
                )}
                {profile.linkedinProfile && (
                  <a
                    href={profile.linkedinProfile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-gray-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    <Linkedin className="w-4 h-4 mr-1" />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-200 dark:border-slate-800">
            {profile.userType === "innovator" ? (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {ideas.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Ideas
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {ideas.reduce(
                      (sum, idea) => sum + (idea.likes?.length || 0),
                      0
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Total Likes
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {ideas.reduce(
                      (sum, idea) => sum + (Number(idea.views) || 0),
                      0
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Total Views
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {formatCurrency(
                      ideas.reduce(
                        (sum, idea) => sum + (Number(idea.currentFunding) || 0),
                        0
                      )
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Funding Raised
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {profile.totalInvestments || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Investments
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {profile.successfulInvestments || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Successful
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-2xl font-bold text-gray-900 dark:text-slate-100">
                    <Star className="w-5 h-5 text-yellow-500 mr-1" />
                    {profile.reputationScore || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Reputation
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {profile.investmentRange?.min != null &&
                    profile.investmentRange?.max != null
                      ? `${formatCurrency(
                          Number(profile.investmentRange.min) || 0
                        )}-${formatCurrency(
                          Number(profile.investmentRange.max) || 0
                        )}`
                      : "N/A"}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">
                    Investment Range
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Ideas (for innovators) */}
            {profile.userType === "innovator" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
                  Ideas ({ideas.length})
                </h2>
                {ideas.length > 0 ? (
                  <div className="space-y-4">
                    {ideas.map((idea) => (
                      <div
                        key={idea._id}
                        className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:border-primary-300 dark:hover:border-primary-500 transition-colors bg-white dark:bg-slate-800/60"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                            {idea.title}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              idea.status === "published"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {idea.status}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                          {idea.description}
                        </p>
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              {Number(idea.views) || 0}
                            </span>
                            <span className="flex items-center">
                              <Heart className="w-4 h-4 mr-1" />
                              {idea.likes?.length || 0}
                            </span>
                            <span className="flex items-center">
                              <MessageSquare className="w-4 h-4 mr-1" />
                              {idea.comments?.length || 0}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900 dark:text-slate-200">
                              {formatCurrency(Number(idea.currentFunding) || 0)}{" "}
                              / {formatCurrency(Number(idea.fundingGoal) || 0)}
                            </div>
                            {idea.status === "draft" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditIdea(idea)}
                              >
                                <Edit className="w-4 h-4 mr-1" /> Edit
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-slate-500">
                    No ideas yet.
                  </p>
                )}
                {/* Edit Idea Modal */}
                <Modal
                  isOpen={!!editingIdea}
                  onClose={() => setEditingIdea(null)}
                  title="Edit Idea"
                  size="lg"
                >
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Title"
                        value={
                          typeof editIdeaData.title === "string"
                            ? editIdeaData.title
                            : editIdeaData.title ?? ""
                        }
                        onChange={(e) =>
                          setEditIdeaData((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                      />
                      <Input
                        label="Category"
                        value={
                          typeof editIdeaData.category === "string"
                            ? editIdeaData.category
                            : editIdeaData.category ?? ""
                        }
                        onChange={(e) =>
                          setEditIdeaData((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Input
                      label="Stage"
                      value={
                        typeof editIdeaData.stage === "string"
                          ? editIdeaData.stage
                          : editIdeaData.stage ?? ""
                      }
                      onChange={(e) =>
                        setEditIdeaData((prev) => ({
                          ...prev,
                          stage: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Funding Goal ($)"
                      type="number"
                      value={
                        editIdeaData.fundingGoal === undefined ||
                        editIdeaData.fundingGoal === null ||
                        isNaN(Number(editIdeaData.fundingGoal))
                          ? ""
                          : String(editIdeaData.fundingGoal)
                      }
                      onChange={(e) =>
                        setEditIdeaData((prev) => ({
                          ...prev,
                          fundingGoal: e.target.value,
                        }))
                      }
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        rows={3}
                        value={editIdeaData.description || ""}
                        onChange={(e) =>
                          setEditIdeaData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Input
                      label="Tags (comma separated)"
                      value={
                        typeof editIdeaData.tags === "string"
                          ? editIdeaData.tags
                          : editIdeaData.tags ?? ""
                      }
                      onChange={(e) =>
                        setEditIdeaData((prev) => ({
                          ...prev,
                          tags: e.target.value,
                        }))
                      }
                    />
                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setEditingIdea(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleSaveIdea(false)}
                        loading={editIdeaMutation.isLoading}
                      >
                        Save Draft
                      </Button>
                      <Button
                        onClick={() => handleSaveIdea(true)}
                        loading={editIdeaMutation.isLoading}
                      >
                        Publish
                      </Button>
                    </div>
                  </div>
                </Modal>
              </motion.div>
            )}
          </div>
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Expertise */}
            {profile.expertise && profile.expertise.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                  Expertise
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.expertise.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100/80 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
            {/* Sectors of Interest */}
            {profile.sectorsOfInterest &&
              profile.sectorsOfInterest.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                    {profile.userType === "investor"
                      ? "Investment Sectors"
                      : "Sectors of Interest"}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.sectorsOfInterest.map((sector, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary-100/80 dark:bg-secondary-900/30 text-secondary-800 dark:text-secondary-300"
                      >
                        {sector}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
          </div>
        </div>

        {/* Edit Profile Modal */}
        <Modal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          title="Edit Profile"
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Name"
                value={profileData.name || ""}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <Input
                label="Company"
                value={profileData.company || ""}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    company: e.target.value,
                  }))
                }
              />
            </div>

            <Input
              label="Location"
              value={profileData.location || ""}
              onChange={(e) =>
                setProfileData((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                value={profileData.bio || ""}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, bio: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Website"
                value={profileData.website || ""}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    website: e.target.value,
                  }))
                }
              />
              <Input
                label="LinkedIn Profile"
                value={profileData.linkedinProfile || ""}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    linkedinProfile: e.target.value,
                  }))
                }
              />
            </div>

            {profile.userType === "investor" && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Min Investment ($)"
                  type="number"
                  value={profileData.investmentRange?.min || ""}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      investmentRange: {
                        ...prev.investmentRange,
                        min: parseInt(e.target.value) || 0,
                      },
                    }))
                  }
                />
                <Input
                  label="Max Investment ($)"
                  type="number"
                  value={profileData.investmentRange?.max || ""}
                  onChange={(e) =>
                    setProfileData((prev) => ({
                      ...prev,
                      investmentRange: {
                        ...prev.investmentRange,
                        max: parseInt(e.target.value) || 0,
                      },
                    }))
                  }
                />
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                loading={updateProfileMutation.isLoading}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ProfilePage;
