//Training Grounds: three short practice reviews that unlock in order.
//Matching is generous on purpose: it is practice, and Bit explains every finding either way.
export type Finding = { key: string; name: string; code: string; why: string; match: RegExp };
export type Level = {
  n: 1 | 2 | 3;
  title: string;
  tag: string;
  goal: string;
  context: string;
  notes: string;
  snippet: string;
  hints: string[];
  findings: Finding[];
};

export const LEVELS: Level[] = [
  {
    n: 1,
    title: "The Gatekeeper",
    tag: "Easy · 1 bug",
    goal: "Find one bug by checking the code against the brief.",
    context: "Returns 1 if a grade passes and 0 if it fails. A grade of 75 and up passes.",
    notes: "Short one! I just want to be sure the pass check is right.",
    snippet: `#include <stdio.h>

/* Returns 1 if the grade passes, 0 if not. */
int is_passing(int grade) {
    if (grade > 75) {
        return 1;
    }
    return 0;
}

int main(void) {
    printf("%d\\n", is_passing(80));
    return 0;
}`,
    hints: [
      "Read the brief first. It says exactly which grades should pass.",
      "Try the edge: what does is_passing(75) return?",
    ],
    findings: [
      {
        key: "edge",
        name: "Wrong boundary",
        code: "if (grade > 75)",
        why: "The brief says 75 and up passes, but > 75 makes a grade of exactly 75 fail. It should be grade >= 75. Edge values like this are where most bugs hide.",
        match: />=|or equal|boundary|edge|exactly 75|75 (itself|should|does(n't| not)|fails|is fail)|equal to 75|include 75/i,
      },
    ],
  },
  {
    n: 2,
    title: "The Messy Scroll",
    tag: "Medium · readability",
    goal: "This code works. Review how easy it is to read.",
    context: "Counts how many grades are passing (75 and up) and prints the count.",
    notes: "It gives the right answer. Is it readable enough for someone else to maintain?",
    snippet: `#include <stdio.h>
int f(int a[],int b){
int c=0;
for(int i=0;i<b;i++){
if(a[i]>=75)c++;}
return c;}

int main(void){
int x[]={80,60,75,90};
printf("%d\\n",f(x,4));
return 0;}`,
    hints: [
      "No bugs this time. Look at it like someone who has to edit it next month.",
      "What do f, a, b, c and x mean? Would you know without reading every line?",
      "Where is the indentation? Where does each block start and end?",
      "Why 75? Why 4? Numbers with no name are called magic numbers.",
    ],
    findings: [
      {
        key: "names",
        name: "Unclear names",
        code: "int f(int a[],int b)",
        why: "f, a, b, c and x say nothing about their job. count_passing(int grades[], int count) explains itself, so the reader does not have to work it out.",
        match: /\bnam(e|es|ing)\b|variable|descriptive|meaningful|rename|identifier|\bf\b|single.?letter|one.?letter/i,
      },
      {
        key: "format",
        name: "No indentation or spacing",
        code: "if(a[i]>=75)c++;}",
        why: "Everything sits at the left edge and the closing braces hide at the ends of lines, so you cannot see where the loop or the if ends. Indent each block and give braces their own lines.",
        match: /indent|spacing|spaces|whitespace|format|brace|cramped|squish|messy|hard to (read|follow)|one line|same line|tab/i,
      },
      {
        key: "magic",
        name: "Magic numbers",
        code: "a[i]>=75 ... f(x,4)",
        why: "75 is the passing grade and 4 is the array length, but neither has a name. A #define PASSING_GRADE 75 and sizeof x / sizeof x[0] make them clear and safe to change.",
        match: /magic|constant|#define|\bconst\b|hard.?cod|sizeof|named? (value|number)|literal/i,
      },
    ],
  },
  {
    n: 3,
    title: "The Average Trap",
    tag: "Hard · 3 bugs",
    goal: "Three bugs. Use the brief to find the last one.",
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
    hints: [
      "Three bugs are hiding here. Read the brief first: it tells you what the code should do.",
      "Check the loop. How many times does it run when n is 3?",
      "Look at the types in the division. What does int divided by int give you in C?",
      "The brief mentions an empty list. What happens when n is 0?",
    ],
    findings: [
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
    ],
  },
];

export const levelOf = (n: number) => LEVELS.find((l) => l.n === n);

//Best number of findings per level, stored on the user. A level opens once the one before it was submitted.
export type TrainingProgress = Partial<Record<"1" | "2" | "3", number>>;
export const isUnlocked = (p: TrainingProgress, n: number) => n === 1 || p[String(n - 1) as "1"] !== undefined;

export function findIn(level: Level, text: string) {
  return level.findings.filter((f) => f.match.test(text)).map((f) => f.key);
}
