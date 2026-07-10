export const MATCH_CREATED = "match.created";

export interface MatchCreatedEvent {
  matchId: string;
  userAId: string;
  userBId: string;
}
