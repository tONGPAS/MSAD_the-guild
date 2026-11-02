//The Training Grounds sample: a short C function with three planted bugs.
//Matching is generous on purpose: it is practice, and Pip explains each bug either way.
export const TRAINING = {
  title: "Average of grades",
  context: "Returns the average of the first n grades as a decimal. It should not crash when the list is empty.",
  notes: "First time writing a loop over an array in a function. Is my loop right?",
  snippet: `#include <stdio.h>

/* Returns the average of the first n grades. */
float average(int grades[], int n) {
    int sum = 0;
    for (int i = 0; i <= n; i++) {
        sum += grades[i];
    }
    return sum / n;
}

int main(void) {
    int grades[] = {90, 85, 77};
    printf("%.2f\\n", average(grades, 3));
    return 0;
}`,
};

export const BUGS = [
  {
    key: "bounds",
    name: "Off-by-one in the loop",
    code: "for (int i = 0; i <= n; i++)",
    why: "i <= n runs one step too many, so grades[n] reads past the end of the array. It should be i < n.",
    match: /<=|off[\s-]*by[\s-]*one|out\s*of\s*bound|bounds|past the end|overflow|one (extra|too many)|i\s*<\s*n\b|grades\[n\]|index/i,
  },
  {
    key: "intdiv",
    name: "Integer division",
    code: "return sum / n;",
    why: "sum and n are both int, so sum / n drops the decimals before it becomes a float. Cast first: (float)sum / n.",
    match: /integer division|int division|truncat|cast|\(float\)|\(double\)|decimal|rounds? down|whole number|float/i,
  },
  {
    key: "zero",
    name: "Division by zero",
    code: "return sum / n;",
    why: "The brief says an empty list must not crash, but when n is 0 the function divides by zero. Check n first.",
    match: /zero|n\s*==\s*0|n is 0|\bempty\b|divid\w* by 0|division by 0|n\s*<=?\s*0/i,
  },
] as const;
export type BugKey = (typeof BUGS)[number]["key"];

export function findBugs(text: string): BugKey[] {
  return BUGS.filter((b) => b.match.test(text)).map((b) => b.key);
}
