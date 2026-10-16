/**
 * @file src/components/profile/UserProfileTab.tsx
 * @description Painel de perfil do estudante e configuração de metas diárias.
 */

import React, { useState } from 'react';
import { User, Target, Flame, Award, CheckCircle, Save } from 'lucide-react';
import type { UserProfile, ExamType } from '../../types/index.ts';

interface UserProfileTabProps {
  profile: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

export const UserProfileTab: React.FC<UserProfileTabProps> = ({
  profile,
  onUpdateProfile,
}) => {
  const [name, setName] = useState<string>(profile.name);
  const [targetExam, setTargetExam] = useState<ExamType>(profile.targetExam);
  const [targetCourse, setTargetCourse] = useState<string>(profile.targetCourse);
  const [dailyGoal, setDailyGoal] = useState<number>(profile.dailyGoalQuestions);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name,
      targetExam,
      targetCourse,
      dailyGoalQuestions: dailyGoal,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white neo-border neo-shadow p-5">
        <h2 className="text-xl md:text-2xl font-black text-black flex items-center gap-2">
          <User className="w-6 h-6 text-[#FF3366]" />
          MEU PERFIL & METAS DE APROVAÇÃO
        </h2>
        <p className="text-xs font-bold text-gray-700 mt-1">
          Configure seu vestibular prioritário e mantenha a ofensiva de estudos ativa todos os dias.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white neo-border neo-shadow p-6 space-y-4">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-800 mb-1">
            Nome ou Apelido de Estudos
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2.5 text-sm neo-border-sm bg-[#F5F2EA] focus:bg-white focus:outline-none font-bold"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-800 mb-1">
              Vestibular Alvo Principal
            </label>
            <select
              value={targetExam}
              onChange={(e) => setTargetExam(e.target.value as ExamType)}
              className="w-full p-2.5 text-sm neo-border-sm bg-[#F5F2EA] focus:bg-white focus:outline-none font-bold"
            >
              <option value="ENEM">ENEM (Exame Nacional do Ensino Médio - TRI)</option>
              <option value="UERJ">UERJ (Universidade do Estado do Rio de Janeiro)</option>
              <option value="FUVEST">FUVEST (USP)</option>
              <option value="UNICAMP">UNICAMP (Universidade Estadual de Campinas)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-800 mb-1">
              Curso Alvo / Carreira
            </label>
            <input
              type="text"
              value={targetCourse}
              onChange={(e) => setTargetCourse(e.target.value)}
              placeholder="Ex: Medicina, Direito, Ciência da Computação"
              className="w-full p-2.5 text-sm neo-border-sm bg-[#F5F2EA] focus:bg-white focus:outline-none font-bold"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-800 mb-1">
            Meta Diária de Questões Resolvidas: {dailyGoal} questões/dia
          </label>
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={dailyGoal}
            onChange={(e) => setDailyGoal(Number(e.target.value))}
            className="w-full accent-black cursor-pointer"
          />
          <div className="flex justify-between text-[11px] font-bold text-gray-500 mt-1">
            <span>5 questões (Iniciante)</span>
            <span>20 questões (Intensivo)</span>
            <span>60 questões (Simulado Completo)</span>
          </div>
        </div>

        <div className="pt-3 border-t-2 border-black flex items-center justify-between">
          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-black neo-btn bg-[#FFE600] text-black flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Alterações do Perfil</span>
          </button>

          {savedSuccess && (
            <span className="text-xs font-black text-green-700 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Perfil atualizado com sucesso!
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
