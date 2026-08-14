import { Vote, RoundResult } from "./types";

export interface TallyOutcome {
  tally: Record<string, number>; // playerId -> count ("skip" bucket for skip votes)
  topId: string | null; // "skip" is never a candidate for elimination
  isTie: boolean;
  isSkip: boolean; // true if nobody voted, or skip strictly won
}

export function tallyVotes(votes: Vote[]): TallyOutcome {
  const tally: Record<string, number> = {};

  for (const vote of votes) {
    const key = vote.targetId ?? "skip";
    tally[key] = (tally[key] ?? 0) + 1;
  }

  if (votes.length === 0) {
    return { tally, topId: null, isTie: false, isSkip: true };
  }

  let topCount = -1;
  let topKeys: string[] = [];
  for (const [key, count] of Object.entries(tally)) {
    if (count > topCount) {
      topCount = count;
      topKeys = [key];
    } else if (count === topCount) {
      topKeys.push(key);
    }
  }

  // Skip wins outright if it has the strict majority of the top bucket.
  if (topKeys.length === 1 && topKeys[0] === "skip") {
    return { tally, topId: null, isTie: false, isSkip: true };
  }

  // A tie between two or more player targets (or a tie involving skip and a
  // player) results in no elimination, per spec section 20.
  if (topKeys.length > 1) {
    return { tally, topId: null, isTie: true, isSkip: false };
  }

  return { tally, topId: topKeys[0], isTie: false, isSkip: false };
}

export function buildRoundResult(round: number, votes: Vote[]): RoundResult {
  const outcome = tallyVotes(votes);
  return {
    round,
    tally: outcome.tally,
    eliminatedId: outcome.isTie || outcome.isSkip ? null : outcome.topId,
    wasSkip: outcome.isSkip,
    wasTie: outcome.isTie,
  };
}
