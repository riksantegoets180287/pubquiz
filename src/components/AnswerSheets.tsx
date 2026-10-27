import React, { useState } from 'react';
import { Quiz, Round, Question } from '../types/quiz.ts';
import {
  Printer,
  Download,
  FileText,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import jsPDF from 'jspdf';

interface AnswerSheetsProps {
  quiz: Quiz;
  onBackToEditor: () => void;
}

type SheetType = 'participants' | 'markers' | 'presenter';

export const AnswerSheets: React.FC<AnswerSheetsProps> = ({
  quiz,
  onBackToEditor,
}) => {
  const [sheetType, setSheetType] = useState<SheetType>('participants');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const roundsToRender =
    selectedRoundId === 'all'
      ? quiz.rounds
      : quiz.rounds.filter((r) => r.id === selectedRoundId);

  // Generate genuine downloadable A4 PDF using jsPDF
  const generatePdf = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 16;
      let y = margin;

      const titleMap = {
        participants: 'DEELNEMERSBLAD',
        markers: 'NAKIJKBLAD MET SCOREVAKJES',
        presenter: 'ANTWOORDENBLAD VOOR PRESENTATOR',
      };

      const printHeader = (roundTitle?: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text(quiz.title, margin, y);
        y += 6;

        doc.setFontSize(11);
        doc.setTextColor(79, 70, 229);
        doc.text(titleMap[sheetType], margin, y);
        y += 7;

        // Team and table info box for participants/markers
        if (sheetType !== 'presenter') {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);

          doc.rect(margin, y, pageWidth - 2 * margin, 12);
          doc.text('Teamnaam: _____________________________________', margin + 3, y + 8);
          doc.text('Tafel: ________', pageWidth - margin - 35, y + 8);
          y += 18;
        } else {
          doc.setDrawColor(203, 213, 225);
          doc.line(margin, y, pageWidth - margin, y);
          y += 6;
        }

        if (roundTitle) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.text(roundTitle, margin, y);
          y += 6;
        }
      };

      printHeader();

      roundsToRender.forEach((round, rIndex) => {
        // If not first round and low remaining space, add page
        if (y > pageHeight - 50) {
          doc.addPage();
          y = margin;
          printHeader(`Ronde ${round.roundNumber}: ${round.title}`);
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(15, 23, 42);
          doc.text(`Ronde ${round.roundNumber}: ${round.title}${round.theme ? ` (${round.theme})` : ''}`, margin, y);
          y += 7;
        }

        const questions = round.questions || [];
        if (questions.length === 0) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9);
          doc.setTextColor(148, 163, 184);
          doc.text('Geen vragen in deze ronde.', margin, y);
          y += 8;
        } else {
          questions.forEach((q, qIndex) => {
            // Check page boundary
            if (y > pageHeight - 25) {
              doc.addPage();
              y = margin;
              printHeader(`Ronde ${round.roundNumber}: ${round.title} (vervolg)`);
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(51, 65, 85);

            const qNum = `${qIndex + 1}.`;
            doc.text(qNum, margin, y);

            if (sheetType === 'presenter') {
              // Presenter sheet: Question text and correct answer
              doc.setFont('helvetica', 'normal');
              const qTextLines = doc.splitTextToSize(q.questionText, pageWidth - 2 * margin - 15);
              doc.text(qTextLines, margin + 7, y);
              y += qTextLines.length * 4.5 + 1;

              doc.setFont('helvetica', 'bold');
              doc.setTextColor(16, 149, 93);
              const ansText = `Antwoord: ${q.correctAnswer}  (${q.points || 1} pt)`;
              doc.text(ansText, margin + 7, y);
              y += 7;
            } else if (sheetType === 'markers') {
              // Marker sheet: Question line, dotted answer blank, and score box
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(100, 116, 139);

              const answerLineWidth = pageWidth - 2 * margin - 35;
              doc.setDrawColor(203, 213, 225);
              doc.setLineDashPattern([1, 2], 0);
              doc.line(margin + 7, y, margin + 7 + answerLineWidth, y);
              doc.setLineDashPattern([], 0); // reset

              // Small score box for the marker
              doc.rect(pageWidth - margin - 22, y - 5, 22, 7);
              doc.setFontSize(8);
              doc.text('Score: [    ]', pageWidth - margin - 20, y);
              y += 9;
            } else {
              // Participants sheet: Question number + clean dotted line for answer
              doc.setDrawColor(203, 213, 225);
              doc.setLineDashPattern([1, 2], 0);
              doc.line(margin + 7, y, pageWidth - margin, y);
              doc.setLineDashPattern([], 0);
              y += 9;
            }
          });
        }
        y += 4;
      });

      // Save PDF file
      const sanitizedTitle = quiz.title.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`${sanitizedTitle}_${sheetType}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Er is een fout opgetreden bij het genereren van de PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Configuration Header (Hidden during print) */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Antwoordbladen Genereren & Printen
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Genereer automatisch printklare formulieren voor deelnemers, nakijkers en de presentator.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Direct Printen</span>
            </button>

            <button
              onClick={generatePdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'PDF Genereren...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* Sheet Type & Scope Controls */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Segmented Tab Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-xl">
            <button
              onClick={() => setSheetType('participants')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                sheetType === 'participants'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              1. Deelnemersblad
            </button>

            <button
              onClick={() => setSheetType('markers')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                sheetType === 'markers'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              2. Nakijkblad (Puntenvakjes)
            </button>

            <button
              onClick={() => setSheetType('presenter')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                sheetType === 'presenter'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              3. Antwoordenblad Presentator
            </button>
          </div>

          {/* Round Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">Rondes:</label>
            <select
              value={selectedRoundId}
              onChange={(e) =>
                setSelectedRoundId(
                  e.target.value === 'all' ? 'all' : e.target.value
                )
              }
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            >
              <option value="all">Alle {quiz.rounds.length} rondes</option>
              {quiz.rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  Alleen Ronde {r.roundNumber}: {r.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Security / Privacy notice */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {sheetType === 'presenter'
              ? 'Bevat de juiste antwoorden. Alleen voor de presentator en jury.'
              : 'Veilig: De juiste antwoorden worden nooit getoond op het deelnemers- of nakijkblad.'}
          </span>
        </div>
      </div>

      {/* A4 Printable Sheet Preview */}
      <div className="printable-sheet bg-white text-slate-900 border border-slate-300 shadow-md rounded-xl max-w-[210mm] min-h-[297mm] mx-auto p-8 sm:p-12 mb-12">
        {/* Sheet Top Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {quiz.title}
              </h2>
              <p className="text-xs font-semibold tracking-wider uppercase text-indigo-700 mt-0.5">
                {sheetType === 'participants' && 'DEELNEMERSBLAD'}
                {sheetType === 'markers' && 'NAKIJKBLAD MET SCOREVAKJES'}
                {sheetType === 'presenter' && 'OFFICIEEL ANTWOORDENBLAD (PRESENTATOR)'}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              Datum: {new Date().toLocaleDateString('nl-NL')}
            </div>
          </div>

          {/* Write-in Team Details Bar for participants and markers */}
          {sheetType !== 'presenter' && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-300 rounded-lg flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">
                Teamnaam: <span className="inline-block border-b border-slate-400 w-48 sm:w-64 ml-1"></span>
              </span>
              <span className="font-medium text-slate-700">
                Tafel / Nummer: <span className="inline-block border-b border-slate-400 w-16 ml-1"></span>
              </span>
            </div>
          )}
        </div>

        {/* Rounds and Questions */}
        {roundsToRender.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Geen rondes gevonden in deze quiz.
          </div>
        ) : (
          <div className="space-y-8">
            {roundsToRender.map((round) => (
              <div key={round.id} className="break-inside-avoid">
                {/* Round Title Header */}
                <div className="bg-slate-100 px-3 py-2 border-l-4 border-indigo-600 rounded-r mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Ronde {round.roundNumber}: {round.title}
                    {round.theme && <span className="font-normal text-slate-600"> ({round.theme})</span>}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {round.questions?.length || 0} vragen
                  </span>
                </div>

                {/* Questions List */}
                {(!round.questions || round.questions.length === 0) ? (
                  <p className="text-xs text-slate-400 italic pl-3">
                    Geen vragen in deze ronde.
                  </p>
                ) : (
                  <div className="space-y-3.5 pl-1">
                    {round.questions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="flex items-start justify-between gap-4 py-1"
                      >
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span className="font-bold text-xs text-slate-800 w-6 shrink-0 mt-0.5">
                            {idx + 1}.
                          </span>

                          <div className="flex-1 min-w-0">
                            {/* Question text is visible on Presenter sheet and Participant sheet */}
                            <p className="text-xs text-slate-800 leading-snug">
                              {q.questionText}
                            </p>

                            {/* Presenter Sheet: Show Correct Answer */}
                            {sheetType === 'presenter' ? (
                              <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                                <span>Antwoord: {q.correctAnswer}</span>
                                <span className="text-slate-400">({q.points || 1} pt)</span>
                              </div>
                            ) : (
                              /* Participant and Marker Sheets: Clean write-in lines */
                              <div className="mt-2 border-b border-dotted border-slate-400 w-full h-3"></div>
                            )}
                          </div>
                        </div>

                        {/* Nakijkblad: Marker score box */}
                        {sheetType === 'markers' && (
                          <div className="w-20 shrink-0 border border-slate-400 rounded p-1 text-center bg-slate-50/50">
                            <span className="text-[10px] text-slate-500 block">Punten</span>
                            <span className="text-xs font-mono font-bold text-slate-700">
                              / {q.points || 1}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-400">
          <span>Gegenereerd met PubQuiz Master Pro</span>
          <span>Pagina 1 van 1</span>
        </div>
      </div>
    </div>
  );
};
