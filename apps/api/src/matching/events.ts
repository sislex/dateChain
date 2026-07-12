export const MATCH_CREATED = "match.created";

export interface MatchCreatedEvent {
  matchId: string;
  userAId: string;
  userBId: string;
}

export const SUPER_LIKE_SENT = "superlike.sent";

/** Emitted when a user super-likes another without an immediate match. */
export interface SuperLikeSentEvent {
  fromUserId: string;
  toUserId: string;
}
