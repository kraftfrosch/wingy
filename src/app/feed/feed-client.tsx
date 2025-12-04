"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  X,
  Mic,
  PhoneOff,
  ChevronDown,
  Sparkles,
  User,
  LogOut,
} from "lucide-react";
import { useConversation } from "@elevenlabs/react";
import { createSupabaseClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { UserProfile, MatchWithProfile } from "@/types/profile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CARD_COLORS = [
  "bg-orange-50",
  "bg-green-50",
  "bg-blue-50",
  "bg-purple-50",
  "bg-pink-50",
  "bg-yellow-50",
  "bg-teal-50",
];

type Decision = "yes" | "no" | null;

interface FeedClientProps {
  user: any;
}

export default function FeedClient({ user }: FeedClientProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null
  );
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [showMatchesDropdown, setShowMatchesDropdown] = useState(false);
  const [newMatchProfile, setNewMatchProfile] = useState<UserProfile | null>(
    null
  );
  const matchesDropdownRef = useRef<HTMLDivElement>(null);

  const supabase = createSupabaseClient();
  const currentUserId = user?.id;

  const currentProfile = profiles[currentIndex] || null;

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to agent");
      toast.success(`Connected to ${currentProfile?.display_name}'s agent`);
    },
    onDisconnect: () => {
      console.log("Disconnected from agent");
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      toast.error("Connection error. Please try again.");
    },
  });

  const { status, isSpeaking } = conversation;

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push("/login");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Error signing out");
    }
  };

  // Close matches dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        matchesDropdownRef.current &&
        !matchesDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMatchesDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get current user's profile
  useEffect(() => {
    async function getCurrentUserProfile() {
      if (!currentUserId) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", currentUserId)
        .single();

      if (profile) {
        console.log("Current user profile loaded:", {
          gender: profile.gender,
          preferences: profile.onboarding_preferences,
        });
        setCurrentUserProfile(profile);
      } else {
        setLoading(false);
      }
    }
    getCurrentUserProfile();
  }, [supabase, currentUserId]);

  // Helper: Normalize gender terms to a common format
  const normalizeGender = (value: string): string => {
    const v = value.toLowerCase().trim();
M    if (["woman", "women", "female", "f", "girl", "girls", "lady", "ladies"].includes(v)) return "female";
    if (["man", "men", "male", "m", "boy", "guy", "guys", "gentleman", "gentlemen"].includes(v)) return "male";
    if (["non-binary", "nonbinary", "nb", "enby", "non binary", "other"].includes(v))
      return "non-binary";
    if (["any", "everyone", "all", "both", "anyone", "everybody", "open", "no preference"].includes(v)) return "any";
    console.log(`[Matching] Unknown gender/preference value: "${value}" (normalized: "${v}")`);
    return v;
  };

  // Helper: Check if a gender matches a preference
  const genderMatchesPreference = (
    gender: string | undefined | null,
    preference: string | string[] | undefined | null
  ): boolean => {
    if (!preference) return true;
    if (!gender) return false;

    const normalizedGender = normalizeGender(gender);

    if (Array.isArray(preference)) {
      return preference.some((p) => {
        const normalizedPref = normalizeGender(p);
        return normalizedPref === normalizedGender || normalizedPref === "any";
      });
    }

    const normalizedPref = normalizeGender(preference);
    return normalizedPref === normalizedGender || normalizedPref === "any";
  };

  // Check if two profiles are compatible based on preferences
  const areProfilesCompatible = (
    myProfile: UserProfile,
    theirProfile: UserProfile
  ): boolean => {
    const myPrefs = myProfile.onboarding_preferences;
    const theirPrefs = theirProfile.onboarding_preferences;

    // Check both possible field names: looking_for (from onboarding) or partner_gender
    const myLookingFor = myPrefs?.looking_for || myPrefs?.partner_gender;
    const theirLookingFor = theirPrefs?.looking_for || theirPrefs?.partner_gender;

    const iWantThem = genderMatchesPreference(
      theirProfile.gender,
      myLookingFor as string | string[] | undefined
    );
    const theyWantMe = genderMatchesPreference(
      myProfile.gender,
      theirLookingFor as string | string[] | undefined
    );

    let ageCompatible = true;
    if (myPrefs?.partner_age_range && theirProfile.age) {
      const { min, max } = myPrefs.partner_age_range;
      if (min && theirProfile.age < min) ageCompatible = false;
      if (max && theirProfile.age > max) ageCompatible = false;
    }
    if (theirPrefs?.partner_age_range && myProfile.age) {
      const { min, max } = theirPrefs.partner_age_range;
      if (min && myProfile.age < min) ageCompatible = false;
      if (max && myProfile.age > max) ageCompatible = false;
    }

    const isCompatible = iWantThem && theyWantMe && ageCompatible;

    console.log(`Checking ${theirProfile.display_name}:`, {
      theirGender: theirProfile.gender,
      theirGenderNormalized: normalizeGender(theirProfile.gender || ""),
      myLookingFor,
      myLookingForNormalized: myLookingFor ? normalizeGender(String(myLookingFor)) : null,
      iWantThem,
      myGender: myProfile.gender,
      myGenderNormalized: normalizeGender(myProfile.gender || ""),
      theirLookingFor,
      theirLookingForNormalized: theirLookingFor ? normalizeGender(String(theirLookingFor)) : null,
      theyWantMe,
      ageCompatible,
      result: isCompatible ? "✅ SHOW" : "❌ HIDE",
    });

    return isCompatible;
  };

  // Fetch profiles with ready agents
  useEffect(() => {
    async function fetchProfiles() {
      if (!currentUserProfile) {
        console.log(
          "Waiting for current user profile to load before fetching feed..."
        );
        return;
      }

      const myPrefs = currentUserProfile.onboarding_preferences;
      const myLookingFor = myPrefs?.looking_for || myPrefs?.partner_gender;
      console.log("=== CURRENT USER INFO ===", {
        myGender: currentUserProfile.gender,
        myGenderNormalized: normalizeGender(currentUserProfile.gender || ""),
        myLookingFor: myLookingFor,
        myLookingForNormalized: myLookingFor ? normalizeGender(String(myLookingFor)) : null,
        fullPrefs: myPrefs,
      });

      try {
        let query = supabase
          .from("user_profiles")
          .select("*")
          .eq("agent_ready", true)
          .order("created_at", { ascending: false });

        if (currentUserId) {
          query = query.neq("user_id", currentUserId);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching profiles:", error);
          toast.error("Failed to load profiles");
          return;
        }

        console.log(
          `Found ${data?.length || 0} profiles, filtering by preferences...`
        );

        const filteredProfiles = (data || []).filter((profile) =>
          areProfilesCompatible(currentUserProfile, profile)
        );

        console.log(
          `After filtering: ${filteredProfiles.length} compatible profiles`
        );

        setProfiles(filteredProfiles);
      } catch (err) {
        console.error("Error:", err);
        toast.error("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    if (currentUserId && currentUserProfile) {
      fetchProfiles();
    }
  }, [supabase, currentUserId, currentUserProfile]);

  // Fetch matches
  const fetchMatches = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { data: myLikes, error: likesError } = await supabase
        .from("user_likes")
        .select("to_user_id")
        .eq("from_user_id", currentUserId);

      if (likesError) {
        console.error("Error fetching likes:", likesError);
        return;
      }

      if (!myLikes || myLikes.length === 0) {
        setMatches([]);
        return;
      }

      const likedUserIds = myLikes.map((l) => l.to_user_id);

      const { data: mutualLikes, error: mutualError } = await supabase
        .from("user_likes")
        .select("from_user_id, created_at")
        .eq("to_user_id", currentUserId)
        .in("from_user_id", likedUserIds);

      if (mutualError) {
        console.error("Error fetching mutual likes:", mutualError);
        return;
      }

      if (!mutualLikes || mutualLikes.length === 0) {
        setMatches([]);
        return;
      }

      const matchedUserIds = mutualLikes.map((l) => l.from_user_id);

      const { data: matchedProfiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*")
        .in("user_id", matchedUserIds);

      if (profilesError) {
        console.error("Error fetching matched profiles:", profilesError);
        return;
      }

      const matchesWithProfiles: MatchWithProfile[] = mutualLikes
        .map((like) => {
          const profile = matchedProfiles?.find(
            (p) => p.user_id === like.from_user_id
          );
          if (!profile) return null;
          return {
            user_id: currentUserId,
            matched_with_user_id: like.from_user_id,
            matched_at: like.created_at,
            profile,
          };
        })
        .filter((m): m is MatchWithProfile => m !== null)
        .sort(
          (a, b) =>
            new Date(b.matched_at).getTime() - new Date(a.matched_at).getTime()
        );

      setMatches(matchesWithProfiles);
    } catch (err) {
      console.error("Error fetching matches:", err);
    }
  }, [supabase, currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      fetchMatches();
    }
  }, [currentUserId, fetchMatches]);

  // Save like to database
  const saveLike = useCallback(
    async (toUserId: string): Promise<boolean> => {
      if (!currentUserId) {
        toast.error("Please log in to like profiles");
        return false;
      }

      try {
        const { error } = await supabase.from("user_likes").insert({
          from_user_id: currentUserId,
          to_user_id: toUserId,
        });

        if (error) {
          if (error.code === "23505") return true;
          console.error("Error saving like:", error);
          return false;
        }

        const { data: theirLike } = await supabase
          .from("user_likes")
          .select("id")
          .eq("from_user_id", toUserId)
          .eq("to_user_id", currentUserId)
          .single();

        if (theirLike) {
          const matchedProfile = profiles.find((p) => p.user_id === toUserId);
          if (matchedProfile) {
            setNewMatchProfile(matchedProfile);
          }
          fetchMatches();
          return true;
        }

        return true;
      } catch (err) {
        console.error("Error:", err);
        return false;
      }
    },
    [supabase, currentUserId, profiles, fetchMatches]
  );

  // Start conversation with agent
  const startCall = useCallback(async () => {
    if (!currentProfile?.cloned_agent_id) {
      toast.error("This user's agent is not available");
      return;
    }

    setIsCallModalOpen(true);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: currentProfile.cloned_agent_id,
        connectionType: "webrtc",
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error("Could not access microphone or connect to agent");
      setIsCallModalOpen(false);
    }
  }, [conversation, currentProfile]);

  const endCall = useCallback(async () => {
    await conversation.endSession();
    setIsCallModalOpen(false);
    setShowDecisionModal(true);
  }, [conversation]);

  const handleDecision = useCallback(
    async (decision: Decision) => {
      if (!currentProfile) return;

      setDecisions((prev) => ({ ...prev, [currentProfile.id]: decision }));
      setSwipeDirection(decision === "yes" ? "right" : "left");

      if (decision === "yes") {
        const saved = await saveLike(currentProfile.user_id);
        if (saved) {
          toast.success(`You liked ${currentProfile.display_name}! 💕`);
        }
      }

      setShowDecisionModal(false);

      setTimeout(() => {
        setSwipeDirection(null);
        if (currentIndex < profiles.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      }, 300);
    },
    [currentProfile, currentIndex, profiles.length, saveLike]
  );

  const handleSkip = useCallback(() => {
    if (!currentProfile) return;

    setDecisions((prev) => ({ ...prev, [currentProfile.id]: "no" }));
    setSwipeDirection("left");

    setTimeout(() => {
      setSwipeDirection(null);
      if (currentIndex < profiles.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 300);
  }, [currentProfile, currentIndex, profiles.length]);

  const handleLike = useCallback(async () => {
    if (!currentProfile) return;

    setDecisions((prev) => ({ ...prev, [currentProfile.id]: "yes" }));
    setSwipeDirection("right");

    const saved = await saveLike(currentProfile.user_id);
    if (saved) {
      toast.success(`You liked ${currentProfile.display_name}! 💕`);
    }

    setTimeout(() => {
      setSwipeDirection(null);
      if (currentIndex < profiles.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 300);
  }, [currentProfile, currentIndex, profiles.length, saveLike]);

  const getProfileTag = (profile: UserProfile): string => {
    if (profile.onboarding_tags && profile.onboarding_tags.length > 0) {
      return profile.onboarding_tags[0];
    }
    return "New here";
  };

  const getBioExcerpt = (profile: UserProfile): string => {
    if (profile.bio) {
      return profile.bio.length > 100
        ? `"${profile.bio.slice(0, 100)}..."`
        : `"${profile.bio}"`;
    }
    if (profile.onboarding_summary) {
      return profile.onboarding_summary.length > 100
        ? `"${profile.onboarding_summary.slice(0, 100)}..."`
        : `"${profile.onboarding_summary}"`;
    }
    return `"Looking forward to connecting..."`;
  };

  const formatMatchTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays}d ago`;
  };

  const likesCount = Object.values(decisions).filter((d) => d === "yes").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading profiles...</p>
        </div>
      </div>
    );
  }

  const isEndOfProfiles = currentIndex >= profiles.length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50 flex justify-between items-center border-b border-border/40">
        <h1 className="text-3xl font-bold text-primary font-heading">Ember</h1>

        <div className="flex items-center gap-3">
          {likesCount > 0 && (
            <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-md">
              <Heart className="w-4 h-4 text-primary fill-primary" />
              <span className="text-sm font-medium text-primary">
                {likesCount}
              </span>
            </div>
          )}

          {/* Matches Dropdown */}
          <div className="relative" ref={matchesDropdownRef}>
            <button
              onClick={() => setShowMatchesDropdown(!showMatchesDropdown)}
              className="flex items-center gap-1 group"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                  <Sparkles className="w-5 h-5 text-foreground" />
                </div>
                {matches.length > 0 && (
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                    <span className="text-[10px] font-bold text-primary-foreground">
                      {matches.length}
                    </span>
                  </div>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${
                  showMatchesDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {showMatchesDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-card rounded-lg shadow-xl border border-border overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-border">
                    <h3 className="font-semibold text-foreground flex items-center gap-2 font-heading">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Your Matches
                    </h3>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {matches.length === 0 ? (
                      <div className="p-6 text-center">
                        <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">
                          No matches yet
                        </p>
                        <p className="text-muted-foreground/60 text-xs mt-1">
                          Keep swiping to find your match!
                        </p>
                      </div>
                    ) : (
                      <div className="py-2">
                        {matches.map((match) => (
                          <button
                            key={match.matched_with_user_id}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors"
                            onClick={() => {
                              toast.info(
                                `Chat with ${match.profile.display_name} coming soon!`
                              );
                              setShowMatchesDropdown(false);
                            }}
                          >
                            <div
                              className={`w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 ${
                                CARD_COLORS[
                                  matches.indexOf(match) % CARD_COLORS.length
                                ]
                              }`}
                            >
                              {match.profile.profile_photo_url ? (
                                <img
                                  src={match.profile.profile_photo_url}
                                  alt={match.profile.display_name}
                                  className="w-full h-full object-cover rounded-md"
                                />
                              ) : (
                                <span className="text-lg font-semibold text-foreground/60">
                                  {match.profile.display_name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 text-left">
                              <h4 className="font-medium text-foreground">
                                {match.profile.display_name},{" "}
                                {match.profile.age}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                Matched {formatMatchTime(match.matched_at)}
                              </p>
                            </div>
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center overflow-hidden hover:bg-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <User className="w-5 h-5 text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-lg p-2">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                {user?.email}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10 rounded-md"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-8 space-y-4 max-w-md mx-auto relative z-10">
        {/* Progress indicator */}
        {profiles.length > 0 && !isEndOfProfiles && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} of {profiles.length}
            </span>
            <div className="flex-1 mx-4 h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / profiles.length) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {profiles.length === 0 ? (
          <div className="bg-card rounded-xl p-8 text-center shadow-sm border border-border/50 mt-20">
            <Mic className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground font-heading mb-2">
              No matches yet
            </h3>
            <p className="text-muted-foreground">
              Check back later for new profiles!
            </p>
          </div>
        ) : isEndOfProfiles ? (
          <div className="bg-card rounded-xl p-8 text-center shadow-sm border border-border/50 mt-20">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground font-heading mb-2">
              You&apos;ve seen everyone!
            </h3>
            <p className="text-muted-foreground mb-4">
              You liked {likesCount} {likesCount === 1 ? "person" : "people"} 💕
            </p>
            <button
              onClick={() => setCurrentIndex(0)}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-medium transition-colors"
            >
              Start Over
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProfile?.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{
                opacity: 1,
                x:
                  swipeDirection === "left"
                    ? -300
                    : swipeDirection === "right"
                    ? 300
                    : 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-card rounded-xl overflow-hidden shadow-sm border border-border/50"
            >
              {currentProfile && (
                <>
                  <div
                    className={`h-72 ${
                      CARD_COLORS[currentIndex % CARD_COLORS.length]
                    } relative group transition-colors`}
                  >
                    {currentProfile.profile_photo_url ? (
                      <img
                        src={currentProfile.profile_photo_url}
                        alt={currentProfile.display_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="absolute w-32 h-32 bg-primary/20 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <Mic className="w-16 h-16 text-foreground/10 group-hover:scale-110 transition-transform duration-500 relative z-10" />
                      </div>
                    )}
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      <div className="bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-md text-xs font-medium shadow-sm border border-white/20">
                        {getProfileTag(currentProfile)}
                      </div>
                      {currentProfile.onboarding_tags
                        ?.slice(1, 3)
                        .map((tag, i) => (
                          <div
                            key={i}
                            className="bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-md text-xs font-medium shadow-sm border border-white/20"
                          >
                            {tag}
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="p-6 pt-4">
                    <div className="mb-4">
                      <h3 className="text-3xl font-bold text-foreground font-heading">
                        {currentProfile.display_name}, {currentProfile.age}
                      </h3>
                      {currentProfile.location_city && (
                        <p className="text-muted-foreground text-sm mt-1">
                          {currentProfile.location_city}
                          {currentProfile.location_region &&
                            `, ${currentProfile.location_region}`}
                        </p>
                      )}
                      <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                        {getBioExcerpt(currentProfile)}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-8 flex gap-3">
                      <button
                        onClick={handleSkip}
                        className="w-16 h-16 bg-secondary hover:bg-secondary/80 text-muted-foreground rounded-xl flex items-center justify-center transition-all hover:scale-105"
                      >
                        <X className="w-7 h-7" />
                      </button>

                      <button
                        onClick={startCall}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-md font-semibold transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Mic className="w-5 h-5" />
                        Talk to Agent
                      </button>

                      <button
                        onClick={handleLike}
                        className="w-16 h-16 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl flex items-center justify-center transition-all hover:scale-105"
                      >
                        <Heart className="w-7 h-7" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>


      {/* Voice Call Modal */}
      <AnimatePresence>
        {isCallModalOpen && currentProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-xl w-full max-w-sm p-8 relative border border-border"
            >
              <div className="text-center space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground font-heading">
                    {currentProfile.display_name}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {status === "connected" ? "Connected" : "Connecting..."}
                  </p>
                </div>

                <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                  {status === "connected" && (
                    <>
                      <motion.div
                        animate={{
                          scale: isSpeaking ? [1, 1.2, 1] : 1,
                          opacity: isSpeaking ? 0.5 : 0.2,
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 2,
                          ease: "easeInOut",
                        }}
                        className="absolute inset-0 bg-primary rounded-full blur-xl"
                      />
                      <motion.div
                        animate={{ scale: isSpeaking ? [1, 1.1, 1] : 1 }}
                        transition={{
                          repeat: Infinity,
                          duration: 1,
                          ease: "easeInOut",
                        }}
                        className="absolute inset-4 bg-primary/30 rounded-full"
                      />
                    </>
                  )}

                  <div className="relative z-10 w-28 h-28 bg-card rounded-full shadow-xl flex items-center justify-center border-4 border-border">
                    {status === "connected" ? (
                      <div className="flex gap-1 items-center">
                        {[1, 2, 3, 4].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ height: isSpeaking ? [15, 35, 15] : 8 }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.4,
                              delay: i * 0.1,
                            }}
                            className="w-2 bg-foreground rounded-full"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>

                <p className="text-muted-foreground text-sm">
                  {isSpeaking
                    ? "Speaking..."
                    : status === "connected"
                    ? "Your turn to speak"
                    : "Setting up connection..."}
                </p>

                <button
                  onClick={endCall}
                  className="w-full py-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <PhoneOff className="w-5 h-5" />
                  End Call
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decision Modal */}
      <AnimatePresence>
        {showDecisionModal && currentProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-card rounded-xl w-full max-w-sm p-8 border border-border"
            >
              <div className="text-center space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground font-heading">
                    What do you think?
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Would you like to match with {currentProfile.display_name}?
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-secondary p-4 rounded-lg">
                  <div
                    className={`w-16 h-16 ${
                      CARD_COLORS[currentIndex % CARD_COLORS.length]
                    } rounded-lg flex items-center justify-center flex-shrink-0`}
                  >
                    {currentProfile.profile_photo_url ? (
                      <img
                        src={currentProfile.profile_photo_url}
                        alt={currentProfile.display_name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Mic className="w-6 h-6 text-foreground/20" />
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-foreground">
                      {currentProfile.display_name}, {currentProfile.age}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getProfileTag(currentProfile)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleDecision("no")}
                    className="flex-1 py-4 bg-secondary hover:bg-secondary/80 text-foreground rounded-md font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <X className="w-5 h-5" />
                    Pass
                  </button>
                  <button
                    onClick={() => handleDecision("yes")}
                    className="flex-1 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <Heart className="w-5 h-5" />
                    Like
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Match Celebration Modal */}
      <AnimatePresence>
        {newMatchProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-card rounded-xl w-full max-w-sm p-8 text-center border border-border"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6"
              >
                <Sparkles className="w-10 h-10 text-primary-foreground" />
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-foreground font-heading mb-2"
              >
                It&apos;s a Match! 🎉
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground mb-6"
              >
                You and {newMatchProfile.display_name} liked each other!
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex gap-3"
              >
                <button
                  onClick={() => setNewMatchProfile(null)}
                  className="flex-1 py-4 bg-secondary hover:bg-secondary/80 text-foreground rounded-md font-semibold transition-colors"
                >
                  Keep Browsing
                </button>
                <button
                  onClick={() => {
                    toast.info("Chat coming soon!");
                    setNewMatchProfile(null);
                  }}
                  className="flex-1 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-semibold transition-colors"
                >
                  Say Hi 👋
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
