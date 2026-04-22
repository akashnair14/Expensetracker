import { GoogleGenerativeAI } from "@google/generative-ai"

const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

export const flashModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
export const proModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }) // Using flash as fallback/default if pro not needed for cost
