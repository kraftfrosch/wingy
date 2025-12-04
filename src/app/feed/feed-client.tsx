"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  X,
  Mic,
  ChevronDown,
  Sparkles,
  User,
  LogOut,
  MapPin,
  Calendar,
  MessageCircle,
  ArrowLeft,
  Clock,
  Send,
  Settings,
} from "lucide-react";
import { useConversation } from "@elevenlabs/react";
import { createSupabaseClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { UserProfile, MatchWithProfile, Message } from "@/types/profile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/logo";

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
  const [selectedMatch, setSelectedMatch] = useState<MatchWithProfile | null>(
    null
  );
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const callStartTimeRef = useRef<number | null>(null);
  const lastCallDurationRef = useRef<number>(0);
  const matchesDropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = createSupabaseClient();
  const currentUserId = user?.id;

  const currentProfile = profiles[currentIndex] || null;


  // Prevent body scrolling on mobile
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, []);

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to agent - starting timer");
      callStartTimeRef.current = Date.now();
      console.log("Call start time set:", callStartTimeRef.current);
      toast.success(`Connected to ${currentProfile?.display_name}'s agent`);
    },
    onDisconnect: () => {
      console.log("Disconnected from agent, callStartTimeRef:", callStartTimeRef.current);
      // Duration is now calculated in endCall, so we just log here
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
    if (["woman", "women", "female", "f", "girl", "girls", "lady", "ladies"].includes(v)) return "female";
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
      // Get my likes with call duration
      const { data: myLikes, error: likesError } = await supabase
        .from("user_likes")
        .select("to_user_id, call_duration_seconds")
        .eq("from_user_id", currentUserId);

      if (likesError) {
        // Fallback: try without call_duration_seconds column (if it doesn't exist yet)
        console.warn("Fetching likes with duration failed, trying without:", likesError);
        const { data: fallbackLikes, error: fallbackError } = await supabase
          .from("user_likes")
          .select("to_user_id")
          .eq("from_user_id", currentUserId);
        
        if (fallbackError) {
          console.error("Error fetching likes:", fallbackError);
          return;
        }
        
        // Continue with fallback data (no duration)
        if (!fallbackLikes || fallbackLikes.length === 0) {
          setMatches([]);
          return;
        }
        
        const likedUserIds = fallbackLikes.map((l) => l.to_user_id);
        
        const { data: mutualLikes, error: mutualError } = await supabase
          .from("user_likes")
          .select("from_user_id, created_at")
          .eq("to_user_id", currentUserId)
          .in("from_user_id", likedUserIds);

        if (mutualError || !mutualLikes || mutualLikes.length === 0) {
          setMatches([]);
          return;
        }

        const matchedUserIds = mutualLikes.map((l) => l.from_user_id);

        const { data: matchedProfiles } = await supabase
          .from("user_profiles")
          .select("*")
          .in("user_id", matchedUserIds);

        const matchesWithProfiles: MatchWithProfile[] = mutualLikes
          .map((like): MatchWithProfile | null => {
            const profile = matchedProfiles?.find((p) => p.user_id === like.from_user_id);
            if (!profile) return null;
            return {
              user_id: currentUserId,
              matched_with_user_id: like.from_user_id,
              matched_at: like.created_at,
              profile,
            };
          })
          .filter((m): m is MatchWithProfile => m !== null)
          .sort((a, b) => new Date(b.matched_at).getTime() - new Date(a.matched_at).getTime());

        setMatches(matchesWithProfiles);
        return;
      }

      if (!myLikes || myLikes.length === 0) {
        setMatches([]);
        return;
      }

      const likedUserIds = myLikes.map((l) => l.to_user_id);

      // Get their likes with call duration
      const { data: mutualLikes, error: mutualError } = await supabase
        .from("user_likes")
        .select("from_user_id, created_at, call_duration_seconds")
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

      // Get conversations for unread counts
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, user1_id, user2_id")
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

      // Get unread message counts per conversation
      const { data: unreadCounts } = await supabase
        .from("messages")
        .select("conversation_id")
        .neq("sender_id", currentUserId)
        .is("read_at", null);

      // Count unreads per conversation
      const unreadByConversation: Record<string, number> = {};
      unreadCounts?.forEach((msg) => {
        unreadByConversation[msg.conversation_id] = (unreadByConversation[msg.conversation_id] || 0) + 1;
      });

      const matchesWithProfiles: MatchWithProfile[] = mutualLikes
        .map((like): MatchWithProfile | null => {
          const profile = matchedProfiles?.find(
            (p) => p.user_id === like.from_user_id
          );
          if (!profile) return null;
          
          // Find my like to get my call duration
          const myLike = myLikes.find((l) => l.to_user_id === like.from_user_id);
          const myCallDuration = myLike?.call_duration_seconds || 0;
          const theirCallDuration = like.call_duration_seconds || 0;

          // Find conversation for this match
          const conversation = conversations?.find(
            (c) =>
              (c.user1_id === currentUserId && c.user2_id === like.from_user_id) ||
              (c.user2_id === currentUserId && c.user1_id === like.from_user_id)
          );
          
          return {
            user_id: currentUserId,
            matched_with_user_id: like.from_user_id,
            matched_at: like.created_at,
            profile,
            my_call_duration_seconds: myCallDuration,
            their_call_duration_seconds: theirCallDuration,
            total_call_duration_seconds: myCallDuration + theirCallDuration,
            conversation_id: conversation?.id,
            unread_count: conversation ? (unreadByConversation[conversation.id] || 0) : 0,
          };
        })
        .filter((m): m is MatchWithProfile => m !== null)
        .sort(
          (a, b) =>
            new Date(b.matched_at).getTime() - new Date(a.matched_at).getTime()
        );

      // Calculate total unread count
      const totalUnread = matchesWithProfiles.reduce((sum, m) => sum + (m.unread_count || 0), 0);
      setTotalUnreadCount(totalUnread);

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

  // Get or create conversation for a match
  const getOrCreateConversation = useCallback(
    async (otherUserId: string): Promise<string | null> => {
      if (!currentUserId) return null;

      // Check if conversation exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(user1_id.eq.${currentUserId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${currentUserId})`
        )
        .single();

      if (existing) return existing.id;

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          user1_id: currentUserId,
          user2_id: otherUserId,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating conversation:", error);
        return null;
      }

      return newConv?.id || null;
    },
    [supabase, currentUserId]
  );

  // Fetch messages for a conversation
  const fetchMessages = useCallback(
    async (conversationId: string) => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      setMessages(data || []);

      // Mark unread messages as read
      if (currentUserId) {
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .neq("sender_id", currentUserId)
          .is("read_at", null);

        // Update unread count for this match
        setMatches((prev) =>
          prev.map((m) =>
            m.conversation_id === conversationId ? { ...m, unread_count: 0 } : m
          )
        );
        
        // Recalculate total unread
        setTotalUnreadCount((prev) => {
          const match = matches.find((m) => m.conversation_id === conversationId);
          return Math.max(0, prev - (match?.unread_count || 0));
        });
      }
    },
    [supabase, currentUserId, matches]
  );

  // Send a message
  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!currentUserId || !content.trim()) return;

      setSendingMessage(true);
      try {
        const { data, error } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: currentUserId,
            content: content.trim(),
          })
          .select()
          .single();

        if (error) {
          console.error("Error sending message:", error);
          toast.error("Failed to send message");
          return;
        }

        setMessages((prev) => [...prev, data]);
        setNewMessage("");
      } finally {
        setSendingMessage(false);
      }
    },
    [supabase, currentUserId]
  );

  // Subscribe to real-time messages when chat is open
  useEffect(() => {
    if (!showChat || !selectedMatch?.conversation_id) return;

    const channel = supabase
      .channel(`messages:${selectedMatch.conversation_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedMatch.conversation_id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Only add if not from us (we already added it optimistically)
          if (newMsg.sender_id !== currentUserId) {
            setMessages((prev) => [...prev, newMsg]);
            // Mark as read since we're viewing
            supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showChat, selectedMatch?.conversation_id, supabase, currentUserId]);

  // Global subscription for new messages (updates unread counts)
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("global-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // If message is not from us and we're not viewing that chat
          if (newMsg.sender_id !== currentUserId) {
            // Refresh matches to update unread counts
            fetchMatches();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase, fetchMatches]);

  // Subscribe to new likes (for real-time match detection)
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("new-likes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_likes",
          filter: `to_user_id=eq.${currentUserId}`,
        },
        async (payload) => {
          console.log("New like received:", payload);
          // Someone liked us - check if it's a match
          const newLike = payload.new as { from_user_id: string; to_user_id: string };
          
          // Check if we already liked them back
          const { data: ourLike } = await supabase
            .from("user_likes")
            .select("id")
            .eq("from_user_id", currentUserId)
            .eq("to_user_id", newLike.from_user_id)
            .single();

          if (ourLike) {
            // It's a match! Refresh matches and show celebration
            const { data: matchedProfile } = await supabase
              .from("user_profiles")
              .select("*")
              .eq("user_id", newLike.from_user_id)
              .single();

            if (matchedProfile) {
              setNewMatchProfile(matchedProfile);
              fetchMatches();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase, fetchMatches]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Open chat for a match
  const openChat = useCallback(
    async (match: MatchWithProfile) => {
      let conversationId: string | undefined = match.conversation_id;

      if (!conversationId) {
        const newConvId = await getOrCreateConversation(match.matched_with_user_id);
        if (newConvId) {
          conversationId = newConvId;
          // Update match with conversation ID
          setMatches((prev) =>
            prev.map((m) =>
              m.matched_with_user_id === match.matched_with_user_id
                ? { ...m, conversation_id: conversationId }
                : m
            )
          );
          setSelectedMatch({ ...match, conversation_id: conversationId });
        }
      }

      if (conversationId) {
        await fetchMessages(conversationId);
        setShowChat(true);
      } else {
        toast.error("Could not open chat");
      }
    },
    [getOrCreateConversation, fetchMessages]
  );

  // Save like to database
  const saveLike = useCallback(
    async (toUserId: string, callDurationSeconds?: number): Promise<boolean> => {
      if (!currentUserId) {
        toast.error("Please log in to like profiles");
        return false;
      }

      const durationToSave = callDurationSeconds || 0;
      console.log(`Saving like with duration: ${durationToSave} seconds`);

      try {
        // First check if like already exists
        const { data: existingLike } = await supabase
          .from("user_likes")
          .select("id, call_duration_seconds")
          .eq("from_user_id", currentUserId)
          .eq("to_user_id", toUserId)
          .single();

        if (existingLike) {
          // Update existing like - add to existing duration (multiple calls)
          const newDuration = (existingLike.call_duration_seconds || 0) + durationToSave;
          console.log(`Updating existing like ID: ${existingLike.id}`);
          console.log(`Previous: ${existingLike.call_duration_seconds || 0}s, Adding: ${durationToSave}s, New total: ${newDuration}s`);
          
          const { data: updateData, error: updateError } = await supabase
            .from("user_likes")
            .update({ call_duration_seconds: newDuration })
            .eq("id", existingLike.id)
            .select();

          console.log("Update response - data:", updateData, "error:", updateError);

          if (updateError) {
            console.error("Error updating like:", updateError);
            return false;
          }
          
          if (!updateData || updateData.length === 0) {
            console.error("Update returned no data - RLS policy may be blocking update");
          } else {
            console.log("Like updated successfully, new value:", updateData[0]?.call_duration_seconds);
          }
        } else {
          // Insert new like
          console.log("Creating new like with duration:", durationToSave);
          const { data, error } = await supabase.from("user_likes").insert({
            from_user_id: currentUserId,
            to_user_id: toUserId,
            call_duration_seconds: durationToSave,
          }).select();

          console.log("Insert response - data:", data, "error:", error);

          if (error) {
            console.error("Error saving like:", error);
            return false;
          }
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

  const endCall = useCallback(async () => {
    console.log("endCall triggered, callStartTimeRef:", callStartTimeRef.current);
    
    // Calculate duration before ending session
    let duration = 0;
    if (callStartTimeRef.current) {
      duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      console.log(`Call ended. Duration: ${duration} seconds`);
      callStartTimeRef.current = null;
    } else {
      console.warn("No call start time found - duration will be 0");
    }
    
    // Store duration in ref (immediate, not async like state)
    lastCallDurationRef.current = duration;
    console.log("Duration stored in ref:", lastCallDurationRef.current);
    
    await conversation.endSession();
    setShowDecisionModal(true);
  }, [conversation]);

  // Start or end conversation with agent
  const toggleCall = useCallback(async () => {
    // If already connected, end the call
    if (status === "connected") {
      await endCall();
      return;
    }

    // Otherwise, start the call
    if (!currentProfile?.cloned_agent_id) {
      toast.error("This user's agent is not available");
      return;
    }

    // Set call start time immediately as a backup
    // (onConnect should also set this, but just in case)
    callStartTimeRef.current = Date.now();
    console.log("startCall - timer started:", callStartTimeRef.current);

    try {
      await conversation.startSession({
        agentId: currentProfile.cloned_agent_id,
        connectionType: "webrtc",
      });
    } catch (error: any) {
      console.error("Failed to start conversation:", error);
      toast.error("Could not access microphone or connect to agent");
      callStartTimeRef.current = null; // Reset on error
    }
  }, [conversation, currentProfile, status, endCall]);

  const handleDecision = useCallback(
    async (decision: Decision) => {
      if (!currentProfile) return;

      setDecisions((prev) => ({ ...prev, [currentProfile.id]: decision }));
      setSwipeDirection(decision === "yes" ? "right" : "left");

      if (decision === "yes") {
        console.log("Liking with duration from ref:", lastCallDurationRef.current);
        const saved = await saveLike(currentProfile.user_id, lastCallDurationRef.current);
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

  // Get profile picture path based on gender (default) or real photo (for matches)
  const getProfilePicturePath = (
    profile: UserProfile, 
    options: { index?: number; useRealPhoto?: boolean } = {}
  ): string => {
    const { index = 0, useRealPhoto = false } = options;
    
    // If useRealPhoto is true and profile has a photo, use it
    if (useRealPhoto && profile.profile_photo_url) {
      return profile.profile_photo_url;
    }
    
    // Otherwise, use default picture based on gender
    const gender = profile.gender?.toLowerCase() || 'male';
    let folder = 'male';
    let maxPics = 3;
    
    if (gender === 'female' || gender === 'woman' || gender === 'women') {
      folder = 'female';
      maxPics = 3;
    } else if (gender === 'non-binary' || gender === 'nonbinary' || gender === 'nb') {
      folder = 'non-binary';
      maxPics = 1;
    }
    
    // Use user_id hash for consistent picture selection, fallback to index
    let picIndex = index;
    if (profile.user_id) {
      // Simple hash of user_id for consistent picture selection
      let hash = 0;
      for (let i = 0; i < profile.user_id.length; i++) {
        hash = ((hash << 5) - hash) + profile.user_id.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
      }
      picIndex = Math.abs(hash);
    }
    
    const picNumber = (picIndex % maxPics) + 1;
    return `/profiles/${folder}/profile${picNumber}.png`;
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

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
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
    <div 
      className="h-screen relative overflow-hidden flex flex-col"
      style={{
        backgroundImage: 'url(/background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Header */}
      <header className="px-6 py-2 z-50 flex justify-between items-center flex-shrink-0">
        <Logo width={160} height={48} />

        <div className="flex items-center gap-3">
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
                {(matches.length > 0 || totalUnreadCount > 0) && (
                  <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center border-2 border-background ${totalUnreadCount > 0 ? 'bg-destructive' : 'bg-primary'}`}>
                    <span className="text-[10px] font-bold text-primary-foreground">
                      {totalUnreadCount > 0 ? totalUnreadCount : matches.length}
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
                              setSelectedMatch(match);
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
                            {match.unread_count && match.unread_count > 0 ? (
                              <div className="w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                                <span className="text-[10px] font-bold text-white">
                                  {match.unread_count}
                                </span>
                              </div>
                            ) : (
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
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
                onClick={() => router.push("/profile/edit")}
                className="cursor-pointer rounded-md"
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </DropdownMenuItem>
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
      <main className="px-4 pb-2 pt-1 max-w-lg mx-auto relative z-10 flex flex-col justify-center flex-1 overflow-hidden">
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
              transition={{ duration: swipeDirection ? 0.3 : 0.2 }}
              className="w-full flex flex-col"
            >
              {currentProfile && (
                <>
                  {/* Meet text */}
                  <h2 className="text-5xl font-bold font-heading text-white mb-6 text-left">
                    Meet
                  </h2>
                  
                  {/* Profile Picture - Clickable to start/stop conversation */}
                  <button
                    onClick={toggleCall}
                    className="w-full aspect-square relative overflow-hidden group cursor-pointer rounded-xl"
                  >
                    <img
                      key={`feed-${currentProfile.user_id}-${currentIndex}`}
                      src={getProfilePicturePath(currentProfile, { index: currentIndex, useRealPhoto: false })}
                      alt={currentProfile.display_name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        console.error('Failed to load image:', e.currentTarget.src);
                      }}
                    />
                    
                    {/* Voice Visualizer Overlay */}
                    {status === "connected" || status === "connecting" ? (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                        {status !== "connected" ? (
                          <div className="text-center">
                            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-white text-sm font-medium">Connecting...</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            {/* Voice Visualizer Bars */}
                            <div className="flex items-end gap-1.5 h-12">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <motion.div
                                  key={i}
                                  animate={{
                                    height: isSpeaking
                                      ? [8, Math.random() * 32 + 16, 8]
                                      : 8,
                                  }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 0.4,
                                    delay: i * 0.05,
                                    ease: "easeInOut",
                                  }}
                                  className="w-2 bg-white rounded-full"
                                  style={{ minHeight: "8px" }}
                                />
                              ))}
                            </div>
                            <p className="text-white text-xs font-medium">
                              {isSpeaking ? "Speaking..." : "Listening..."}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : null}
                    
                    {/* Name and Age overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 z-20">
                      <h3 className="text-white text-2xl font-bold font-heading text-left">
                        {currentProfile.display_name}, {currentProfile.age}
                      </h3>
                    </div>
                  </button>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>



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
                    Is there a spark?
                  </h2>
                </div>

                <div className="flex items-center gap-4 bg-secondary p-4 rounded-lg">
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img
                      src={getProfilePicturePath(currentProfile, { index: currentIndex, useRealPhoto: false })}
                      alt={currentProfile.display_name}
                      className="w-full h-full object-cover rounded-lg"
                    />
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
              className="bg-card rounded-xl w-full max-w-sm overflow-hidden border border-border flex flex-col"
            >
              {/* Spark Image */}
              <div className="w-full aspect-square relative">
                <img
                  src="/spark.png"
                  alt="Match celebration"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Say Hi Button */}
              <div className="p-6">
                <button
                  onClick={() => {
                    // Find the match in matches array and open their profile
                    const match = matches.find(
                      (m) => m.profile.user_id === newMatchProfile.user_id
                    );
                    if (match) {
                      setSelectedMatch(match);
                    }
                    setNewMatchProfile(null);
                  }}
                  className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-semibold transition-colors"
                >
                  Say hi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Details Modal */}
      <AnimatePresence>
        {selectedMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background z-50 overflow-y-auto"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="min-h-screen"
            >
              {/* Header */}
              <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 px-4 py-4 flex items-center gap-4 border-b border-border/40">
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">
                    {selectedMatch.profile.display_name}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Matched {formatMatchTime(selectedMatch.matched_at)}
                  </p>
                </div>
              </div>

              {/* Profile Photo / Avatar */}
              <div className="h-[70vh] max-h-[500px] relative">
                <img
                  key={`match-${selectedMatch.profile.user_id}`}
                  src={getProfilePicturePath(selectedMatch.profile, { useRealPhoto: true })}
                  alt={selectedMatch.profile.display_name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    console.error('Failed to load image:', e.currentTarget.src);
                  }}
                />
              </div>

              {/* Profile Content */}
              <div className="p-6 space-y-6">
                {/* Name, Age, Location */}
                <div>
                  <h2 className="text-3xl font-bold text-foreground font-heading">
                    {selectedMatch.profile.display_name},{" "}
                    {selectedMatch.profile.age}
                  </h2>
                  {(selectedMatch.profile.location_city ||
                    selectedMatch.profile.location_region) && (
                    <p className="text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {selectedMatch.profile.location_city}
                      {selectedMatch.profile.location_region &&
                        `, ${selectedMatch.profile.location_region}`}
                    </p>
                  )}
                </div>

                {/* Tags */}
                {selectedMatch.profile.onboarding_tags &&
                  selectedMatch.profile.onboarding_tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedMatch.profile.onboarding_tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}


                {/* Talk Time Stats */}
                {(selectedMatch.total_call_duration_seconds ?? 0) > 0 && (
                  <div className="bg-secondary/50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Time Spent Talking
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          {formatDuration(selectedMatch.my_call_duration_seconds || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">You</p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          {formatDuration(selectedMatch.their_call_duration_seconds || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedMatch.profile.display_name.split(" ")[0]}
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
                          <Heart className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <p className="text-lg font-bold text-foreground">
                          {formatDuration(selectedMatch.total_call_duration_seconds || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Match Info */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      You matched on
                    </p>
                    <p className="font-medium text-foreground">
                      {new Date(selectedMatch.matched_at).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      if (selectedMatch.profile.cloned_agent_id) {
                        setSelectedMatch(null);
                        // Find this profile in the main list and start a call
                        const profileIndex = profiles.findIndex(
                          (p) => p.user_id === selectedMatch.profile.user_id
                        );
                        if (profileIndex !== -1) {
                          setCurrentIndex(profileIndex);
                          setTimeout(() => toggleCall(), 100);
                        } else {
                          toast.info("Talk to their agent from the feed!");
                        }
                      } else {
                        toast.error("Agent not available");
                      }
                    }}
                    className="flex-1 py-4 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Mic className="w-5 h-5" />
                    Talk
                  </button>
                  <button
                    onClick={() => {
                      if (selectedMatch) {
                        openChat(selectedMatch);
                      }
                    }}
                    className="flex-1 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Message
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {showChat && selectedMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background z-[60] flex flex-col"
          >
            {/* Chat Header */}
            <div className="bg-background/80 backdrop-blur-md px-4 py-4 flex items-center gap-4 border-b border-border/40">
              <button
                onClick={() => {
                  setShowChat(false);
                  setMessages([]);
                }}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                <img
                  key={`chat-${selectedMatch.profile.user_id}`}
                  src={getProfilePicturePath(selectedMatch.profile, { useRealPhoto: true })}
                  alt={selectedMatch.profile.display_name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    console.error('Failed to load image:', e.currentTarget.src);
                  }}
                />
              </div>
              <div className="flex-1">
                <h1 className="font-semibold text-foreground">
                  {selectedMatch.profile.display_name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Matched {formatMatchTime(selectedMatch.matched_at)}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Start the conversation
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Say hi to {selectedMatch.profile.display_name}! You matched
                    because you both liked each other.
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_id === currentUserId
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                          msg.sender_id === currentUserId
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-secondary text-foreground rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={`text-[10px] mt-1 ${
                            msg.sender_id === currentUserId
                              ? "text-primary-foreground/60"
                              : "text-muted-foreground"
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border/40 bg-background">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (selectedMatch.conversation_id && newMessage.trim()) {
                    sendMessage(selectedMatch.conversation_id, newMessage);
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-secondary rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !newMessage.trim()}
                  className="w-12 h-12 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-full flex items-center justify-center transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
