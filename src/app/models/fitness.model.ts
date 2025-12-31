export interface UserProfile {
  weight_kg: number;
  height_cm: number;
  goal_calories: number;
  maintenance_protein_target_g: number;
}

export interface FoodItem {
  item: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
}

export interface Cardio {
  type: string;
  distance_mi: number;
  duration_min: number;
  calories_burned: number;
}

export interface StrengthTraining {
  target_area: string;
  duration_min: number;
  calories_burned: number;
  intensity: string;
}

export interface Exercise {
  cardio: Cardio;
  strength_training: StrengthTraining;
  total_burned_calories: number;
}

export interface DailySummary {
  total_intake_calories: number;
  total_burned_calories: number;
  net_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  status: string;
}

export interface FitnessData {
  date: string;
  user_profile: UserProfile;
  food_diary: FoodItem[];
  exercise: Exercise;
  daily_summary: DailySummary;
}