export type Condition = "uniform" | "ats";
export type ConditionOrder = readonly Condition[];

const TRIALS_PER_CONDITION = 12;
export const TOTAL_EXPERIMENTAL_TRIALS = TRIALS_PER_CONDITION * 2;

const conditionSequence = (first: Condition, second: Condition): Condition[] => {
  const out: Condition[] = [];
  for (let i = 0; i < TRIALS_PER_CONDITION; i += 1) {
    out.push(i % 2 === 0 ? first : second);
  }
  return out;
};

const orderA = conditionSequence("uniform", "ats");
const orderB = conditionSequence("ats", "uniform");

export const CONDITION_ORDERS: readonly ConditionOrder[] = [orderA, orderB] as const;

export function assignConditionOrder(participantIndex: number): ConditionOrder {
  if (!Number.isInteger(participantIndex) || participantIndex < 0) {
    throw new Error(`participantIndex must be a non-negative integer, got ${participantIndex}`);
  }
  const orderIndex = participantIndex % CONDITION_ORDERS.length;
  return CONDITION_ORDERS[orderIndex]!;
}

export function conditionForTrial(participantIndex: number, trialIndex: number): Condition {
  if (trialIndex < 0 || trialIndex >= TOTAL_EXPERIMENTAL_TRIALS) {
    throw new Error(`trialIndex out of range [0, ${TOTAL_EXPERIMENTAL_TRIALS}): ${trialIndex}`);
  }
  const order = assignConditionOrder(participantIndex);
  return order[trialIndex]!;
}

export function conditionForTrialInBlock(
  participantIndex: number,
  block: "a" | "b",
  blockCursor: number,
): Condition {
  const trialIndex = block === "a" ? blockCursor : TRIALS_PER_CONDITION + blockCursor;
  return conditionForTrial(participantIndex, trialIndex);
}

export function balanceReport(): {
  uniformCount: number;
  atsCount: number;
  perOrder: { uniform: number; ats: number }[];
} {
  const perOrder = CONDITION_ORDERS.map((order) => {
    let uniform = 0;
    let ats = 0;
    for (const c of order) {
      if (c === "uniform") uniform += 1;
      else ats += 1;
    }
    return { uniform, ats };
  });
  const uniformCount = perOrder.reduce((acc, p) => acc + p.uniform, 0);
  const atsCount = perOrder.reduce((acc, p) => acc + p.ats, 0);
  return { uniformCount, atsCount, perOrder };
}
