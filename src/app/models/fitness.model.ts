export interface UserProfile {
  age?: number;
  weight_kg: number;
  height_cm: number;
  goal_calories: number;
  maintenance_protein_target_g: number;
  recommended_daily_calories?: number;
}

export interface FoodItem {
  item: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface CardioSession {
  type: string;
  distance_mi: number;
  duration_min: number;
  calories_burned: number;
}

export interface StrengthTraining {
  target: string;
  duration_min: number;
  calories_burned: number;
}

export interface ExerciseSummary {
  cardio_session_1?: CardioSession;
  cardio_session_2?: CardioSession;
  strength_training?: StrengthTraining;
  total_burned_calories: number;
}

export interface DailyTotalStats {
  total_intake_calories: number;
  total_burned_calories: number;
  net_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  protein_per_kg: number;
}

export interface AIEvaluation {
  muscle_maintenance: string;
  weight_loss_status: string;
  recommendation: string;
}

export interface FitnessData {
  date: string;
  user_profile: UserProfile;
  food_diary: FoodItem[];
  exercise_summary: ExerciseSummary;
  daily_total_stats: DailyTotalStats;
  ai_evaluation: AIEvaluation;
  last_update?: string;
}