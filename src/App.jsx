import React, { useState } from 'react';
import { Sparkles, HelpCircle, AlertTriangle, Loader, CheckCircle, XCircle } from 'lucide-react';

// Main App Component
export default function App() {
  // State variables to manage the application
  const [myth, setMyth] = useState(''); // Stores the user's input
  const [analysis, setAnalysis] = useState(null); // Stores the AI's structured response
  const [isLoading, setIsLoading] = useState(false); // Tracks loading state
  const [error, setError] = useState(null); // Stores any error messages
  const [isInitialState, setIsInitialState] = useState(true); // Tracks if it's the first load

  // --- API Call Function ---
  const handleDebunk = async () => {
    if (!myth.trim()) {
      setError('Please enter a health myth to debunk.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setIsInitialState(false);

    try {
      // Construct the prompt for the AI to return a JSON object
      const prompt = `
        You are an expert in medical science and health communication. 
        Your task is to analyze the following health myth and respond ONLY with a valid JSON object.
        The JSON object must have two keys: "verdict" and "explanation".
        - The "verdict" can be one of three strings: "Fact", "Myth", or "Partially True".
        - The "explanation" should be a clear, concise, and evidence-based analysis for a general audience.

        Example Response Format:
        {
          "verdict": "Myth",
          "explanation": "This is a common misconception. The body uses all parts of the brain, just at different times. Brain scans clearly show activity throughout the entire brain, even during rest."
        }

        Health Myth to Analyze: "${myth}"
      `;
      
      let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
      const payload = { contents: chatHistory };
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!apiResponse.ok) {
        throw new Error(`API error: ${apiResponse.status} ${apiResponse.statusText}`);
      }

      const result = await apiResponse.json();
      
      if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        const rawText = result.candidates[0].content.parts[0].text;
        // Clean the response to ensure it's valid JSON
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          const parsedAnalysis = JSON.parse(cleanedText);
          setAnalysis(parsedAnalysis);
        } catch (parseError) {
          throw new Error("Failed to parse the AI's response as JSON.");
        }
      } else {
        throw new Error("Invalid response structure from API.");
      }

    } catch (err) {
      console.error("Error debunking myth:", err);
      setError("Sorry, something went wrong while debunking the myth. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Helper function for styling verdicts ---
  const getVerdictStyles = (verdict) => {
    switch (verdict) {
      case 'Fact':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-600" />,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-300',
        };
      case 'Myth':
        return {
          icon: <XCircle className="w-8 h-8 text-red-600" />,
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-300',
        };
      case 'Partially True':
      default:
        return {
          icon: <AlertTriangle className="w-8 h-8 text-yellow-600" />,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-300',
        };
    }
  };
  
  // --- Render Function ---
  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-800 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-3xl mx-auto">
        
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-full p-3 mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">Health Myth Debunker</h1>
          <p className="text-lg text-slate-600 mt-2">Cutting through the noise with science-backed facts.</p>
        </header>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <input
              type="text"
              value={myth}
              onChange={(e) => setMyth(e.target.value)}
              placeholder="e.g., 'You only use 10% of your brain.'"
              className="flex-grow w-full px-4 py-3 text-lg bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none transition"
              onKeyPress={(e) => e.key === 'Enter' && handleDebunk()}
            />
            <button
              onClick={handleDebunk}
              disabled={isLoading}
              className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-emerald-500 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 ease-in-out disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {isLoading ? <><Loader className="animate-spin mr-2 h-5 w-5" />Debunking...</> : <><HelpCircle className="mr-2 h-5 w-5" />Debunk Myth</>}
            </button>
          </div>
        </div>

        <div className="mt-8">
          {isInitialState && (
            <div className="text-center p-8 bg-white rounded-2xl shadow-md border border-slate-200">
              <HelpCircle className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-4 text-xl font-semibold text-slate-700">Ready to bust some myths?</h3>
              <p className="mt-1 text-slate-500">Enter a health claim in the box above to get started.</p>
            </div>
          )}
          
          {isLoading && <div className="flex justify-center items-center p-10"><Loader className="w-12 h-12 text-emerald-500 animate-spin" /></div>}

          {error && <div className="flex items-center gap-4 p-4 bg-red-100 text-red-700 rounded-lg shadow"><AlertTriangle className="h-6 w-6" /><p>{error}</p></div>}

          {analysis && !isLoading && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 animate-fade-in">
              <div className={`flex items-center gap-4 p-4 rounded-lg mb-6 border ${getVerdictStyles(analysis.verdict).borderColor} ${getVerdictStyles(analysis.verdict).bgColor}`}>
                {getVerdictStyles(analysis.verdict).icon}
                <h2 className={`text-2xl font-bold ${getVerdictStyles(analysis.verdict).textColor}`}>{analysis.verdict}</h2>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Explanation</h3>
              <div className="prose prose-lg max-w-none text-slate-700">
                <p>{analysis.explanation}</p>
              </div>
            </div>
          )}
        </div>
        
        <footer className="text-center mt-12 text-sm text-slate-500">
            <p>Disclaimer: This tool provides information based on AI and should not be considered medical advice. Always consult a healthcare professional.</p>
            <p className="mt-1">Powered by Google Gemini</p>
        </footer>
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}
