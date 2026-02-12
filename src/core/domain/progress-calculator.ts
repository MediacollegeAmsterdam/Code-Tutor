/**
 * Progress Calculation Domain Logic
 *
 * Pure functions for skill level and achievement calculations
 * Part of Core Domain - Zero external dependencies
 */

import {SKILL_LEVELS, ACHIEVEMENTS_THRESHOLDS} from '../constants';

/**
 * Calculate skill level based on total interactions
 * @param total - Total number of student interactions
 * @returns Skill level name and emoji
 */
export function getSkillLevel(total: number): { level: string; emoji: string } {
    const config = SKILL_LEVELS.find(s => total >= s.threshold);
    return {level: config?.level || 'Beginner', emoji: config?.emoji || '🌱'};
}

/**
 * Calculate unlocked achievements based on progress data
 * @param progressData - Command usage counts per student
 * @returns Array of achievement names with emojis
 */
export function calculateAchievements(progressData: Record<string, number>): string[] {
    const total = Object.values(progressData).reduce((a: number, b: number) => a + b, 0);
    const achievements: string[] = [];

    if (total >= ACHIEVEMENTS_THRESHOLDS.firstStep) {
        achievements.push('👶 Eerste Stap');
    }
    if (total >= ACHIEVEMENTS_THRESHOLDS.activeStudent) {
        achievements.push('🥉 Actieve Student');
    }
    if (total >= ACHIEVEMENTS_THRESHOLDS.advancedStudent) {
        achievements.push('🥈 Gevorderde Leerling');
    }
    if (total >= ACHIEVEMENTS_THRESHOLDS.codeMaster) {
        achievements.push('🏆 Code Meester');
    }
    if ((progressData['debug'] || 0) >= ACHIEVEMENTS_THRESHOLDS.bugHunter) {
        achievements.push('🐛 Bug Hunter');
    }
    if ((progressData['review'] || 0) >= ACHIEVEMENTS_THRESHOLDS.codeReviewer) {
        achievements.push('👀 Code Reviewer');
    }
    if ((progressData['explain'] || 0) >= ACHIEVEMENTS_THRESHOLDS.eternalLearner) {
        achievements.push('📚 Eeuwige Leerling');
    }
    if ((progressData['quiz'] || 0) >= ACHIEVEMENTS_THRESHOLDS.quizMaster) {
        achievements.push('🧠 Quiz Master');
    }
    if ((progressData['exercise'] || 0) >= ACHIEVEMENTS_THRESHOLDS.exerciser) {
        achievements.push('💪 Oefenaar');
    }

    const requiredCommands = ['debug', 'review', 'explain', 'quiz', 'exercise', 'refactor', 'concept'];
    if (requiredCommands.every(cmd => progressData[cmd] && progressData[cmd] > 0)) {
        achievements.push('🌟 All-Rounder');
    }

    return achievements;
}
