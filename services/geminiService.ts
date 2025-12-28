import { GoogleGenAI } from "@google/genai";
import { Student, StudentResult, Subject } from "../types";

// Always use the process.env.API_KEY directly in the constructor
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStudentRemark = async (
  student: Student,
  result: StudentResult | undefined,
  subjects: Subject[],
  attendancePercentage: number
): Promise<string> => {
  // Check for API key availability directly from process.env
  if (!process.env.API_KEY) return "API Key missing. Cannot generate remark.";
  if (!result) return "No result data available.";

  // Prepare data for the prompt
  const marksSummary = subjects.map(sub => {
    const mark = result.marks[sub.id] || 0;
    return `${sub.name}: ${mark}/${sub.maxMarks}`;
  }).join(', ');

  const prompt = `
    Student Name: ${student.name}
    Class: ${student.className}
    Attendance: ${attendancePercentage.toFixed(1)}%
    Marks: ${marksSummary}

    Task: Write a professional, encouraging, and concise teacher's remark (max 2 sentences) for this student's annual report card. 
    Mention their academic performance and attendance if notable. 
    Do not use greetings. Write in third person (e.g., "${student.name} has shown...").
  `;

  try {
    // Calling generateContent with the model name and prompt directly
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Extracting text output via the .text property
    return response.text?.trim() || "Excellent progress this year.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Keep up the good work.";
  }
};