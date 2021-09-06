export function getAngleDifference(angle1: float, angle2: float): float {
  const subtractedAngle = angle1 - angle2;
  return ((subtractedAngle + 180) % 360) - 180;
}

export function isEven(num: int): boolean {
  return (num & 1) === 0;
}

export function isOdd(num: int): boolean {
  return (num & 1) === 1;
}

/**
 * Rounds
 * From: http://lua-users.org/wiki/SimpleRound
 */

/**
 * If rounding fails, this function returns 0.
 *
 * @param num The number to round.
 * @param numDecimalPlaces Default is 0.
 */
export function round(num: float, numDecimalPlaces = 0): float {
  const roundedNum = tonumber(string.format(`%.${numDecimalPlaces}f`, num));
  return roundedNum === undefined ? 0 : roundedNum;
}

export function tanh(x: number): number {
  return (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x));
}

/**
 * @returns 1 if n is positive, -1 if n is negative, or 0 if n is 0.
 */
export function sign(n: number): int {
  if (n > 0) {
    return 1;
  }

  if (n < 0) {
    return -1;
  }

  return 0;
}
