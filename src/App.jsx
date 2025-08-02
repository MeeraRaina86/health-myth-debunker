import React, { useState } from 'react';
import { Sparkles, HelpCircle, AlertTriangle, Loader, CheckCircle, XCircle, FileText, Link, Type } from 'lucide-react';

// NOTE: To parse files, you need to install helper libraries.
// Run these commands in your terminal:
// npm install mammoth
// npm install pdfjs-dist

// Main App Component
export default function App() {
  const [inputType, setInputType] = useState('text'); // 'text', 'url', or 'file'
  const [myth, setMyth] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialState, setIsInitialState] = useState(true);

  // --- File Handling ---
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError(null); // Clear previous errors
  };
  
  // Helper function to load a script dynamically from a CDN
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Script load error for ${src}`));
      document.head.appendChild(script);
    });
  };

  // --- Main Debunking Logic ---
  const handleDebunk = async () => {
    let contentToAnalyze = '';
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setIsInitialState(false);

    try {
        // 1. Get content based on input type
        if (inputType === 'text') {
            if (!myth.trim()) throw new Error('Please enter a health myth to debunk.');
            contentToAnalyze = myth;
        } else if (inputType === 'file') {
            if (!file) throw new Error('Please select a file to analyze.');
            
            if (file.type === "application/pdf") {
                // Load pdf.js from CDN if not already present
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
                
                const pdfjsLib = window.pdfjsLib;
                // Set worker source from CDN as well
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
                
                const reader = new FileReader();
                const text = await new Promise((resolve, reject) => {
                    reader.onload = async (event) => {
                        try {
                            const pdf = await pdfjsLib.getDocument(new Uint8Array(event.target.result)).promise;
                            let fullText = '';
                            for (let i = 1; i <= pdf.numPages; i++) {
                                const page = await pdf.getPage(i);
                                const textContent = await page.getTextContent();
                                fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                            }
                            resolve(fullText);
                        } catch (e) {
                            reject(e);
                        }
                    };
                    reader.readAsArrayBuffer(file);
                });
                contentToAnalyze = text;

            } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                // Load mammoth.js from CDN if not already present
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');

                const mammoth = window.mammoth;
                const reader = new FileReader();
                const { value } = await new Promise((resolve, reject) => {
                     reader.onload = (event) => {
                        mammoth.extractRawText({ arrayBuffer: event.target.result })
                            .then(resolve)
                            .catch(reject);
                    };
                    reader.readAsArrayBuffer(file);
                });
                contentToAnalyze = value;
            } else {
                throw new Error('Unsupported file type. Please use PDF or DOCX.');
            }
        } else if (inputType === 'url') {
            if (!url.trim()) throw new Error('Please enter a URL to analyze.');
            // Use a CORS proxy to fetch URL content from the client-side
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error('Could not fetch the URL content. The site may be down or blocking requests.');
            }
            const htmlContent = await response.text();
            contentToAnalyze = htmlContent;
        }

        if (!contentToAnalyze.trim()) {
            throw new Error("Could not extract any text to analyze.");
        }

        // 2. Call Gemini API with the extracted content
        let prompt;
        if (inputType === 'url') {
            prompt = `
                You are an expert in medical science. Analyze the main textual content from the following HTML and respond ONLY with a valid JSON object.
                Ignore navigation, ads, and footers. Focus on the main article.
                The JSON object must have "verdict" ("Fact", "Myth", "Partially True") and "explanation" keys.
                HTML Content to Analyze: "${contentToAnalyze.substring(0, 8000)}"
            `;
        } else {
            prompt = `
                You are an expert in medical science. Analyze the following content and respond ONLY with a valid JSON object.
                The JSON object must have "verdict" ("Fact", "Myth", "Partially True") and "explanation" keys.
                Content to Analyze: "${contentToAnalyze.substring(0, 8000)}"
            `;
        }
        
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
        const apiKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const apiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) throw new Error(`API error: ${apiResponse.status}`);

        const result = await apiResponse.json();
        const rawText = result.candidates[0].content.parts[0].text;
        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedAnalysis = JSON.parse(cleanedText);
        setAnalysis(parsedAnalysis);

    } catch (err) {
        console.error("Error debunking myth:", err);
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const getVerdictStyles = (verdict) => {
    switch (verdict) {
      case 'Fact': return { icon: <CheckCircle className="w-8 h-8 text-green-600" />, bgColor: 'bg-green-100', textColor: 'text-green-800', borderColor: 'border-green-300' };
      case 'Myth': return { icon: <XCircle className="w-8 h-8 text-red-600" />, bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-red-300' };
      default: return { icon: <AlertTriangle className="w-8 h-8 text-yellow-600" />, bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', borderColor: 'border-yellow-300' };
    }
  };
  
  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-800 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-3xl mx-auto">
        
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-full p-3 mb-4"><Sparkles className="w-8 h-8" /></div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900">Health Myth Debunker</h1>
          <p className="text-lg text-slate-600 mt-2">Verify health claims with science-backed facts.</p>
        </header>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
            {/* Input Type Tabs */}
            <div className="flex border-b mb-4">
                <TabButton icon={<Type/>} label="Text" active={inputType === 'text'} onClick={() => setInputType('text')} />
                <TabButton icon={<Link/>} label="URL" active={inputType === 'url'} onClick={() => setInputType('url')} />
                <TabButton icon={<FileText/>} label="File" active={inputType === 'file'} onClick={() => setInputType('file')} />
            </div>

            {/* Input Fields */}
            <div className="min-h-[100px]">
                {inputType === 'text' && (
                    <textarea value={myth} onChange={(e) => setMyth(e.target.value)} placeholder="Enter a health claim here, e.g., 'You must drink 8 glasses of water a day.'" className="w-full p-3 text-lg bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none transition" rows="3"/>
                )}
                {inputType === 'url' && (
                    <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste the full URL here (e.g., https://example.com/health-article)" className="w-full px-4 py-3 text-lg bg-slate-100 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none transition" />
                )}
                {inputType === 'file' && (
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FileText className="w-10 h-10 mb-3 text-slate-400" />
                                <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-slate-500">PDF or DOCX</p>
                                {fileName && <p className="text-xs text-emerald-600 mt-2">{fileName}</p>}
                            </div>
                            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx" />
                        </label>
                    </div> 
                )}
            </div>

            <button onClick={handleDebunk} disabled={isLoading} className="mt-4 w-full flex items-center justify-center px-6 py-3 bg-emerald-500 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-200 ease-in-out disabled:bg-slate-400 disabled:cursor-not-allowed">
              {isLoading ? <><Loader className="animate-spin mr-2 h-5 w-5" />Analyzing...</> : <><HelpCircle className="mr-2 h-5 w-5" />Debunk Claim</>}
            </button>
        </div>

        <div className="mt-8">
          {isInitialState && <div className="text-center p-8 bg-white rounded-2xl shadow-md border border-slate-200"><HelpCircle className="mx-auto h-12 w-12 text-slate-400" /><h3 className="mt-4 text-xl font-semibold text-slate-700">Ready to bust some myths?</h3><p className="mt-1 text-slate-500">Choose an option above to get started.</p></div>}
          {isLoading && <div className="flex justify-center items-center p-10"><Loader className="w-12 h-12 text-emerald-500 animate-spin" /></div>}
          {error && <div className="flex items-center gap-4 p-4 bg-red-100 text-red-700 rounded-lg shadow"><AlertTriangle className="h-6 w-6" /><p>{error}</p></div>}
          {analysis && !isLoading && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 animate-fade-in">
              <div className={`flex items-center gap-4 p-4 rounded-lg mb-6 border ${getVerdictStyles(analysis.verdict).borderColor} ${getVerdictStyles(analysis.verdict).bgColor}`}>
                {getVerdictStyles(analysis.verdict).icon}
                <h2 className={`text-2xl font-bold ${getVerdictStyles(analysis.verdict).textColor}`}>{analysis.verdict}</h2>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Explanation</h3>
              <div className="prose prose-lg max-w-none text-slate-700"><p>{analysis.explanation}</p></div>
            </div>
          )}
        </div>
        
        <footer className="text-center mt-12 text-sm text-slate-500">
            <p>Disclaimer: This tool provides information based on AI and should not be considered medical advice.</p>
            <p className="mt-1">Powered by Google Gemini</p>
        </footer>
      </div>
      <style>{`@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }`}</style>
    </div>
  );
}

// Helper component for tabs
const TabButton = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
        {icon}
        {label}
    </button>
);
