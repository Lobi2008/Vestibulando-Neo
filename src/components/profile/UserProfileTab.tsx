/**
 * @file src/components/profile/UserProfileTab.tsx
 * @description Painel de perfil do estudante com exibição em texto plano,
 * edição inline acionada por ícone de lápis e sem o botão fixo de salvar.
 */

import React, { useState } from 'react';
import { 
  User, 
  Target, 
  Flame, 
  Award, 
  Pencil, 
  Check, 
  X, 
  BookOpen, 
  Sparkles,
  TrendingUp
} from 'lucide-react';
import type { UserProfile, ExamType } from '../../types/index.ts';

interface UserProfileTabProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

export const UserProfileTab: React.FC<UserProfileTabProps> = ({
  profile,
  onUpdateProfile,
}) => {
  // Controle de qual campo está sendo editado inline ('name' | 'targetExam' | 'targetCourse' | 'dailyGoal' | null)
  const [editingField, setEditingField] = useState<string | null>(null);

  // Valores temporários durante a edição
  const [tempName, setTempName] = useState<string>(profile.name);
  const [tempExam, setTempExam] = useState<ExamType>(profile.targetExam);
  const [tempCourse, setTempCourse] = useState<string>(profile.targetCourse);
  const [tempGoal, setTempGoal] = useState<number>(profile.dailyGoalQuestions);

  const startEditing = (field: string) => {
    setEditingField(field);
    setTempName(profile.name);
    setTempExam(profile.targetExam);
    setTempCourse(profile.targetCourse);
    setTempGoal(profile.dailyGoalQuestions);
  };

  const cancelEditing = () => {
    setEditingField(null);
  };

  const saveField = (field: string) => {
    if (field === 'name') {
      if (tempName.trim()) {
        onUpdateProfile({ name: tempName.trim() });
      }
    } else if (field === 'targetExam') {
      onUpdateProfile({ targetExam: tempExam });
    } else if (field === 'targetCourse') {
      onUpdateProfile({ targetCourse: tempCourse.trim() });
    } else if (field === 'dailyGoal') {
      onUpdateProfile({ dailyGoalQuestions: tempGoal });
    }
    setEditingField(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cabeçalho do Perfil */}
      <div className="bg-white dark:bg-[#18181B] neo-border neo-shadow p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-black dark:text-white flex items-center gap-2">
            <User className="w-6 h-6 text-[#FF3366]" />
            Meu perfil
          </h2>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-1">
            Clique no lápis para editar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-[#FFE600] text-black px-3 py-1.5 neo-border-sm font-black text-xs flex items-center gap-1.5">
            <Award className="w-4 h-4 text-black" />
            <span>NÍVEL {profile.level}</span>
          </div>
          <div className="bg-[#FF5A36] text-white px-3 py-1.5 neo-border-sm font-black text-xs flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            <span>{profile.currentStreak} DIAS</span>
          </div>
        </div>
      </div>

      {/* Cartão de Informações em Texto Plano com Edição Inline */}
      <div className="bg-white dark:bg-[#18181B] neo-border neo-shadow p-6 space-y-6">
        <h3 className="text-base font-black uppercase tracking-wider text-black dark:text-white border-b-2 border-black dark:border-gray-700 pb-2">
          Seus dados
        </h3>

        {/* 1. Nome ou Apelido */}
        <div className="p-4 bg-[#F8F5EE] dark:bg-[#202024] neo-border-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="block text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Nome
            </span>
            {editingField === 'name' ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="px-3 py-1 text-sm font-black neo-border-sm bg-white dark:bg-[#27272A] text-black dark:text-white focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveField('name');
                    if (e.key === 'Escape') cancelEditing();
                  }}
                />
                <button
                  type="button"
                  onClick={() => saveField('name')}
                  className="p-1.5 bg-[#00E599] text-black neo-border-sm hover:scale-105"
                  title="Confirmar"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="p-1.5 bg-gray-200 dark:bg-gray-700 text-black dark:text-white neo-border-sm hover:scale-105"
                  title="Cancelar"
                >
                  <X className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            ) : (
              <span className="text-base md:text-lg font-black text-black dark:text-white">
                {profile.name || 'Estudante'}
              </span>
            )}
          </div>

          {editingField !== 'name' && (
            <button
              type="button"
              onClick={() => startEditing('name')}
              className="p-2 neo-border-sm bg-white dark:bg-[#27272A] hover:bg-[#FFE600] dark:hover:bg-[#FFE600] dark:hover:text-black transition-colors self-start sm:self-auto"
              title="Editar nome"
            >
              <Pencil className="w-4 h-4 text-black dark:text-gray-200 hover:text-black" />
            </button>
          )}
        </div>

        {/* Grade: Vestibular Alvo e Curso */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 2. Vestibular Alvo */}
          <div className="p-4 bg-[#F8F5EE] dark:bg-[#202024] neo-border-sm flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <span className="block text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Vestibular
              </span>
              {editingField === 'targetExam' ? (
                <div className="flex items-center gap-2 pt-1">
                  <select
                    value={tempExam}
                    onChange={(e) => setTempExam(e.target.value as ExamType)}
                    className="px-2.5 py-1 text-xs font-black neo-border-sm bg-white dark:bg-[#27272A] text-black dark:text-white focus:outline-none"
                    autoFocus
                  >
                    <option value="ENEM">ENEM</option>
                    <option value="UERJ">UERJ</option>
                    <option value="FUVEST">FUVEST</option>
                    <option value="UNICAMP">UNICAMP</option>
                    <option value="CONCURSOS">Concursos Públicos</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => saveField('targetExam')}
                    className="p-1.5 bg-[#00E599] text-black neo-border-sm hover:scale-105"
                    title="Confirmar"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="p-1.5 bg-gray-200 dark:bg-gray-700 text-black dark:text-white neo-border-sm hover:scale-105"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-black dark:text-white">
                    {profile.targetExam}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-[#00F0FF] text-black neo-border-sm">
                    Foco
                  </span>
                </div>
              )}
            </div>

            {editingField !== 'targetExam' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => startEditing('targetExam')}
                  className="p-2 neo-border-sm bg-white dark:bg-[#27272A] hover:bg-[#FFE600] dark:hover:bg-[#FFE600] dark:hover:text-black transition-colors"
                  title="Editar vestibular"
                >
                  <Pencil className="w-4 h-4 text-black dark:text-gray-200 hover:text-black" />
                </button>
              </div>
            )}
          </div>

          {/* 3. Curso Alvo */}
          <div className="p-4 bg-[#F8F5EE] dark:bg-[#202024] neo-border-sm flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <span className="block text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Curso
              </span>
              {editingField === 'targetCourse' ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={tempCourse}
                    onChange={(e) => setTempCourse(e.target.value)}
                    placeholder="Ex: Medicina, Direito, Computação"
                    className="px-3 py-1 text-xs font-black neo-border-sm bg-white dark:bg-[#27272A] text-black dark:text-white focus:outline-none w-full"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveField('targetCourse');
                      if (e.key === 'Escape') cancelEditing();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => saveField('targetCourse')}
                    className="p-1.5 bg-[#00E599] text-black neo-border-sm hover:scale-105"
                    title="Confirmar"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="p-1.5 bg-gray-200 dark:bg-gray-700 text-black dark:text-white neo-border-sm hover:scale-105"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              ) : (
                <span className="text-base font-black text-black dark:text-white">
                  {profile.targetCourse || 'Não informado'}
                </span>
              )}
            </div>

            {editingField !== 'targetCourse' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => startEditing('targetCourse')}
                  className="p-2 neo-border-sm bg-white dark:bg-[#27272A] hover:bg-[#FFE600] dark:hover:bg-[#FFE600] dark:hover:text-black transition-colors"
                  title="Editar curso"
                >
                  <Pencil className="w-4 h-4 text-black dark:text-gray-200 hover:text-black" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 4. Meta diária */}
        <div className="p-4 bg-[#F8F5EE] dark:bg-[#202024] neo-border-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 flex-1">
            <span className="block text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Meta diária
            </span>
            {editingField === 'dailyGoal' ? (
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(Number(e.target.value))}
                  className="w-48 accent-black cursor-pointer"
                  autoFocus
                />
                <span className="text-sm font-black text-black dark:text-white">
                  {tempGoal} questões/dia
                </span>
                <button
                  type="button"
                  onClick={() => saveField('dailyGoal')}
                  className="p-1.5 bg-[#00E599] text-black neo-border-sm hover:scale-105"
                  title="Confirmar"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="p-1.5 bg-gray-200 dark:bg-gray-700 text-black dark:text-white neo-border-sm hover:scale-105"
                  title="Cancelar"
                >
                  <X className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-base md:text-lg font-black text-black dark:text-white">
                  {profile.dailyGoalQuestions} questões por dia
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                  (Ritmo {profile.dailyGoalQuestions <= 10 ? 'Leve' : profile.dailyGoalQuestions <= 25 ? 'Intensivo' : 'Simulado'})
                </span>
              </div>
            )}
          </div>

          {editingField !== 'dailyGoal' && (
            <button
              type="button"
              onClick={() => startEditing('dailyGoal')}
              className="p-2 neo-border-sm bg-white dark:bg-[#27272A] hover:bg-[#FFE600] dark:hover:bg-[#FFE600] dark:hover:text-black transition-colors self-start sm:self-auto"
              title="Editar meta diária"
            >
              <Pencil className="w-4 h-4 text-black dark:text-gray-200 hover:text-black" />
            </button>
          )}
        </div>
      </div>

      {/* Estatísticas Gerais de Aprendizado */}
      <div className="bg-white dark:bg-[#18181B] neo-border neo-shadow p-6">
        <h3 className="text-base font-black uppercase tracking-wider text-black dark:text-white border-b-2 border-black dark:border-gray-700 pb-2 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#00E599]" />
          Seu progresso
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#F8F5EE] dark:bg-[#202024] neo-border-sm text-center">
            <div className="text-xs font-mono uppercase text-gray-500 dark:text-gray-400">XP total</div>
            <div className="text-lg font-black text-black dark:text-white">{profile.totalXp} XP</div>
          </div>

          <div className="p-3 bg-[#F8F5EE] dark:bg-[#202024] neo-border-sm text-center">
            <div className="text-xs font-mono uppercase text-gray-500 dark:text-gray-400">Ofensiva</div>
            <div className="text-lg font-black text-[#FF5A36]">{profile.currentStreak} dias</div>
          </div>

          <div className="p-3 bg-[#F8F5EE] dark:bg-[#202024] neo-border-sm text-center">
            <div className="text-xs font-mono uppercase text-gray-500 dark:text-gray-400">Recorde</div>
            <div className="text-lg font-black text-black dark:text-white">{profile.longestStreak} dias</div>
          </div>

          <div className="p-3 bg-[#F8F5EE] dark:bg-[#202024] neo-border-sm text-center">
            <div className="text-xs font-mono uppercase text-gray-500 dark:text-gray-400">Nota TRI estimada</div>
            <div className="text-lg font-black text-[#00AA44] dark:text-[#00E599]">
              {profile.estimatedTri ? `${profile.estimatedTri.toFixed(1)} pts` : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};