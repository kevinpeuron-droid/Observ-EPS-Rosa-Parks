import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export function Import() {
  const { bulkImportClasses } = useStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  
  const [lastNameCol, setLastNameCol] = useState<string>('');
  const [firstNameCol, setFirstNameCol] = useState<string>('');
  const [classCol, setClassCol] = useState<string>('');
  const [defaultClassName, setDefaultClassName] = useState<string>('');
  
  const [imported, setImported] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setColumns(results.meta.fields || []);
        setData(results.data);
        
        // Auto-detect common column names
        const fields = results.meta.fields || [];
        const findCol = (keywords: string[]) => fields.find(f => keywords.some(k => f.toLowerCase().includes(k))) || '';
        
        setLastNameCol(findCol(['nom']));
        setFirstNameCol(findCol(['prenom', 'prénom']));
        setClassCol(findCol(['classe', 'groupe']));
      }
    });
  };

  const handleImport = () => {
    if (!lastNameCol) return;
    
    const studentsByClass: Record<string, { name: string }[]> = {};
    
    data.forEach(row => {
      let nom = row[lastNameCol] || '';
      let prenom = firstNameCol ? row[firstNameCol] || '' : '';
      let fullName = prenom ? `${nom} ${prenom}`.trim() : nom;
      
      let className = classCol ? row[classCol] || defaultClassName : defaultClassName;
      if (!className) className = 'Classe Importée';
      
      if (fullName) {
        if (!studentsByClass[className]) {
          studentsByClass[className] = [];
        }
        studentsByClass[className].push({ name: fullName });
      }
    });
    
    const importData = Object.entries(studentsByClass).map(([className, students]) => ({
      className,
      students
    }));
    
    bulkImportClasses(importData);
    setImported(true);
  };

  if (imported) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 animate-in zoom-in duration-300">
        <CheckCircle2 className="w-24 h-24 text-emerald-500" />
        <h1 className="text-3xl font-bold text-slate-900">Importation réussie !</h1>
        <p className="text-slate-500">Les classes et les élèves ont été ajoutés à votre espace.</p>
        <Button onClick={() => navigate('/')} size="lg">
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 ease-out max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8 text-blue-600" />
          Importer des classes
        </h1>
        <p className="text-slate-500 mt-1">Importez vos listes d'élèves depuis un fichier CSV ou Excel (sauvegardé en CSV).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Sélectionner un fichier</CardTitle>
          <CardDescription>Format accepté : .csv</CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'}`}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            {file ? (
              <div className="flex flex-col items-center text-emerald-700">
                <FileSpreadsheet className="w-12 h-12 mb-4" />
                <span className="font-semibold text-lg">{file.name}</span>
                <span className="text-sm mt-1">{data.length} lignes détectées</span>
                <Button variant="outline" size="sm" className="mt-4" onClick={(e) => { e.stopPropagation(); setFile(null); setColumns([]); setData([]); }}>
                  Changer de fichier
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-500">
                <Upload className="w-12 h-12 mb-4 text-slate-400" />
                <span className="font-semibold">Cliquez pour parcourir</span>
                <span className="text-sm mt-1">ou glissez-déposez votre fichier ici</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {file && columns.length > 0 && (
        <Card className="animate-in slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle>2. Association des colonnes (Mapping)</CardTitle>
            <CardDescription>Indiquez à quoi correspondent les colonnes de votre fichier.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={lastNameCol}
                  onChange={e => setLastNameCol(e.target.value)}
                >
                  <option value="">-- Ignorer / Non présent --</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Prénom (Optionnel)</label>
                <select 
                  className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={firstNameCol}
                  onChange={e => setFirstNameCol(e.target.value)}
                >
                  <option value="">-- Ignorer / Non présent --</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Classe (Optionnel)</label>
                <select 
                  className="w-full flex h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  value={classCol}
                  onChange={e => setClassCol(e.target.value)}
                >
                  <option value="">-- Toutes dans une même classe --</option>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {!classCol && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-4 items-start">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="w-full">
                  <p className="text-sm text-amber-800 font-medium mb-2">
                    Aucune colonne "Classe" sélectionnée. Dans quelle classe voulez-vous importer ces élèves ?
                  </p>
                  <Input 
                    placeholder="Ex: 5ème C" 
                    value={defaultClassName}
                    onChange={e => setDefaultClassName(e.target.value)}
                    className="max-w-xs bg-white"
                  />
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <Button 
                size="lg" 
                onClick={handleImport} 
                disabled={!lastNameCol || (!classCol && !defaultClassName.trim())}
                className="gap-2"
              >
                Lancer l'importation
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
