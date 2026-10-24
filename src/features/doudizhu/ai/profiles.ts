/** Complete search limits; caller overrides can only reduce these ceilings. */
export const searchProfiles = Object.freeze({
  hard:Object.freeze({nodeBudget:400,timeBudgetMs:150,workBudget:20000,candidateLimit:4,sampleRounds:4,rolloutDepth:12,sliceMs:8}),
  expert:Object.freeze({nodeBudget:3200,timeBudgetMs:800,workBudget:80000,candidateLimit:8,sampleRounds:12,rolloutDepth:24,sliceMs:8}),
});
