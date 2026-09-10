import React, { useState } from 'react';
import { useStore } from '../store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Users, Plus, ChevronRight, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  const { classes, addClass } = useStore();
  const [newClassName, setNewClassName] = useState('');

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    addClass({ name: newClassName.trim(), students: [] });
    setNewClassName('');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mes Classes</h1>
          <p className="text-slate-500 mt-1">Gérez vos classes et accédez aux activités sportives.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-dashed bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-center min-h-[200px]">
          <CardContent className="pt-6">
            <form onSubmit={handleAddClass} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 text-center items-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-slate-900">Nouvelle classe</h3>
                <p className="text-sm text-slate-500 mb-2">Créez un nouveau groupe pour commencer.</p>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Ex: 4ème B" 
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                />
                <Button type="submit" disabled={!newClassName.trim()}>Créer</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {classes.map(cls => (
          <Link key={cls.id} to={`/class/${cls.id}`} className="block group">
            <Card className="h-full transition-all duration-200 group-hover:shadow-md group-hover:border-blue-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Users className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <CardTitle className="mt-4 text-xl group-hover:text-blue-600 transition-colors">{cls.name}</CardTitle>
                <CardDescription>{cls.students.length} élèves</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Activity className="w-4 h-4" />
                  <span>Gérer les cycles et évaluations</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
