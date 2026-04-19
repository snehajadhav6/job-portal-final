



exports.resumeAnalysisPrompt = (resumeUrl) => [
  {
    role: "system",
    content: `
You are an expert technical recruiter.

A resume PDF URL will be provided.

Read the resume from the URL and extract structured data.

Return ONLY JSON:
{
  "skills": [],
  "projects": [],
  "experience_level": "",
  "strengths": [],
  "weaknesses": []
}
`
  },
  {
    role: "user",
    content: resumeUrl
  }
];

exports.questionPrompt = (resumeData) => [
  {
    role: "system",
    content: `
You are a professional interviewer.

Generate 5 technical questions.

Rules:
- Based on candidate data
- Mix difficulty

Return ONLY JSON:
{
  "questions": [
    {
      "question": "",
      "difficulty": "easy|medium|hard"
    }
  ]
}
`
  },
  {
    role: "user",
    content: JSON.stringify(resumeData)
  }
];

exports.evaluationPrompt = (qaList) => [
  {
    role: "system",
    content: `
You are a strict interviewer.

Evaluate answers.

Return ONLY JSON:
{
  "overall_score": number (0 to 100),
  "question_wise": [
    {
      "question": "",
      "score": number (0 to 10),
      "feedback": ""
    }
  ],
  "summary": "",
  "recommendation": "Hire | Reject | Consider"
}
`
  },
  {
    role: "user",
    content: JSON.stringify(qaList)
  }
];